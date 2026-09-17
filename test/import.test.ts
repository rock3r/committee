import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../src/store.ts';
import { importReview } from '../src/import.ts';
test('legacy review import requires an explicit event rather than assigning another conference',()=>{
 const dir=mkdtempSync(join(tmpdir(),'committee-import-'));const path=join(dir,'input.json');const store=new Store(':memory:');
 try{writeFileSync(path,JSON.stringify({sessions:[]}));assert.throws(()=>importReview(store,path),/explicit event_id/);assert.equal(store.list().length,0);}finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
