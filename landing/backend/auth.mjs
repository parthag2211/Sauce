import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { uid, now, hash, problem, text } from './store.mjs';
const scrypt=promisify(scryptCallback);
const sessionSeconds=60*60*24*14;
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');return `${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;}
export async function checkPassword(password,encoded){const [salt,key]=encoded.split(':');const actual=await scrypt(password,salt,64);return timingSafeEqual(actual,Buffer.from(key,'hex'));}
export function actor(store,req){
  const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sauce_session='))?.slice(14);
  if(!token)return null;
  return store.one('SELECT a.id,a.email,a.name FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?',hash(token),Date.now())||null;
}
export function cookie(res,token,secure,seconds=sessionSeconds){res.setHeader('Set-Cookie',`sauce_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${seconds}${secure?'; Secure':''}`);}
export async function authenticate(store,req,res,body,register,secure){
  const email=text(body.email,'email',254,true).toLowerCase();
  const password=body.password;
  if(typeof password!=='string'||password.length>256)problem(400,'Provide a password up to 256 characters.');
  if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12)problem(400,'Use an email address and a password of at least 12 characters.');
  let account;
  if(register){
    const name=text(body.name,'your name',100,true);
    const encoded=await passwordHash(password);
    account={id:uid(),email,name};
    store.transaction(()=>{
      if(store.one('SELECT id FROM accounts WHERE email=?',email))problem(409,'This account already exists. Sign in instead.');
      store.run('INSERT INTO accounts VALUES(?,?,?,?,?)',account.id,email,encoded,name,now());
      store.run('INSERT INTO profiles VALUES(?,?)',account.id,JSON.stringify({id:account.id,name,credentials:'',workProposal:'',contactInformation:{email,phone:'',linkedin:''},references:[],opportunityIds:[],onboarded:false,isSample:false,version:0}));
    });
  }else{
    const existing=store.one('SELECT * FROM accounts WHERE email=?',email);
    // The dummy hash keeps an unknown account on the same expensive verification path.
    const encoded=existing?.password_hash||`${'0'.repeat(32)}:${'0'.repeat(128)}`;
    if(!(await checkPassword(password,encoded))||!existing)problem(401,'Email or password is incorrect.');
    account={id:existing.id,email:existing.email,name:existing.name};
  }
  const token=randomBytes(32).toString('hex');
  store.run('DELETE FROM sessions WHERE expires<?',Date.now());
  store.run('INSERT INTO sessions VALUES(?,?,?)',hash(token),account.id,Date.now()+sessionSeconds*1000);
  cookie(res,token,secure);return {account};
}
export function logout(store,req,res,secure){
  const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sauce_session='))?.slice(14);
  if(token)store.run('DELETE FROM sessions WHERE token_hash=?',hash(token));cookie(res,'',secure,0);return {ok:true};
}
