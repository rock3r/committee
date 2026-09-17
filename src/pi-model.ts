import { spawn } from 'node:child_process';
import { UserError } from './errors.ts';
export class PiResponseError extends UserError {
 diagnostic:unknown;
 constructor(message:string,diagnostic:unknown){super(message);this.diagnostic=diagnostic;}
}
export function parsePiResponse(out:string,code:number|null){
 const records=out.split('\n').flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
 const m=records.filter(e=>e.type==='message_end'&&e.message?.role==='assistant').at(-1)?.message;
 const diagnostic={exitCode:code,message:m||null};
 if(code!==0)throw new PiResponseError('Pi exited unsuccessfully; diagnostic saved locally',diagnostic);
 if(m?.stopReason!=='stop')throw new PiResponseError('Pi response did not finish normally; diagnostic saved locally',diagnostic);
 const text=(m.content||[]).filter((c:any)=>c.type==='text').map((c:any)=>c.text).join('').trim();
 const json=text.replace(/^```(?:json)?\s*|\s*```$/g,'');
 try{return {value:JSON.parse(json),usage:m.usage||null,syntaxRepair:null};}
 catch{
  // A completed response occasionally omits only the enclosing object's final brace.
  // Never repair strings, array elements, internal punctuation, or truncated responses.
  if(json.startsWith('{')&&/[}\]]$/.test(json))try{return {value:JSON.parse(json+'}'),usage:m.usage||null,syntaxRepair:'added-final-object-brace'};}catch{}
  throw new PiResponseError('Pi returned invalid JSON; diagnostic saved locally',diagnostic);
 }
}
// Credentials stay in the operator's Pi installation. Submitted content travels on stdin,
// never in process arguments; analysis actors have no tools or workspace context.
export function piChat(model:{provider?:string;model:string},system:string,payload:unknown){
 return new Promise<{value:any;usage:any}>((resolve,reject)=>{
  if(!model.provider||!/^[\w.-]+$/.test(model.provider))return reject(new UserError('Invalid Pi provider'));
  const child=spawn('pi',['--provider',model.provider,'--model',model.model,'--thinking','low','--print','--mode','json','--no-tools','--no-session','--no-skills','--no-context-files','--no-prompt-templates','--system-prompt',system],{cwd:'/tmp',stdio:['pipe','pipe','ignore']});
  let out='',failed=false;const fail=(message:string)=>{if(failed)return;failed=true;child.kill();clearTimeout(timer);reject(new UserError(message));};
  const timer=setTimeout(()=>fail('Pi request timed out; not automatically retried'),240000);
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{out+=chunk;if(out.length>4*1024*1024)fail('Pi response exceeds size limit');});
  child.stdin.on('error',()=>{});child.on('error',()=>fail('Pi could not start'));
  child.on('close',code=>{clearTimeout(timer);if(failed)return;try{resolve(parsePiResponse(out,code));}catch(error){reject(error);}});
  child.stdin.end(JSON.stringify(payload));
 });
}
