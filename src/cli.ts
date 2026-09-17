import { importSnapshot, importPangram } from './snapshot-import.ts';
import { resolve,join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateAnalysisConfig } from './analysis.ts';
import { Store } from './store.ts';
import { importReview } from './import.ts';
import { serve } from './server.ts';
import { configureCredential } from './sync.ts';
process.umask(0o077);
const [command,arg]=process.argv.slice(2);const dir=resolve(process.env.REVIEW_HELPER_DATA||'../review-helper-private');const store=new Store(join(dir,'review.sqlite'));
try{
 if(command==='import-snapshot')console.log(importSnapshot(store,JSON.parse(readFileSync(resolve(arg),'utf8'))));
 else if(command==='import-pangram'){if(!process.env.EVENT_ID)throw Error('Set EVENT_ID for the target event');console.log(importPangram(store,dir,process.env.EVENT_ID,JSON.parse(readFileSync(resolve(arg),'utf8')),process.env.PANGRAM_REUSE_REVIEW?JSON.parse(readFileSync(process.env.PANGRAM_REUSE_REVIEW,'utf8')):{}));}
 else if(command==='import')console.log(importReview(store,resolve(arg),Number(process.env.PILOT_SIZE||40)));
 else if(command==='findings'){
  const records=JSON.parse(readFileSync(arg,'utf8'));for(const r of records){const s=store.list().find(s=>s.id===String(r.sessionId)&&s.eventId===String(r.eventId));if(!s||s.contentHash!==r.contentHash)throw Error('Finding packet content mismatch');store.addFinding(s.versionId,r.finding);}console.log({imported:records.length});
 }
 else if(command==='sessionize-auth'){configureCredential(dir,arg);console.log('Sessionize cookie file configured locally.');}
 else if(command==='analysis-config'){const c=validateAnalysisConfig(JSON.parse(readFileSync(arg,'utf8')));writeFileSync(join(dir,'analysis-config.json'),JSON.stringify(c),{mode:0o600});console.log('Analysis configuration saved locally. Restart the service after changing credential environment variables.');}
 else if(command==='jobs')console.log(store.runJobs());
 else if(command==='status')console.log(store.status());
 else if(command==='serve'){const {tokenPath}=serve(store,dir,Number(process.env.PORT||43127));console.log(`Review Helper: http://127.0.0.1:${process.env.PORT||43127}\nToken file (keep private): ${tokenPath}`);}
 else console.log('Commands: import-snapshot <snapshot.json> | import-pangram <bulk.json> | import <review.json> | findings <packet.json> | jobs | status | sessionize-auth <cookies.txt> | analysis-config <config.json> | serve');
}finally{if(command!=='serve')store.close();}
