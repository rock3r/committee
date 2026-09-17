import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Store, hash, now } from './store.ts';
import { readSources, sourceSummary, checkSource, requireCoverage, saveSource } from './sessionize-api.ts';
const eventId=(v:unknown)=>{const s=String(v);if(!/^[1-9]\d{0,9}$/.test(s))throw Error('Invalid event ID');return s;};
export function configureCredential(dir:string,path:string){
 const absolute=resolve(path);if(!statSync(absolute).isFile())throw Error('Cookie file required');
 writeFileSync(join(dir,'sessionize-auth.json'),JSON.stringify({cookiePath:absolute}),{mode:0o600});
}
export type Runner=(event:string,cookie:string,out:string,progress:(p:any)=>void)=>Promise<void>;
export const collect:Runner=(event,cookie,out,progress)=>new Promise((resolve,reject)=>{
 const child=spawn('python3',[new URL('../scripts/sessionize_collect.py',import.meta.url).pathname,event,cookie,out],{stdio:['ignore','pipe','ignore']});
 let buffer='',failure:any;const timeout=setTimeout(()=>{child.kill();reject(Error('Collection timed out; retry to resume'));},45*60_000);
 child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
  buffer+=chunk;if(buffer.length>65536){child.kill();return;}
  let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);try{const p=JSON.parse(line);if(p.error)failure=p;else progress(p);}catch{child.kill();}}
 });
 child.on('error',()=>{clearTimeout(timeout);reject(Error('Could not start Python collector'));});
 child.on('close',code=>{clearTimeout(timeout);if(code===0)resolve();else{const error:any=Error(failure?.error||'Collection failed; previous data retained');error.code=code===3?'auth_required':'failed';reject(error);}});
});
export class SyncManager {
 store:Store;dir:string;runner:Runner;apiCheck:typeof checkSource;busy=false;timer?:ReturnType<typeof setInterval>;closed=false;
 constructor(store:Store,dir:string,runner:Runner=collect,apiCheck:typeof checkSource=checkSource){
  this.store=store;this.dir=dir;this.runner=runner;this.apiCheck=apiCheck;
  store.db.exec(`CREATE TABLE IF NOT EXISTS sync_configs(event_id TEXT PRIMARY KEY,payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_runs(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,payload TEXT NOT NULL);`);
  for(const r of this.activeRuns())if(['queued','running'].includes(r.status))this.saveRun({...r,status:'failed',error:'Local service stopped; retry to resume',finishedAt:now()});
 }
 credential(){try{const p=JSON.parse(readFileSync(join(this.dir,'sessionize-auth.json'),'utf8')).cookiePath;return typeof p==='string'&&existsSync(p)?p:null;}catch{return null;}}
 configs(){return (this.store.db.prepare('SELECT payload FROM sync_configs').all() as any[]).map(r=>JSON.parse(r.payload));}
 runs(){return (this.store.db.prepare('SELECT payload FROM sync_runs ORDER BY rowid DESC LIMIT 100').all() as any[]).map(r=>JSON.parse(r.payload));}
 activeRuns(){return (this.store.db.prepare("SELECT payload FROM sync_runs WHERE json_extract(payload,'$.status') IN ('queued','running') ORDER BY rowid").all() as any[]).map(r=>JSON.parse(r.payload));}
 saveRun(r:any){this.store.db.prepare('INSERT INTO sync_runs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(r.id,r.eventId,JSON.stringify(r));}
 saveConfig(c:any){this.store.db.prepare('INSERT INTO sync_configs VALUES(?,?) ON CONFLICT(event_id) DO UPDATE SET payload=excluded.payload').run(c.eventId,JSON.stringify(c));return c;}
 state(){const runs=this.runs();return {credentialConfigured:Boolean(this.credential()),sources:readSources(this.dir).map(sourceSummary),configs:this.configs().map(c=>({...c,latestRun:runs.find(r=>r.eventId===c.eventId)||null})),runs};}
 configure(id:unknown,enabled:unknown,minutes:unknown){
  const event=eventId(id);if(typeof enabled!=='boolean'||!Number.isInteger(minutes)||Number(minutes)<15||Number(minutes)>10080)throw Error('Invalid sync interval');
  const prior=this.configs().find(c=>c.eventId===event)||{};
  return this.saveConfig({...prior,eventId:event,enabled,intervalMinutes:minutes,nextDue:enabled?new Date(Date.now()+Number(minutes)*60000).toISOString():null});
 }
 enqueue(id:unknown){
  const event=eventId(id);const existing=this.activeRuns().find(r=>r.eventId===event);if(existing)return existing;
  if(!readSources(this.dir).some(s=>s.eventId===event)&&!this.credential())throw Error('Connect a Sessionize API endpoint first');
  if(!this.configs().some(c=>c.eventId===event))this.configure(event,false,60);
  const run={id:randomUUID(),eventId:event,status:'queued',stage:'listing',completed:0,total:0,error:null,startedAt:now(),finishedAt:null,result:null};
  this.saveRun(run);queueMicrotask(()=>void this.drain());return run;
 }
 async drain(){
  if(this.busy||this.closed)return;this.busy=true;
  try{for(;;){const run=this.activeRuns().find(r=>r.status==='queued');if(!run||this.closed)break;
   run.status='running';this.saveRun(run);
   try{
    const source=readSources(this.dir).find(s=>s.eventId===run.eventId);
    if(source){
     const result=await this.apiCheck(source);requireCoverage(source,result);
     if(hash(readSources(this.dir).find(s=>s.eventId===run.eventId))!==hash(source))throw Error('Source configuration changed during sync; retry with the new source');
     run.stage='importing';run.total=result.sessions.length;run.completed=result.sessions.length;this.saveRun(run);
     run.result=this.store.import(result.sessions,result.capturedAt,result.sourceHash,run.eventId);
     run.coverage=result.coverage;
     saveSource(this.dir,{...source,expectedCount:result.sessions.length});
    }else{
     const cookie=this.credential();if(!cookie)throw Error('Connect a Sessionize API endpoint first');
     const out=join(this.dir,'sessionize-sync',run.eventId);mkdirSync(out,{recursive:true,mode:0o700});
     const started=Date.now();await this.runner(run.eventId,cookie,out,p=>{if(['listing','details','done'].includes(p.stage)&&Number.isInteger(p.completed)&&Number.isInteger(p.total)){Object.assign(run,{stage:p.stage,completed:p.completed,total:p.total});this.saveRun(run);}});
     const path=join(out,'snapshot.json');if(statSync(path).mtimeMs<started-1000)throw Error('Collector did not produce a fresh snapshot');
     const snapshot=JSON.parse(readFileSync(path,'utf8'));
     if(snapshot.complete!==true||snapshot.eventId!==run.eventId||!Array.isArray(snapshot.sessions)||!Number.isFinite(Date.parse(snapshot.capturedAt)))throw Error('Invalid snapshot');
     for(const s of snapshot.sessions)if(s.eventId!==run.eventId||!Array.isArray(s.speakers)||!Array.isArray(s.topics)||!Array.isArray(s.track)||!Array.isArray(s.format)||typeof s.withdrawn!=='boolean')throw Error('Invalid session');
     run.stage='importing';this.saveRun(run);
     run.result=this.store.import(snapshot.sessions,snapshot.capturedAt,hash(snapshot.sessions),run.eventId);
    }
    this.store.runJobs();run.status='succeeded';run.stage='done';run.error=null;
   }catch(e:any){run.status=e.code==='auth_required'?'auth_required':'failed';run.error=e.message;}
   run.finishedAt=now();this.saveRun(run);
   const config=this.configs().find(c=>c.eventId===run.eventId);
   this.saveConfig({...config,lastSuccess:run.status==='succeeded'?run.finishedAt:config.lastSuccess||null,nextDue:config.enabled&&run.status!=='auth_required'?new Date(Date.now()+config.intervalMinutes*60000).toISOString():null});
  }}finally{this.busy=false;}
 }
 tick(){for(const c of this.configs())if(c.enabled&&c.nextDue&&Date.parse(c.nextDue)<=Date.now()){try{this.enqueue(c.eventId);}catch{/* Missing credentials remain visible; no background loop. */}}}
 start(){this.timer=setInterval(()=>this.tick(),60_000);this.tick();}
 stop(){this.closed=true;if(this.timer)clearInterval(this.timer);}
}
