import fs from 'node:fs';
import {BACKEND} from './snapshot.mjs';
import {validateWorkSummary,technicalEvidence} from './context.mjs';
const key=process.env.ISKRA_PUBLISHABLE_KEY;
const r=await fetch(BACKEND+'/rest/v1/rpc/iskra_monitor_summary',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)});
if(!r.ok)throw Error('Private evidence unavailable; do not speculate');
const s=await r.json();
const summary=validateWorkSummary(s);
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'needed='+String(s.open_signals>0)+'\n');
let evidence=[];
if(s.open_signals>0){
 const secret=process.env.ISKRA_MONITOR_WORKER_SECRET;if(!secret)throw Error('Worker context not configured');
 const body=JSON.stringify({at:Date.now()});const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const response=await fetch(BACKEND+'/functions/v1/incident-context',{method:'POST',headers:{'Content-Type':'application/json','x-monitor-signature':signature},body,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Worker evidence unavailable');const payload=await response.json();
 evidence=technicalEvidence(payload);
}
fs.writeFileSync('monitor-context.json',JSON.stringify({source:'technical_allowlist',...summary,evidence}));
