import {execFileSync as run} from 'node:child_process';import fs from 'node:fs';
const name='iskra-monitor-check-'+process.pid;
try {
 run('docker',['run','-d','--rm','--name',name,'-e','POSTGRES_PASSWORD=local-fixture-only','postgres:16-alpine'],{stdio:'pipe'});
 let ready=false;for(let n=0;n<30;n++){try{run('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'pipe'});ready=true;break}catch{await new Promise(r=>setTimeout(r,500))}}
 if(!ready)throw Error('Fixture DB did not start');
 const sql=['scripts/monitor/fixture.sql','supabase/migrations/20261103064530_incident_monitor.sql','scripts/monitor/assertions.sql'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
 run('docker',['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],{input:sql,stdio:['pipe','pipe','inherit']});
 console.log('Postgres16: trigger, dedup, transient recovery, out-of-order evidence, RLS and admin/public boundaries passed');
} finally {try{run('docker',['stop',name],{stdio:'pipe'})}catch{}}
