import { UserError } from './errors.ts';
import { Store, hash, now, labels } from './store.ts';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
export type BundleOptions={eventId:string;profile:'strict-blind'|'collaborative'|'organiser';includeAbstracts:boolean};
export function makeBundle(store:Store,options:BundleOptions){
 if(!options||!['strict-blind','collaborative','organiser'].includes(options.profile)||typeof options.includeAbstracts!=='boolean')throw new UserError('Invalid bundle options');
 const sessions=store.list('','',options.profile).filter(s=>s.eventId===options.eventId);if(!sessions.length)throw new UserError('No submissions for this event');
 const projectFinding=(f:any)=>({id:f.id,label:f.label,caption:labels[f.label],kind:f.kind,strength:f.strength,reason:f.reason,...(f.quote?{quote:f.quote}:{}),sources:(f.sources||[]).map((s:any)=>({url:s.url,title:s.title,...(s.date?{date:s.date}:{})})),optional:f.kind==='speaker',inputClasses:f.inputClasses});
 const records=sessions.map(s=>({id:s.id,eventId:s.eventId,title:s.title,speakers:s.speakers,topics:s.topics,track:s.track,format:s.format,withdrawn:s.withdrawn,contentHash:s.contentHash,textHash:hash([s.title.trim(),s.abstract.trim()]),...(options.includeAbstracts?{abstract:s.abstract}:{}),findings:s.findings.filter(f=>store.eligible(f)&&(f.kind==='mechanical'||f.humanApproved===true)).map(projectFinding)}));
 const event=(store.status().events as any[]).find(e=>e.eventId===options.eventId);
 const data={schemaVersion:1,event:{id:options.eventId,name:event?.name||options.eventId,capturedAt:event?.capturedAt||null},profile:options.profile,includeAbstracts:options.includeAbstracts,sessions:records};
 const revision=hash(data);return {...data,revision,generatedAt:now()};
}
export function previewBundle(store:Store,dir:string,options:BundleOptions){
 const bundle=makeBundle(store,options);const folder=join(dir,'publication');mkdirSync(folder,{recursive:true,mode:0o700});writeFileSync(join(folder,bundle.revision+'.json'),JSON.stringify(bundle),{mode:0o600});
 return {revision:bundle.revision,options,event:bundle.event,sessions:bundle.sessions.length,findings:bundle.sessions.reduce((n,s)=>n+s.findings.length,0),bytes:Buffer.byteLength(JSON.stringify(bundle)),fields:['session ID','title','speaker names','topics','track','format','withdrawn','approved finding text and source URLs',...(options.includeAbstracts?['abstract']:[])],excluded:['raw submission fields','speaker biographies','private notes','reviewer comments and votes','credentials','unapproved non-mechanical findings'],bundle};
}
export function loadPreview(dir:string,revision:string){if(!/^[a-f0-9]{64}$/.test(revision))throw new UserError('Invalid revision');return JSON.parse(readFileSync(join(dir,'publication',revision+'.json'),'utf8'));}
