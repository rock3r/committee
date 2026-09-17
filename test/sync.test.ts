import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.ts';
import { SyncManager,configureCredential } from '../src/sync.ts';
const s=(id='1')=>({id,eventId:'12',title:'A proposal',abstract:'A test abstract',speakers:['Example'],topics:['Compose'],track:['Android'],format:['Session'],withdrawn:false});
const setup=(runner:any)=>{const dir=mkdtempSync(join(tmpdir(),'committee-sync-'));const cookie=join(dir,'cookies');writeFileSync(cookie,'fixture');configureCredential(dir,cookie);const store=new Store(':memory:');const sync=new SyncManager(store,dir,runner);return{dir,store,sync,close(){sync.stop();store.close();rmSync(dir,{recursive:true,force:true});}};};
const settle=async(sync:SyncManager)=>{for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,5));if(!sync.busy&&!sync.runs().some(r=>r.status==='queued'))return;}throw Error('Did not settle');};
const snapshot=(out:string,sessions:any[])=>writeFileSync(join(out,'snapshot.json'),JSON.stringify({eventId:'12',capturedAt:new Date().toISOString(),complete:true,sessions}));
test('sync is single flight, complete import replaces only the event, and same content retains findings',async()=>{
 let calls=0;const f=setup(async(_e:any,_c:any,out:string,p:any)=>{calls++;p({stage:'details',completed:1,total:1});snapshot(out,[s()]);});
 try{f.store.import([s('2')],'2025-01-01','old');f.store.import([{...s('3'),eventId:'13'}],'2025-01-01','other');const a=f.sync.enqueue('12'),b=f.sync.enqueue('12');assert.equal(a.id,b.id);await settle(f.sync);assert.equal(calls,1);assert.equal(f.sync.runs()[0].status,'succeeded');assert.deepEqual(f.store.list().map(s=>s.id).sort(),['1','3']);f.sync.enqueue('12');await settle(f.sync);assert.equal(f.sync.runs()[0].result.changed,0);assert.equal(f.store.db.prepare('SELECT count(*) n FROM versions').get()!.n,3);}finally{f.close();}
});
test('authentication failures preserve current data and suspend scheduled retries',async()=>{
 const f=setup(async()=>{const e:any=Error('Reconnect locally');e.code='auth_required';throw e;});
 try{f.store.import([s()],'2025-01-01','old');f.sync.configure('12',true,60);f.sync.enqueue('12');await settle(f.sync);assert.equal(f.store.list().length,1);assert.equal(f.sync.state().configs[0].nextDue,null);assert.equal(f.sync.runs()[0].status,'auth_required');assert.equal(JSON.stringify(f.sync.state()).includes('cookiePath'),false);}finally{f.close();}
});
test('invalid complete snapshot rolls back removal and schedule settings validate',async()=>{
 const f=setup(async(_e:any,_c:any,out:string)=>snapshot(out,[s('2'),{...s('3'),title:''}]));
 try{f.store.import([s()],'2025-01-01','old');assert.throws(()=>f.sync.configure('12',true,1));assert.throws(()=>f.sync.enqueue('../12'));f.sync.enqueue('12');await settle(f.sync);assert.equal(f.sync.runs()[0].status,'failed');assert.deepEqual(f.store.list().map(s=>s.id),['1']);}finally{f.close();}
});
test('periodic tick queues one due run and advances next due after success',async()=>{
 let calls=0;const f=setup(async(_e:any,_c:any,out:string)=>{calls++;snapshot(out,[]);});
 try{f.store.import([s()],'2025-01-01','old');const c=f.sync.configure('12',true,15);f.sync.saveConfig({...c,nextDue:'2020-01-01'});f.sync.tick();f.sync.tick();await settle(f.sync);assert.equal(calls,1);assert.equal(f.store.list().length,0);assert.ok(Date.parse(f.sync.configs()[0].nextDue)>Date.now());}finally{f.close();}
});
test('active queue is not truncated by the visible history window',async()=>{
 let calls=0;const f=setup(async(_e:any,_c:any,out:string)=>{calls++;snapshot(out,[s()]);});
 try{const run=f.sync.enqueue('12');for(let i=0;i<101;i++)f.sync.saveRun({id:`history-${i}`,eventId:'13',status:'succeeded'});assert.equal(f.sync.enqueue('12').id,run.id);await settle(f.sync);assert.equal(calls,1);assert.equal(f.store.list().length,1);}finally{f.close();}
});
test('API sync does not overwrite a source changed while a fetch is in flight',async()=>{
 const {saveSource,readSources}=await import('../src/sessionize-api.ts');const dir=mkdtempSync(join(tmpdir(),'committee-api-race-'));const store=new Store(':memory:');const source={eventId:'12',eventName:'Synthetic',url:'https://sessionize.com/api/v2/first/view/All',expectedCount:1,requiredFields:[],allStatusesConfirmed:true,unscheduledConfirmed:true};saveSource(dir,source);store.import([s()],'2025-01-01','old');let release:any;const sync=new SyncManager(store,dir,undefined,async()=>{await new Promise(r=>release=r);return {sessions:[s('2')],coverage:{missingRequiredFields:[]},sourceHash:'new',capturedAt:new Date().toISOString()} as any;});try{sync.enqueue('12');await new Promise(r=>setTimeout(r,5));saveSource(dir,{...source,url:'https://sessionize.com/api/v2/second/view/All'});release();await settle(sync);assert.equal(sync.runs()[0].status,'failed');assert.deepEqual(store.list().map(s=>s.id),['1']);assert.ok(readSources(dir)[0].url.includes('second'));}finally{sync.stop();store.close();rmSync(dir,{recursive:true,force:true});}
});
