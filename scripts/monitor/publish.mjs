import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {snapshot} from './snapshot.mjs';
const api=(path,method='GET',body)=>JSON.parse(execFileSync('gh',['api',path,'--method',method,...(body?['--input','-']:[])],{input:body?JSON.stringify(body):undefined,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
const repo='repos/Dany-tut/Edu-study',branch='codex/monitor-status';
const value=JSON.parse(fs.readFileSync('/tmp/iskra-monitor.json','utf8'));
// Reject rather than publishing any expanded/raw upstream document.
const example=snapshot({probeOk:false,now:value.updated_at});
if(JSON.stringify(Object.keys(value))!==JSON.stringify(Object.keys(example)) || value.project!=='iskra' || value.schema_version!==1 || value.history?.length!==0)throw Error('Invalid aggregate');
if(value.name!=='Искра' || !Number.isFinite(Date.parse(value.updated_at)) || value.last_checked_at!==null&&!Number.isFinite(Date.parse(value.last_checked_at)) || Object.keys(value.states).sort().join()!==Object.keys(example.states).sort().join())throw Error('Invalid aggregate metadata');
const labels=new Set(['Серверный монитор отвечает','Проверка сервера не подтверждена','Сбор проверяется отдельно от доступности','Есть сигналы для разбора','Подтверждённого вывода о сбоях нет','Исправления требуют отдельного разбора','Источник не управляет выпуском']);
for(const k of Object.keys(example.states)){
  const v=value.states[k];if(!v || Object.keys(v).sort().join()!=='at,code,label' || typeof v.label!=='string' || !labels.has(v.label) || !Number.isFinite(Date.parse(v.at)) || !['observing','error','unknown','detected','none','not_started'].includes(v.code))throw Error('Invalid state');
}
// Never create this branch from main: aggregate plus a fixed no-deploy guard only.
let head;
try{head=api(repo+'/git/ref/heads/'+branch).object.sha}catch{}
const blob=api(repo+'/git/blobs','POST',{content:JSON.stringify(value,null,2)+'\n',encoding:'utf-8'});
const guard=api(repo+'/git/blobs','POST',{content:JSON.stringify({git:{deploymentEnabled:false}})+'\n',encoding:'utf-8'});
const tree=api(repo+'/git/trees','POST',{tree:[{path:'iskra.json',mode:'100644',type:'blob',sha:blob.sha},{path:'vercel.json',mode:'100644',type:'blob',sha:guard.sha}]});
const commit=api(repo+'/git/commits','POST',{message:'Update Iskra aggregate monitor status',tree:tree.sha,parents:head?[head]:[]});
if(head)api(repo+'/git/refs/heads/'+branch,'PATCH',{sha:commit.sha,force:false});
else api(repo+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:commit.sha});
console.log('Aggregate published; no user data or logs.');
