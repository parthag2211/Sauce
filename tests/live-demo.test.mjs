import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const salt='test-salt';const password='only-a-test-password';
const env={OPENAI_API_KEY:'test-key',DEMO_SESSION_SECRET:'test-session-secret',DEMO_PASSWORD_HASH:salt+':'+createHash('sha256').update(salt+':'+password).digest('hex')};
const origin='https://example.test';
const request=(route,payload,cookie='',extra={})=>new Request(origin+'/api/demo/'+route,{method:payload===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie,...extra},body:payload===undefined?undefined:JSON.stringify(payload)});
const fresh=async()=>import('../backend/live-demo.mjs?case='+crypto.randomUUID());
const xml=`<?xml version="1.0"?><feed>${[
 ['2303.04137','Diffusion Policy','Cheng Chi,Yilun Du','A visuomotor action diffusion policy evaluated on physical robots.'],
 ['2304.13705','Bimanual manipulation','Tony Z. Zhao,Chelsea Finn','Imitation learning for physical bimanual robot manipulation.'],
 ['2205.09991','Diffusion planning','Michael Janner,Yilun Du','Diffusion models for trajectory planning.']
].map(([id,title,authors,abstract])=>`<entry><id>http://arxiv.org/abs/${id}v1</id><title>${title}</title>${authors.split(',').map(name=>`<author><name>${name}</name></author>`).join('')}<summary>${abstract}</summary><published>2023-01-01T00:00:00Z</published><updated>2023-01-01T00:00:00Z</updated></entry>`).join('')}</feed>`;
async function login(module){const response=await module.handleDemoAPI(request('login',{password}),env);assert.equal(response.status,200);return response.headers.get('Set-Cookie').split(';')[0];}
test('password, forged cookies, same-origin checks and approval gate block paid requests',async()=>{
 const module=await fresh();const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('No network expected');};
 try{
  assert.equal((await module.handleDemoAPI(request('sources',{}),env)).status,401);
  assert.equal((await module.handleDemoAPI(request('login',{password:'wrong'}),env)).status,401);
  assert.equal((await module.handleDemoAPI(request('login',{password},'',{Origin:'https://attacker.test'}),env)).status,403);
  assert.equal((await module.handleDemoAPI(request('samples',undefined,'sauce_demo=9999999999999.fake.forged'),env)).status,401);
  const cookie=await login(module);
  assert.equal((await module.handleDemoAPI(request('evaluate',{criterionId:'diffusion'},cookie),env)).status,400);
  assert.equal((await module.handleDemoAPI(request('evaluate',{criterionId:'custom-prompt',approved:true},cookie),env)).status,400);
  assert.equal((await module.handleDemoAPI(request('evaluate',{criterionId:'diffusion',approved:true,password:'x'.repeat(3000)},cookie),env)).status,413);
  const samples=await module.handleDemoAPI(request('samples',undefined,cookie),env);assert.equal((await samples.json()).samples.length,3);
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('real source structure, explicit authorship and uncertain individual ownership stay distinct',async()=>{
 const module=await fresh();const papers=module.parseArxiv(xml);assert.equal(papers.length,3);
 assert.throws(()=>module.parseArxiv('<!DOCTYPE feed [<!ENTITY x SYSTEM "file:///secret">]>'+xml));
 const {SAMPLES}=await import('../backend/samples.mjs');
 const evidence=module.evidenceFor(SAMPLES[1],papers.reverse());
 assert.equal(evidence.supported.paperId,'2303.04137');assert.equal(evidence.supported.status,'supported');assert.equal(evidence.uncertain.status,'uncertain');
 assert.equal(module.evidenceFor({...SAMPLES[0],name:'Different person'},papers).supported.status,'uncertain');
});
test('criterion change makes a real new API request; ownership guard and shared cache protect the result',async()=>{
 const module=await fresh();const original=globalThis.fetch;let researchCalls=0,decisionCalls=0;const bodies=[];
 globalThis.fetch=async(url,options)=>{
  if(String(url).includes('export.arxiv.org')){researchCalls++;return new Response(xml);}
  assert.equal(url,'https://api.openai.com/v1/decisions');decisionCalls++;const body=JSON.parse(options.body);bodies.push(body);
  return Response.json({model:'gpt-6-luna',answers:body.questions.map(q=>({type:'choice',name:q.name,choice:'supported',confidence:.99})),usage:{input_tokens:200,total_tokens:200}});
 };
 try{
  const cookie=await login(module);
  const evaluate=async criterion=>{const r=await module.handleDemoAPI(request('evaluate',{criterionId:criterion,approved:true},cookie),env);assert.equal(r.status,200);return r.json();};
  const first=await evaluate('diffusion');assert.equal(first.cached,false);assert.equal(first.recommendations[0].recommendation,'Review for interview');
  const cached=await evaluate('diffusion');assert.equal(cached.cached,true);assert.equal(decisionCalls,1);
  const changed=await evaluate('ownership');assert.equal(changed.cached,false);assert(changed.recommendations.every(r=>r.status==='uncertain'&&r.recommendation==='Verify criterion first'));
  assert.equal(decisionCalls,2);assert.equal(researchCalls,1);assert(bodies[1].input.includes('production maintenance'));assert.equal(bodies[0].questions.length,3);
  assert(!JSON.stringify(changed).includes('test-key'));assert(!JSON.stringify(changed).includes('test-session-secret'));
 }finally{globalThis.fetch=original;}
});
test('source and model outages return errors and never fabricated recommendations',async()=>{
 const original=globalThis.fetch;
 try{
  let module=await fresh();let cookie=await login(module);globalThis.fetch=async()=>new Response('Unavailable',{status:503});
  const unavailable=await module.handleDemoAPI(request('sources',{},cookie),env);assert.equal(unavailable.status,503);assert((await unavailable.json()).error.includes('research source'));
  module=await fresh();cookie=await login(module);globalThis.fetch=async url=>String(url).includes('arxiv')?new Response(xml):Response.json({error:{message:'Never reveal secrets'}},{status:429});
  const quota=await module.handleDemoAPI(request('evaluate',{criterionId:'diffusion',approved:true},cookie),env);assert.equal(quota.status,503);assert((await quota.json()).error.includes('quota'));
  module=await fresh();cookie=await login(module);globalThis.fetch=async url=>String(url).includes('arxiv')?new Response(xml):Response.json({answers:[]});
  const invalid=await module.handleDemoAPI(request('evaluate',{criterionId:'diffusion',approved:true},cookie),env);assert.equal(invalid.status,503);assert((await invalid.json()).error.includes('incomplete'));
 }finally{globalThis.fetch=original;}
});
test('repeated password attempts are rate limited',async()=>{const module=await fresh();for(let i=0;i<5;i++)assert.equal((await module.handleDemoAPI(request('login',{password:'wrong'}),env)).status,401);assert.equal((await module.handleDemoAPI(request('login',{password}),env)).status,429);});
test('an unavailable hosted cache does not block real source retrieval',async()=>{
 const originalFetch=globalThis.fetch,originalCache=globalThis.caches;
 globalThis.caches={default:{match(){throw new Error('Cache unavailable');}}};globalThis.fetch=async()=>new Response(xml);
 try { const module=await fresh();const cookie=await login(module);const response=await module.handleDemoAPI(request('sources',{},cookie),env);assert.equal(response.status,200);const result=await response.json();assert.equal(result.papers.length,3);assert.equal(result.cached,false); }
 finally {globalThis.fetch=originalFetch;globalThis.caches=originalCache;}
});
