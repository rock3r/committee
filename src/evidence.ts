import { publicFetch } from './http.ts';
// Hosts are operator approved. The transport rejects non-global addresses and pins the socket's DNS result.
export async function fetchEvidence(url:string,allowedHosts:string[]):Promise<string>{
 const u=new URL(url);if(u.protocol!=='https:'||u.port&&u.port!=='443'||u.username||u.password||!allowedHosts.includes(u.hostname))throw Error('Evidence host is not approved');
 const r=await publicFetch(u.href,{redirect:'error',headers:{Accept:'text/html,text/plain'},signal:AbortSignal.timeout(20000)});
 if(r.status!==200||!/^text\/(html|plain)/.test(r.headers.get('content-type')||''))throw Error('Source page unavailable');
 const text=await r.text();if(text.length>1024*1024)throw Error('Source page too large');
 const main=text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||text;
 return main.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/\s+/g,' ').trim().slice(0,16000);
}
