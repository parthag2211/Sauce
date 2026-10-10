import { Store, problem, parse, hash } from './store.mjs';
import { authenticate, actor, logout } from './auth.mjs';
import { bootstrap, profile, saveProfile, ownedOpportunity, createOpportunity, submit, outcome } from './domain.mjs';
import { previewImport, commitImport } from './imports.mjs';
import { provider, saveVoice, canReadVoice } from './voice.mjs';
import path from 'node:path';
export async function readBytes(req,max=1024*1024){
  if(Number(req.headers['content-length'])>max)problem(413,'The upload is too large.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>max)problem(413,'The upload is too large.');chunks.push(chunk);}
  return Buffer.concat(chunks);
}
async function body(req,max){let result;try{result=JSON.parse((await readBytes(req,max)).toString()||'{}');}catch(e){if(e.status)throw e;problem(400,'Invalid JSON.');}if(!result||typeof result!=='object'||Array.isArray(result))problem(400,'Use a JSON object.');return result;}
export function createApi({store,secure=process.env.NODE_ENV==='production',origin=process.env.SAUCE_PUBLIC_ORIGIN||'https://sauce-vision-production.up.railway.app'}={}){
  if(!store){
    const dir=process.env.SAUCE_DATA_DIR||process.env.RAILWAY_VOLUME_MOUNT_PATH;
    if(secure&&!dir)problem(503,'Persistent storage is required for the live portal.');
    store=new Store(path.join(dir||'.data','sauce.sqlite'));
  }
  const attempts=new Map();
  function limit(key,max,window=600000){const current=attempts.get(key);const v=current&&current.until>Date.now()?current:{count:0,until:Date.now()+window};v.count++;attempts.set(key,v);if(attempts.size>10000)for(const [k,x]of attempts)if(x.until<Date.now())attempts.delete(k);while(attempts.size>10000)attempts.delete(attempts.keys().next().value);if(v.count>max)problem(429,'Please wait a few minutes before trying again.');}
  return async function api(req,res,url){
    const method=req.method,p=url.pathname;
    if(!['GET','POST','PUT','PATCH'].includes(method))problem(405,'This method is not supported.');
    if(method!=='GET'){
      const expected=secure?origin:`http://${req.headers.host}`;
      if(req.headers.origin!==expected)problem(403,'Open Sauce in the same browser tab before saving.');
      if(p!=='/api/v1/voice'&&!String(req.headers['content-type']||'').startsWith('application/json'))problem(415,'Send JSON for this request.');
    }
    const account=actor(store,req);
    if(p==='/api/v1/session'&&method==='GET')return {account,voiceProvider:provider(),mode:'live'};
    if(['/api/v1/auth/register','/api/v1/auth/login'].includes(p)&&method==='POST'){
      if(p.endsWith('/register'))limit('registrations',60,3600000);
      const data=await body(req);const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',').at(-1).trim();
      limit(`auth-ip:${ip}`,30);limit(`auth-email:${hash(String(data.email).toLowerCase())}`,10);
      return authenticate(store,req,res,data,p.endsWith('/register'),secure);
    }
    if(!account)problem(401,'Sign in to save jobs, profiles and applications.');
    if(p==='/api/v1/auth/logout'&&method==='POST')return logout(store,req,res,secure);
    if(p==='/api/v1/bootstrap'&&method==='GET')return bootstrap(store,account,url.searchParams.get('role')==='applicant'?'applicant':'manager');
    if(p==='/api/v1/profile'&&method==='GET')return profile(store,account);
    if(p==='/api/v1/profile'&&method==='PUT')return saveProfile(store,account,await body(req));
    if(p==='/api/v1/opportunities'&&method==='POST'){limit(`posting:${account.id}`,30,3600000);return createOpportunity(store,account,await body(req));}
    if(p==='/api/v1/voice'&&method==='POST'){limit('voice-global',60,3600000);limit(`voice:${account.id}`,30,3600000);return saveVoice(store,account,req,readBytes);}
    const audio=p.match(/^\/api\/v1\/voice\/([\w-]+)$/);
    if(audio&&method==='GET'){
      const row=canReadVoice(store,account,audio[1]);if(!row)problem(404,'Recording not found.');
      res.writeHead(200,{'Content-Type':parse(row).mimeType,'Content-Length':row.bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(Buffer.from(row.bytes));return undefined;
    }
    const route=p.match(/^\/api\/v1\/opportunities\/([\w-]+)(.*)$/);
    if(route){
      const [,id,tail]=route;
      if(tail==='/applications'&&method==='POST')return submit(store,account,id,await body(req));
      const result=tail.match(/^\/applications\/([\w-]+)\/outcomes$/);
      if(result&&method==='POST')return outcome(store,account,id,result[1],await body(req));
      if(tail==='/imports/preview'&&method==='POST'){limit(`import:${account.id}`,20,3600000);return previewImport(store,account,ownedOpportunity(store,account,id),await body(req,5*1024*1024));}
      if(tail==='/imports/commit'&&method==='POST'){const data=await body(req);return commitImport(store,account,ownedOpportunity(store,account,id),data.previewId);}
      if(!tail&&method==='PATCH'){
        const data=await body(req),o=ownedOpportunity(store,account,id);
        if(data.version!==o.version)problem(409,'This opening changed. Reload before updating.');
        if(!['open','closed'].includes(data.status))problem(400,'Set this opening to open or closed.');
        o.status=data.status;o.version++;store.run('UPDATE opportunities SET data=? WHERE id=?',JSON.stringify(o),id);return {opportunity:o};
      }
    }
    problem(404,'API route not found.');
  };
}
