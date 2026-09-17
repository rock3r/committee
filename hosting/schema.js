const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const strings=v=>Array.isArray(v)&&v.every(x=>typeof x==='string');
export function validBundle(d){
 if(!keys(d,['schemaVersion','event','profile','includeAbstracts','sessions','revision','generatedAt'])||d.schemaVersion!==1||!keys(d.event,['id','name','capturedAt'])||!/^\d+$/.test(d.event.id)||typeof d.event.name!=='string'||!Array.isArray(d.sessions)||d.sessions.length>100000||typeof d.includeAbstracts!=='boolean')return false;
 const ids=new Set();
 return d.sessions.every(s=>{
  if(!keys(s,['id','eventId','title','speakers','topics','track','format','withdrawn','contentHash','textHash','abstract','findings'])||typeof s.id!=='string'||ids.has(s.id)||s.eventId!==d.event.id||typeof s.title!=='string'||![s.speakers,s.topics,s.track,s.format].every(strings)||typeof s.withdrawn!=='boolean'||!Array.isArray(s.findings)||('abstract' in s&&(!d.includeAbstracts||typeof s.abstract!=='string')))return false;ids.add(s.id);
  return s.findings.every(f=>keys(f,['id','label','caption','kind','strength','reason','quote','sources','optional','inputClasses'])&&typeof f.reason==='string'&&typeof f.caption==='string'&&strings(f.inputClasses)&&Array.isArray(f.sources)&&f.sources.every(p=>keys(p,['url','title','date'])&&typeof p.title==='string'&&typeof p.url==='string'&&p.url.startsWith('https://')));
 });
}
