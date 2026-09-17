import { hash, Store } from './store.ts';
export type Rule={purpose:string,provider:string,fields:string[]};
// Adapters are injected. The broker rejects unapproved field classes before any transport executes.
export class Broker {
 store:Store;rules:Rule[];ceiling:number;
 constructor(store:Store,rules:Rule[],ceiling:number){this.store=store;this.rules=rules;this.ceiling=ceiling;}
 async execute(purpose:string,provider:string,payload:Record<string,unknown>,costCeiling:number,transport:(payload:Record<string,unknown>)=>Promise<unknown>){
  const rule=this.rules.find(r=>r.purpose===purpose&&r.provider===provider);
  if(!rule||Object.keys(payload).some(f=>!rule.fields.includes(f)))throw Error('Outbound request denied by field policy');
  if(!Number.isFinite(costCeiling)||costCeiling<0||costCeiling>this.ceiling)throw Error('Request exceeds remaining budget');
  this.ceiling-=costCeiling;const requestHash=hash([purpose,provider,payload]);
  this.store.audit('provider-start',{purpose,provider,fields:Object.keys(payload),requestHash,costCeiling});
  try{const result=await transport(payload);this.store.audit('provider-complete',{requestHash});return result;}
  catch(e){this.store.audit('provider-failed',{requestHash});throw e;}
 }
}
