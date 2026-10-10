const journeys = {
  manager: {
    label:'THE HIRING MANAGER', title:'Tell us what\ngreat looks like.', intro:'Your organization, the role, and the person you can picture working beside you.',
    steps:[
      ['THE ORGANIZATION','Give us your world.','Upload a Markdown file about your organization: what you’re building, how you work, and what matters to your team.','↑ organization.md','<div class="document"><span>.md</span><b>Our world</b><i></i><i></i><i></i><div class="document-stamp">THE CONTEXT</div></div>'],
      ['THE JOB DESCRIPTION','Make the work clear.','Upload the JD as a Markdown file. Bring the responsibilities, the scope, and the outcomes you want this person to own.','↑ the-role.md','<div class="sticky"><span>THE ROLE</span><b>Own the work.<br>Make an impact.</b><div>☑ Responsibilities</div><div>☑ Outcomes</div><div>☑ Scope</div></div>'],
      ['THE VOICE VISION','Now, give it some feeling.','Speak freely about your ideal hire. The things you can explain in a conversation but never quite fit into a job description.','◉ Record your vision','<div class="voice-tile"><span>YOUR VISION, OUT LOUD</span><div class="wavebars"></div><p>“Here’s the person<br>I’m imagining…”</p></div>']
    ], result:'One clear, manager-confirmed hiring brief.', resultCopy:'Sauce brings all three sources together, flags contradictions, and lets you confirm the picture before it moves forward.', badge:'CONTEXT → CLARITY'
  },
  applicant: {
    label:'THE APPLICANT',title:'Show us the person\nbehind the profile.', intro:'Where you’ve been, the work you want to do, and the people who can help tell your story.',
    steps:[
      ['YOUR CREDENTIALS','Bring your experience.','Share your academic and work history: the roles, projects, and chapters that shaped what you can do. Think LinkedIn experience, with room for your story.','◎ Academic + work history','<div class="profile-mini"><span class="avatar">J</span><b>The story so far.</b><small>Education & learning</small><small>Work & experience</small><small>Projects & contributions</small></div>'],
      ['YOUR WORK PROPOSAL','Tell us what’s next.','Scope the work you’re open to. Describe the kinds of projects, responsibilities, and problems you’d like to take on, instead of fitting yourself into a title.','↗ Work you want to own','<div class="sticky"><span>MY NEXT CHAPTER</span><b>Here’s where<br>I can contribute.</b><div>→ Work I enjoy</div><div>→ Scope I can own</div><div>→ What I’m open to</div></div>'],
      ['YOUR CONTACTS + REFERENCES','Make the connection.','Add your LinkedIn, email, phone, and references. Keep your contact details separate from the evidence used to assess your fit.','↗ Contacts + references','<div class="contact-mini"><span class="avatar">J</span><b>Let’s connect.</b><small>↗ LinkedIn</small><small>↗ Email & phone</small><small>◎ References</small></div>']
    ], result:'A complete profile. Ready for a real conversation.', resultCopy:'Next, answer up to three manager-approved questions by voice. Review your transcripts, choose your takes, and submit the version you want to share.', badge:'PROFILE → CONVERSATION'
  }
};
function populateWaves(root=document) {
  root.querySelectorAll('.wavebars').forEach((wave,index)=> {
    if(wave.childElementCount) return;
    for(let n=0;n<24;n++) {
      const bar=document.createElement('i');
      bar.style.height=`${5+Math.round(Math.abs(Math.sin(n*1.37+index*.72))*24)}px`;
      wave.append(bar);
    }
  });
}
function setRole(role) {
  const data=journeys[role];
  document.querySelectorAll('[data-role]').forEach(button=> {
    const selected=button.dataset.role===role;
    button.setAttribute('aria-selected',String(selected)); button.tabIndex=selected?0:-1;
  });
  document.getElementById('journey-panel').setAttribute('aria-labelledby',`tab-${role}`);
  document.getElementById('role-label').textContent=data.label;
  document.getElementById('journey-title').textContent=data.title;
  document.getElementById('journey-intro').textContent=data.intro;
  data.steps.forEach((step,index)=>{
    const id=index+1;
    ['kicker','title','copy','format'].forEach((field,k)=>document.getElementById(`${field}-${id}`).textContent=step[k]);
    document.getElementById(`visual-${id}`).innerHTML=step[4];
  });
  document.getElementById('result-title').textContent=data.result;
  document.getElementById('result-copy').textContent=data.resultCopy;
  document.getElementById('result-badge').textContent=data.badge;
  populateWaves(document.getElementById('journey-panel'));
}
document.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',()=>setRole(button.dataset.role)));
document.querySelectorAll('[data-role-link]').forEach(link=>link.addEventListener('click',()=>setRole(link.dataset.roleLink)));
document.querySelectorAll('.question-toggle').forEach(button=>button.addEventListener('click',()=>{
  const next=button.getAttribute('aria-expanded')!=='true';
  document.querySelectorAll('.question-toggle').forEach(item=>{
    const open=item===button&&next;
    item.setAttribute('aria-expanded',String(open));
    document.getElementById(item.getAttribute('aria-controls')).hidden=!open;
    item.querySelector('.question-plus').textContent=open?'−':'+';
  });
}));
const pipeline=[
 ['SOURCE → STRUCTURE','Keep the originals. Build the picture.','Documents, profile information, and recordings become versioned records. Every interpretation points back to its source, so a correction never erases the original story.'],
 ['CONTEXT → QUESTIONS','Find the details worth asking about.','Sauce interprets the organization, JD, and manager vision into a brief for review. From that confirmed brief, it proposes at most three screening questions for the manager to approve.'],
 ['EVIDENCE → REVIEW','Use the manager’s lens. Show your working.','The backend assesses the composite profile, voice response content, and defined observable delivery measures against approved anchors. Manager-set weights combine supported components; missing evidence stays unknown.'],
 ['ONE SYSTEM → BOTH SURFACES','Same job. Same application. Same truth.','iMessage and MCP call the same authorized services. A shared job card connects the conversation, while private applications, contacts, and audio stay visible only to the people with permission.']
];
document.querySelectorAll('[data-pipeline]').forEach(button=>button.addEventListener('click',()=>{
  const index=Number(button.dataset.pipeline);
  document.querySelectorAll('[data-pipeline]').forEach(item=>{
    const selected=item===button; item.setAttribute('aria-selected',String(selected)); item.tabIndex=selected?0:-1;
  });
  document.getElementById('pipeline-detail').setAttribute('aria-labelledby',button.id);
  ['tag','title','copy'].forEach((field,k)=>document.getElementById(`pipeline-${field}`).textContent=pipeline[index][k]);
}));
document.querySelectorAll('[role="tablist"]').forEach(list=>list.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...list.querySelectorAll('[role="tab"]')];
  if(!tabs.includes(document.activeElement))return;
  event.preventDefault();
  const current=tabs.indexOf(document.activeElement);
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[next].focus();tabs[next].click();
}));
const weights=['profile','transcript','behavior'];
function updateWeights(){
  let sum=0;
  weights.forEach(key=>{
    const value=Number(document.getElementById(`${key}-weight`).value);sum+=value;
    document.getElementById(`${key}-value`).textContent=`${value}%`;
    document.getElementById(`bar-${key}`).style.width=`${value}%`;
    document.getElementById(`${key}-weight`).setAttribute('aria-valuetext',`${value} percent`);
  });
  const status=document.getElementById('weight-status');
  status.textContent=sum===100?'Total 100% · balanced':`Total ${sum}% · adjust to 100%`;
  status.classList.toggle('invalid',sum!==100);
}
weights.forEach(key=>document.getElementById(`${key}-weight`).addEventListener('input',updateWeights));
document.getElementById('reset-weights').addEventListener('click',()=>{
  [50,35,15].forEach((value,index)=>document.getElementById(`${weights[index]}-weight`).value=value); updateWeights();
});
populateWaves();updateWeights();
