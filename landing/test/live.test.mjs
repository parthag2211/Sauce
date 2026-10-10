import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store, uid, now, parse } from '../backend/store.mjs';
import { createApi } from '../backend/router.mjs';
import { parseCsv } from '../backend/imports.mjs';
import { transcribe } from '../backend/voice.mjs';
function harness(store=new Store(':memory:')){
  const handler=createApi({store,secure:false});
  const call=async(route,{method='GET',body,cookie,origin='http://localhost',bytes,headers={}}={})=>{
    const req=Object.assign(Readable.from([bytes||Buffer.from(body===undefined?'':JSON.stringify(body))]),{method,headers:{host:'localhost',origin,'content-type':'application/json',...headers,...(cookie?{cookie}:{})},socket:{remoteAddress:'test'}});
    const out={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(s,h){this.status=s;Object.assign(this.headers,h);},end(b){this.body=b;}};
    const result=await handler(req,out,new URL(route,'http://localhost'));return {result,headers:out.headers,body:out.body};
  };
  const register=async(name)=>{const r=await call('/api/v1/auth/register',{method:'POST',body:{name,email:`${name.toLowerCase()}@example.invalid`,password:'test-only-long-password'}});return {...r.result.account,cookie:r.headers['Set-Cookie'].split(';')[0]};};
  return {store,call,register};
}
const job={company:{name:'Test Organization',organizationMarkdown:'Private company context'},title:'Business Analyst',team:'Client team',seniority:'Undergraduate',jobDescription:'Use evidence, structure questions, and collaborate.'};
const profile={name:'Test Applicant',credentials:'Economics projects and campus operations.',workProposal:'Analytical team projects.',contactInformation:{email:'applicant@example.invalid',phone:'private phone',linkedin:''},references:['Private reference'],version:0};
function addVoice(store,owner){const id=uid(),meta={blobId:id,mimeType:'audio/wav',transcription:{status:'ready',originalTranscript:'Original words'}};store.run('INSERT INTO voices VALUES(?,?,?,?,?,?)',id,owner,uid(),JSON.stringify(meta),Buffer.alloc(256),now());return meta;}
test('live storage starts empty and requires an authenticated actor',async()=>{
  const h=harness();try{
    assert.equal((await h.call('/api/v1/session')).result.account,null);
    await assert.rejects(h.call('/api/v1/bootstrap'),{status:401});
    const a=await h.register('Owner');const state=(await h.call('/api/v1/bootstrap',{cookie:a.cookie})).result;
    assert.equal(state.opportunities.length,0);assert.equal(state.applicants.length,1);assert.equal(state.applicants[0].credentials,'');assert.equal(state.applicants[0].isSample,false);
    assert.equal(h.store.one('SELECT token_hash FROM sessions').token_hash.includes(a.cookie.slice(14)),false);
  }finally{h.store.close();}
});
test('cookie sessions, CSRF checks, password verification and logout are enforced',async()=>{
  const h=harness();try{
    const a=await h.register('Login');
    const stored=h.store.one('SELECT password_hash FROM accounts');assert.ok(!stored.password_hash.includes('test-only-long-password'));
    await assert.rejects(h.call('/api/v1/profile',{method:'PUT',cookie:a.cookie,origin:'https://untrusted.example',body:profile}),{status:403});
    await assert.rejects(h.call('/api/v1/auth/login',{method:'POST',body:{email:a.email,password:'wrong-password-long'}}),{status:401});
    await h.call('/api/v1/auth/logout',{method:'POST',cookie:a.cookie,body:{}});
    await assert.rejects(h.call('/api/v1/bootstrap',{cookie:a.cookie}),{status:401});
    const login=await h.call('/api/v1/auth/login',{method:'POST',body:{email:a.email,password:'test-only-long-password'}});assert.ok(login.headers['Set-Cookie'].includes('HttpOnly'));
  }finally{h.store.close();}
});
test('applicants discover openings without receiving manager context, contacts or other applications',async()=>{
  const h=harness();try{
    const m=await h.register('Manager'),a=await h.register('Applicant'),other=await h.register('Other');
    const o=(await h.call('/api/v1/opportunities',{method:'POST',cookie:m.cookie,body:job})).result.opportunity;
    const data=(await h.call('/api/v1/bootstrap?role=applicant',{cookie:a.cookie})).result;
    assert.equal(data.opportunities[0].title,'Business Analyst');assert.equal(data.organizations[0].organizationMarkdown,undefined);assert.equal(data.opportunities[0].managerVision.audio,null);assert.deepEqual(data.opportunities[0].applications,[]);
    await assert.rejects(h.call(`/api/v1/opportunities/${o.id}/imports/preview`,{method:'POST',cookie:other.cookie,body:{}}),{status:404});
    assert.equal((await h.call('/api/v1/bootstrap',{cookie:other.cookie})).result.opportunities.length,0);
  }finally{h.store.close();}
});
test('submission validates voice ownership, freezes the server profile, ignores supplied scores and is idempotent',async()=>{
  const h=harness();try{
    const m=await h.register('Hiring'),a=await h.register('Applying'),stranger=await h.register('Stranger');
    const o=(await h.call('/api/v1/opportunities',{method:'POST',cookie:m.cookie,body:job})).result.opportunity;
    await h.call('/api/v1/profile',{method:'PUT',cookie:a.cookie,body:profile});
    const voiceAnswers=o.questions.forApplicants.map(q=>({questionId:q.id,audio:addVoice(h.store,a.id),reviewedTranscript:'Reviewed words',isSample:true}));
    const stolen=structuredClone(voiceAnswers);stolen[0].audio=addVoice(h.store,stranger.id);
    await assert.rejects(h.call(`/api/v1/opportunities/${o.id}/applications`,{method:'POST',cookie:a.cookie,body:{voiceAnswers:stolen}}),{status:400});
    await assert.rejects(h.call(`/api/v1/opportunities/${o.id}/applications`,{method:'POST',cookie:a.cookie,body:{voiceAnswers:voiceAnswers.slice(0,2)}}),{status:400});
    const endpoint=`/api/v1/opportunities/${o.id}/applications`;
    const result=(await h.call(endpoint,{method:'POST',cookie:a.cookie,body:{voiceAnswers,assessment:{overall:100},submittedProfile:{name:'Forged'}}})).result.application;
    assert.equal(result.assessment.overall,null);assert.equal(result.submittedProfile.name,profile.name);assert.equal(result.voiceAnswers[0].originalTranscript,'Original words');assert.equal(result.voiceAnswers[0].reviewedTranscript,'Reviewed words');assert.equal(result.voiceAnswers[0].isSample,false);
    const again=(await h.call(endpoint,{method:'POST',cookie:a.cookie,body:{voiceAnswers}})).result;assert.equal(again.application.id,result.id);assert.equal(again.alreadySubmitted,true);
    await h.call('/api/v1/profile',{method:'PUT',cookie:a.cookie,body:{...profile,credentials:'Changed after submission',version:1}});
    assert.equal((await h.call('/api/v1/bootstrap',{cookie:m.cookie})).result.opportunities[0].applications[0].submittedProfile.credentials,profile.credentials);
    await assert.rejects(h.call(`/api/v1/voice/${voiceAnswers[0].audio.blobId}`,{cookie:stranger.cookie}),{status:404});
    assert.ok((await h.call(`/api/v1/voice/${voiceAnswers[0].audio.blobId}`,{cookie:m.cookie})).body.length>0);
    const outcome=`${endpoint}/${result.id}/outcomes`;
    await assert.rejects(h.call(outcome,{method:'POST',cookie:stranger.cookie,body:{stage:'hired',version:1}}),{status:404});
    const accepted=(await h.call(outcome,{method:'POST',cookie:m.cookie,body:{stage:'accepted',version:1}})).result.application;
    assert.equal(accepted.status,'accepted');assert.deepEqual(accepted.outcomeHistory.map(e=>e.stage),['submitted','accepted']);
    await assert.rejects(h.call(outcome,{method:'POST',cookie:m.cookie,body:{stage:'hired',version:1}}),{status:409});
  }finally{h.store.close();}
});
test('reviewed imports preserve stages, private sources, deduplication and commit idempotency',async()=>{
  const h=harness();try{
    const m=await h.register('Importer'),a=await h.register('Viewer');const o=(await h.call('/api/v1/opportunities',{method:'POST',cookie:m.cookie,body:job})).result.opportunity;
    const content='name,email,resume_text,stage\r\n"Alex, Example",alex@example.invalid,"A project, with evidence",accepted\r\nOther,,"Work history",shortlisted';
    const p=(await h.call(`/api/v1/opportunities/${o.id}/imports/preview`,{method:'POST',cookie:m.cookie,body:{format:'csv',filename:'pool.csv',content}})).result;
    assert.equal(p.count,2);assert.equal(p.applicants[0].name,'Alex, Example');
    assert.deepEqual((await h.call('/api/v1/bootstrap',{cookie:m.cookie})).result.opportunities[0].history.previousApplicants,[]);
    await assert.rejects(h.call(`/api/v1/opportunities/${o.id}/imports/commit`,{method:'POST',cookie:a.cookie,body:{previewId:p.previewId}}),{status:404});
    const endpoint=`/api/v1/opportunities/${o.id}/imports/commit`;
    assert.equal((await h.call(endpoint,{method:'POST',cookie:m.cookie,body:{previewId:p.previewId}})).result.imported,2);
    assert.equal((await h.call(endpoint,{method:'POST',cookie:m.cookie,body:{previewId:p.previewId}})).result.alreadyCommitted,true);
    const history=(await h.call('/api/v1/bootstrap',{cookie:m.cookie})).result.opportunities[0].history.previousApplicants;
    assert.deepEqual(history[0].outcomeHistory.map(e=>e.stage),['accepted']);assert.equal(history[0].assessment.overall,null);assert.equal(history[0].source.filename,'pool.csv');
    assert.equal((await h.call('/api/v1/bootstrap?role=applicant',{cookie:a.cookie})).result.opportunities[0].history.previousApplicants.length,0);
  }finally{h.store.close();}
});
test('CSV rejects malformed records and preserves quoted newlines rather than splitting applicants',()=>{
  const rows=parseCsv('name,resume_text,stage\nA,"Line one\nLine two",offered');assert.equal(rows.length,1);assert.match(rows[0].resume_text,/\n/);
  assert.throws(()=>parseCsv('name,resume_text\nA,"unclosed'),{status:400});assert.throws(()=>parseCsv('name,name\nA,B'),{status:400});assert.throws(()=>parseCsv('name,resume_text\nA,B,C'),{status:400});
});
test('records survive reopening the database and stale profile writes are rejected',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'sauce-storage-')),file=path.join(dir,'test.sqlite');let store=new Store(file);
  try{
    let h=harness(store);const m=await h.register('Durable');await h.call('/api/v1/opportunities',{method:'POST',cookie:m.cookie,body:job});
    await h.call('/api/v1/profile',{method:'PUT',cookie:m.cookie,body:profile});await assert.rejects(h.call('/api/v1/profile',{method:'PUT',cookie:m.cookie,body:profile}),{status:409});
    store.close();store=new Store(file);h=harness(store);const saved=(await h.call('/api/v1/bootstrap',{cookie:m.cookie})).result;assert.equal(saved.opportunities.length,1);assert.equal(saved.applicants[0].credentials,profile.credentials);
  }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('transcription retains original words and reports provider failure without fabricating text',async()=>{
  const old=process.env.GROQ_API_KEY,eleven=process.env.ELEVENLABS_API_KEY;process.env.GROQ_API_KEY='test-private-key';delete process.env.ELEVENLABS_API_KEY;
  try{
    const success=await transcribe(Buffer.alloc(256),'audio/wav',async(url,options)=>{assert.match(url,/groq/);assert.equal(options.body.get('model'),'whisper-large-v3');return {ok:true,json:async()=>({text:'Um, my original words.'})};});
    assert.equal(success.originalTranscript,'Um, my original words.');
    const failed=await transcribe(Buffer.alloc(256),'audio/wav',async()=>({ok:false}));assert.equal(failed.status,'failed');assert.equal(failed.originalTranscript,undefined);
    delete process.env.GROQ_API_KEY;assert.equal((await transcribe(Buffer.alloc(256),'audio/wav')).status,'unavailable');
  }finally{if(old===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=old;if(eleven!==undefined)process.env.ELEVENLABS_API_KEY=eleven;}
});
