import { readdirSync,readFileSync,statSync,existsSync } from 'node:fs';
import { join,dirname,resolve } from 'node:path';
const roots=['src','web','hosting','scripts','test','docs','.github'];
const files=['DESIGN.md','PRODUCT.md','.gitignore','README.md','CONTRIBUTING.md','SECURITY.md','package.json','package-lock.json','tsconfig.json','eslint.config.mjs'];
function walk(path){for(const name of readdirSync(path)){if(name==='__pycache__'||name==='.wrangler'||name.startsWith('.dev.vars'))continue;const p=join(path,name);if(statSync(p).isDirectory())walk(p);else files.push(p);}}
roots.forEach(walk);
const errors=[];
for(const file of files){
 if(/\.(sqlite|db|log|csv|zip)(?:$|\.)/i.test(file))errors.push(`${file}: data or generated artifact in release source`);
 if(file.endsWith('.png'))continue;
 const text=readFileSync(file,'utf8');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))errors.push(`${file}: private key`);
 if(/sk-(?:proj-)?[A-Za-z0-9_-]{30,}/.test(text))errors.push(`${file}: possible API key`);
 if(/\/Users\/[^/\s]+\//.test(text))errors.push(`${file}: personal absolute path`);
 if(file.endsWith('.md'))for(const m of text.matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1].split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;
  if(!existsSync(resolve(dirname(file),target)))errors.push(`${file}: broken link ${target}`);
 }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Checked ${files.length} source files and documentation links. This bounded scan does not prove absence of private data.`);
