import assert from 'node:assert/strict';
import {snapshot,probe,ROOT,BACKEND} from './monitor/snapshot.mjs';
const now=new Date().toISOString();const summary={project:'iskra',schema_version:1,checked_at:now,capture_error:false,open_signals:1,raw:'private@example.com'};
const good=snapshot({summary,probeOk:true,now});assert.equal(good.states.monitor.code,'observing');assert.equal(good.states.incident.code,'detected');assert(!JSON.stringify(good).includes('private@'));
for(const bad of [{...summary,checked_at:'invalid'},{...summary,checked_at:'2000-01-01T00:00:00Z'},{...summary,capture_error:true},{...summary,project:'testly'}]) assert.equal(snapshot({summary:bad,probeOk:true,now}).states.monitor.code,'error');
const failed=snapshot({summary,probeOk:false,previous:good,now});assert.equal(failed.last_checked_at,good.last_checked_at);assert.equal(failed.states.monitor.code,'error');assert.notEqual(snapshot({summary:{...summary,open_signals:0},probeOk:true,now}).states.incident.code,'resolved');
const manifest={commit:'a'.repeat(40),version:'1.0.1',build:1,environment:'production'};
const urls=[];const fake=async(url)=>{urls.push(url);return url.endsWith('/release.json')||url.endsWith('/version.json')?new Response(JSON.stringify(manifest)):url===ROOT+'/'?new Response('<div id="root"></div><script type="module" src="/assets/index-fixture.js"></script>'):url.includes('/assets/')?new Response('/* fixture */',{headers:{'Content-Type':'application/javascript'}}):new Response(JSON.stringify(summary))};
assert.equal((await probe(fake,'public-fixture')).probeOk,true);assert(urls.every(x=>x.startsWith(ROOT)||x.startsWith(BACKEND)));
await assert.rejects(()=>probe(async()=>new Response('bad',{status:503}),'fixture'));
console.log('Server monitor: fixed targets, public privacy, failure publication, stale/future/invalid heartbeat and unresolved evidence passed');

await assert.rejects(()=>probe(async (url,init)=>String(url).includes('/assets/')?new Response('<html>fallback</html>',{headers:{'Content-Type':'text/html'}}):fake(url,init),'fixture'));
console.log('External monitor rejects missing entry/MIME fallback even when HTML and manifests are200');
// Execute the real publisher against a fake GitHub API, never touching a remote ref.
const {build}=await import('esbuild');const calls=[];let blobN=0;
globalThis.__publisherFixture={readFileSync:()=>JSON.stringify(good),execFileSync:(cmd,args,opts)=>{
 assert.equal(cmd,'gh');assert.equal(args[0],'api');const path=args[1];const body=opts?.input?JSON.parse(opts.input):null;calls.push({path,body});
 if(path.includes('/git/ref/heads/'))return JSON.stringify({object:{sha:'previous'}});
 if(path.endsWith('/git/blobs'))return JSON.stringify({sha:'blob'+(++blobN)});
 if(path.endsWith('/git/trees'))return JSON.stringify({sha:'tree'});
 if(path.endsWith('/git/commits'))return JSON.stringify({sha:'commit'});
 if(path.endsWith('/git/refs/heads/codex/monitor-status'))return JSON.stringify({object:{sha:'commit'}});
 throw Error('Unexpected publication target');
}};
const bundle=await build({entryPoints:['scripts/monitor/publish.mjs'],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'fake-api',setup(b){b.onResolve({filter:/^node:(fs|child_process)$/},a=>({path:a.path,namespace:'fake'}));b.onLoad({filter:/.*/,namespace:'fake'},a=>({contents:a.path==='node:fs'?'export default globalThis.__publisherFixture':'export const execFileSync=globalThis.__publisherFixture.execFileSync'}))}}]});
await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const tree=calls.find(x=>x.path.endsWith('/git/trees')).body.tree;assert.deepEqual(tree.map(x=>x.path),['iskra.json','vercel.json']);const guard=calls.filter(x=>x.path.endsWith('/git/blobs'))[1].body.content;assert.equal(JSON.parse(guard).git.deploymentEnabled,false);assert(calls.filter(x=>x.path.includes('/git/refs/')).every(x=>x.path.endsWith('/codex/monitor-status')&&x.body.force===false));
console.log('Publisher: aggregate-only branch, fixed no-deploy guard and no main/force mutation passed');
