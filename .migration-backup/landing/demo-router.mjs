import { makeSeed, roleSource } from './public/demo/seed.mjs';
import { analyzePatterns, makeHypothesis, assessDemo, validWeights } from './public/demo/logic.mjs';
export const contract = {
  mode: 'stateless_mock',
  version: 'sauce-demo-1',
  mainObjects: ['Organization', 'HiringManager', 'Applicant', 'Opportunity'],
  routes: {
    'GET /api/demo/bootstrap': 'Four-object empty demo workspace. Browser owns local edits.',
    'POST /api/demo/patterns': '{ pool: [{ characteristics, outcomeHistory, source }] } → { patterns }. Explicit labels only.',
    'POST /api/demo/hypothesis': '{ opportunity: { title, seniority, history } } → { lines }. Eight-line template, not an LLM.',
    'POST /api/demo/assessment': '{ application: { isSample }, policy } → illustrative fixture or null scores. No live hiring evaluation.',
    'GET /api/demo/research': 'Curated public role reference. Does not perform live enrichment.',
  },
  notImplemented: ['Production authentication', 'Shared backend persistence', 'PDF/DOCX extraction', 'Live speech-to-text', 'Live web enrichment', 'Validated hiring evaluators', 'Model training', 'MCP server'],
  voice: 'Audio stored in browser IndexedDB only. Transcripts reviewed manually or loaded from fictional samples.',
};
export async function readBody(req) {
  const chunks=[];let size=0;
  for await (const chunk of req) { size+=chunk.length;if(size>1024*1024)throw Object.assign(new Error('Use a JSON body under 1 MB.'),{status:413});chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()||'{}'); } catch { throw Object.assign(new Error('Invalid JSON.'),{status:400}); }
}
function fail(message){throw Object.assign(new Error(message),{status:400});}
export async function demoRoute(req,pathname){
  if(req.method==='GET'&&pathname==='/api/demo/contract')return contract;
  if(req.method==='GET'&&pathname==='/api/demo/bootstrap')return makeSeed();
  if(req.method==='GET'&&pathname==='/api/demo/research')return {isMock:true,provider:'curated-demo',summary:'The public Business Analyst role describes analytical client-team work, research and communication. Review office-specific requirements on the source page.',sources:[{title:'McKinsey — Business Analyst',url:roleSource,checkedAt:'2026-10-10'}]};
  if(req.method!=='POST')return null;
  const body=await readBody(req);
  if(pathname==='/api/demo/patterns'){
    if(!Array.isArray(body.pool)||body.pool.length>100||body.pool.some(p=>!p||!Array.isArray(p.characteristics)||p.characteristics.some(c=>typeof c!=='string')||!Array.isArray(p.outcomeHistory)||p.outcomeHistory.some(e=>!e||typeof e.stage!=='string')))fail('Use up to 100 pool records with characteristics and outcomeHistory arrays.');
    return {isMock:true,patterns:analyzePatterns(body.pool)};
  }
  if(pathname==='/api/demo/hypothesis'){
    const o=body.opportunity;if(!o||typeof o.title!=='string'||typeof o.seniority!=='string'||!o.history||['previousApplicants','employeeInterviews','managerInterviews'].some(k=>!Array.isArray(o.history[k])))fail('Provide an opportunity title, seniority and nested history arrays.');
    return {isMock:true,lines:makeHypothesis(o)};
  }
  if(pathname==='/api/demo/assessment'){
    if(!body.application||typeof body.application.isSample!=='boolean'||!body.policy||!validWeights(body.policy.weights||{}))fail('Provide isSample and an approved scoring configuration with weights totaling 100%.');
    return assessDemo(body.application,body.policy);
  }
  return null;
}
