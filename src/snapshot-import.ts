import { Store, hash } from './store.ts';
import { DetectorManager } from './detector.ts';
import { UserError } from './errors.ts';
const values=(v:any)=>Array.isArray(v)?v.map(String):typeof v==='string'?[v]:[];
export function importSnapshot(store:Store,raw:any){
 if(!/^\d+$/.test(String(raw.eventId))||!Array.isArray(raw.sessions)||!raw.sessions.length)throw new UserError('Invalid Sessionize snapshot');
 const sessions=raw.sessions.map((s:any)=>{if(typeof s.description!=='string'||!Array.isArray(s.speakers)||!s.speakers.length)throw new UserError('Missing abstract or speaker records');const f=s.fields||{};return {id:String(s.id),eventId:String(raw.eventId),eventName:raw.eventName||(store.db.prepare('SELECT name FROM event_metadata WHERE event_id=?').get(String(raw.eventId)) as any)?.name||('Sessionize event '+raw.eventId),title:s.title,abstract:s.description,speakers:s.speakers.map((p:any)=>p.name),speakerProfiles:s.speakers.map((p:any)=>({id:p.id,name:p.name,bio:p.bio||'',tagline:p.tagline||'',links:p.links||[]})),topics:values(f.Tags),track:values(f['Select Track/Event']||f.Track),format:values(f['Session format']),withdrawn:s.isWithdrawn===true,submittedFields:{'Share your experience with this topic':f['Share your experience with this topic']||''}};});
 const result=store.import(sessions,raw.capturedAt,hash(raw),String(raw.eventId));store.runJobs();return result;
}
// Import the provider's original output keyed by exact normalized input, not session ID.
// Edited abstracts are deliberately left unmatched and are never submitted automatically.
export function importPangram(store:Store,dir:string,eventId:string,raw:any,reuseReview:Record<string,string>={}){
 if(typeof raw.model!=='string'||!Array.isArray(raw.pages))throw new UserError('Invalid Pangram bulk export');
 const manager=new DetectorManager(store,dir);let imported=0,matched=0;const normalized=(s:string)=>s.normalize('NFKC').trim().replace(/\s+/g,' ');
 const sessions=store.list().filter(s=>s.eventId===eventId);
 for(const page of raw.pages)for(const item of page.items||[]){const r=item.result;if(item.stage!=='STAGE_SUCCESS'||typeof r?.text!=='string'||typeof r.headline!=='string'||!Number.isFinite(r.fraction_ai)||r.fraction_ai<0||r.fraction_ai>1)continue;const text=normalized(r.text),id=hash(['pangram',raw.model,text]);const versions=sessions.filter(s=>normalized(s.abstract)===text).map(s=>s.versionId);const job={id,eventId,versionIds:versions,text,model:raw.model,status:'done',taskId:item.task_id,result:{headline:r.headline,fraction_ai:r.fraction_ai},source:'imported-pangram-bulk',createdAt:new Date().toISOString(),polls:0};manager.save(job);for(const version of versions)manager.attach(version,job);imported++;matched+=versions.length;
 const edited=sessions.find(s=>s.id===String(item.id)&&normalized(s.abstract)!==text);const reason=reuseReview[String(item.id)];if(edited&&typeof reason==='string'&&reason.trim()){const newText=normalized(edited.abstract);const reused={...job,id:hash(['pangram',raw.model,newText]),versionIds:[edited.versionId],text:newText,reusedFrom:id,reuseReason:reason};manager.save(reused);manager.attach(edited.versionId,reused);matched++;store.audit('detector-minor-edit-reuse',{sessionId:edited.id,oldInputHash:hash(text),newInputHash:hash(newText),reason,reviewedBy:'operator-supplied-review'});}}
 manager.stop();store.audit('pangram-cache-import',{eventId,imported,matched,unmatched:sessions.length-matched});return {imported,matched,unmatched:sessions.length-matched,paidRequests:0};
}
