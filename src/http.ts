import { spawn } from 'node:child_process';
// Uses the same Python runtime as the legacy collector, without a browser cookie jar.
// No retries here: a timed-out paid POST may already have succeeded remotely.
const request=async(input:any,init:RequestInit={},publicOnly=false):Promise<Response>=>{
 const url=String(input);if(new URL(url).protocol!=='https:')throw Error('HTTPS required');
 if(init.body!==undefined&&typeof init.body!=='string')throw Error('Only JSON/text request bodies are supported');
 return new Promise<Response>((resolve,reject)=>{
  const child=spawn('python3',[new URL('../scripts/http_request.py',import.meta.url).pathname],{stdio:['pipe','pipe','ignore']});let output='';let failed=false;
  const abort=()=>{failed=true;child.kill();reject(Error('HTTPS request interrupted'));};
  const timeout=setTimeout(abort,95000);const signal=init.signal;if(signal?.aborted){abort();clearTimeout(timeout);return;}signal?.addEventListener('abort',abort,{once:true});
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>24*1024*1024)abort();});child.stdin.on('error',()=>{});
  child.on('error',()=>{clearTimeout(timeout);signal?.removeEventListener('abort',abort);reject(Error('Python HTTPS transport could not start'));});
  child.on('close',code=>{clearTimeout(timeout);signal?.removeEventListener('abort',abort);if(failed)return;try{if(code!==0)throw Error();const d=JSON.parse(output);if(d.error)throw Error();if(d.status>=300&&d.status<400&&init.redirect==='error')throw Error();const headers=new Headers(d.headers);headers.delete('content-encoding');headers.delete('content-length');resolve(new Response([204,205,304].includes(d.status)?null:d.body,{status:d.status,headers}));}catch{reject(Error('HTTPS request failed'));}});
  child.stdin.end(JSON.stringify({url,method:init.method||'GET',headers:Object.fromEntries(new Headers(init.headers).entries()),body:init.body,publicOnly}));
 });
};

export const outboundFetch:typeof fetch=(input,init)=>request(input,init);
export const publicFetch:typeof fetch=(input,init)=>request(input,init,true);
