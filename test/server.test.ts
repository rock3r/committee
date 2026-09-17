import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.ts';
import { serve } from '../src/server.ts';
test('sync API requires authentication and local origin, validates schedule, and returns no secrets',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'committee-http-'));const store=new Store(':memory:');const {server,tokenPath}=serve(store,dir,0);await once(server,'listening');const port=(server.address() as any).port;const base=`http://127.0.0.1:${port}`;const headers={Authorization:`Bearer ${readFileSync(tokenPath,'utf8').trim()}`,'Content-Type':'application/json'};
 try{
  assert.throws(()=>serve(store,dir,0),/already uses/);
  assert.equal((await fetch(base+'/api/sync')).status,401);
  const state=await(await fetch(base+'/api/sync',{headers})).json();assert.deepEqual(state,{credentialConfigured:false,sources:[],configs:[],runs:[]});
  const body=JSON.stringify({eventId:'12',enabled:false,intervalMinutes:60});
  assert.equal((await fetch(base+'/api/sync/config',{method:'PUT',headers:{...headers,Origin:'https://sessionize.com'},body})).status,403);
  assert.equal((await fetch(base+'/api/sync/config',{method:'PUT',headers,body})).status,200);
  assert.equal((await fetch(base+'/api/sync/config',{method:'PUT',headers,body:JSON.stringify({eventId:'12',enabled:true,intervalMinutes:1})})).status,400);
  assert.equal((await fetch(base+'/api/sync',{method:'POST',headers,body:'{"eventId":"12"}'})).status,409);
  assert.equal((await fetch(base+'/api/status',{headers})).status,200);
  store.import([{id:'1',eventId:'12',title:'Synthetic',abstract:'Synthetic abstract.',speakers:['Example'],topics:[],track:[],format:[],withdrawn:false}],'2026-01-01','fixture');
  const version=store.list()[0].versionId;const id=store.addFinding(version,{label:'vague',kind:'editorial',origin:'analysis-v1:synthetic',inputClasses:['abstract'],reason:'Synthetic concern',quote:'Synthetic abstract.',humanApproved:false});
  const badges=async()=>await(await fetch(base+'/api/badges',{headers})).json();
  assert.equal((await badges()).sessions[0].findings.length,0);
  store.approveFinding(id,true,false);assert.equal((await badges()).sessions[0].findings.length,1);

 }finally{await new Promise<void>(r=>server.close(()=>r()));store.close();rmSync(dir,{recursive:true,force:true});}
});
