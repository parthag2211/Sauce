import { SOURCES, BUCKETS, PRESETS, newState, candidates, screeningPool, counts, evaluate, criterionState, parseFile, normalizeCandidates, seedHistory } from './data.js';

const KEY = 'sauce-demo-v3';
const clean = value => String(value ?? '').replaceAll('\u2014', ',');
const esc = value => clean(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const num = value => Number(value).toLocaleString('en-US');
const main = document.querySelector('#main'), overlay = document.querySelector('#overlay');
const NAV = [['brain','Company brain'],['criteria','Criteria'],['research','Research'],['decisions','Decisions'],['flywheel','Data flywheel']];
let state = newState(), busy = false, modal = null, toastTimer, lastFocus;
try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved?.version === 3) state = { ...state, ...saved }; } catch {}
state.sources.forEach(s => { if (s.status === 'Researching' || s.status === 'Queued') s.status = 'Ready'; });
const btn = (label, action, cls = '', extra = '') => `<button class="button ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const next = (label, view) => btn(`${label} <span class="arrow" aria-hidden="true">→</span>`, 'navigate', '', `data-view="${view}"`);
const tick = value => value === 'meets' ? '<span class="tick" aria-label="Meets criterion">✓</span>' : value === 'unknown' ? '<span class="unknown" aria-label="Unknown">?</span>' : '<span class="cross" aria-label="Criterion mismatch">×</span>';
const roleSelect = () => `<select aria-label="Current role" data-change="preset">${Object.entries(PRESETS).map(([key,p]) => `<option value="${key}" ${key === state.preset ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}<option value="custom" ${state.preset === 'custom' ? 'selected' : ''}>${state.preset === 'custom' ? esc(state.role.title) : 'Create a role'}</option></select>`;
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('Storage is full. Export your shortlist before closing.'); } }
function toast(text) { const el = document.querySelector('#toast'); el.textContent = clean(text); el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4200); }
function log(text) { state.history.unshift({ text: clean(text), time: new Date().toISOString() }); state.history = state.history.slice(0,30); }
function invalidate() { state.approved = false; state.screening = false; state.researched = false; state.decisions = {}; state.selected = []; state.outcomes = {}; state.bucket = 'interview'; state.page = 1; }
function heading(title, actions = '') { return `<div class="page-heading"><h1>${title}</h1><div class="heading-actions">${actions}</div></div>`; }
function render() {
  document.querySelector('#nav').innerHTML = NAV.map(([id,title]) => `<button class="nav-item ${state.view === id ? 'active' : ''}" data-action="navigate" data-view="${id}" ${state.view === id ? 'aria-current="page"' : ''}>${title}</button>`).join('');
  const views = { brain: brainView, criteria: criteriaView, research: researchView, decisions: decisionsView, flywheel: flywheelView };
  main.innerHTML = (views[state.view] || brainView)();
  renderModal();
}
function brainView() {
  const imported = state.importedHistory, historyTotal = imported ? imported.length : 10000;
  const hires = imported ? imported.filter(r => /hired|joined/i.test(r.outcome)).length : 84;
  return `${heading('Your hiring history.<br><span class="orange-text">Put to work.</span>', btn('Create a role', 'new-role', 'outline'))}
  <div class="grid2">
    <section class="stack">
      <div class="surface"><div class="section-head"><h2>Hiring history</h2>${btn('View records', 'history', 'text')}</div>
        <div class="history-stats"><div class="history-stat"><span class="metric">${num(historyTotal)}</span><span class="label">Previous CVs</span></div><div class="history-stat"><span class="metric orange-text">${num(hires + state.learning.length)}</span><span class="label">Hires</span></div></div>
        <div class="file-actions">${btn('Import CSV / JSON', 'upload-history', 'outline')}${btn('Download example', 'sample-history', 'outline')}</div>
      </div>
      <div class="surface mint"><div class="section-head"><h2>Our next ${esc(state.role.title)}</h2></div>
        <div class="tokens"><span class="token">${esc(state.role.focus)}</span><span class="token">${esc(state.role.level)}</span><span class="token peach">${state.role.limit} interviews</span></div>
        <div class="footer-action">${btn('Edit role', 'new-role', 'outline')}${btn('Draft criteria', 'hypothesis', 'orange')}</div>
      </div>
      ${state.hypothesis ? `<div class="hypothesis"><h3>What great looks like</h3><ul>${state.criteria.filter(c => c.enabled).map(c => `<li>${esc(c.label)}</li>`).join('')}<li>Review collaboration and ownership in the interview.</li></ul><div class="footer-action">${next('Review criteria', 'criteria')}</div></div>` : ''}
    </section>
    <section><div class="section-head"><h2>Company brain</h2></div><div class="context-fields">
      <div class="context-field"><label class="label" for="company">Company</label><input class="field wide" id="company" data-context="company" value="${esc(state.context.company)}"></div>
      ${[['companyBrain','Company context'],['team','Team context'],['role','Role context'],['process','Process context']].map(([id,label]) => `<div class="context-field"><label class="label" for="context-${id}">${label}</label><textarea class="field" id="context-${id}" data-context="${id}">${esc(state.context[id])}</textarea></div>`).join('')}
    </div><div class="footer-action"><span class="approved-mark">✓ Saved in this demo</span>${next('Define criteria','criteria')}</div></section>
  </div>`;
}
function criteriaView() {
  return `${heading('Define what <span class="orange-text">great looks like.</span>', roleSelect())}
  <div class="section-head"><div class="tokens"><span class="token">${esc(state.role.focus)}</span><span class="token">${esc(state.role.level)}</span><span class="token peach">${state.role.limit} interviews</span></div>${btn('Add criterion','add-criterion','outline')}</div>
  <div class="table-scroll"><table class="criteria-table"><thead><tr><th>Criterion</th><th>Dimension</th><th>Requirement</th><th>Use</th></tr></thead><tbody>${state.criteria.map((c,i) => `<tr><td><input class="field" aria-label="Criterion ${i+1}" data-criterion="${i}" data-prop="label" value="${esc(c.label)}"></td><td>${esc(c.dimension)}</td><td><select aria-label="Requirement ${i+1}" data-criterion="${i}" data-prop="required"><option value="true" ${c.required ? 'selected' : ''}>Must have</option><option value="false" ${!c.required ? 'selected' : ''}>Explore</option></select></td><td><input type="checkbox" aria-label="Use ${esc(c.label)}" data-criterion="${i}" data-prop="enabled" ${c.enabled ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div>
  <div class="footer-action"><div class="approved-mark">${state.approved ? '✓ Criteria approved' : 'Approval required'}</div>${btn(state.approved ? 'Approved ✓' : 'Approve criteria','approve','orange', state.approved ? 'disabled' : '')}</div>
  <div class="surface mint" style="margin-top:36px"><div class="section-head"><h2>Screen the CVs.</h2><span class="token">${num(candidates(state).length)} candidates</span></div>
    <div class="file-actions">${btn('Import candidates','upload-candidates','outline')}${btn('Download example','sample-candidates','outline')}${state.imported ? btn('Load sample pool','seed-pool','outline') : ''}</div>
    ${state.screening ? `<div class="pool-row"><div class="pool-block"><h3>CVs reviewed</h3><div class="metric">${num(candidates(state).length)}</div></div><span class="arrow">→</span><div class="pool-block"><h3>Pass initial criteria</h3><div class="metric orange-text">${num(screeningPool(state).length)}</div></div></div>` : ''}
    <div class="footer-action"><span class="token">${state.screening ? `${num(candidates(state).length - screeningPool(state).length)} CV mismatches` : 'CV evidence first'}</span>${state.screening ? next('Research the evidence','research') : btn(busy ? 'Screening CVs…' : 'Screen CVs','screen','', !state.approved || busy ? 'disabled' : '')}</div>
  </div>`;
}
function researchView() {
  const complete = state.sources.filter(s => s.enabled && s.status === 'Complete').length, enabled = state.sources.filter(s => s.enabled).length;
  return `${heading('<span class="orange-text">20 agents.</span><br>Research in parallel.', roleSelect())}
  ${!state.screening ? `<div class="notice"><b>Approve the criteria and screen the CVs.</b>${next('Go to criteria','criteria')}</div>` : ''}
  <div class="research-layout"><section><div class="section-head"><h2>Sources</h2><span class="token">Simulated research</span></div><div class="sources">${state.sources.map(s => {
    const source = SOURCES.find(x => x[0] === s.id);
    return `<div class="source ${s.status === 'Complete' ? 'complete' : s.status === 'Researching' ? 'working' : s.status === 'Needs access' ? 'failed' : ''}"><div class="source-top"><span class="source-mark">${source[2]}</span><input type="checkbox" aria-label="Use ${source[1]}" data-source="${s.id}" ${s.enabled ? 'checked' : ''} ${busy ? 'disabled' : ''}></div><span class="source-name">${source[1]}</span><span class="source-state ${s.status === 'Needs access' ? 'error' : ''}">${s.enabled ? esc(s.status) : 'Disconnected'}</span>${s.status === 'Needs access' ? btn('Retry','retry-source','outline compact',`data-source="${s.id}" ${busy ? 'disabled' : ''}`) : ''}</div>`;
  }).join('')}</div></section>
  <section class="research-center"><h2>${num(screeningPool(state).length)} candidates</h2><div class="agent-ring ${busy ? 'running' : ''}"><div class="agent-dots">${Array.from({length:20},(_,i) => `<i style="--x:${Math.cos(i*Math.PI/10)*95}px;--y:${Math.sin(i*Math.PI/10)*95}px"></i>`).join('')}</div><img src="./logo.svg" alt="Sauce"></div>
    <div class="evidence-feed"><div><span class="tick">${complete > 2 ? '✓' : '→'}</span> Research evidence</div><div><span class="tick">${complete > 4 ? '✓' : '→'}</span> Public trail</div><div><span class="tick">${complete > 6 ? '✓' : '→'}</span> Evaluation results</div></div>
    <div class="status-line" role="status">${complete} / ${enabled} sources complete</div>
    ${state.researched ? `<div class="approved-mark">✓ Research complete</div>${next('See the decisions','decisions')}${btn('Run again','research','outline', busy ? 'disabled' : '')}` : btn(busy ? 'Research in progress…' : 'Run research','research','orange', !state.screening || busy || !enabled ? 'disabled' : '')}
  </section></div>`;
}
function decisionsView() {
  if (!state.researched) return `${heading('Three decisions.', roleSelect())}<div class="empty"><img src="./logo.svg" alt="Sauce" width="68" height="68"><h2>Build the evidence.</h2>${btn(busy ? 'Research in progress…' : 'Run the sample demo','quick-demo','orange', busy ? 'disabled' : '')}${next('Review the criteria','criteria')}</div>`;
  const totals = counts(state), pool = screeningPool(state), filtered = pool.filter(c => evaluate(c,state) === state.bucket && c.name.toLowerCase().includes(state.query.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length/10)); state.page = Math.min(state.page,pageCount);
  const slice = filtered.slice((state.page-1)*10, state.page*10);
  return `${heading('Three decisions.', `${roleSelect()}${btn('Export shortlist','export')}`)}
  <div class="decision-tabs" role="tablist" aria-label="Candidate decisions">${Object.entries(BUCKETS).map(([key,label]) => `<button class="decision-tab ${state.bucket === key ? 'active' : ''}" role="tab" aria-selected="${state.bucket===key}" data-action="bucket" data-bucket="${key}"><span class="metric">${num(totals[key])}</span><strong>${label}</strong></button>`).join('')}</div>
  <div class="decision-tools"><h2>${BUCKETS[state.bucket]}</h2><div class="search-tools"><input class="field" placeholder="Find a candidate" aria-label="Find a candidate" id="candidate-search" value="${esc(state.query)}"><span>${num(filtered.length)} candidates</span></div></div>
  <div class="table-scroll"><table class="candidate-table"><thead><tr><th>Candidate</th><th>Research evidence</th><th>Public trail</th><th>Real-robot work</th><th>Decision</th></tr></thead><tbody>${slice.map((c,i) => `<tr><td><div class="person"><span class="avatar">${esc(c.name.replace('Dr. ','')[0])}</span>${esc(c.name)}</div></td>${[['research','Paper'],['code','GitHub'],['robots','Evaluation']].map(([id,label]) => `<td><div class="evidence-cell">${tick(criterionState(c,{id},state))}<button class="source-button" data-action="evidence" data-id="${c.id}" data-evidence="${id}">${label}</button></div></td>`).join('')}<td>${btn(state.selected.includes(c.id) ? 'Selected ✓' : 'Review','review','orange compact',`data-id="${c.id}"`)}</td></tr>`).join('')}</tbody></table></div>
  ${!slice.length ? '<div class="empty"><h3>No matching candidates.</h3></div>' : ''}
  <div class="footer-action">${pageCount > 1 ? `<div class="pagination">${btn('Previous','page','outline compact',`data-page="${state.page-1}" ${state.page===1?'disabled':''}`)}<span>Page ${state.page} / ${pageCount}</span>${btn('Next','page','outline compact',`data-page="${state.page+1}" ${state.page===pageCount?'disabled':''}`)}</div>` : '<span></span>'}${btn(`Select interviews <span class="arrow">→</span>`,'interviews')}</div>
  ${state.selected.length ? `<div class="footer-action"><div class="selected-tray">${state.selected.map(id => {const c=pool.find(x=>x.id===id);return c?`<span class="selected-pill">${esc(c.name)}<button aria-label="Remove ${esc(c.name)}" data-action="deselect" data-id="${id}">×</button></span>`:''}).join('')}</div></div>` : ''}`;
}
function flywheelView() {
  const selected = candidates(state).filter(c => state.selected.includes(c.id));
  return `${heading('Data <span class="orange-text">flywheel.</span>',btn('Export decisions','export','outline'))}
  <div class="flywheel-layout"><section><h2>Hiring outcomes</h2>${selected.length ? `<div class="event-list">${selected.map(c => `<div class="event-row"><h3>${esc(c.name)}</h3><select aria-label="Outcome for ${esc(c.name)}" data-outcome="${c.id}">${['Interview selected','Interviewed','Offered','Accepted','Hired','Declined'].map(o => `<option ${o===(state.outcomes[c.id]||'Interview selected')?'selected':''}>${o}</option>`).join('')}</select></div>`).join('')}</div>` : `<div class="empty" style="margin-top:25px"><h3>Select the people to interview.</h3>${next('See candidates','decisions')}</div>`}
  ${state.learning.length ? `<div class="hypothesis"><h3>${esc(state.learning[state.learning.length-1].name.replace('Dr. ','').split(' ')[0])} joined.</h3><div class="tokens">${state.learning.map(l => `<span class="token mint">${esc(l.name)}</span>`).join('')}</div><div class="footer-action">${btn('Refine the next search','refine','orange')}</div></div>` : ''}
  </section><section><div class="flywheel ${state.learning.length ? 'spinning' : ''}"><div class="wheel-path"></div><span class="wheel-label top">Hire</span><span class="wheel-label right">Observe</span><span class="wheel-label bottom">Learn</span><span class="wheel-label left">Refine</span><img src="./logo.svg" alt="Sauce"></div><div class="tokens" style="justify-content:center"><span class="token mint">${state.learning.length} new outcomes</span><span class="token peach">${state.researchRun} research runs</span></div></section></div>
  ${state.history.length ? `<div class="timeline">${state.history.slice(0,6).map(h=>`<p>${esc(h.text)}</p>`).join('')}</div>` : ''}`;
}

function openModal(type, extra = {}) { lastFocus = document.activeElement; modal = { type,...extra }; renderModal(); setTimeout(() => overlay.querySelector('button,input,select')?.focus(),0); }
function closeModal() { modal = null; overlay.innerHTML = ''; document.body.style.overflow = ''; main.inert = false; document.querySelector('.header').inert = false; lastFocus?.focus(); }
function modalFrame(title, body, small = false) { return `<div class="modal-backdrop"><section class="modal ${small?'small':''}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal-head"><h2 id="dialog-title">${title}</h2><button class="close-button" data-action="close" aria-label="Close">×</button></div>${body}</section></div>`; }
function reviewBody(c) {
  const decision = evaluate(c,state), selected = state.selected.includes(c.id);
  return `<span class="review-status">${BUCKETS[decision]}</span><div class="review-layout"><div class="claim"><h3>Claim</h3><blockquote>“${esc(c.claim)}”</blockquote><div class="footer-action">${btn('View CV','evidence','outline compact',`data-id="${c.id}" data-evidence="cv"`)}</div></div><div><h3>Your criteria</h3>${state.criteria.filter(x=>x.enabled).map(cr => `<div class="evidence-review"><h3>${tick(criterionState(c,cr,state))}${esc(cr.label)}</h3><button class="source-button" data-action="evidence" data-id="${c.id}" data-evidence="${cr.id}">${({research:'Research paper',code:'Public trail',robots:'Evaluation results',authorization:'Applicant declaration'})[cr.id]||'Evidence gap'}</button></div>`).join('')}</div></div>
  <div class="notes"><label class="label" for="review-note">Interview notes</label><textarea id="review-note" class="field" data-note="${c.id}">${esc(state.notes[c.id]||'')}</textarea></div>
  <div class="review-actions"><label class="label" style="margin:0" for="decision-override">Your decision</label><select id="decision-override" data-decision="${c.id}">${Object.entries(BUCKETS).map(([key,val])=>`<option value="${key}" ${key===decision?'selected':''}>${val}</option>`).join('')}</select>${btn(selected?'Remove interview':'Select interview',selected?'deselect':'select','orange',`data-id="${c.id}"`)}${btn('Next candidate','next-review','outline',`data-id="${c.id}"`)}</div>`;
}
function evidenceBody(c,id) {
  const titles = {research:'Research paper',code:'Public trail',robots:'Evaluation results',authorization:'Applicant declaration',cv:'CV'};
  let body;
  if(id==='cv') body=`<h3>${esc(c.role)}</h3><p>${esc(c.cv)}</p><p>Research focus: ${esc(c.focus)}</p>`;
  else if(id==='research') body=`<h3>${esc(c.paper)}</h3><div class="definition"><b>Authorship</b><span>${esc(c.contribution)}</span></div><div class="definition"><b>Source</b><span>arXiv + OpenReview</span></div><div class="definition"><b>Evidence</b><span>${criterionState(c,{id},state)==='meets'?'First-author action-generating RL / VLA research. The candidate owns the policy method and evaluation.':criterionState(c,{id},state)==='unknown'?'Individual contribution still needs verification. Ask which policy and evaluation choices the candidate owned.':'The submitted research describes offline prediction, rather than action-generating robot policies.'}</span></div>`;
  else if(id==='code') body=`<h3>robot-policy-lab / action-policy</h3><div class="definition"><b>Source</b><span>GitHub + Hugging Face</span></div><div class="definition"><b>Ownership</b><span>${c.code===true?'Maintainer. Training code, checkpoints, and reproduction guide.':c.code===null?'Public ownership is not established. Ask for a work sample.':'The supplied repository contains analysis notebooks, without an implemented action policy.'}</span></div><div class="definition"><b>Reproduction</b><span>${c.code===true?'Training configuration and benchmark runs are included.':'Not established.'}</span></div>`;
  else if(id==='robots') body=`<h3>Physical robot evaluation</h3><div class="definition"><b>Source</b><span>Lab page + portfolio</span></div><div class="definition"><b>Result</b><span>${esc(c.benchmark)}</span></div><div class="definition"><b>Verification</b><span>${c.robots===true?'Video trials and the evaluation protocol support physical robot testing.':c.robots===null?'Physical robot results need verification. Request the evaluation protocol.':'The supplied evaluation uses simulation only.'}</span></div>`;
  else if(id==='authorization') body=`<h3>Work authorization</h3><p>${c.authorization===true?'The fictional applicant declared US work authorization.':c.authorization===false?'The fictional applicant declared no current US work authorization.':'No declaration supplied. Ask the candidate.'}</p>`;
  else body='<h3>No evidence mapped to this criterion.</h3><p>Review this requirement in the interview.</p>';
  return `<div class="tokens"><span class="token peach">Sample evidence</span><span class="token">${esc(c.name)}</span></div><div class="snapshot stack">${body}</div><div class="split-actions">${btn('Back to review','review','outline',`data-id="${c.id}"`)}${btn('Select interview','select','orange',`data-id="${c.id}" ${state.selected.includes(c.id)?'disabled':''}`)}</div>`;
}
function interviewsBody() {
  const pool=screeningPool(state), options=pool.filter(c=>evaluate(c,state)==='interview');
  return `<div class="section-head"><span class="token peach">${state.selected.length} / ${state.role.limit} selected</span>${btn('Select top candidates','auto-select','outline')}</div><div class="event-list">${options.map(c=>`<div class="event-row"><div class="person"><span class="avatar">${esc(c.name.replace('Dr. ','')[0])}</span>${esc(c.name)}</div>${btn(state.selected.includes(c.id)?'Selected ✓':'Select',state.selected.includes(c.id)?'deselect':'select',state.selected.includes(c.id)?'outline':'orange',`data-id="${c.id}"`)}</div>`).join('')}</div>${!options.length?'<h3>No candidates meet the required evidence.</h3>':''}<div class="footer-action">${btn('Export shortlist','export','outline')}${btn('Record outcomes','navigate','',`data-view="flywheel"`)}</div>`;
}
function renderModal() {
  main.inert = !!modal; document.querySelector('.header').inert = !!modal;
  if (!modal) { overlay.innerHTML='';document.body.style.overflow=''; return; }
  document.body.style.overflow='hidden'; const c=candidates(state).find(x=>x.id===modal.id);
  if(modal.type==='review' && c) overlay.innerHTML=modalFrame(`Review the fit.<br><span class="orange-text">${esc(c.name)}</span>`,reviewBody(c));
  else if(modal.type==='evidence' && c) overlay.innerHTML=modalFrame(({research:'Research paper',code:'Public trail',robots:'Evaluation results',authorization:'Applicant declaration',cv:'CV'})[modal.evidence]||'Evidence',evidenceBody(c,modal.evidence),true);
  else if(modal.type==='interviews') overlay.innerHTML=modalFrame('Meet the right people.',interviewsBody());
  else if(modal.type==='role') overlay.innerHTML=modalFrame('Create a role.',`<form id="role-form" class="dialog-form"><div><label class="label" for="role-title">Role title</label><input class="field wide" id="role-title" name="title" value="${esc(state.role.title)}" required maxlength="80"></div><div><label class="label" for="role-focus">Research focus</label><input class="field wide" id="role-focus" name="focus" value="${esc(state.role.focus)}" required maxlength="100"></div><div><label class="label" for="role-level">Seniority</label><select class="field wide" name="level" id="role-level">${['Junior','Mid-level','Senior','Principal'].map(l=>`<option ${l===state.role.level?'selected':''}>${l}</option>`).join('')}</select></div><button class="button orange" type="submit">Save role</button></form>`,true);
  else if(modal.type==='history') {
    const records=state.importedHistory||seedHistory(), page=modal.page||1, pages=Math.ceil(records.length/20);
    overlay.innerHTML=modalFrame('Hiring history.',`<span class="token peach">${num(records.length)} ${state.importedHistory?'imported records':'sample records'}</span><div class="table-scroll history-table"><table class="criteria-table"><thead><tr><th>Name</th><th>Outcome</th><th>Evidence</th></tr></thead><tbody>${records.slice((page-1)*20,page*20).map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.outcome||'Unknown')}</td><td>${esc(r.skills||'Not supplied')}</td></tr>`).join('')}</tbody></table></div><div class="footer-action"><span>Page ${page} / ${pages}</span><div class="button-row">${btn('Previous','history-page','outline',`data-page="${page-1}" ${page===1?'disabled':''}`)}${btn('Next','history-page','outline',`data-page="${page+1}" ${page===pages?'disabled':''}`)}</div></div>`,false);
  } else if(modal.type==='reset') overlay.innerHTML=modalFrame('Reset the demo?',`<div class="stack"><h3>Clear demo imports, selections and notes.</h3><div class="button-row">${btn('Keep changes','close','outline')}${btn('Reset demo','confirm-reset','orange')}</div></div>`,true);
  else if(modal.type==='criterion') overlay.innerHTML=modalFrame('Add a criterion.',`<form id="criterion-form" class="dialog-form"><div><label class="label" for="criterion-label">Criterion</label><input class="field wide" name="label" id="criterion-label" required maxlength="100"></div><div><label class="label" for="criterion-dimension">Dimension</label><select name="dimension" id="criterion-dimension" class="field wide"><option>Expertise</option><option>Problem solving</option><option>Interpersonal skills</option></select></div><button class="button orange" type="submit">Add criterion</button></form>`,true);
  setTimeout(() => overlay.querySelector('button,input,select')?.focus(),0);
}
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function screenCVs() { if(busy||!state.approved)return; busy=true;render();await delay(1100);state.screening=true;log(`${num(candidates(state).length)} CVs reviewed. ${num(screeningPool(state).length)} passed the initial criteria.`);busy=false;save();render();toast('CV screening complete.'); }
async function runResearch() {
  if(busy||!state.screening||!state.sources.some(s=>s.enabled))return;
  busy=true;state.researched=false;state.view='research';state.sources.forEach(s=>s.status=s.enabled?'Queued':'Disconnected');save();render();
  const enabled=state.sources.filter(s=>s.enabled);
  for(let i=0;i<enabled.length;i+=3){
    const batch=enabled.slice(i,i+3);batch.forEach(s=>s.status='Researching');render();await delay(800);
    batch.forEach(s=>s.status=s.id==='linkedin'?'Needs access':'Complete');render();await delay(200);
  }
  state.researched=true;state.researchRun++;log(`${num(screeningPool(state).length)} fictional candidates researched across ${enabled.length} sample sources.`);busy=false;save();render();toast('Research complete. Review the evidence.');
}
function download(filename,data,type='application/json') { const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function exportShortlist() {
  if(!state.researched){toast('Run research before exporting.');return;}
  const pool=screeningPool(state), ids=state.selected.length?state.selected:pool.filter(c=>evaluate(c,state)==='interview').slice(0,state.role.limit).map(c=>c.id);
  download('Sauce-shortlist.json',{demo:true,role:state.role,criteria:state.criteria.filter(c=>c.enabled),selected:pool.filter(c=>ids.includes(c.id)).map(c=>({name:c.name,decision:BUCKETS[evaluate(c,state)],claim:c.claim,evidence:state.criteria.filter(x=>x.enabled).map(x=>({criterion:x.label,status:criterionState(c,x,state)})),notes:state.notes[c.id]||'',outcome:state.outcomes[c.id]||'Not recorded'})),counts:counts(state),history:state.history});toast('Shortlist exported.');
}
function selectCandidate(id) {
  if(state.selected.includes(id))return;
  if(state.selected.length>=state.role.limit){toast(`Select at most ${state.role.limit} candidates for this role.`);return;}
  state.selected.push(id);state.outcomes[id]='Interview selected';const c=candidates(state).find(x=>x.id===id);log(`${c.name}: interview selected.`);save();render();toast('Interview selected.');
}
function upload(kind) {
  if(busy){toast('Wait for research to finish.');return;}
  const input=document.createElement('input');input.type='file';input.accept='.csv,.json';input.className='file-input';document.body.append(input);
  input.onchange=async()=>{const file=input.files[0];if(!file)return;try{if(file.size>3000000)throw new Error('Use a file smaller than 3 MB.');const text=await file.text(),rows=parseFile(text,file.name);
    if(kind==='history'){if(!rows.every(r=>typeof r.name==='string'))throw new Error('Every record needs a name.');state.importedHistory=rows.map(r=>({name:clean(r.name).slice(0,120),outcome:clean(r.outcome).slice(0,60),skills:clean(r.skills).slice(0,1000)}));state.hypothesis=false;invalidate();}
    else{state.imported=normalizeCandidates(rows);state.screening=false;state.researched=false;state.decisions={};state.selected=[];state.outcomes={};state.page=1;}
    log(`${rows.length} ${kind==='history'?'history records':'candidate CVs'} imported.`);save();render();toast(`${rows.length} records imported.`);
  }catch(err){toast(`Import failed: ${err.message}`);}finally{input.remove();}};input.oncancel=()=>input.remove();input.click();
}
document.addEventListener('click',async event=>{
  const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
  const action=target.dataset.action,id=target.dataset.id;
  if(action==='navigate'){state.view=target.dataset.view;modal=null;save();render();main.focus();window.scrollTo(0,0);}
  else if(action==='close')closeModal();
  else if(action==='new-role')openModal('role');
  else if(action==='add-criterion')openModal('criterion');
  else if(action==='history')openModal('history');
  else if(action==='history-page'){modal.page=Number(target.dataset.page);renderModal();overlay.querySelector('.modal').scrollTop=0;}
  else if(action==='reset') {if(busy){toast('Wait for research to finish.');return;}openModal('reset');}
  else if(action==='confirm-reset'){state=newState();modal=null;save();render();toast('Demo reset.');}
  else if(action==='hypothesis'){
    if(busy){toast('Wait for research to finish.');return;}
    {
      const hires=(state.importedHistory||seedHistory()).filter(r=>/hired|joined/i.test(r.outcome));
      if(!hires.length){toast('Add history records with a Hired outcome.');return;}
      const skills=hires.map(r=>r.skills).join(' ');
      const signals=[['research',/RL|VLA|research|paper|first.author/i],['code',/code|github|model|benchmark|reproduc/i],['robots',/robot|physical|deploy/i]];
      signals.forEach(([id,pattern])=>{const criterion=state.criteria.find(c=>c.id===id);if(criterion)criterion.required=pattern.test(skills);});
      invalidate();
    }
    state.hypothesis=true;log('A role hypothesis was drafted from the labeled hiring history.');save();render();toast('Criteria drafted.');
  }
  else if(action==='approve'){if(!state.criteria.some(c=>c.enabled)){toast('Enable at least one criterion.');return;}state.approved=true;log('Hiring criteria approved by the demo manager.');save();render();}
  else if(action==='screen')await screenCVs();
  else if(action==='research')await runResearch();
  else if(action==='quick-demo'){state.approved=true;state.screening=true;await runResearch();state.view='decisions';save();render();}
  else if(action==='retry-source'){const s=state.sources.find(x=>x.id===target.dataset.source);if(!s)return;s.status='Researching';render();await delay(800);s.status='Complete';save();render();toast('Sample connection restored.');}
  else if(action==='bucket'){state.bucket=target.dataset.bucket;state.page=1;state.query='';save();render();}
  else if(action==='page'){state.page=Number(target.dataset.page);save();render();}
  else if(action==='review')openModal('review',{id});
  else if(action==='evidence')openModal('evidence',{id,evidence:target.dataset.evidence});
  else if(action==='select')selectCandidate(id);
  else if(action==='deselect'){state.selected=state.selected.filter(x=>x!==id);delete state.outcomes[id];state.learning=state.learning.filter(l=>l.id!==id);save();render();toast('Interview removed.');}
  else if(action==='next-review'){const list=screeningPool(state).filter(c=>evaluate(c,state)===state.bucket);const index=list.findIndex(c=>c.id===id);if(list.length)openModal('review',{id:list[(index+1)%list.length].id});}
  else if(action==='interviews')openModal('interviews');
  else if(action==='auto-select'){state.selected=screeningPool(state).filter(c=>evaluate(c,state)==='interview').slice(0,state.role.limit).map(c=>c.id);state.selected.forEach(id=>state.outcomes[id]||='Interview selected');save();render();toast(`${state.selected.length} interviews selected.`);}
  else if(action==='export')exportShortlist();
  else if(action==='upload-history')upload('history');
  else if(action==='upload-candidates')upload('candidates');
  else if(action==='sample-history')download('Sauce-history-example.json',[{name:'Dr. Aria Stone',outcome:'Hired',skills:'RL policies, physical robots, open-source code'},{name:'Dr. James Lin',outcome:'Hired',skills:'VLA methods, reproducible research'},{name:'Dr. Nina Shah',outcome:'Not selected',skills:'Simulation-only research'}]);
  else if(action==='sample-candidates')download('Sauce-candidates-example.json',candidates(newState()).slice(0,8).map(({id,...c})=>({...c,cvfit:c.cvFit,contribution:c.contribution})));
  else if(action==='seed-pool'){state.imported=null;state.screening=false;state.researched=false;state.selected=[];state.decisions={};state.outcomes={};save();render();toast('2,400 sample CVs loaded.');}
  else if(action==='refine'){state.hypothesis=true;state.approved=false;state.screening=false;state.researched=false;state.view='criteria';state.context.process=`Review supporting evidence. Interview at most ${state.role.limit} people. ${state.learning.length} new hiring outcomes inform the next search. Verify ownership and physical robot results in the interview.`;log('New hiring outcomes added to the next role hypothesis. Human approval is required.');save();render();toast('Hiring outcomes added to the next search.');}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.context){state.context[el.dataset.context]=clean(el.value);save();}
  if(el.dataset.note){state.notes[el.dataset.note]=clean(el.value);save();}
  if(el.id==='candidate-search'){const position=el.selectionStart;state.query=el.value;state.page=1;render();const field=document.querySelector('#candidate-search');field?.focus();field?.setSelectionRange(position,position);}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.change==='preset'){if(busy){render();toast('Wait for research to finish.');return;}if(el.value==='custom'){openModal('role');return;}state.preset=el.value;state.role={...PRESETS[el.value]};invalidate();log(`Role changed to ${state.role.title}.`);save();render();}
  if(el.dataset.criterion!==undefined){if(busy){render();toast('Wait for research to finish.');return;}const c=state.criteria[Number(el.dataset.criterion)];c[el.dataset.prop]=el.dataset.prop==='enabled'?el.checked:el.dataset.prop==='required'?el.value==='true':clean(el.value);invalidate();save();render();}
  if(el.dataset.source){state.sources.find(s=>s.id===el.dataset.source).enabled=el.checked;state.researched=false;save();render();}
  if(el.dataset.decision){state.decisions[el.dataset.decision]=el.value;if(el.value!=='interview'){state.selected=state.selected.filter(id=>id!==el.dataset.decision);delete state.outcomes[el.dataset.decision];}log(`${candidates(state).find(c=>c.id===el.dataset.decision).name}: manager decision changed to ${BUCKETS[el.value]}.`);save();render();}
  if(el.dataset.outcome){const id=el.dataset.outcome;state.outcomes[id]=el.value;const c=candidates(state).find(c=>c.id===id);state.learning=state.learning.filter(l=>l.id!==id);if(el.value==='Hired')state.learning.push({id,name:c.name,criteria:state.criteria.filter(x=>x.enabled).map(x=>x.label)});log(`${c.name}: ${el.value.toLowerCase()}.`);save();render();toast('Hiring outcome recorded.');}
});
document.addEventListener('submit',event=>{
  if(event.target.id==='role-form'){event.preventDefault();if(busy){toast('Wait for research to finish.');return;}const form=new FormData(event.target),level=form.get('level');state.role={title:clean(form.get('title')).trim(),focus:clean(form.get('focus')).trim(),level,limit:level==='Junior'?2:level==='Mid-level'?3:5};state.preset='custom';invalidate();state.view='criteria';modal=null;log(`New role created: ${state.role.title}.`);save();render();toast('Role saved.');}
  if(event.target.id==='criterion-form'){event.preventDefault();const form=new FormData(event.target);state.criteria.push({id:`custom-${Date.now()}`,label:clean(form.get('label')),dimension:form.get('dimension'),required:false,enabled:true});invalidate();modal=null;save();render();toast('Criterion added. Evidence remains unknown until review.');}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&modal)closeModal();
  if(event.key==='Tab'&&modal){const focusables=[...overlay.querySelectorAll('button:not(:disabled),input,select,textarea,a[href]')];const first=focusables[0],last=focusables[focusables.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
});
overlay.addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeModal();});
render();
