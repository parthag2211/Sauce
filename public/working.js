if(location.hostname==='parthag2211.github.io'){location.replace('https://sauce-hiring-demo.parthag22.chatgpt.site/working');await new Promise(()=>{});}
const main=document.querySelector('#demo-main');
const dialog=document.querySelector('#evidence-dialog');
const loginMarkup=main.innerHTML;
const state={samples:[],criteria:[],loaded:false,draft:'diffusion',approved:null,research:null,result:null,previous:null,inspected:new Set(),busy:'',error:''};
const esc=value=>String(value??'').replaceAll('\u2014',',').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prettyDate=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
const button=(label,action,disabled=false,cls='')=>`<button class="live-button ${cls}" data-live="${action}" ${disabled?'disabled':''}>${label}</button>`;
let noticeTimer;
function notice(text){const box=document.querySelector('#live-status');box.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>box.textContent='',5500);}
async function api(route,payload){
  const response=await fetch('/api/demo/'+route,{method:payload===undefined?'GET':'POST',headers:payload===undefined?{}:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload),credentials:'same-origin'});
  let data;try{data=await response.json();}catch{throw new Error('The live server could not complete this request.');}
  if(!response.ok){if(response.status===401&&route!=='login')lock();throw new Error(data.error||'The live request failed.');}return data;
}
function lock(){document.querySelector('#logout').hidden=true;main.innerHTML=loginMarkup;state.loaded=false;state.approved=null;state.research=null;state.result=null;state.previous=null;state.inspected.clear();dialog.close();}
async function unlock(){const data=await api('samples');state.samples=data.samples;state.criteria=data.criteria;document.querySelector('#logout').hidden=false;render();}
function render(){
  const criterion=state.criteria.find(c=>c.id===state.draft);
  const busy=!!state.busy;
  const steps=[['1. Load CVs',state.loaded],['2. Approve criterion',!!state.approved],['3. Retrieve sources',!!state.research],['4. Inspect claims',state.inspected.size===2],['5. Update recommendation',!!state.previous&&!!state.result&&state.result.criterion.id!==state.previous.criterion.id]];
  const firstPending=steps.findIndex(s=>!s[1]);
  main.innerHTML=`<div class="notice">We wanted to build a more comprehensive product. This hackathon demo has a limited scope because we had limited data access and API funding.</div>
  <div class="live-title"><h1>From CV.<br>To evidence.</h1><span class="pill">Working demo</span></div>
  <div class="steps" aria-label="Demo progress">${steps.map((s,i)=>`<span class="step ${s[1]?'done':firstPending===i?'active':''}">${s[1]?'✓ ':''}${s[0]}</span>`).join('')}</div>
  ${state.error?`<div class="error-box" role="alert">${esc(state.error)}</div>`:''}
  <section class="panel" id="samples"><div class="panel-title"><h2>Three public CV samples</h2>${button(state.loaded?'CVs loaded':'Load three sample CVs','load',busy||state.loaded)}</div>
  ${state.loaded?`<p>These researchers are examples, not applicants. The cards are curated summaries of their public CVs.</p><div class="sample-grid">${state.samples.map(s=>`<article class="cv-card"><h3>${esc(s.name)}</h3><p>${esc(s.summary)}</p><div class="cv-date"><span class="pill peach">${esc(s.cvDate)}</span></div><a href="${esc(s.cvUrl)}" target="_blank" rel="noopener noreferrer">Open public CV ↗</a></article>`).join('')}</div>`:'<div class="empty">Load the CVs to start the live workflow.</div>'}</section>
  <section class="panel" id="criterion"><div class="panel-title"><h2>Research Scientist, Robot Learning</h2><span class="pill ${state.approved?'':'peach'}">${state.approved?'Criterion approved':'Approval required'}</span></div><div class="criterion-layout"><label class="field" for="criterion-select">Role criterion<select id="criterion-select" ${busy||!state.loaded?'disabled':''}>${state.criteria.map(c=>`<option value="${c.id}" ${c.id===state.draft?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><div class="criterion-copy"><p>${esc(criterion.text)}</p>${button('Approve criterion','approve',busy||!state.loaded||state.approved===state.draft,state.approved===state.draft?'mint':'')}</div></div></section>
  <section class="panel" id="sources"><div class="panel-title"><h2>Retrieve real sources</h2><span class="pill white">arXiv API</span></div><div class="source-row">${button(state.busy==='research'?'Retrieving sources...':state.research?'Sources retrieved':'Retrieve real sources','research',busy||!state.approved||!!state.research)}${state.research?`<span class="pill">${state.research.papers.length} real papers · ${state.research.cached?'Cached retrieval':'Live retrieval'}</span>`:''}</div>
  ${state.research?`<div class="source-table">${state.research.papers.map(p=>`<article class="source-record"><div><h3>${esc(p.title)}</h3><p>arXiv ${esc(p.id)} · ${esc(p.published.slice(0,10))}</p></div><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a></article>`).join('')}</div><div class="run-facts"><span class="run-fact">Retrieved: ${esc(prettyDate(state.research.retrievedAt))}</span></div><div class="evidence-actions">${button((state.inspected.has('supported')?'✓ ':'')+'Inspect supported claim','supported',busy,'mint')}${button((state.inspected.has('uncertain')?'✓ ':'')+'Inspect uncertain claim','uncertain',busy,'outline')}</div>`:'<div class="empty" style="margin-top:22px">Approve the criterion before retrieving the papers.</div>'}</section>
  <section class="panel" id="recommendations"><div class="panel-title"><h2>${state.previous?'Updated recommendation':'Recommendation'}</h2>${button(state.busy==='evaluate'?'Evaluating evidence...':state.previous?'Update recommendation':'Evaluate approved criterion','evaluate',busy||!state.research||!state.approved||state.result?.criterion.id===state.approved)}</div>
  ${state.result?renderResult():`<div class="empty">${state.previous?'The criterion changed. Approve it, then update the recommendation.':'Evaluate the retrieved evidence with the approved criterion.'}</div>`}
  <div class="actions" style="margin-top:24px">${button('Change criterion','change',busy||!state.result,'outline')}${button('Export evidence record','export',busy||!state.result,'outline')}</div></section>`;
}
function renderResult(){return `<span class="pill white">${esc(state.result.criterion.name)}</span><div class="result-grid" style="margin-top:22px">${state.result.recommendations.map(r=>{const old=state.previous?.recommendations.find(o=>o.id===r.id);return `<article class="result-card ${esc(r.status)}"><h3>${esc(r.name)}</h3><strong>${esc(r.recommendation)}</strong><span class="pill white">${r.status==='supported'?'Supported criterion':r.status==='different_focus'?'Different research focus':'Uncertain criterion'}</span><p>${esc(r.reason)}</p>${old?`<div class="comparison"><span>Before: ${esc(old.recommendation)}</span><span>Now: ${esc(r.recommendation)}</span></div>`:''}${button('Inspect evidence','person:'+r.id,false,'outline small')}</article>`;}).join('')}</div><div class="run-facts"><span class="run-fact">${esc(state.result.provider)} · ${esc(state.result.model)}</span><span class="run-fact">${state.result.cached?'Cached API result':'Live API result'} · ${esc(prettyDate(state.result.evaluatedAt))}</span><span class="run-fact">${esc(state.result.latencyMs)} ms · ${esc(state.result.usage.totalTokens??'Unknown')} tokens</span></div><p class="result-notice">A human makes every interview and hiring decision. This demo evaluates evidence coverage.</p>`;}
function inspect(kind,personId='cheng'){
  const person=state.research.evidence.find(e=>e.id===personId);if(!person)return;
  if(kind==='supported'||kind==='uncertain')state.inspected.add(kind);
  const current=kind==='person'?'supported':kind;
  const claim=person[current];
  const paper=state.research.papers.find(p=>p.id===person.supported.paperId);
  dialog.innerHTML=`<div class="dialog-head"><h2 id="evidence-title">${esc(person.name)} · Evidence</h2><button class="live-button outline small" data-dialog="close">Close</button></div><div class="dialog-content"><div class="actions"><button class="live-button ${current==='supported'?'mint':'outline'}" data-dialog="supported" data-person="${person.id}">Supported claim</button><button class="live-button ${current==='uncertain'?'':'outline'}" data-dialog="uncertain" data-person="${person.id}">Uncertain claim</button></div><div class="claim-card"><span class="pill ${claim.status==='supported'?'':'peach'}">${esc(claim.status==='supported'?'Supported':'Uncertain')}</span><h3>${esc(claim.claim)}</h3>${claim.origin?`<p>${esc(claim.origin)}</p>`:''}<p>${esc(claim.reason)}</p>${claim.next?`<p><strong>Next verification:</strong> ${esc(claim.next)}</p>`:''}</div>${paper?`<div class="citation-box"><p><strong>${esc(paper.title)}</strong></p><p>Authors: ${esc(paper.authors.join(', '))}</p><a href="${esc(paper.url)}" target="_blank" rel="noopener noreferrer">Inspect original paper ↗</a></div>`:''}<dl class="metadata"><dt>Public CV</dt><dd><a href="${esc(person.cvUrl)}" target="_blank" rel="noopener noreferrer">Open original CV ↗</a></dd><dt>Source retrieval</dt><dd>${esc(prettyDate(state.research.retrievedAt))}</dd><dt>Evidence limit</dt><dd>Publication metadata and abstracts. No contribution logs, references, or employment records.</dd></dl></div>`;
  if(!dialog.open)dialog.showModal();render();
}
async function run(task,fn){state.busy=task;state.error='';render();try{await fn();}catch(error){state.error=error.message;}finally{state.busy='';if(!document.querySelector('#login-form'))render();}}
document.addEventListener('submit',async event=>{
  if(event.target.id!=='login-form')return;event.preventDefault();const submit=event.target.querySelector('button');submit.disabled=true;const password=event.target.elements.password.value;document.querySelector('#login-status').textContent='Checking access...';
  try{await api('login',{password});event.target.reset();await unlock();}catch(error){const status=document.querySelector('#login-status');if(status)status.textContent=error.message;}finally{if(submit.isConnected)submit.disabled=false;}
});
document.addEventListener('change',event=>{if(event.target.id!=='criterion-select')return;state.draft=event.target.value;state.approved=null;if(state.result){state.previous=state.result;state.result=null;}render();});
document.addEventListener('click',async event=>{
  const dialogButton=event.target.closest('[data-dialog]');if(dialogButton){if(dialogButton.dataset.dialog==='close')dialog.close();else inspect(dialogButton.dataset.dialog,dialogButton.dataset.person);return;}
  const action=event.target.closest('[data-live]')?.dataset.live;if(!action)return;
  if(action==='load'){state.loaded=true;render();notice('Three public CV samples loaded.');}
  if(action==='approve'){state.approved=state.draft;render();notice('Role criterion approved.');}
  if(action==='research')await run('research',async()=>{state.research=await api('sources',{});notice('Real arXiv evidence retrieved.');});
  if(action==='evaluate')await run('evaluate',async()=>{state.result=await api('evaluate',{criterionId:state.approved,approved:true});notice(state.previous?'Recommendation updated for the changed criterion.':'Live Decisions API evaluation complete.');});
  if(action==='supported'||action==='uncertain')inspect(action);
  if(action.startsWith('person:'))inspect('person',action.split(':')[1]);
  if(action==='change'){state.previous=state.result;state.result=null;state.draft=state.approved==='ownership'?'diffusion':'ownership';state.approved=null;render();document.querySelector('#criterion').scrollIntoView({behavior:'smooth'});notice('Criterion changed. Approve it before updating the recommendation.');}
  if(action==='export'){const record={exportedAt:new Date().toISOString(),sampleType:'Curated public CV summaries. These researchers are not applicants.',sources:state.research,previous:state.previous,current:state.result,inspectedClaims:[...state.inspected],humanReviewRequired:true};const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='sauce-live-evidence.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Evidence record exported.');}
});
document.querySelector('#logout').addEventListener('click',async()=>{try{await api('logout',{});lock();}catch(error){notice(error.message);}});
try{const session=await api('session');if(session.authenticated)await unlock();}catch{document.querySelector('#login-status').textContent='The live server is unavailable. Please reload.';}
