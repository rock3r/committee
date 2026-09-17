import { readFileSync } from 'node:fs';
import { Store, hash } from './store.ts';
import type { Session, Finding } from './store.ts';
const arr=(v:any)=>Array.isArray(v)?v.map(String):v?[String(v)]:[];
export function importReview(store:Store,path:string,limit=40){
 const raw=readFileSync(path,'utf8'),d=JSON.parse(raw);
 if(!d.event_id)throw Error('Expected explicit event_id');
 if(!Array.isArray(d.sessions))throw Error('Expected sessions array');
 const all=d.sessions;
 // Deterministic strata, no rank or reviewer-vote input. Broad coverage, not a representative prevalence estimate.
 const buckets=[all.filter((s:any)=>s.claim_review?.warning),all.filter((s:any)=>s.slop_flag),all.filter((s:any)=>s.promotion?.warning),all.filter((s:any)=>s.novelty?.warning),all.filter((s:any)=>s.word_count<80),all.filter((s:any)=>!s.actionable)];
 const chosen=new Map();let index=0;
 while(chosen.size<Math.min(limit,all.length)){
  let progress=false;for(const bucket of buckets){if(bucket[index]&&chosen.size<limit){chosen.set(String(bucket[index].session_id),bucket[index]);progress=true;}}index++;
  if(!progress){for(const s of all){if(chosen.size>=limit)break;chosen.set(String(s.session_id),s);}break;}
 }
 const sessions:Session[]=[...chosen.values()].map((s:any)=>({id:String(s.session_id),eventId:String(d.event_id),title:s.title,abstract:s.abstract||'',speakers:(s.speakers||[]).map((x:any)=>typeof x==='string'?x:x.name||x.fullName||'Unknown'),topics:(s.topics||[]).map((t:any)=>typeof t==='string'?t:t.label||t.id).filter(Boolean),track:arr(s.track),format:arr(s.format),withdrawn:!!s.withdrawn}));
 const result=store.import(sessions,d.source_refreshed_at||d.review_date||'unknown',hash(raw));
 const current=new Map(store.list().map(s=>[s.id,s]));
 for(const s of chosen.values()){
  const v=current.get(String(s.session_id));if(!v)continue;
  const add=(label:string,reason:string,kind:string,quote='',strength='legacy / unverified')=>{if(reason)store.addFinding(v.versionId,{label,reason,kind,quote:v.abstract.includes(quote)?quote:'',strength,origin:'legacy-import',inputClasses:['abstract','legacy-analysis']});};
  if(s.slop_flag)add('vague',s.slop_reason,'editorial',s.evidence_quote);
  if(s.claim_review?.warning)add('claims',s.claim_review.reason,'claim');
  if(s.promotion?.warning)add('promotion',s.promotion.reason,'editorial');
  if(s.novelty?.warning)add('reuse',s.novelty.reason,'editorial');
  if(s.pangram)add('detector',`${s.pangram.headline||s.pangram.prediction_short||'Result available'}. Cached detector result; this is not an authorship probability or quality judgment.`,'detector','','cached detector');
 }
 return {...result,selection:'Stratified pilot; not a prevalence sample',jobs:store.runJobs()};
}
