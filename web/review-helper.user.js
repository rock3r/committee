// ==UserScript==
// @name         Committee — Sessionize review insights
// @namespace    committee-review
// @version      0.2.0
// @description  Optional evidence badges and topics from your committee's read-only workspace.
// @match        https://sessionize.com/app/*
// @icon         https://sessionize.com/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      *
// ==/UserScript==
(function(){'use strict';
const eventMatch=location.pathname.match(/\/organizer\/(?:sessions|session|speakers|speaker)\/(\d+)/)||location.pathname.match(/\/organizer\/event\/(?:evaluation\/(?:rate\/)?)?(\d+)/);
const eventId=eventMatch?.[1];let connection=GM_getValue('committeeConnection',null),bundle=null,inflight=null,generation=0,rendering=false,again=false;
const mounted=new WeakMap();let optional=GM_getValue('committeeContext',false);
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function request(c,path){return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url:c.origin+path,headers:{Authorization:'Bearer '+c.token},anonymous:true,timeout:20000,onload:r=>{if(r.status!==200)return reject(Error(r.status===401?'Connection expired or revoked. Ask the organiser for a new invitation.':'Could not load this event ('+r.status+').'));try{resolve(JSON.parse(r.responseText));}catch{reject(Error('Unexpected server response.'));}},onerror:()=>reject(Error('Could not connect. Check the site address and Tampermonkey connection permission.')),ontimeout:()=>reject(Error('Connection timed out. Try again.'))}));}
function parseCode(text){let d;try{const b=text.trim().replace(/-/g,'+').replace(/_/g,'/');d=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b),c=>c.charCodeAt(0))));}catch{throw Error('Paste the complete connection code from your committee website.');}const u=new URL(d.origin);if(d.schemaVersion!==1||u.protocol!=='https:'||u.origin!==d.origin||typeof d.token!=='string'||d.token.length<32||!Array.isArray(d.eventIds)||!d.eventIds.every(v=>typeof v==='string'&&/^\d+$/.test(v)))throw Error('Invalid committee invitation.');return d;}
async function connect(){const code=prompt('Paste the connection code from your committee website. No script editing is needed.');if(!code)return;try{const next=parseCode(code);const info=await request(next,'/api/connection');if(info.schemaVersion!==1)throw Error('Unsupported workspace version.');connection=next;GM_setValue('committeeConnection',next);generation++;bundle=null;clear();if(inflight)await inflight;await refresh();toast('Connected to '+new URL(next.origin).hostname);}catch(e){toast(e.message);}}
GM_registerMenuCommand('Connect Committee…',connect);
GM_registerMenuCommand('Refresh committee insights',()=>refresh(true));
GM_registerMenuCommand('Toggle optional speaker context',()=>{optional=!optional;GM_setValue('committeeContext',optional);clear();render();toast('Optional context '+(optional?'on':'off'));});
GM_registerMenuCommand('Disconnect Committee',()=>{generation++;connection=null;bundle=null;GM_setValue('committeeConnection',null);clear();toast('Committee disconnected');});
function clear(){document.querySelectorAll('[data-committee-ui]').forEach(n=>n.remove());hideTip();}
let toastTimer;function toast(text){let n=document.getElementById('committee-status');if(!n){n=el('div');n.id='committee-status';n.setAttribute('role','status');n.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#293846;color:white;padding:10px 16px;border-radius:5px;max-width:80vw;font:14px/1.5 sans-serif;box-shadow:0 3px 14px #0003';document.body.append(n);}n.textContent=text;clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.remove(),6500);}
let tip,tipOwner;function hideTip(){tipOwner?.removeAttribute('aria-describedby');tipOwner=null;tip?.remove();tip=null;}
function tooltip(node,text){node.addEventListener('mouseenter',()=>showTip(node,text));node.addEventListener('focus',()=>showTip(node,text));node.addEventListener('mouseleave',hideTip);node.addEventListener('blur',hideTip);}
function showTip(node,text){hideTip();tipOwner=node;tip=el('div',text);tip.id='committee-tooltip';tip.setAttribute('role','tooltip');node.setAttribute('aria-describedby',tip.id);tip.style.cssText='position:fixed;z-index:2147483647;background:#293846;color:white;padding:10px 12px;border-radius:4px;max-width:min(360px,calc(100vw - 24px));font:13px/1.5 sans-serif;box-shadow:0 4px 16px #0003;pointer-events:none';document.body.append(tip);const r=node.getBoundingClientRect(),t=tip.getBoundingClientRect();tip.style.left=Math.max(12,Math.min(r.left,innerWidth-t.width-12))+'px';tip.style.top=Math.max(12,r.top-t.height-8<12?Math.min(r.bottom+8,innerHeight-t.height-12):r.top-t.height-8)+'px';}
addEventListener('scroll',hideTip,true);addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});
function href(s,topic){const u=new URL(connection.origin+'/');u.searchParams.set('event',s.eventId);u.searchParams.set('session',s.id);if(topic)u.searchParams.set('topic',topic);return u.href;}
function chip(text,description,s,topic){const n=el('a',text);n.href=href(s,topic);n.target='_blank';n.rel='noopener noreferrer';n.style.cssText='display:inline-block;padding:3px 7px;border:1px solid #d6dce1;border-radius:3px;background:#f5f7f8;color:#536675;font-size:12px;line-height:1.4;text-decoration:none';tooltip(n,description);return n;}
async function refresh(notify=false){if(!connection||!eventId)return;if(!connection.eventIds.includes(eventId)){if(notify)toast('This invitation does not include this event.');return;}if(inflight)return inflight;const g=generation,c=connection;inflight=(async()=>{try{const next=await request(c,'/api/bundle?eventId='+eventId);if(g!==generation)return;if(next.schemaVersion!==1||next.event?.id!==eventId||!Array.isArray(next.sessions))throw Error('Unexpected event data.');bundle=next;await render();if(notify)toast('Insights updated · '+new Date(next.generatedAt).toLocaleString());}catch(e){if(g!==generation)return;bundle=null;clear();toast(e.message);}finally{inflight=null;}})();return inflight;}
const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function render(){if(rendering){again=true;return;}if(!bundle||!connection)return;rendering=true;const revision=bundle.revision;try{
 for(const link of document.querySelectorAll('a[href*="/app/organizer/session/"]')){
  const m=new URL(link.href).pathname.match(/\/session\/(\d+)\/(\d+)$/);if(!m||m[1]!==eventId)continue;const s=bundle.sessions.find(s=>s.id===m[2]);if(!s)continue;
  const card=link.closest('.ibox.evaluation-session'),holder=card||link.closest('td');if(!holder)continue;
  const desc=card?.querySelector('p.es-description'),title=card?.querySelector('h3.es-title')?.cloneNode(true);title?.querySelectorAll('.label,.badge').forEach(n=>n.remove());
  const titleText=title?.textContent.trim(),abstract=desc?.textContent.trim();const key=JSON.stringify([s.id,revision,optional,titleText,abstract]);if(mounted.get(holder)===key&&holder.querySelector('[data-committee-ui]'))continue;
  let stale=false;if(card){stale=!titleText||abstract===undefined||(await digest(JSON.stringify([titleText,abstract])))!==s.textHash;}
  if(!bundle||bundle.revision!==revision||!connection)return;
  holder.querySelectorAll('[data-committee-ui]').forEach(n=>n.remove());const box=el('div');box.dataset.committeeUi='badges';box.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:8px 0;font:12px/1.5 inherit';
  if(stale)box.append(chip('Review outdated','The title or abstract differs from the reviewed snapshot. Open the evidence to inspect it.',s));
  else{
   if(s.withdrawn)box.append(chip('Withdrawn','This submission was withdrawn in the published snapshot.',s));
   for(const f of s.findings||[]){if(f.optional&&!optional)continue;const n=chip(f.caption,f.reason,s);if(f.optional)n.style.borderStyle='dashed';box.append(n);}
  }
  for(const text of [...(s.track||[]),...(s.format||[])])box.append(chip(text,'Submission track or format supplied in Sessionize.',s));
  if(box.children.length){if(card){box.style.margin='10px 20px';card.insertBefore(box,card.querySelector('.es-rating')||card.firstChild);}else holder.append(box);}
  if(!stale&&s.topics?.length){const topics=el('div');topics.dataset.committeeUi='topics';topics.style.cssText='display:flex;flex-wrap:wrap;gap:5px;margin-top:10px';for(const t of s.topics)topics.append(chip(t,'See other submissions about '+t,s,t));if(desc)desc.after(topics);else holder.append(topics);}
  // Keep an empty marker for idempotence when there is nothing useful to display.
  if(!holder.querySelector('[data-committee-ui]')){const marker=el('span');marker.dataset.committeeUi='marker';marker.hidden=true;holder.append(marker);}mounted.set(holder,key);
 }
 }finally{rendering=false;if(again){again=false;void render();}}}
let debounce;new MutationObserver(ms=>{if(ms.every(m=>m.target.closest?.('[data-committee-ui],#committee-tooltip,#committee-status')||([...m.addedNodes,...m.removedNodes].length&&[...m.addedNodes,...m.removedNodes].every(n=>n.nodeType===1&&(n.matches?.('[data-committee-ui],#committee-tooltip,#committee-status'))))))return;clearTimeout(debounce);debounce=setTimeout(render,150);}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href']});
void refresh();setInterval(()=>{if(document.visibilityState==='visible')void refresh();},5*60*1000);
})();
