import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePiResponse,PiResponseError} from '../src/pi-model.ts';
const response=(text:string,stopReason='stop')=>JSON.stringify({type:'message_end',message:{role:'assistant',stopReason,content:[{type:'text',text}]}});
test('Pi accepts complete JSON and fenced JSON but never salvages truncated output',()=>{
 assert.deepEqual(parsePiResponse(response('  ```json\n{"findings":[]}\n```  '),0).value,{findings:[]});
 assert.throws(()=>parsePiResponse(response('{"findings":[]}','length'),0),PiResponseError);
 assert.throws(()=>parsePiResponse(response('{"findings":['),0),PiResponseError);
});
test('Pi exposes only a safe error while retaining provider diagnostics locally',()=>{
 try{parsePiResponse(response('private provider detail','error'),0);assert.fail();}catch(e){assert.ok(e instanceof PiResponseError);assert.ok(!e.message.includes('private provider detail'));assert.ok(JSON.stringify(e.diagnostic).includes('private provider detail'));}
});

test('a completed object missing only its final brace is repaired with provenance',()=>{const r=parsePiResponse(response('{"findings":[]'),0);assert.deepEqual(r.value,{findings:[]});assert.equal(r.syntaxRepair,'added-final-object-brace');assert.throws(()=>parsePiResponse(response('{"findings":["unfinished'),0));});
