import { uid, now, text, parse, problem } from './store.mjs';
import { ownVoice } from './voice.mjs';
import { questions as defaultQuestions } from '../public/demo/seed.mjs';
const json=JSON.stringify;
export function profile(store,account){return parse(store.one('SELECT data FROM profiles WHERE account_id=?',account.id));}
export function saveProfile(store,account,body){
  const current=profile(store,account);
  if(body.version!==current.version)problem(409,'Your profile changed in another tab. Reload it before saving.');
  const contact=body.contactInformation||{};
  const email=text(contact.email||'','contact email',254,true);if(!/^\S+@\S+\.\S+$/.test(email))problem(400,'Add a valid contact email.');
  if(!Array.isArray(body.references)||body.references.length>10)problem(400,'Use up to ten references.');
  const result={...current,name:text(body.name,'your name',100,true),credentials:text(body.credentials,'your background',128000,true),workProposal:text(body.workProposal,'preferred work',20000,true),contactInformation:{email,linkedin:text(contact.linkedin||'','LinkedIn URL',2048),phone:text(contact.phone||'','phone',100)},references:body.references.map(r=>text(r,'reference',2000)),onboarded:true,version:current.version+1,isSample:false};
  store.run('UPDATE profiles SET data=? WHERE account_id=?',json(result),account.id);return result;
}
export function ownedOpportunity(store,account,id){const row=store.one('SELECT data FROM opportunities WHERE id=? AND owner_id=?',id,account.id);if(!row)problem(404,'Opening not found.');return parse(row);}
function vision(store,account,value){
  if(!value)return {audio:null,originalTranscript:'',reviewedTranscript:''};
  const reviewedTranscript=text(value.reviewedTranscript||'','voice note transcript',20000);
  if(!value.audio?.blobId)return {audio:null,originalTranscript:'',reviewedTranscript};
  const row=ownVoice(store,account,value.audio.blobId),audio=parse(row);
  return {audio,reviewedTranscript,originalTranscript:audio.transcription.originalTranscript||'',isSample:false};
}
export function createOpportunity(store,account,body){
  const company=body.company||{},name=text(company.name,'company name',200,true),brief=text(company.organizationMarkdown||'','company brief',128000);
  const title=text(body.title,'role',200,true),team=text(body.team||'','team',200),seniority=text(body.seniority||'','level',200),jobDescription=text(body.jobDescription,'job description',128000,true);
  const qs=body.questions||defaultQuestions;
  if(!Array.isArray(qs)||qs.length<1||qs.length>3)problem(400,'Use one to three screening questions.');
  const questions=qs.map(q=>({id:uid(),text:text(q.text,'screening question',1000,true),responseMode:'voice'}));
  const managerVision=vision(store,account,body.managerVision);
  const current=parse(store.one('SELECT data FROM organizations WHERE owner_id=?',account.id));
  if(current&&body.organizationVersion!==current.version)problem(409,'Company details changed in another tab. Reload before posting.');
  return store.transaction(()=>{
    const organization={id:current?.id||uid(),name,organizationMarkdown:brief,hiringManagerIds:[account.id],opportunityIds:[...(current?.opportunityIds||[])],version:(current?.version||0)+1};
    const id=uid();organization.opportunityIds.push(id);
    const o={id,organizationId:organization.id,hiringManagerId:account.id,title,team,seniority,jobDescription,managerVision,status:'open',questions:{forApplicants:questions,fromApplicants:[]},scoring:{weights:{composite_profile:null,voice_transcript:null,voice_behaviors:null},managerApproved:false,version:0},history:{previousApplicants:[],imports:[]},version:1,isSample:false,createdAt:now()};
    store.run('INSERT INTO organizations VALUES(?,?,?) ON CONFLICT(owner_id) DO UPDATE SET data=excluded.data',organization.id,account.id,json(organization));
    store.run('INSERT INTO opportunities VALUES(?,?,?,?,?)',id,account.id,organization.id,json(o),now());
    return {opportunity:o,organization};
  });
}
export function submit(store,account,id,body){
  const row=store.one('SELECT data FROM opportunities WHERE id=?',id);if(!row)problem(404,'Opening not found.');const o=parse(row);
  const existing=store.one('SELECT data FROM applications WHERE opportunity_id=? AND applicant_id=?',id,account.id);if(existing)return {application:parse(existing),alreadySubmitted:true};
  if(o.status!=='open')problem(409,'This opening is closed.');
  const p=profile(store,account);if(!p.onboarded)problem(400,'Save your profile before applying.');
  const answers=body.voiceAnswers;
  if(!Array.isArray(answers)||answers.length!==o.questions.forApplicants.length)problem(400,'Answer every screening question.');
  const voiceAnswers=answers.map((a,i)=>{
    if(a.questionId!==o.questions.forApplicants[i].id||!a.audio?.blobId)problem(400,'Include a recording for each screening question.');
    const audio=parse(ownVoice(store,account,a.audio.blobId));
    return {questionId:a.questionId,audio,originalTranscript:audio.transcription.originalTranscript||'',reviewedTranscript:text(a.reviewedTranscript,'reviewed response',20000,true),isSample:false};
  });
  if(new Set(voiceAnswers.map(v=>v.audio.blobId)).size!==voiceAnswers.length)problem(400,'Record a separate response for each question.');
  const application={id:uid(),applicantId:account.id,submittedProfile:structuredClone(p),voiceAnswers,assessment:{overall:null,components:{composite_profile:null,voice_transcript:null,voice_behaviors:null},status:'awaiting_policy',reason:'No approved evaluation policy or trained model is connected.'},status:'submitted',outcomeHistory:[{stage:'submitted',at:now()}],submittedAt:now(),isSample:false,version:1};
  store.run('INSERT INTO applications VALUES(?,?,?,?)',application.id,id,account.id,json(application));return {application};
}
export function outcome(store,account,id,applicationId,body){
  ownedOpportunity(store,account,id);
  if(!['reviewed','shortlisted','offered','accepted','hired','rejected','withdrawn'].includes(body.stage))problem(400,'Choose a recorded hiring stage.');
  return store.transaction(()=>{
    const row=store.one('SELECT data FROM applications WHERE id=? AND opportunity_id=?',applicationId,id);if(!row)problem(404,'Application not found.');const a=parse(row);
    if(body.version!==a.version)problem(409,'The application changed. Refresh before recording this outcome.');
    a.status=body.stage;a.outcomeHistory.push({stage:body.stage,at:now(),managerId:account.id});a.version++;
    store.run('UPDATE applications SET data=? WHERE id=?',json(a),applicationId);return {application:a};
  });
}
export function bootstrap(store,account,role){
  const manager=role==='manager';
  const rows=manager?store.all('SELECT * FROM opportunities WHERE owner_id=? ORDER BY created_at DESC',account.id):store.all("SELECT * FROM opportunities WHERE json_extract(data,'$.status')='open' OR id IN (SELECT opportunity_id FROM applications WHERE applicant_id=?) ORDER BY created_at DESC",account.id);
  const organizations=[],opportunities=[];
  for(const row of rows){
    const o=parse(row),organization=parse(store.one('SELECT data FROM organizations WHERE id=?',o.organizationId));
    if(!organizations.some(x=>x.id===organization.id))organizations.push(manager?organization:{id:organization.id,name:organization.name});
    const apps=manager?store.all('SELECT data FROM applications WHERE opportunity_id=?',o.id):store.all('SELECT data FROM applications WHERE opportunity_id=? AND applicant_id=?',o.id,account.id);
    opportunities.push(manager?{...o,applications:apps.map(parse)}:{id:o.id,organizationId:o.organizationId,title:o.title,team:o.team,seniority:o.seniority,jobDescription:o.jobDescription,status:o.status,questions:{forApplicants:o.questions.forApplicants,fromApplicants:[]},applications:apps.map(parse),managerVision:{audio:null},scoring:{},history:{previousApplicants:[]},isSample:false,version:o.version});
  }
  if(manager&&!organizations.length){const own=parse(store.one('SELECT data FROM organizations WHERE owner_id=?',account.id));if(own)organizations.push(own);}
  return {schemaVersion:'sauce-live-1',account,organizations,hiringManagers:[{id:account.id,name:account.name,opportunityIds:opportunities.filter(o=>o.hiringManagerId===account.id).map(o=>o.id)}],applicants:[profile(store,account)],opportunities};
}
