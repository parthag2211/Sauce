import { uid, now, parse, problem } from './store.mjs';
const codecs=new Map([['audio/webm','webm'],['audio/mp4','m4a'],['audio/m4a','m4a'],['audio/x-m4a','m4a'],['audio/ogg','ogg'],['audio/wav','wav'],['audio/x-wav','wav'],['audio/mpeg','mp3'],['audio/flac','flac']]);
export function provider(){return process.env.GROQ_API_KEY?'Groq':process.env.ELEVENLABS_API_KEY?'ElevenLabs':null;}
export async function transcribe(bytes,mime,fetchImpl=fetch){
  const name=provider();if(!name)return {status:'unavailable',message:'Transcription is not configured. Add your words manually.'};
  const groq=name==='Groq',model=groq?'whisper-large-v3':'scribe_v2',form=new FormData();
  form.append('file',new Blob([bytes],{type:mime}),`recording.${codecs.get(mime)||'webm'}`);
  form.append(groq?'model':'model_id',model);
  if(groq){form.append('response_format','json');form.append('temperature','0');}
  // Preserve original wording. No transcript editing, emotion or personality inference.
  try{
    const response=await fetchImpl(groq?'https://api.groq.com/openai/v1/audio/transcriptions':'https://api.elevenlabs.io/v1/speech-to-text',{method:'POST',headers:groq?{Authorization:`Bearer ${process.env.GROQ_API_KEY}`}:{'xi-api-key':process.env.ELEVENLABS_API_KEY},body:form,signal:AbortSignal.timeout(60000)});
    if(!response.ok)return {status:'failed',provider:name,model,message:'Transcription could not finish. Your recording is saved; add your words manually.'};
    const result=await response.json();if(typeof result.text!=='string'||!result.text.trim())return {status:'failed',provider:name,model,message:'No speech was recognized. Your recording is saved.'};
    return {status:'ready',provider:name,model,originalTranscript:result.text,processedAt:now()};
  }catch{return {status:'failed',provider:name,model,message:'Transcription timed out or is unavailable. Your recording is saved.'};}
}
export async function saveVoice(store,account,req,readBytes){
  const mime=String(req.headers['content-type']||'').split(';')[0].toLowerCase();
  if(!codecs.has(mime))problem(415,'Record WebM, MP4/M4A, OGG, WAV, MP3 or FLAC audio.');
  const clientId=String(req.headers['idempotency-key']||'');if(!/^[a-zA-Z0-9-]{16,100}$/.test(clientId))problem(400,'Include a recording idempotency key.');
  const existing=store.one('SELECT data FROM voices WHERE owner_id=? AND client_id=?',account.id,clientId);if(existing)return parse(existing);
  const bytes=await readBytes(req,20*1024*1024);if(bytes.length<100)problem(400,'This recording is empty or too short.');
  const retry=store.one('SELECT data FROM voices WHERE owner_id=? AND client_id=?',account.id,clientId);if(retry)return parse(retry);
  const total=store.one('SELECT COALESCE(SUM(length(bytes)),0) total FROM voices WHERE owner_id=?',account.id).total;
  if(total+bytes.length>100*1024*1024)problem(413,'This account has reached its 100 MB voice storage limit.');
  const id=uid(),data={blobId:id,mimeType:mime,bytes:bytes.length,capturedAt:now(),transcription:{status:'processing'}};
  store.run('INSERT INTO voices VALUES(?,?,?,?,?,?)',id,account.id,clientId,JSON.stringify(data),bytes,now());
  data.transcription=await transcribe(bytes,mime);
  store.run('UPDATE voices SET data=? WHERE id=?',JSON.stringify(data),id);
  return data;
}
export function ownVoice(store,account,id){
  const row=store.one('SELECT * FROM voices WHERE id=? AND owner_id=?',id,account.id);if(!row)problem(400,'A recording is missing or belongs to another account.');return row;
}
export function canReadVoice(store,account,id){
  const row=store.one('SELECT * FROM voices WHERE id=?',id);if(!row)return null;if(row.owner_id===account.id)return row;
  const applications=store.all('SELECT a.data FROM applications a JOIN opportunities o ON o.id=a.opportunity_id WHERE o.owner_id=?',account.id).map(parse);
  return applications.some(a=>a.voiceAnswers.some(v=>v.audio?.blobId===id))?row:null;
}
