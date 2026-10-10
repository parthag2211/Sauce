import { liveRequest as api, uploadRecording } from './api.mjs';
import { captureVoice } from './portal-voice.mjs';
import { questions as defaultQuestions } from './seed.mjs';
const root=document.querySelector('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={plus:'<path d="M12 5v14M5 12h14"/>',person:'<circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/>',people:'<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M17 3a4 4 0 0 1 0 8m5 10v-2a4 4 0 0 0-3-4"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',back:'<path d="M19 12H5m6-6-6 6 6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>'};
const icon=(name,size=22)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
let role=new URLSearchParams(location.search).get('role')==='applicant'?'applicant':'manager';
let account=null,voiceProvider=null,state=null,screen='home',busy=false,signUp=false,selected=null,selectedJob=null,answerIndex=0,answers=[],posting=null,recording=null,recordTarget=null,storyOpen=false,importPreview=null;
const pendingAudio=new Map(),audioUrls=[];
const emptyJob=()=>({id:null,title:'',team:'',seniority:'',jobDescription:'',managerVision:{audio:null,reviewedTranscript:''},questions:{forApplicants:structuredClone(defaultQuestions)},applications:[],history:{previousApplicants:[]}});
const opp=()=>state?.opportunities.find(o=>o.id===selectedJob)||state?.opportunities[0]||emptyJob();
const person=()=>state.applicants[0];
const org=()=>state?.organizations.find(o=>o.id===opp().organizationId)||state?.organizations[0]||{name:'',organizationMarkdown:'',version:0};
const items=()=>[...(opp().applications||[]),...(opp().history?.previousApplicants||[]).map(p=>({...p,isHistorical:true,submittedProfile:p.profile,voiceAnswers:[],tag:'Previous pool'}))].sort((a,b)=>(b.assessment?.overall??-1)-(a.assessment?.overall??-1));
const initials=name=>name?.split(' ').map(n=>n[0]).slice(0,2).join('')||'✳';
function notify(message){const e=document.querySelector('#toast');e.textContent=message;e.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>e.classList.remove('show'),6000);}
const button=(label,action,cls='primary',disabled=false)=>`<button type="button" class="${cls}" data-action="${action}" ${cls==='back-button'?'aria-label="Back"':''} ${action.startsWith('record:')?`aria-label="${recording?'Stop recording':'Record voice note'}"`:''} ${action.startsWith('role:')?`aria-pressed="${role===action.slice(5)}"`:''} ${disabled||busy?'disabled':''}>${label}</button>`;
const field=(label,name,value,area=false,rows=3,type='text')=>`<label class="field"><span>${label}</span>${area?`<textarea rows="${rows}" data-field="${name}">${esc(value)}</textarea>`:`<input type="${type}" data-field="${name}" value="${esc(value)}">`}</label>`;
const heading=(text,sub='')=>`<div class="headline"><h1>${text}</h1>${sub?`<p>${sub}</p>`:''}</div>`;
const back=(title,target='home')=>`<div class="screen-nav">${button(icon('back'),'go:'+target,'back-button')}<span>${title}</span><span class="tiny-star">✳</span></div>`;
const file=(label,target)=>`<label>${label}<input type="file" data-upload="${target}" accept=".md,.txt"></label>`;
const recordingNote=()=>`<p class="gentle-note">Saved privately in Sauce.${voiceProvider?` ${esc(voiceProvider)} transcribes your recording.`:' Add your words after recording.'}</p>`;
const audioTag=audio=>audio?`<audio controls data-audio="${esc(audio.blobId)}"></audio>`:'';
const companyCard=()=>`<div class="company"><span class="company-letter">${esc(org().name.slice(0,1)||'✳')}</span><div><b>${esc(org().name)}</b><small>${esc(opp().title)}</small></div></div>`;
const empty=(title,note)=>`<div class="little-insight"><span>✳</span><p><b>${title}</b><br>${note}</p></div>`;
function auth(){
  return heading(signUp?'A little Sauce.<br><em>Your next chapter.</em>':'Good to have<br><em>you back.</em>','One account. Hire great people or find your next role.')+`<form id="auth-form">${signUp?'<label class="field"><span>Your name</span><input name="name" autocomplete="name" maxlength="100" required></label>':''}<label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required maxlength="254"></label><label class="field"><span>Password · at least 12 characters</span><input name="password" type="password" minlength="12" maxlength="256" autocomplete="${signUp?'new-password':'current-password'}" required></label><button class="primary full" ${busy?'disabled':''}>${busy?'One moment…':signUp?'Create my account':'Sign in'} ${icon('arrow',18)}</button></form>${button(signUp?'Already have an account? Sign in':'New here? Create an account','auth-mode','quiet full')}<p class="gentle-note">A hackathon prototype. Only the jobs you post are discoverable.<br>Your profile is shared with a manager when you apply.</p><a class="quiet full" href="/demo">Just exploring? Play the sample demo ↗</a>`;
}
function tile(symbol,title,sub,action,color){return button(`<span class="tile-icon ${color}">${icon(symbol,28)}</span><b>${title}</b><small>${sub}</small><span class="tile-arrow">↗</span>`,action,'action-tile');}
function home(){
  const manager=role==='manager',submitted=opp().applications?.find(a=>a.applicantId===account.id);
  return `<div class="greeting">${manager?'A LITTLE SAUCE GOES A LONG WAY.':`HEY, ${esc(person().name.split(' ')[0].toUpperCase())}.`}</div>`+heading(manager?'Find your next<br><em>great person.</em>':'Good work.<br><em>Your kind of people.</em>',manager?'Less paperwork. More conversation.':'Bring your story. Find your next chapter.')+`<div class="home-art" aria-hidden="true"><span class="art-bubble person-one">${icon(manager?'person':'star',36)}</span><span class="art-spark">✳</span><span class="art-bubble person-two">${icon(manager?'person':'search',36)}</span><span class="art-line">⤴</span></div><div class="action-grid">${manager?tile('plus','Post a job','Tell us who you need.','new-job','peach')+tile('people','Review applicants','Meet your next hire.','go:review','sage'):tile('person','My profile','What makes you, you.','go:profile','peach')+tile('search','Find jobs','Find a good fit.','go:jobs','sage')}</div>${manager?`<div class="home-context"><span class="live-dot"></span>${state.opportunities.length?`${state.opportunities.length} saved opening${state.opportunities.length===1?'':'s'}`:'Your next great hire starts here.'}</div>`:submitted?button('Your application · '+esc(submitted.status)+' ↗','go:submitted','home-context context-button'):'<p class="gentle-note">A few good questions. Answered in your own voice.</p>'}`;
}
function post(){
  return back('POST A JOB')+heading('Who’s your<br><em>next great hire?</em>')+field('Company','job.company',posting.company.name)+`<details class="profile-detail"><summary>A little about the company <span>+</span></summary>${field('Company brief','job.companyBrief',posting.company.organizationMarkdown,true)}<div class="file-links">${file('Add a company brief','organization')}</div></details>`+field('Role','job.title',posting.title)+`<div class="form-pair">${field('Team','job.team',posting.team)}${field('Level','job.seniority',posting.seniority)}</div>`+field('What will they work on?','job.jobDescription',posting.jobDescription,true,4)+`<div class="file-links">${file('Add a job brief','jd')}</div><div class="voice-note"><div><b>And the person behind the résumé?</b><p>Tell us what you’re really looking for.</p></div>${button(recordTarget==='vision'?'■':icon('mic'),'record:vision',recordTarget==='vision'?'mic-button recording':'mic-button')}</div>${audioTag(posting.managerVision.audio)}${posting.managerVision.audio?field('Your words · check them before posting','job.vision',posting.managerVision.reviewedTranscript,true):''}${recordingNote()}<details class="profile-detail"><summary>The three questions applicants will answer <span>+</span></summary>${posting.questions.map((q,i)=>field(`Question ${i+1}`,`question.${i}`,q.text,true,2)).join('')}</details>${button('Post job '+icon('arrow',18),'post','primary full',!!recording)}`;
}
function posted(){return back('YOUR OPENING')+`<div class="celebration"><div class="success-stamp">${icon('check',38)}</div>${heading('You’re open<br><em>for good people.</em>','Your opening is saved. Applicants can now find it.')}<div class="job-ticket">${companyCard()}<div class="ticket-rule"></div><span class="chip">${opp().questions.forApplicants.length} voice questions</span></div>${button('Meet your applicants '+icon('arrow',18),'go:review','primary full')}${button('See it as an applicant','role:applicant','quiet full')}</div>`;}
function review(){
  const all=items();
  return back('YOUR APPLICANTS')+heading('A few people<br><em>worth meeting.</em>','Review their experience and their own words.')+(state.opportunities.length>1?`<label class="field"><span>Opening</span><select data-select="opening">${state.opportunities.map(o=>`<option value="${o.id}" ${o.id===opp().id?'selected':''}>${esc(o.title)}</option>`).join('')}</select></label>`:'')+(opp().id?`<div class="role-chip"><span class="live-dot"></span>${esc(opp().title)}<small>${all.length} people</small></div>`:'')+`<div class="candidate-list">${all.map((a,i)=>button(`<span class="avatar avatar-${i%3}">${esc(initials(a.submittedProfile.name))}</span><span class="candidate-name"><b>${esc(a.submittedProfile.name)}</b><small>${a.isHistorical?'Previous pool · ':''}${esc(a.status)}</small></span><span class="match"><b>${a.assessment?.overall??'—'}</b><small>${a.assessment?.overall==null?'to review':'match'}</small></span><span class="candidate-arrow">›</span>`,`candidate:${a.id}`,'candidate-row')).join('')}</div>`+(!all.length?empty('A good story starts somewhere.',opp().id?'Share Sauce with an applicant. Their submitted application will appear here.':'Post your first opening to start meeting applicants.'):'')+(opp().id?button('Import a previous applicant pool','go:import','quiet full'):'')+(all.length?'<p class="gentle-note">Every story is ready for your review.<br>Automated matching is still being built.</p>':'');
}
function candidate(){
  const a=items().find(x=>x.id===selected);if(!a)return review();
  return back('MEET YOUR APPLICANT','review')+`<div class="candidate-hero"><span class="avatar big">${esc(initials(a.submittedProfile.name))}</span><h1>${esc(a.submittedProfile.name)}</h1><p>${esc(opp().title)} · ${esc(a.status)}</p></div><div class="story-card"><span class="label">THEIR BACKGROUND</span><p class="readable">${esc(a.submittedProfile.credentials||'Resume text has not been extracted.')}</p></div>${a.isHistorical?'':button(`${icon('mic',20)} Their story ${storyOpen?'−':'+'}`,'story','story-button')}${storyOpen?`<div class="story-transcript">${a.voiceAnswers.map((v,i)=>`<span class="label">QUESTION ${i+1}</span><p>${esc(opp().questions.forApplicants[i]?.text)}</p>${audioTag(v.audio)}<p>${esc(v.reviewedTranscript)}</p>`).join('')}</div>`:''}<details class="profile-detail"><summary>Work preferences & contact <span>+</span></summary><p>${esc(a.submittedProfile.workProposal)}</p><p>${esc(Object.values(a.submittedProfile.contactInformation||{}).filter(Boolean).join('\n'))}</p><p>${esc((a.submittedProfile.references||[]).join('\n'))}</p></details><details class="profile-detail"><summary>Recorded hiring stages <span>+</span></summary><p>${a.outcomeHistory?.length?a.outcomeHistory.map(e=>`${esc(e.sourceStage||e.stage)}${e.at?' · '+esc(new Date(e.at).toLocaleDateString()):''}`).join('<br>'):'No stage history supplied.'}</p></details>${a.isHistorical?empty('Imported history','These records preserve the stages supplied in your export.'):button(a.status==='shortlisted'?'Shortlisted '+icon('check',18):'Let’s meet '+icon('arrow',18),'shortlist','primary full',a.status==='shortlisted')}`;
}
function profile(){return back('MY PROFILE')+heading('Your story.<br><em>In a nutshell.</em>')+field('Your name','person.name',person().name)+field('Your background','person.credentials',person().credentials,true,4)+`<div class="file-links">${file('Add background from a text brief','credentials')}</div>`+field('What work are you open to?','person.workProposal',person().workProposal,true)+field('Email','contact.email',person().contactInformation.email,false,3,'email')+`<details class="profile-detail"><summary>LinkedIn, phone & references <span>+</span></summary>${field('LinkedIn','contact.linkedin',person().contactInformation.linkedin,false,3,'url')}${field('Phone','contact.phone',person().contactInformation.phone)}${field('References','person.references',person().references.join('\n'),true,2)}</details>${button('Save my profile '+icon('check',18),'save-profile','primary full')}`;}
function jobs(){
  const jobs=state.opportunities.filter(o=>o.status==='open');
  return back('FIND YOUR NEXT ROLE')+heading('A new chapter<br><em>looks good on you.</em>','Real openings, posted by the people using Sauce.')+jobs.map(o=>{const company=state.organizations.find(c=>c.id===o.organizationId);return `<div class="discovery-card"><div class="job-card-top"><span class="company-letter">${esc(company?.name.slice(0,1))}</span><span class="chip peach-chip">${esc(o.seniority||'Open role')}</span></div><p class="company-name">${esc(company?.name)}</p><h2>${esc(o.title)}</h2><p class="job-description clamp">${esc(o.jobDescription)}</p><div class="job-tags"><span>${esc(o.team||'Team to discuss')}</span></div><div class="job-rule"></div><div class="application-promise">${icon('mic',20)}<span>${o.questions.forApplicants.length} questions. Your own voice.</span></div>${button(o.applications.some(a=>a.applicantId===account.id)?'View my application':'Tell them your story '+icon('arrow',18),`job:${o.id}`,'primary full')}</div>`;}).join('')+(!jobs.length?empty('Your next chapter is on its way.','No openings have been posted yet. Come back after a manager posts a job.'):'');
}
function answerPage(){
  const q=opp().questions.forApplicants[answerIndex],a=answers[answerIndex]||{},active=recordTarget===`answer-${answerIndex}`;
  return back('YOUR VOICE, YOUR STORY','jobs')+`<div class="answer-progress"><span>0${answerIndex+1} / 0${opp().questions.forApplicants.length}</span><div>${opp().questions.forApplicants.map((_,i)=>`<i class="${i<=answerIndex?'filled':''}"></i>`).join('')}</div></div><h1 class="question-title">${esc(q.text)}</h1><div class="record-space">${button(active?'■':icon('mic',34),`record:answer-${answerIndex}`,active?'record-orb recording':'record-orb')}<p>${active?'Tap to finish. Take your time.':a.audio?'Your recording is ready.':'Tap to talk. Take your time.'}</p>${audioTag(a.audio)}</div>${recordingNote()}${a.audio?field('Your words · check them before sending','answer.text',a.reviewedTranscript||'',true,4):''}<div class="answer-bottom">${button(answerIndex===opp().questions.forApplicants.length-1?'Send application '+icon('arrow',18):'Next question '+icon('arrow',18),'next-answer','primary full',!!recording)}${answerIndex>0?button('Previous question','previous-answer','quiet full',!!recording):''}</div>`;
}
function submitted(){const a=opp().applications.find(a=>a.applicantId===account.id);return back('YOUR APPLICATION')+`<div class="celebration"><div class="success-stamp">${icon('check',38)}</div>${heading('Story told.<br><em>Door opened.</em>','Your application is saved and shared with this hiring manager.')}<div class="job-ticket">${companyCard()}<div class="ticket-rule"></div><span class="chip">${esc(a?.status||'Submitted')}</span><span class="chip">${a?.voiceAnswers.length||0} answers shared</span></div>${button('Find more jobs','go:jobs','primary full')}${button('Back to my home','go:home','quiet full')}</div>`;}
function imports(){return back('PREVIOUS APPLICANTS','review')+heading('Bring the<br><em>previous chapter.</em>','Preview your CSV or JSON export before saving it.')+`<label class="field"><span>Applicant pool · CSV or JSON · up to 1,000 records</span><input type="file" data-upload="pool" accept=".csv,.json"></label><p class="gentle-note">Include name, resume_text (or credentials), and stage.<br>Optional: email, LinkedIn, phone, work_proposal and outcome_history.</p>${importPreview?`<div class="story-card"><h2>${importPreview.count} applicants ready to review</h2>${importPreview.warnings.map(w=>`<p>${esc(w)}</p>`).join('')}</div><div class="import-list">${importPreview.applicants.map(a=>`<div class="import-row"><b>${esc(a.name)}</b><small>${esc(a.outcomeHistory.map(e=>e.sourceStage||e.stage).join(' → ')||'No recorded stage')}</small><p>${esc(a.resumePreview)}</p></div>`).join('')}</div>${button(`Save ${importPreview.count} reviewed applicants`,'commit-import','primary full')}`:empty('No records are imported automatically.','Shortlisted, offered, accepted and hired stay distinct. Resume links are retained without claiming the text has been extracted.')}`;}
function render(){
  audioUrls.forEach(URL.revokeObjectURL);audioUrls.length=0;
  const views={home,post,posted,review,candidate,profile,jobs,answers:answerPage,submitted,import:imports};
  root.innerHTML=`<main id="main" class="stage"><div class="game"><header class="game-header"><a class="brand" href="/" aria-label="Sauce home"><img src="/favicon.svg" alt="" width="30" height="30">sauce<span>✳</span></a><span class="demo-badge">LIVE</span></header>${account?`<div class="mode-switch" aria-label="Choose your role">${button('I’m hiring','role:manager',role==='manager'?'mode selected':'mode',!!recording)}${button('I’m applying','role:applicant',role==='applicant'?'mode selected':'mode',!!recording)}</div>`:''}<div class="screen">${account&&state?views[screen]():auth()}</div><footer class="game-footer"><span class="footer-star">✳</span>${busy?'Saving…':account?'Your work, saved privately.':'A little more human.'}${account?button('Sign out','logout','footer-signout',!!recording):''}</footer></div><a class="about-link" href="/">Back to Sauce ↗</a></main>`;
  root.querySelectorAll('[data-audio]').forEach(async el=>{try{const id=el.dataset.audio;let blob=pendingAudio.get(id);if(!blob){const response=await fetch(`/api/v1/voice/${encodeURIComponent(id)}`,{credentials:'same-origin'});if(!response.ok)throw new Error();blob=await response.blob();}if(!el.isConnected)return;const url=URL.createObjectURL(blob);audioUrls.push(url);el.src=url;}catch{notify('That recording could not load. Refresh and try again.');}});
}
async function refresh(){state=await api(`/bootstrap?role=${role}`);account=state.account;}
function go(next){screen=next;storyOpen=false;render();window.scrollTo({top:0,behavior:'instant'});}
async function upload(audio){
  if(audio.saved)return audio;
  const blob=pendingAudio.get(audio.blobId);if(!blob)throw new Error('Record this answer again before sending.');
  const saved=await uploadRecording(blob,audio.blobId);pendingAudio.delete(audio.blobId);return {...saved,saved:true};
}
function responseTarget(target){return target==='vision'?posting.managerVision:(answers[Number(target.split('-')[1])]||={questionId:opp().questions.forApplicants[Number(target.split('-')[1])].id});}
async function record(target){
  if(recording){busy=true;recording.stop();render();return;}
  busy=true;render();
  try{
    recording=await captureVoice(async blob=>{
      recording=null;recordTarget=null;busy=true;
      const id=crypto.randomUUID(),entry=responseTarget(target);pendingAudio.set(id,blob);entry.audio={blobId:id,mimeType:blob.type,saved:false};entry.reviewedTranscript='';
      try{entry.audio=await upload(entry.audio);entry.originalTranscript=entry.audio.transcription.originalTranscript||'';entry.reviewedTranscript=entry.originalTranscript;if(entry.audio.transcription.status!=='ready')notify(entry.audio.transcription.message||'Your recording is saved. Add your words below.');}
      catch(e){notify(e.message);}
      finally{busy=false;render();}
    },e=>{recording=null;recordTarget=null;busy=false;render();notify(e.message);});
    recordTarget=target;busy=false;render();
  }catch(e){busy=false;render();notify(e.name==='NotAllowedError'?'Microphone is off. Enable it in your browser to answer by voice.':e.message);}
}
root.addEventListener('input',e=>{
  const key=e.target.dataset.field,v=e.target.value;if(!key)return;
  if(key.startsWith('job.')){const k=key.slice(4);if(k==='company')posting.company.name=v;else if(k==='companyBrief')posting.company.organizationMarkdown=v;else if(k==='vision')posting.managerVision.reviewedTranscript=v;else posting[k]=v;}
  if(key.startsWith('question.'))posting.questions[Number(key.slice(9))].text=v;
  if(key.startsWith('person.')){const k=key.slice(7);person()[k]=k==='references'?v.split('\n').filter(Boolean):v;}
  if(key.startsWith('contact.'))person().contactInformation[key.slice(8)]=v;
  if(key==='answer.text')answers[answerIndex].reviewedTranscript=v;
});
root.addEventListener('submit',async e=>{
  if(e.target.id!=='auth-form')return;e.preventDefault();if(busy)return;
  const data=Object.fromEntries(new FormData(e.target));busy=true;render();
  try{const result=await api(signUp?'/auth/register':'/auth/login',data);account=result.account;await refresh();screen='home';}
  catch(error){notify(error.message);}finally{busy=false;render();}
});
root.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');if(!el||el.disabled||busy)return;const action=el.dataset.action;
  if(recording&&!action.startsWith('record:'))return;
  if(action.startsWith('record:')){await record(action.slice(7));return;}
  try{
    if(action==='auth-mode'){signUp=!signUp;render();return;}
    if(action.startsWith('go:')){go(action.slice(3));return;}
    if(action==='story'){storyOpen=!storyOpen;render();return;}
    if(action==='new-job'){posting={...emptyJob(),company:{name:org().name,organizationMarkdown:org().organizationMarkdown||''},organizationVersion:org().version,questions:structuredClone(defaultQuestions)};go('post');return;}
    if(action.startsWith('candidate:')){selected=action.slice(10);go('candidate');return;}
    busy=true;render();
    if(action.startsWith('role:')){role=action.slice(5);history.replaceState(null,'',`/portal?role=${role}`);selectedJob=null;answers=[];await refresh();screen='home';}
    if(action==='logout'){await api('/auth/logout',{});account=null;state=null;answers=[];posting=null;pendingAudio.clear();screen='home';}
    if(action==='post'){
      if(posting.managerVision.audio)posting.managerVision.audio=await upload(posting.managerVision.audio);
      const result=await api('/opportunities',posting);selectedJob=result.opportunity.id;await refresh();screen='posted';notify('Your opening is saved.');
    }
    if(action==='save-profile'){await api('/profile',person(),'PUT');await refresh();screen='home';notify('Profile saved.');}
    if(action.startsWith('job:')){
      selectedJob=action.slice(4);answers=[];answerIndex=0;
      if(opp().applications.some(a=>a.applicantId===account.id))screen='submitted';
      else if(!person().onboarded){screen='profile';notify('Save your profile first, then choose the job you want.');}
      else screen='answers';
    }
    if(action==='previous-answer')answerIndex--;
    if(action==='next-answer'){
      const a=answers[answerIndex];if(!a?.audio||!a.reviewedTranscript?.trim())throw new Error('Record your answer and check your words before continuing.');
      a.audio=await upload(a.audio);
      if(answerIndex<opp().questions.forApplicants.length-1)answerIndex++;
      else{await api(`/opportunities/${opp().id}/applications`,{voiceAnswers:answers});await refresh();screen='submitted';notify('Application sent to this hiring manager.');}
    }
    if(action==='shortlist'){const a=items().find(a=>a.id===selected);await api(`/opportunities/${opp().id}/applications/${a.id}/outcomes`,{stage:'shortlisted',version:a.version});await refresh();notify('Added to your shortlist.');}
    if(action==='commit-import'){const result=await api(`/opportunities/${opp().id}/imports/commit`,{previewId:importPreview.previewId});importPreview=null;await refresh();screen='review';notify(`${result.imported} applicants saved.`);}
  }catch(error){notify(error.message);if(error.status===401){account=null;state=null;answers=[];pendingAudio.clear();}}
  finally{busy=false;render();if(!['story','auth-mode'].includes(action))window.scrollTo({top:0,behavior:'instant'});}
});
root.addEventListener('change',async e=>{
  if(e.target.dataset.select==='opening'){selectedJob=e.target.value;go('review');return;}
  const target=e.target.dataset.upload,file=e.target.files?.[0];if(!target||!file||busy)return;
  try{
    if(file.size>(target==='pool'?4:1)*1024*1024)throw new Error(target==='pool'?'Use a pool export under 4 MB.':'Use a text brief under 1 MB.');
    const text=await file.text();
    if(target==='pool'){busy=true;render();importPreview=await api(`/opportunities/${opp().id}/imports/preview`,{content:text,format:file.name.toLowerCase().endsWith('.csv')?'csv':'json',filename:file.name});}
    if(target==='organization')posting.company.organizationMarkdown=text;
    if(target==='jd')posting.jobDescription=text;
    if(target==='credentials')person().credentials=text;
  }catch(error){notify(error.message);}finally{busy=false;render();}
});
window.addEventListener('beforeunload',e=>{if(recording||busy){e.preventDefault();e.returnValue='';}});
(async()=>{try{const session=await api('/session');account=session.account;voiceProvider=session.voiceProvider;if(account)await refresh();}catch(error){notify(error.message);}render();})();
