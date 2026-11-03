import {execFileSync as run} from 'node:child_process';
import fs from 'node:fs';
const git=(...args)=>run('git',args,{encoding:'utf8'}).trim();
const patch='/tmp/iskra-candidate/iskra-fix.patch';
if(fs.statSync(patch).size>50000)throw Error('Patch too large');
git('apply','--check',patch);git('apply',patch);
const files=git('diff','--name-only','-z').split('\0').filter(Boolean);
if(!files.length||files.length>15||files.some(f=>!/^src\/[A-Za-z0-9_./-]+$/.test(f)&&!/^scripts\/check[A-Za-z0-9_-]+\.(mjs|ts)$/.test(f)))throw Error('Patch outside permitted source files');
// Refuse symlinks, mode changes and executable files. Never execute generated code here.
if(git('diff','--summary'))throw Error('File creation/deletion/mode changes require manual review');
const status=JSON.parse(run('gh',['pr','list','--repo','Dany-tut/Edu-study','--state','open','--search','in:title Iskra incident candidate','--json','number'],{encoding:'utf8'}));
if(status.length){console.log('Existing candidate awaiting review; no duplicate PR');process.exit(0)}
if(!/^\d+$/.test(process.env.ISKRA_FIX_RUN??''))throw Error('Invalid run id');
const branch='codex/incident-candidate-'+process.env.ISKRA_FIX_RUN;
git('switch','-c',branch);git('config','user.name','Iskra monitor');git('config','user.email','iskra-monitor@users.noreply.github.com');git('add','--',...files);git('commit','-m','Prepare Iskra incident candidate for owner review');
run('gh',['auth','setup-git'],{stdio:'pipe'});git('push','origin',branch);
const body='/tmp/iskra-draft-body.txt';fs.writeFileSync(body,'Automatically prepared candidate. Requires owner review and independent checks. Aggregate telemetry alone does not prove a user defect. No production, schema or permission changes were made. Do not merge without reviewing the reproduction, diff and exact-SHA checks.');
run('gh',['pr','create','--repo','Dany-tut/Edu-study','--draft','--base','main','--head',branch,'--title','Iskra incident candidate — requires approval','--body-file',body],{stdio:'pipe'});
console.log('Draft candidate created; production unchanged');
