import { UserError } from './errors.ts';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync, realpathSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
export const hash=(v:unknown)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export const now=()=>new Date().toISOString();
export type Session={id:string,eventId:string,title:string,abstract:string,speakers:string[],topics:string[],track:string[],format:string[],withdrawn:boolean,eventName?:string};
export type Finding={label:string,reason:string,quote?:string,sources?:{url:string,title:string,excerpt?:string,date?:string}[],kind:string,strength:string,inputClasses:string[],origin:string,identityConfirmed?:boolean,humanApproved?:boolean};
export const labels:Record<string,string>={short:'Very short abstract',vague:'Vague / unclear',claims:'Claim needs checking',promotion:'Promotional',fit:'Audience fit',reuse:'Repeat talk',circuit:'Circuit-speaking pattern',expertise:'Speaker expertise',incoherent:'Incoherent scope',detector:'AI detector signal'};
export class Store {
 db:DatabaseSync;
 constructor(path:string){
  if(path!==':memory:'){
   mkdirSync(dirname(path),{recursive:true,mode:0o700});
   const source=realpathSync(new URL('..',import.meta.url).pathname);const parent=realpathSync(dirname(path));
   const rel=relative(source,parent);if(!rel.startsWith('..')&&!rel.startsWith('/'))throw Error('Private data must live outside the source directory');
  }
  this.db=new DatabaseSync(path);this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS event_metadata(event_id TEXT PRIMARY KEY,name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,captured_at TEXT NOT NULL,imported_at TEXT NOT NULL,source_hash TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,session_id TEXT NOT NULL,content_hash TEXT NOT NULL,payload TEXT NOT NULL,snapshot_id TEXT NOT NULL REFERENCES snapshots(id));
  CREATE TABLE IF NOT EXISTS current(event_id TEXT,session_id TEXT,version_id TEXT NOT NULL REFERENCES versions(id),PRIMARY KEY(event_id,session_id));
  CREATE TABLE IF NOT EXISTS findings(id TEXT PRIMARY KEY,version_id TEXT NOT NULL REFERENCES versions(id),signature TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS dispositions(signature TEXT PRIMARY KEY,status TEXT NOT NULL,note TEXT NOT NULL,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,version_id TEXT NOT NULL REFERENCES versions(id),kind TEXT NOT NULL,status TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,error TEXT,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS analysis_results(version_id TEXT PRIMARY KEY REFERENCES versions(id),payload TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,kind TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
  CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(version_id UNINDEXED,title,abstract,speakers);
  `);
 }
 transaction<T>(fn:()=>T):T{this.db.exec('BEGIN IMMEDIATE');try{const x=fn();this.db.exec('COMMIT');return x;}catch(e){this.db.exec('ROLLBACK');throw e;}}
 audit(kind:string,payload:unknown){this.db.prepare('INSERT INTO audit(kind,payload,created_at) VALUES(?,?,?)').run(kind,JSON.stringify(payload),now());}
 import(sessions:Session[],capturedAt:string,sourceHash:string,completeEvent?:string){
  if(!sessions.length&&!completeEvent)throw Error('Empty import');
  const eventId=completeEvent||sessions[0].eventId;
  if(new Set(sessions.map(s=>s.id)).size!==sessions.length)throw Error('Duplicate session');
  const sid=hash([eventId,capturedAt,sourceHash]);
  return this.transaction(()=>{
   this.db.prepare('INSERT OR IGNORE INTO snapshots VALUES(?,?,?,?,?)').run(sid,eventId,capturedAt,now(),sourceHash);
   if(completeEvent)this.db.prepare('DELETE FROM current WHERE event_id=?').run(eventId);
   if(sessions[0]?.eventName)this.setEventName(eventId,sessions[0].eventName);
   let changed=0;
   for(const s of sessions){
    if(!s.id||!s.title||typeof s.abstract!=='string'||s.eventId!==eventId)throw Error('Invalid session');
    const contentHash=hash(s);const vid=hash([s.eventId,s.id,contentHash]);
    const result=this.db.prepare('INSERT OR IGNORE INTO versions VALUES(?,?,?,?,?,?)').run(vid,s.eventId,s.id,contentHash,JSON.stringify(s),sid);
    if(result.changes){changed++;this.db.prepare('INSERT INTO search VALUES(?,?,?,?)').run(vid,s.title,s.abstract,s.speakers.join(' '));}
    this.db.prepare('INSERT INTO current VALUES(?,?,?) ON CONFLICT(event_id,session_id) DO UPDATE SET version_id=excluded.version_id').run(s.eventId,s.id,vid);
    this.db.prepare('INSERT OR IGNORE INTO jobs(id,version_id,kind,status,updated_at) VALUES(?,?,?,?,?)').run(hash([vid,'mechanical-v1']),vid,'mechanical-v1','pending',now());
   }this.audit('import',{snapshot:sid,count:sessions.length,changed});return {snapshot:sid,count:sessions.length,changed};
  });
 }
 addFinding(versionId:string,f:Finding){
  if(!labels[f.label]||!f.reason||!['mechanical','editorial','claim','speaker','detector'].includes(f.kind))throw Error('Invalid finding');
  const v=this.db.prepare('SELECT * FROM versions WHERE id=?').get(versionId) as any;if(!v)throw Error('Unknown version');
  const session=JSON.parse(v.payload);if(f.quote&&!session.abstract.includes(f.quote))throw Error('Evidence quote is not an exact abstract span');
  for(const src of f.sources||[]){const u=new URL(src.url);if(u.protocol!=='https:')throw Error('Evidence sources must be HTTPS');}
  // Content dependency prevents a dismissal hiding a materially changed proposal; same-version reruns retain it.
  const signature=hash([v.event_id,v.session_id,v.content_hash,f.label,f.quote||'',f.kind]);
  const id=hash([signature,f.origin]);
  this.db.prepare('INSERT INTO findings VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(id,versionId,signature,JSON.stringify(f),now());return id;
 }
 findings(versionId:string,profile='collaborative'){
  return (this.db.prepare('SELECT f.*,d.status disposition,d.note FROM findings f LEFT JOIN dispositions d ON d.signature=f.signature WHERE version_id=? ORDER BY created_at DESC').all(versionId) as any[]).map(r=>({id:r.id,signature:r.signature,...JSON.parse(r.payload),disposition:r.disposition||'open',note:r.note||''})).filter(f=>!f.superseded).filter(f=>profile!=='strict-blind'||!f.inputClasses.some((x:string)=>['reviewer','outcome'].includes(x)));
 }
 eligible(f:any){return Boolean(f.disposition!=='dismissed'&&(f.kind!=='speaker'||(f.identityConfirmed&&f.humanApproved)));}
 disposition(id:string,status:string,note:string){
  if(!['dismissed','open'].includes(status)||note.length>4000)throw Error('Invalid disposition');
  const f=this.db.prepare('SELECT signature FROM findings WHERE id=?').get(id) as any;if(!f)throw Error('Finding not found');
  this.transaction(()=>{this.db.prepare('INSERT INTO dispositions VALUES(?,?,?,?) ON CONFLICT(signature) DO UPDATE SET status=excluded.status,note=excluded.note,updated_at=excluded.updated_at').run(f.signature,status,note,now());this.audit('disposition',{id,status,note});});
 }
 list(query='',topic='',profile='collaborative'){
  let rows=this.db.prepare('SELECT v.* FROM current c JOIN versions v ON v.id=c.version_id ORDER BY json_extract(payload,\'$.title\') COLLATE NOCASE').all() as any[];
  if(query){const words=query.match(/[\p{L}\p{N}]+/gu)||[];if(words.length){const matches=new Set((this.db.prepare('SELECT version_id FROM search WHERE search MATCH ?').all(words.map(w=>'"'+w+'"*').join(' AND ')) as any[]).map(r=>r.version_id));rows=rows.filter(r=>matches.has(r.id));}}
  return rows.map(r=>{const s=JSON.parse(r.payload);const row=this.db.prepare('SELECT payload FROM analysis_results WHERE version_id=?').get(r.id) as any;const analysis=row?JSON.parse(row.payload):null;return {...s,submittedTopics:s.topics,topics:[...new Set([...s.topics,...(analysis?.topicsApproved?analysis.topics.map((t:any)=>t.name):[])])],analysis,versionId:r.id,contentHash:r.content_hash,findings:this.findings(r.id,profile)};}).filter(s=>!topic||s.topics.includes(topic));
 }
 approveFinding(id:string,approved:boolean,identityConfirmed:boolean){
  const row=this.db.prepare('SELECT payload FROM findings WHERE id=?').get(id) as any;if(!row)throw Error('Finding not found');const f=JSON.parse(row.payload);
  if(approved&&f.kind==='speaker'&&!identityConfirmed)throw new UserError('Confirm speaker identity before approving');
  f.humanApproved=approved;f.identityConfirmed=identityConfirmed;this.transaction(()=>{this.db.prepare('UPDATE findings SET payload=? WHERE id=?').run(JSON.stringify(f),id);this.audit('finding-approval',{id,approved,identityConfirmed});});
 }
 approveTopics(versionId:string,approved:boolean){const row=this.db.prepare('SELECT payload FROM analysis_results WHERE version_id=?').get(versionId) as any;if(!row)throw Error('Analysis not found');const d=JSON.parse(row.payload);d.topicsApproved=approved;this.db.prepare('UPDATE analysis_results SET payload=? WHERE version_id=?').run(JSON.stringify(d),versionId);this.audit('topics-approval',{versionId,approved});}
 runJobs(){
  // Single-process worker: startup explicitly reclaims interrupted local runs.
  this.db.prepare("UPDATE jobs SET status='pending' WHERE status='running'").run();let done=0;
  for(const j of this.db.prepare("SELECT * FROM jobs WHERE status='pending' ORDER BY rowid").all() as any[]){
   this.db.prepare("UPDATE jobs SET status='running',attempts=attempts+1,updated_at=? WHERE id=?").run(now(),j.id);
   try{
    const v=this.db.prepare('SELECT payload FROM versions WHERE id=?').get(j.version_id) as any;const s=JSON.parse(v.payload);const words=s.abstract.trim().split(/\s+/).filter(Boolean).length;
    if(words<40)this.addFinding(j.version_id,{label:'short',kind:'mechanical',strength:'measured',reason:`The supplied abstract has ${words} words. Inspect whether it establishes a problem, scope and takeaways; length alone does not establish quality.`,quote:s.abstract,origin:'mechanical-v1',inputClasses:['abstract']});
    this.db.prepare("UPDATE jobs SET status='done',error=NULL,updated_at=? WHERE id=?").run(now(),j.id);done++;
   }catch{this.db.prepare("UPDATE jobs SET status='failed',error='Analysis failed; inspect input and retry explicitly',updated_at=? WHERE id=?").run(now(),j.id);}
  }return {done};
 }
 setEventName(eventId:string,name:string){this.db.prepare('INSERT INTO event_metadata VALUES(?,?) ON CONFLICT(event_id) DO UPDATE SET name=excluded.name').run(eventId,name);}
 status(){return {events:this.db.prepare('SELECT c.event_id eventId,m.name,count(*) sessions,(SELECT max(captured_at) FROM snapshots s WHERE s.event_id=c.event_id) capturedAt FROM current c LEFT JOIN event_metadata m ON m.event_id=c.event_id GROUP BY c.event_id').all(),snapshots:this.db.prepare('SELECT count(*) n FROM snapshots').get(),versions:this.db.prepare('SELECT count(*) n FROM versions').get(),jobs:this.db.prepare('SELECT status,count(*) count FROM jobs GROUP BY status').all(),latest:this.db.prepare('SELECT captured_at,imported_at FROM snapshots ORDER BY imported_at DESC LIMIT 1').get()};}
 close(){this.db.close();}
}
