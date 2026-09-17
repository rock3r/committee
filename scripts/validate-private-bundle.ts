// Run only against a disposable PRIVATE database copy. Approval here is simulated,
// never written to the admin's working database. No external requests or uploads.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join,basename} from 'node:path';
import {Store} from '../src/store.ts';
import {makeBundle} from '../src/bundle.ts';
const [db,eventId,outdir]=process.argv.slice(2);
if(!db||basename(db)!=='validation-only-copy.sqlite'||!/^\d+$/.test(eventId)||!outdir)throw Error('Use a private validation-only-copy.sqlite, event ID and private output directory');
const store=new Store(db);try{
 const sessions=store.list().filter(s=>s.eventId===eventId);
 const opts={eventId,profile:'strict-blind' as const,includeAbstracts:false};
 const before=makeBundle(store,opts);const drafts=sessions.flatMap(s=>s.findings).filter(f=>f.origin.startsWith('analysis-')&&!f.humanApproved);
 const ids=new Set(drafts.map(f=>f.id));assert.ok(!before.sessions.some(s=>s.findings.some(f=>ids.has(f.id))));
 const candidate=drafts.find(f=>f.kind==='editorial'&&f.disposition!=='dismissed');assert.ok(candidate,'Need a real draft to test the publication boundary');
 store.audit('validation-simulation',{description:'Simulated approval in disposable copy only; not a human decision'});store.approveFinding(candidate.id,true,false);
 const after=makeBundle(store,opts);assert.ok(after.sessions.some(s=>s.findings.some(f=>f.id===candidate.id)));
 for(const s of after.sessions)for(const field of ['abstract','speakerProfiles','submittedFields','analysis','rank','votes','comments'])assert.ok(!(field in s));
 writeFileSync(join(outdir,'validation-reader-bundle.json'),JSON.stringify(after),{mode:0o600});
 const summary={eventId,sessions:sessions.length,analysed:sessions.filter(s=>s.analysis).length,cachedDetectorSignals:sessions.filter(s=>s.findings.some(f=>f.kind==='detector')).length,draftsExcluded:ids.size,simulatedApprovedFindings:1,revision:after.revision};
 writeFileSync(join(outdir,'validation-bundle-receipt.json'),JSON.stringify(summary,null,2),{mode:0o600});console.log(summary);
}finally{store.close();}
