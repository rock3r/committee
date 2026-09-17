import { UserError } from './errors.ts';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Store, labels } from './store.ts';
import { DetectorManager } from './detector.ts';
import { AnalysisManager } from './analysis.ts';
import { previewBundle } from './bundle.ts';
import { targetSummary, saveTarget, publish, invite, revoke, readers, rollback } from './publication.ts';
import { SyncManager } from './sync.ts';
import { sourceInput, checkSource, requireCoverage, saveSource, sourceSummary, readSources } from './sessionize-api.ts';
const root=new URL('../web/',import.meta.url);
export function serve(store:Store,dir:string,port=43127){
 const lockPath=join(dir,'service.lock');
 if(existsSync(lockPath)){
  const pid=Number(readFileSync(lockPath,'utf8'));
  if(!Number.isInteger(pid)||pid<1)throw Error('Invalid service lock; inspect the private data directory');
  let alive=true;try{process.kill(pid,0);}catch(e:any){if(e.code==='ESRCH')alive=false;}
  if(alive)throw Error('A Committee service already uses this private data directory');
  unlinkSync(lockPath);
 }
 writeFileSync(lockPath,String(process.pid),{mode:0o600,flag:'wx'});
 const releaseLock=()=>{try{if(readFileSync(lockPath,'utf8')===String(process.pid))unlinkSync(lockPath);}catch{}};
 const sync=new SyncManager(store,dir);
 const analysis=new AnalysisManager(store,dir);
 const detector=new DetectorManager(store,dir);
 const tokenPath=join(dir,'access-token');if(!existsSync(tokenPath))writeFileSync(tokenPath,randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
 const token=readFileSync(tokenPath,'utf8').trim();
 const valid=(value:string)=>{const a=Buffer.from(value),b=Buffer.from(token);return a.length===b.length&&timingSafeEqual(a,b);};
 const server=createServer(async(req,res)=>{
  const host=req.headers.host||'';const address=server.address();const activePort=address&&typeof address!=='string'?address.port:port;const allowedHosts=[`127.0.0.1:${activePort}`,`localhost:${activePort}`];
  const send=(status:number,data:any)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  if(!allowedHosts.includes(host))return send(403,{error:'Unrecognised host'});
  const origin=req.headers.origin;const own=`http://${host}`;
  if(origin&&![own,'https://sessionize.com'].includes(origin))return send(403,{error:'Origin denied'});
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, OPTIONS');res.writeHead(204);return res.end();}
  const url=new URL(req.url||'/',own);
  try{
   if(!url.pathname.startsWith('/api/')){
    const file:Record<string,string>={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/review-helper.user.js':'review-helper.user.js'};
    if(req.method!=='GET'||!file[url.pathname])return send(404,{error:'Not found'});
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    res.setHeader('Content-Type',url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html');return res.end(readFileSync(new URL(file[url.pathname],root)));
   }
   if(req.method==='GET'&&url.pathname==='/api/runtime')return send(200,{mode:'admin',schemaVersion:1});
   if(!valid((req.headers.authorization||'').replace(/^Bearer /,'')))return send(401,{error:'Unlock with the local access token'});
   const profile=url.searchParams.get('profile')||'collaborative';if(!['collaborative','strict-blind','organiser'].includes(profile))return send(400,{error:'Invalid profile'});
   if(req.method==='GET'&&url.pathname==='/api/detector')return send(200,detector.state());
   if(['/api/detector/run','/api/detector/resume'].includes(url.pathname)&&req.method==='POST'){
    if(origin==='https://sessionize.com')return send(403,{error:'Detection is controlled in the local workspace'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return send(413,{error:'Request too large'});}const d=JSON.parse(body);
    return send(202,url.pathname.endsWith('/resume')?detector.resume(String(d.id)):detector.enqueue(String(d.eventId),d.limit));
   }
   if(req.method==='GET'&&url.pathname==='/api/analysis')return send(200,analysis.state());
   if(['/api/analysis/run','/api/analysis/approve','/api/analysis/topics'].includes(url.pathname)&&req.method==='POST'){
    if(origin==='https://sessionize.com')return send(403,{error:'Analysis is controlled in the local workspace'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return send(413,{error:'Request too large'});}const d=JSON.parse(body);
    if(url.pathname.endsWith('/run'))return send(202,analysis.enqueue(String(d.eventId),d.limit,d.sessionIds,d.revalidateSaved===true));
    if(typeof d.approved!=='boolean')return send(400,{error:'Approval must be explicit'});
    if(url.pathname.endsWith('/topics')){store.approveTopics(String(d.versionId),d.approved);return send(200,{ok:true});}
    store.approveFinding(String(d.id),d.approved,d.identityConfirmed===true);return send(200,{ok:true});
   }
   if(req.method==='GET'&&url.pathname==='/api/publication/readers')return send(200,{readers:readers(store)});
   if(req.method==='GET'&&url.pathname==='/api/publication')return send(200,targetSummary(dir));
   if(['/api/publication/target','/api/publication/preview','/api/publication/publish','/api/publication/invite','/api/publication/revoke','/api/publication/rollback'].includes(url.pathname)&&req.method==='POST'){
    if(origin==='https://sessionize.com')return send(403,{error:'Publication is controlled in the local workspace'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return send(413,{error:'Request too large'});}
    const d=JSON.parse(body);
    if(url.pathname.endsWith('/target'))return send(200,saveTarget(dir,d));
    if(url.pathname.endsWith('/preview'))return send(200,previewBundle(store,dir,d));
    if(url.pathname.endsWith('/publish'))return send(200,await publish(store,dir,String(d.revision)));
    if(url.pathname.endsWith('/rollback'))return send(200,await rollback(store,dir,String(d.revision)));
    if(url.pathname.endsWith('/invite'))return send(200,await invite(store,dir,d));
    return send(200,await revoke(store,dir,String(d.id)));
   }
   if(req.method==='GET'&&url.pathname==='/api/status')return send(200,{...store.status(),sync:sync.state()});
   if(req.method==='GET'&&url.pathname==='/api/sync')return send(200,sync.state());
   if((req.method==='POST'&&url.pathname==='/api/source/check')||(req.method==='PUT'&&url.pathname==='/api/source')){
    if(origin==='https://sessionize.com')return send(403,{error:'Sources are configured in the local workspace'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return send(413,{error:'Request too large'});}
    const input=JSON.parse(body);const saved=readSources(dir).find(s=>s.eventId===String(input.eventId));
    const source=input.url===undefined&&req.method==='POST'&&saved?saved:sourceInput(input);const result=await checkSource(source);
    const existing=store.list().filter(s=>s.eventId===source.eventId);const ids=new Set(result.sessions.map(s=>s.id));
    Object.assign(result.coverage,{existingCount:existing.length,missingExisting:existing.filter(s=>!ids.has(s.id)).length});
    if(req.method==='PUT'){requireCoverage(source,result,true);if(existing.length&&!existing.some(s=>ids.has(s.id)))throw new UserError('This endpoint has no sessions in common with the selected event. Check the event ID.');if(existing.some(s=>!ids.has(s.id))&&input.allowRemovalConfirmed!==true)throw new UserError('This endpoint omits currently imported sessions. Check all-status coverage before explicitly confirming removals.');saveSource(dir,source);if(!sync.configs().some(c=>c.eventId===source.eventId))sync.configure(source.eventId,false,60);}
    return send(200,{source:sourceSummary(source),coverage:result.coverage,checkedAt:result.capturedAt});
   }
   if((req.method==='POST' &&url.pathname==='/api/sync')||(req.method==='PUT'&&url.pathname==='/api/sync/config')){
    if(origin==='https://sessionize.com')return send(403,{error:'Sync is controlled in the local workspace'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return send(413,{error:'Request too large'});}
    const d=JSON.parse(body);
    if(req.method==='PUT')return send(200,{config:sync.configure(d.eventId,d.enabled,d.intervalMinutes)});
    if(!readSources(dir).some(s=>s.eventId===String(d.eventId))&&!sync.credential())return send(409,{error:'Configure Sessionize credentials locally first'});
    return send(202,{run:sync.enqueue(d.eventId)});
   }
   if(req.method==='GET'&&url.pathname==='/api/sessions')return send(200,{sessions:store.list(url.searchParams.get('q')||'',url.searchParams.get('topic')||'',profile).filter(s=>!url.searchParams.get('eventId')||s.eventId===url.searchParams.get('eventId')),labels,status:store.status()});
   if(req.method==='GET'&&url.pathname==='/api/badges')return send(200,{sessions:store.list('', '',profile).filter(s=>!url.searchParams.get('eventId')||s.eventId===url.searchParams.get('eventId')).map(s=>({id:s.id,eventId:s.eventId,title:s.title,abstract:s.abstract,topics:s.topics,findings:s.findings.filter(f=>store.eligible(f)&&f.kind!=='detector'&&(f.kind==='mechanical'||f.humanApproved===true)).map(f=>({label:labels[f.label],reason:f.reason,strength:f.strength}))}))});
   if(req.method==='POST'&&url.pathname==='/api/disposition'){
    if(origin==='https://sessionize.com')return send(403,{error:'Corrections are made in the local workspace'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required'});
    let body='';for await(const chunk of req){body+=chunk;if(body.length>16000)return send(413,{error:'Request too large'});}
    const d=JSON.parse(body);store.disposition(String(d.id),String(d.status),String(d.note||''));return send(200,{ok:true});
   }
   send(404,{error:'Not found'});
  }catch(e){send(400,{error:e instanceof UserError?e.message:'Could not process request. Check the input and try again.'});}
 });
 server.on('close',()=>{sync.stop();analysis.stop();detector.stop();releaseLock();});server.on('error',releaseLock);server.listen(port,'127.0.0.1',()=>{sync.start();detector.start();});return {server,tokenPath};
}
