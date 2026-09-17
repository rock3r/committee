import { outboundFetch } from './http.ts';
import { UserError } from './errors.ts';
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hash, now } from './store.ts';

export type ApiSource = {eventId:string;eventName:string;url:string;allStatusesConfirmed:boolean;unscheduledConfirmed:boolean;expectedCount:number;requiredFields:string[];checkedAt?:string};
export function apiURL(value:unknown):string {
 let u:URL;try{u=new URL(String(value));}catch{throw new UserError('Paste the Sessionize JSON All endpoint URL');}
 if(u.origin!=='https://sessionize.com'||u.username||u.password||u.search||u.hash||!/^\/api\/v2\/[a-zA-Z0-9]+\/view\/All\/?$/.test(u.pathname))throw new UserError('Use https://sessionize.com/api/v2/<endpoint>/view/All');
 return u.href.replace(/\/$/,'');
}
export function sourceInput(d:any):ApiSource {
 if(!d||!/^\d+$/.test(String(d.eventId))||typeof d.eventName!=='string'||!d.eventName.trim()||d.eventName.length>200)throw new UserError('An event ID and name are required');
 if(!Number.isInteger(d.expectedCount)||d.expectedCount<1||d.expectedCount>100000)throw new UserError('Expected submission count must be a positive integer');
 if(!Array.isArray(d.requiredFields)||d.requiredFields.some((s:any)=>typeof s!=='string'||s.length>200))throw new UserError('Invalid required fields');
 return {eventId:String(d.eventId),eventName:d.eventName.trim(),url:apiURL(d.url),allStatusesConfirmed:d.allStatusesConfirmed===true,unscheduledConfirmed:d.unscheduledConfirmed===true,expectedCount:d.expectedCount,requiredFields:[...new Set<string>(d.requiredFields)]};
}
export function readSources(dir:string):ApiSource[]{const file=join(dir,'sessionize-sources.json');return existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];}
export function saveSource(dir:string,source:ApiSource){const all=readSources(dir).filter(s=>s.eventId!==source.eventId);all.push({...source,checkedAt:now()});const file=join(dir,'sessionize-sources.json');writeFileSync(file+'.tmp',JSON.stringify(all),{mode:0o600});renameSync(file+'.tmp',file);}
export function sourceSummary(s:ApiSource){const {url,...safe}=s;return {...safe,kind:'sessionize-api',configured:true};}

