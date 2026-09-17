import {mkdirSync,copyFileSync,rmSync} from 'node:fs';
const dest=new URL('../.reader-assets/',import.meta.url);
rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});
for(const file of ['index.html','app.js','style.css','review-helper.user.js'])copyFileSync(new URL('../web/'+file,import.meta.url),new URL(file,dest));
console.log('Prepared four source assets. No data or configuration included.');
