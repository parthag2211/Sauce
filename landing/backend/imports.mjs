import { hash, uid, now, text, problem, parse } from './store.mjs';
const stages=new Set(['submitted','reviewed','shortlisted','offered','accepted','hired','rejected','withdrawn','unknown']);
export function parseCsv(raw){
  raw=raw.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<raw.length;i++){
    const c=raw[i];
    if(c==='"'){if(quoted&&raw[i+1]==='"'){field+='"';i++;}else if(quoted||field==='')quoted=!quoted;else problem(400,'Unexpected quote in CSV. Export with quoted text fields.');}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted)problem(400,'A quoted CSV field was not closed.');
  row.push(field);if(row.some(x=>x.trim()))rows.push(row);
  if(rows.length<2)problem(400,'Include a header row and at least one applicant.');
  const keys=rows.shift().map(x=>x.trim().toLowerCase().replace(/[\s-]+/g,'_'));
  if(new Set(keys).size!==keys.length||keys.some(k=>!k))problem(400,'CSV headers must be unique and non-empty.');
  return rows.map((r,i)=>{if(r.length!==keys.length)problem(400,`CSV row ${i+2} has ${r.length} columns; expected ${keys.length}.`);return Object.fromEntries(keys.map((k,j)=>[k,r[j]]));});
}
function normalize(row,index){
  if(!row||typeof row!=='object'||Array.isArray(row))problem(400,`Row ${index+1} is not an applicant object.`);
  const name=text(row.name||row.full_name||row.candidate_name||'','applicant name',100,true);
  const email=text(row.email||'','applicant email',254);
  const resume=text(row.credentials||row.resume_text||row.resume||'','resume text',128000);
  const resumeUrl=text(row.resume_url||'','resume URL',2048);
  if(resumeUrl&&!/^https?:\/\//i.test(resumeUrl))problem(400,`Use an HTTP(S) resume URL for ${name}.`);
  if(!resume&&!resumeUrl)problem(400,`Add credentials or resume_text for ${name}.`);
  let history=row.outcomeHistory||row.outcome_history||row.outcomes||row.stage||row.status||[];
  if(typeof history==='string'){
    const value=history.trim();
    if(value.startsWith('[')){try{history=JSON.parse(value);}catch{problem(400,`Invalid outcome_history JSON for ${name}.`);}}
    else history=value?value.split('|').map(stage=>({stage:stage.trim()})):[];
  }
  if(!Array.isArray(history)||history.length>100)problem(400,`Use a list of recorded stages for ${name}.`);
  const warnings=[];
  const outcomeHistory=history.map(entry=>{
    const e=typeof entry==='string'?{stage:entry}:entry;
    if(!e||typeof e.stage!=='string')problem(400,`A stage is missing for ${name}.`);
    const sourceStage=text(e.stage,'stage label',100,true),canonical=sourceStage.toLowerCase();
    const stage=canonical==='applied'?'submitted':stages.has(canonical)?canonical:'unknown';
    if(stage==='unknown')warnings.push(`Unknown stage “${sourceStage}” retained for ${name}.`);
    if(e.at&&Number.isNaN(Date.parse(e.at)))problem(400,`Invalid outcome timestamp for ${name}.`);
    return {stage,sourceStage,...(e.at?{at:new Date(e.at).toISOString()}:{}),source:'import'};
  });
  if(!resume)warnings.push(`${name}: resume URL saved; document text has not been extracted.`);
  const profile={name,credentials:resume,workProposal:text(row.workProposal||row.work_proposal||'','work proposal',20000),contactInformation:{email,linkedin:text(row.linkedin||'','LinkedIn URL',2048),phone:text(row.phone||'','phone',100)},references:[]};
  return {dedupeKey:hash(email?email.toLowerCase():`${name.toLowerCase()}\n${resume}\n${resumeUrl}`),profile,resumeUrl,outcomeHistory,sourceRow:index+1,warnings};
}
export function previewImport(store,account,opportunity,body){
  const format=body.format;if(!['csv','json'].includes(format))problem(400,'Use a CSV or JSON export.');
  const raw=text(body.content,'import contents',4*1024*1024,true);let rows;
  if(format==='csv')rows=parseCsv(raw);
  else{let data;try{data=JSON.parse(raw);}catch{problem(400,'The file is not valid JSON.');}rows=Array.isArray(data)?data:data?.applicants;}
  if(!Array.isArray(rows)||!rows.length||rows.length>1000)problem(400,'Import between 1 and 1,000 applicants at a time.');
  const normalized=rows.map(normalize),seen=new Set(),records=[],warnings=[];
  for(const record of normalized){warnings.push(...record.warnings);if(seen.has(record.dedupeKey)){warnings.push(`Duplicate row for ${record.profile.name} will be skipped.`);continue;}seen.add(record.dedupeKey);records.push(record);}
  const data={records,warnings,sourceHash:hash(raw),filename:text(body.filename||`pool.${format}`,'filename',200),createdAt:now(),format};
  const id=uid();store.run('DELETE FROM import_previews WHERE expires<? AND committed=0',Date.now());
  store.run('INSERT INTO import_previews(id,owner_id,opportunity_id,data,expires) VALUES(?,?,?,?,?)',id,account.id,opportunity.id,JSON.stringify(data),Date.now()+15*60*1000);
  return {previewId:id,count:records.length,warnings,applicants:records.map(r=>({name:r.profile.name,email:r.profile.contactInformation.email,resumePreview:r.profile.credentials.slice(0,240),outcomeHistory:r.outcomeHistory})),expiresInSeconds:900};
}
export function commitImport(store,account,opportunity,previewId){
  return store.transaction(()=>{
    const preview=store.one('SELECT * FROM import_previews WHERE id=? AND owner_id=? AND opportunity_id=?',previewId,account.id,opportunity.id);
    if(!preview)problem(404,'Import preview not found.');
    if(preview.committed)return {alreadyCommitted:true,imported:0};
    if(preview.expires<Date.now())problem(409,'This preview expired. Preview the file again.');
    const data=parse(preview),o=parse(store.one('SELECT data FROM opportunities WHERE id=?',opportunity.id));
    o.history||={};o.history.previousApplicants||=[];
    const seen=new Set(o.history.previousApplicants.map(a=>a.dedupeKey));let imported=0;
    for(const r of data.records){if(seen.has(r.dedupeKey))continue;seen.add(r.dedupeKey);const id=uid();o.history.previousApplicants.push({...r,id,applicantId:id,importedAt:now(),source:{filename:data.filename,hash:data.sourceHash,row:r.sourceRow},assessment:{overall:null},status:r.outcomeHistory.at(-1)?.stage||'imported'});imported++;}
    o.history.imports||=[];o.history.imports.push({id:previewId,filename:data.filename,sourceHash:data.sourceHash,imported,at:now()});
    o.version++;store.run('UPDATE opportunities SET data=? WHERE id=?',JSON.stringify(o),o.id);
    store.run('UPDATE import_previews SET committed=1 WHERE id=?',previewId);
    return {imported,skipped:data.records.length-imported};
  });
}