export async function fetchAPI(url:string,transport:typeof fetch=outboundFetch){
 // Do not forward cookies, credentials, redirect destinations or error bodies.
 for(let attempt=0;attempt<3;attempt++){
  let r:Response;try{r=await transport(apiURL(url),{redirect:'error',headers:{Accept:'application/json'},signal:AbortSignal.timeout(30000)});}catch{throw new UserError('Sessionize API could not be reached; check the endpoint and retry');}
  if((r.status===429||r.status>=500)&&attempt<2){await r.body?.cancel();await new Promise(r=>setTimeout(r,500*(attempt+1)));continue;}
  if(!r.ok)throw new UserError('Sessionize API refused the request; check that the endpoint is enabled');
  if(!r.headers.get('content-type')?.includes('application/json'))throw new UserError('Sessionize did not return JSON');
  const reader=r.body?.getReader();if(!reader)throw new UserError('Empty API response');const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16*1024*1024){await reader.cancel();throw new UserError('API response exceeds 16 MB');}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new UserError('Invalid API JSON');}
 }
 throw new UserError('Sessionize API temporarily unavailable');
}
const list=(v:any)=>{if(!Array.isArray(v))throw new UserError('Incomplete Sessionize All response');return v;};
const id=(v:any)=>{if(!['string','number'].includes(typeof v)||!String(v))throw new UserError('Invalid API identifier');return String(v);};
const unique=(items:any[],key:(v:any)=>string)=>{const map=new Map<string,any>();for(const item of items){const k=key(item);if(map.has(k))throw new UserError('Duplicate API identifier');map.set(k,item);}return map;};
export function normalizeAPI(raw:any,source:Pick<ApiSource,'eventId'|'eventName'>){
 const speakers=unique(list(raw.speakers),p=>id(p.id));const categories=list(raw.categories);const questions=list(raw.questions);
 const categoryMap=new Map<string,{group:string,value:string}>();
 for(const c of categories){if(typeof c.title!=='string')throw new UserError('Invalid category');for(const v of list(c.items)){const k=id(v.id);if(categoryMap.has(k)||typeof v.name!=='string')throw new UserError('Invalid category item');categoryMap.set(k,{group:c.title,value:v.name});}}
 const questionMap=unique(questions,q=>id(q.id));
 const fields=(record:any)=>{const out:Record<string,string[]>={};for(const key of list(record.categoryItems)){const c=categoryMap.get(id(key));if(!c)throw new UserError('Missing category definition');(out[c.group]??=[]).push(c.value);}for(const a of list(record.questionAnswers)){const q=questionMap.get(id(a.questionId));if(!q||typeof q.question!=='string')throw new UserError('Missing question definition');(out[q.question]??=[]).push(String(a.answerValue??''));}return out;};
 const profiles=new Map<string,any>();for(const [key,p] of speakers){if(typeof p.fullName!=='string'||!p.fullName.trim())throw new UserError('Speaker name is missing');profiles.set(key,{id:key,name:p.fullName,bio:typeof p.bio==='string'?p.bio:'',tagline:typeof p.tagLine==='string'?p.tagLine:'',links:list(p.links).filter((l:any)=>typeof l.url==='string'&&/^https?:\/\//.test(l.url)).map((l:any)=>({title:String(l.title||''),url:l.url})),submittedFields:fields(p)});}
 const records=list(raw.sessions);unique(records,s=>id(s.id));const statuses:Record<string,number>={};let serviceSessions=0;
 const sessions=records.filter((s:any)=>{if(s.isServiceSession===true){serviceSessions++;return false;}return true;}).map((s:any)=>{
  if(typeof s.title!=='string'||!s.title.trim()||typeof s.description!=='string')throw new UserError('Session title or description is missing; enable these fields');
  const ps=list(s.speakers).map((key:any)=>{const p=profiles.get(id(key));if(!p)throw new UserError('Missing speaker record');return p;});if(!ps.length)throw new UserError('Submission has no speaker; check endpoint fields');
  const submittedFields=fields(s);const cat=(pattern:RegExp)=>Object.entries(submittedFields).filter(([k])=>pattern.test(k)).flatMap(([,v])=>v).sort();
  const status=typeof s.status==='string'?s.status:'Unknown';statuses[status]=(statuses[status]||0)+1;
  return {id:id(s.id),eventId:source.eventId,eventName:source.eventName,title:s.title,abstract:s.description,speakers:ps.map((p:any)=>p.name),speakerProfiles:ps,topics:cat(/^(tags?|topics?)$/i),track:cat(/^track$/i),format:cat(/^(session format|session type|format|type)$/i),withdrawn:/^withdrawn$/i.test(status),status,statusKnown:status!=='Unknown',submittedFields};
 });
 const availableFields=[...new Set([...categories.map((c:any)=>c.title),...questions.map((q:any)=>q.question)])].sort();
 return {sessions,coverage:{count:sessions.length,speakers:new Set(sessions.flatMap((s:any)=>s.speakerProfiles.map((p:any)=>p.id))).size,serviceSessions,statuses,availableFields,missingAbstracts:sessions.filter((s:any)=>!s.abstract.trim()).length,reviewerDataAvailable:false,scopeVerified:false,warnings:['The API does not prove its status/category filters. Confirm All, no category limits, and include unscheduled in Sessionize.','Reviewer votes and comments are not imported by this connector.']}};
}
export async function checkSource(source:ApiSource,transport:typeof fetch=outboundFetch){const raw=await fetchAPI(source.url,transport);const result=normalizeAPI(raw,source);const missing=source.requiredFields.filter(f=>!result.coverage.availableFields.includes(f));return {...result,coverage:{...result.coverage,missingRequiredFields:missing,expectedCount:source.expectedCount,countMatches:source.expectedCount===result.sessions.length},sourceHash:hash(raw),capturedAt:now()};}
export function requireCoverage(source:ApiSource,result:Awaited<ReturnType<typeof checkSource>>,initial=false){
 if(!source.allStatusesConfirmed||!source.unscheduledConfirmed)throw new UserError('Confirm All statuses, no category filters, and unscheduled sessions before saving');
 if(result.coverage.missingRequiredFields.length)throw new UserError('Required custom fields are missing from the API');
 if(initial?result.sessions.length!==source.expectedCount:result.sessions.length<source.expectedCount)throw new UserError('Submission count changed or is incomplete. Check the endpoint and confirm the count again');
}
