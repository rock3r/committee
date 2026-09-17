import { validBundle } from './schema.js';
// The Worker serves approved bundles only. It never imports Sessionize or calls models.
const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const equal=async(a,b)=>Boolean(a&&b)&&(await sha(a))===(await sha(b));
const validId=v=>typeof v==='string'&&/^\d+$/.test(v);
const json=(data,status=200,extra={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra}});
export default {async fetch(req,env){
 const u=new URL(req.url);const origin=req.headers.get('Origin');const same=origin===u.origin;const cors=origin==='https://sessionize.com'?{'Access-Control-Allow-Origin':origin,'Vary':'Origin'}:{};
 if(origin&&!same&&origin!=='https://sessionize.com')return json({error:'Origin denied'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, OPTIONS'}});
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
 try{
  if(req.method==='GET'&&u.pathname==='/api/runtime')return json({mode:'reader',schemaVersion:1});
  if(u.pathname.startsWith('/admin/')){
   if(origin&&!same)return json({error:'Local publisher only'},403);
   if(!await equal(token,env.PUBLISH_TOKEN))return json({error:'Publisher authentication required'},401);
   if(req.method==='DELETE'&&/^\/admin\/readers\/[a-f0-9]{64}$/.test(u.pathname)){await env.BUNDLES.delete('readers/'+u.pathname.split('/').pop());return json({revoked:true});}
   if(req.method!=='POST')return json({error:'Not found'},404);
   if(Number(req.headers.get('Content-Length'))>16*1024*1024)return json({error:'Too large'},413);
   const text=await req.text();if(text.length>16*1024*1024)return json({error:'Too large'},413);const d=JSON.parse(text);
   if(u.pathname==='/admin/readers'){
    if(!/^[a-f0-9]{64}$/.test(d.id)||!Array.isArray(d.eventIds)||!d.eventIds.length||!d.eventIds.every(validId))return json({error:'Invalid reader'},400);
    await env.BUNDLES.put('readers/'+d.id,JSON.stringify({id:d.id,eventIds:d.eventIds,label:String(d.label||'Reader')}));return json({id:d.id});
   }
   if(u.pathname==='/admin/bundles'){
    if(!validBundle(d)||!validId(d.event?.id)||!Array.isArray(d.sessions)||!['strict-blind','collaborative','organiser'].includes(d.profile)||!/^[a-f0-9]{64}$/.test(d.revision))return json({error:'Invalid bundle'},400);
    const content={schemaVersion:d.schemaVersion,event:d.event,profile:d.profile,includeAbstracts:d.includeAbstracts,sessions:d.sessions};if(await sha(JSON.stringify(content))!==d.revision)return json({error:'Revision mismatch'},400);
    // Store the immutable object before switching the per-event pointer. Failed uploads preserve the old revision.
    await env.BUNDLES.put('bundles/'+d.revision,JSON.stringify(d));
    await env.BUNDLES.put('events/'+d.event.id,JSON.stringify({revision:d.revision}));return json({published:true,revision:d.revision,eventId:d.event.id});
   }
   return json({error:'Not found'},404);
  }
  if(u.pathname.startsWith('/api/')){
   if(!token)return json({error:'Connect using your reviewer invitation'},401,cors);
   const reader=await env.BUNDLES.get('readers/'+await sha(token));if(!reader)return json({error:'Connection expired or revoked'},401,cors);const access=await reader.json();
   if(req.method!=='GET')return json({error:'Read only'},405,cors);
   if(u.pathname==='/api/connection')return json({schemaVersion:1,label:access.label,eventIds:access.eventIds},200,cors);
   if(u.pathname==='/api/bundle'){
    const eventId=u.searchParams.get('eventId');if(!access.eventIds.includes(eventId))return json({error:'Event not permitted'},403,cors);
    const pointer=await env.BUNDLES.get('events/'+eventId);if(!pointer)return json({error:'No published bundle yet'},404,cors);const {revision}=await pointer.json();const object=await env.BUNDLES.get('bundles/'+revision);if(!object)return json({error:'Bundle unavailable'},503,cors);return new Response(object.body,{headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
   }
   return json({error:'Not found'},404,cors);
  }
  // Only source assets are served by ASSETS. No bundles, credentials or private files are deployed there.
  const asset=await env.ASSETS.fetch(req);let response=new Response(asset.body,asset);if(u.pathname==='/review-helper.user.js'&&asset.status===200){const code=(await response.text()).replace('// ==/UserScript==',`// @downloadURL  ${u.origin}/review-helper.user.js\n// @updateURL    ${u.origin}/review-helper.user.js\n// ==/UserScript==`);response=new Response(code,{status:200,headers:{'Content-Type':'text/javascript','Cache-Control':'no-cache'}});}response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");response.headers.set('Referrer-Policy','no-referrer');response.headers.set('X-Content-Type-Options','nosniff');return response;
 }catch{return json({error:'Request failed'},400,cors);}
}};
