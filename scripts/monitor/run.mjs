import fs from 'node:fs';
import {probe,snapshot} from './snapshot.mjs';
let previous;try{previous=JSON.parse(fs.readFileSync(process.env.ISKRA_PREVIOUS_SNAPSHOT??'/tmp/iskra-previous.json','utf8'))}catch{}
let result;try{result=await probe()}catch{result={probeOk:false}}
const out=snapshot({...result,previous});
fs.writeFileSync('/tmp/iskra-monitor.json',JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({monitor:out.states.monitor.code,checked_at:out.last_checked_at}));
// The caller publishes even failure snapshots, then fails the run to surface an alert.
if(out.states.monitor.code!=='observing')process.exitCode=1;
