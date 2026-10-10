import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { demoRoute, readBody, contract } from '../demo-router.mjs';
import { makeSeed } from '../public/demo/seed.mjs';
import { assessDemo, validWeights, canSubmit, analyzePatterns, makeHypothesis } from '../public/demo/logic.mjs';
const weights={composite_profile:60,voice_transcript:40,voice_behaviors:0};
const policy={weights,managerApproved:true,version:1};
const req=(body,method='POST')=>Object.assign(Readable.from([Buffer.from(typeof body==='string'?body:JSON.stringify(body))]),{method});
test('demo contract keeps four objects and explicitly identifies missing live services',()=>{
  assert.equal(contract.mode,'stateless_mock');
  assert.deepEqual(contract.mainObjects,['Organization','HiringManager','Applicant','Opportunity']);
  assert.ok(contract.notImplemented.includes('Live speech-to-text'));
  assert.equal(makeSeed().opportunities[0].questions.forApplicants.length,3);
});
test('unknown voice evidence prevents a score only when it has a positive weight',()=>{
  assert.equal(assessDemo({isSample:true},policy).overall,87.2);
  assert.equal(assessDemo({isSample:true},{...policy,weights:{composite_profile:50,voice_transcript:40,voice_behaviors:10}}).overall,null);
  assert.equal(assessDemo({isSample:true},{...policy,managerApproved:false}).overall,null);
});
test('real submissions never receive fabricated fixture scores',()=>{
  const score=assessDemo({isSample:false},policy);
  assert.equal(score.overall,null);assert.equal(score.composite_profile,null);assert.equal(score.voice_transcript,null);assert.deepEqual(score.evidence,[]);
});
test('weights reject missing, misspelled and non-numeric component definitions',()=>{
  for(const bad of [null,{},[60,40,0],{a:60,b:40,c:0},{...weights,voice_transcript:'40'},{...weights,voice_transcript:Infinity},{...weights,voice_behaviors:1}])assert.equal(validWeights(bad),false);
  assert.equal(validWeights(weights),true);
});
test('submission requires the exact three questions and original audio for non-sample responses',()=>{
  const s=makeSeed(),o=s.opportunities[0];o.scoring.managerApproved=true;
  const a={onboarded:true};const answers=o.questions.forApplicants.map(q=>({questionId:q.id,reviewedTranscript:'My words',audio:{blobId:'local-recording'}}));
  assert.equal(canSubmit(a,o,answers),true);
  assert.equal(canSubmit(a,o,answers.slice(0,2)),false);
  assert.equal(canSubmit(a,o,answers.map(x=>({...x,audio:null}))),false);
  assert.equal(canSubmit(a,o,[...answers].reverse()),false);
});
test('historical evidence counts people once and never converts acceptance to hired',()=>{
  const pool=[{characteristics:['problem structuring','problem structuring'],outcomeHistory:[{stage:'accepted'}],source:'resume-1'},{characteristics:[],outcomeHistory:[{stage:'shortlisted'}],source:'resume-2'}];
  const before=JSON.stringify(pool);const p=analyzePatterns(pool)[0];
  assert.equal(p.advanced,1);assert.equal(p.advancedTotal,1);assert.equal(p.othersTotal,1);assert.equal(JSON.stringify(pool),before);
  const lines=makeHypothesis(makeSeed().opportunities[0]);assert.equal(lines.length,8);assert.match(lines.join(' '),/no model has been trained/);
});
test('mock API rejects malformed, oversized and incorrectly structured requests',async()=>{
  await assert.rejects(readBody(req('{')),{status:400});
  await assert.rejects(readBody(req('x'.repeat(1024*1024+1))),{status:413});
  await assert.rejects(demoRoute(req({pool:[{characteristics:'bad',outcomeHistory:[]}]}),'/api/demo/patterns'),{status:400});
  await assert.rejects(demoRoute(req({application:{isSample:true},policy:{...policy,weights:{a:60,b:40,c:0}}}),'/api/demo/assessment'),{status:400});
  assert.equal(await demoRoute(req({},'GET'),'/api/demo/unknown'),null);
});
