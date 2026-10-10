import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
export const uid=()=>randomUUID();
export const now=()=>new Date().toISOString();
export const hash=s=>createHash('sha256').update(s).digest('hex');
export class Store {
  constructor(file){
    if(file!==':memory:')mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(file);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES accounts(id),expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS organizations(id TEXT PRIMARY KEY,owner_id TEXT UNIQUE NOT NULL REFERENCES accounts(id),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS profiles(account_id TEXT PRIMARY KEY REFERENCES accounts(id),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS opportunities(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES accounts(id),organization_id TEXT NOT NULL REFERENCES organizations(id),data TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,opportunity_id TEXT NOT NULL REFERENCES opportunities(id),applicant_id TEXT NOT NULL REFERENCES accounts(id),data TEXT NOT NULL,UNIQUE(opportunity_id,applicant_id));
      CREATE TABLE IF NOT EXISTS voices(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES accounts(id),client_id TEXT NOT NULL,data TEXT NOT NULL,bytes BLOB NOT NULL,created_at TEXT NOT NULL,UNIQUE(owner_id,client_id));
      CREATE TABLE IF NOT EXISTS import_previews(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES accounts(id),opportunity_id TEXT NOT NULL REFERENCES opportunities(id),data TEXT NOT NULL,expires INTEGER NOT NULL,committed INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS opportunity_owner ON opportunities(owner_id);
      CREATE INDEX IF NOT EXISTS application_opportunity ON applications(opportunity_id);
      PRAGMA user_version=1;`);
  }
  one(sql,...params){return this.db.prepare(sql).get(...params);}
  all(sql,...params){return this.db.prepare(sql).all(...params);}
  run(sql,...params){return this.db.prepare(sql).run(...params);}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  close(){this.db.close();}
}
export const parse=row=>row?JSON.parse(row.data):null;
export function problem(status,message){throw Object.assign(new Error(message),{status});}
export function text(value,label,max=10000,required=false){
  if(typeof value!=='string'||value.length>max||(required&&!value.trim()))problem(400,`Provide ${label}${required?' (required)':''}, up to ${max} characters.`);
  return value.trim();
}
