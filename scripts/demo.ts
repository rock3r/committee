// Fictional records only. The demo never opens the operator's data directory.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.ts';
import { serve } from '../src/server.ts';
const dir = mkdtempSync(join(tmpdir(), 'committee-demo-'));
const store = new Store(join(dir, 'review.sqlite'));
const abstracts = [
 ['Tracing a slow startup', 'We will trace a cold start in a small Android application, identify work blocking the main thread, and measure the effect of deferring it. Attendees will learn how to capture a trace and compare startup measurements without confusing warm and cold launches.', ['Performance', 'Android']],
 ['Testing offline sync', 'A practical walkthrough of conflict handling in an offline-first application. We will simulate disconnected edits, replay queued operations, and test a deterministic merge strategy. The examples include failure cases and explain where manual conflict resolution is still necessary.', ['Testing', 'Data']],
 ['The future of everything', 'Discover revolutionary solutions that transform every application and guarantee success.', ['Architecture']]
];
store.import(abstracts.map(([title, abstract, topics], i) => ({id:String(i+1),eventId:'100',eventName:'Example Conference · synthetic demo',title:String(title),abstract:String(abstract),topics:topics as string[],speakers:[['Alex Example','Sam Sample','Morgan Demo'][i]],track:['Engineering'],format:['Session'],withdrawn:false})),new Date().toISOString(),'synthetic-demo');
store.runJobs();
const s=store.list().find(s=>s.id==='3')!;
store.addFinding(s.versionId,{label:'claims',kind:'claim',origin:'synthetic-demo',inputClasses:['abstract'],reason:'The abstract promises guaranteed success without stating a measurable outcome or supporting evidence. Ask for a concrete example and limits.',quote:'guarantee success',strength:'demo finding'});
const { tokenPath } = serve(store,dir,Number(process.env.PORT||43129));
console.log(`Synthetic demo: http://127.0.0.1:${process.env.PORT||43129}\nToken file: ${tokenPath}\nTemporary data: ${dir}`);
