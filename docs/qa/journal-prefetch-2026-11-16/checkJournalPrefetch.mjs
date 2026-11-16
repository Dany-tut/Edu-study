// Controlled React hook fixture: actual useCourseJournal + synthetic RPC/roster.
// Compares origin/main behavior to the candidate without touching production data.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const cwd = process.cwd()
const hookPath = `${cwd}/src/lib/useCourseJournal.ts`
const candidate = readFileSync(hookPath, 'utf8')
const baseline = execFileSync('git', ['show', 'origin/main:src/lib/useCourseJournal.ts'], { encoding: 'utf8' })
const columns = {
  courses: ['id','short_id','title','subject','kind','group_ids','student_ids'],
  lessons: ['id','short_id','course_id','module_id','title','kind','position','lesson_number','scheduled_date','scheduled_time','rec_date','rec_time','lesson_sched_manual','delivery_mode','youtube_url','hwTask','recTask','hwDate','recHwDate','extraHw'],
  modules: ['id','course_id','label','position'], work: ['id','student_id','lesson_ref','status','score','attachments','updated_at','review_comment'],
  events: ['id','lesson_id','node_type','group_id','student_id','date','time_start','time_end','lesson_title','subject','status'],
  assignments: ['id','lesson_id','group_id','title','due_date','status','basicTask','assignedAt','basicTasks'],
  legacy: ['id','student_id','lesson_date','lesson_title','present','grade'],
  attempts: ['id','student_id','lesson_ref','number','status','score','passing_score','submitted_at','review_comment'], marks: ['schedule_id','attendance'],
}
const entry = `import React,{useState}from'react';import{createRoot}from'react-dom/client';import{useCourseJournal}from'journal-hook';
window.__owner='A';window.__rosterLoading=true;window.__groups=[];window.__students=[];window.__plans||=[];window.__rpcCalls||=[];window.__authListeners||=[];
const root=createRoot(document.getElementById('root'));
function Harness(){const[enabled,setEnabled]=useState(false);const[,refresh]=useState(0);window.__enable=setEnabled;window.__refresh=()=>refresh(x=>x+1);window.__reload=()=>window.__latest.reload();const state=useCourseJournal(true,enabled,false);window.__latest=state;return React.createElement('div',{id:'view','data-loading':String(state.loading)},state.loading?'loading':state.error||state.data?.courses?.[0]?.title||'empty')};root.render(React.createElement(Harness));
window.__enqueue=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});window.__plans.push({resolve,reject,promise});};
window.__resolve=(i,owner)=>window.__rpcCalls[i].plan.resolve({data:window.__response(owner),error:null});
window.__reject=i=>window.__rpcCalls[i].plan.reject(new Error('fixture RPC failed'));
window.__response=owner=>{const rows={courses:[[owner,owner,'Course '+owner,'Biology','course',[],[]]],lessons:[],modules:[],work:[],events:[],assignments:[],legacy:[],attempts:[],marks:[]};const out={encoding:'columns-v1',warnings:[],demo:false,students:[],groups:[]};for(const[k,c]of Object.entries(${JSON.stringify(columns)}))out[k]={columns:c,rows:rows[k]};return out};
window.__switchOwner=owner=>{window.__owner=owner;const session={user:{id:owner,role:'authenticated',app_metadata:{}}};for(const fn of window.__authListeners)fn('SIGNED_IN',session)};
`;
const mocks = {
  supabase: `export const supabase={rpc(_name,args){window.__plans||=[];window.__rpcCalls||=[];const plan=window.__plans.shift();if(!plan)throw Error('RPC plan missing');const call={owner:args.p_owner,signal:null,plan};window.__rpcCalls.push(call);return{abortSignal(s){call.signal=s;return this},retry(){return this},then(a,b){return plan.promise.then(a,b)}}},auth:{onAuthStateChange(fn){window.__authListeners||=[];window.__authListeners.push(fn);return{data:{subscription:{unsubscribe(){}}}}}}};`,
  owner: `export const getOwnerId=async()=>window.__owner;`,
  useGroups: `export const useGroups=()=>({groups:window.__groups,loading:window.__rosterLoading});export const useAllStudentsSnapshot=()=>({value:window.__students,loading:window.__rosterLoading});`,
  journalRequests: `export const journalRowsById=async()=>[];export const journalBatches=async()=>[];export const journalPages=async()=>[];`,
  journalPages: `export const journalPages=async()=>[];export const journalParallelPages=async()=>[];`,
  platformPerformance: `export const journalPaintTiming=()=>{};`,
}

async function bundle(source) {
  const result = await build({ stdin: { contents: entry, resolveDir: cwd, loader: 'tsx' }, bundle: true, write: false, format: 'iife',
    define: { 'import.meta.env.DEV': 'false', 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'journal-fixture', setup(b) {
      b.onResolve({ filter: /^journal-hook$/ }, () => ({ path: hookPath, namespace: 'hook-source' }))
      b.onLoad({ filter: /.*/, namespace: 'hook-source' }, () => ({ contents: source, loader: 'ts', resolveDir: `${cwd}/src/lib` }))
      b.onResolve({ filter: /^\.\/(supabase|owner|useGroups|journalRequests|journalPages|platformPerformance)$/ }, args => ({ path: args.path.slice(2), namespace: 'journal-mocks' }))
      b.onLoad({ filter: /.*/, namespace: 'journal-mocks' }, args => ({ contents: mocks[args.path], loader: 'js' }))
    } }],
  })
  return result.outputFiles[0].text
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const observations = {}
async function pageFor(bundleText) {
  const page = await browser.newPage()
  page.on('pageerror', error => console.error('[fixture page error]', error.message))
  page.on('console', message => { if (message.type() === 'error') console.error('[fixture console]', message.text()) })
  await page.addInitScript(() => { window.__owner='A';window.__rosterLoading=true;window.__groups=[];window.__students=[];window.__plans=[];window.__rpcCalls=[];window.__authListeners=[] })
  await page.setContent('<div id="root"></div>')
  await page.addScriptTag({ content: bundleText })
  await page.waitForFunction(() => window.__enable, { timeout: 5000 })
  return page
}
async function waitCalls(page, count) {
  await page.waitForFunction(n => window.__rpcCalls.length === n, count)
}
try {
  const oldBundle = await bundle(baseline), newBundle = await bundle(candidate)
  // Same synthetic delays: roster 180ms, snapshot 120ms.
  for (const [name, code] of [['before', oldBundle], ['after', newBundle]]) {
    const page = await pageFor(code)
    await page.evaluate(() => { window.__enqueue(); window.__enable(true) })
    const started = Date.now()
    if (name === 'before') {
      await page.waitForTimeout(180)
      assert.equal(await page.evaluate(() => window.__rpcCalls.length), 0, 'baseline waits for roster before starting snapshot')
      await page.evaluate(() => { window.__rosterLoading = false; window.__refresh() })
      await waitCalls(page, 1)
      await page.waitForTimeout(120)
    } else {
      await waitCalls(page, 1)
      assert.equal(await page.evaluate(() => window.__rosterLoading), true, 'snapshot started before roster is ready')
      await page.waitForTimeout(120)
      await page.evaluate(() => window.__resolve(0, 'A'))
      await page.waitForTimeout(20)
      assert.equal(await page.locator('#view').textContent(), 'loading', 'no partial content before roster is ready')
      await page.waitForTimeout(40)
      await page.evaluate(() => { window.__rosterLoading = false; window.__refresh() })
    }
    if (name === 'before') await page.evaluate(() => window.__resolve(0, 'A'))
    await page.getByText('Course A', { exact: true }).waitFor()
    observations[name] = { initialMs: Date.now() - started, calls: await page.evaluate(() => window.__rpcCalls.length) }
    assert.equal(observations[name].calls, 1)
    await page.close()
  }
  assert.ok(observations.after.initialMs < observations.before.initialMs - 40, 'candidate overlaps roster and snapshot latency')

  // Failed prefetch before roster: no automatic retry/fan-out; explicit retry works.
  {
    const page = await pageFor(newBundle)
    await page.evaluate(() => { window.__enqueue(); window.__enable(true) })
    await waitCalls(page, 1)
    await page.evaluate(() => window.__reject(0))
    await page.waitForTimeout(30)
    await page.evaluate(() => { window.__rosterLoading = false; window.__refresh() })
    await page.getByText(/fixture RPC failed/).waitFor()
    assert.equal(await page.evaluate(() => window.__rpcCalls.length), 1)
    await page.evaluate(() => { window.__enqueue(); window.__reload() })
    await waitCalls(page, 2)
    await page.evaluate(() => window.__resolve(1, 'A'))
    await page.getByText('Course A', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__rpcCalls.length), 2)
    observations.retry = { calls: 2, errorRetainedUntilRetry: true }
    await page.close()
  }

  // Owner change: late A cannot replace B.
  {
    const page = await pageFor(newBundle)
    await page.evaluate(() => { window.__rosterLoading = false; window.__enqueue(); window.__enable(true) })
    await waitCalls(page, 1)
    await page.evaluate(() => { window.__enqueue(); window.__switchOwner('B') })
    await waitCalls(page, 2)
    assert.equal(await page.evaluate(() => window.__rpcCalls[0].signal.aborted), true)
    await page.evaluate(() => window.__resolve(1, 'B'))
    await page.getByText('Course B', { exact: true }).waitFor()
    await page.evaluate(() => window.__resolve(0, 'A'))
    await page.waitForTimeout(40)
    assert.equal(await page.locator('#view').textContent(), 'Course B')
    observations.ownerSwitch = { owners: await page.evaluate(() => window.__rpcCalls.map(x => x.owner)), lateAIgnored: true }
    await page.close()
  }

  // Disabled activation is quiet; abort then re-enable starts exactly one fresh request.
  {
    const page = await pageFor(newBundle)
    await page.evaluate(() => { window.__rosterLoading = false; window.__refresh() })
    await page.waitForTimeout(20)
    assert.equal(await page.evaluate(() => window.__rpcCalls.length), 0)
    await page.evaluate(() => { window.__enqueue(); window.__enable(true) })
    await waitCalls(page, 1)
    await page.evaluate(() => window.__enable(false))
    await page.waitForTimeout(30)
    assert.equal(await page.evaluate(() => window.__rpcCalls[0].signal.aborted), true)
    await page.evaluate(() => window.__resolve(0, 'A'))
    await page.evaluate(() => { window.__enqueue(); window.__enable(true) })
    await waitCalls(page, 2)
    await page.evaluate(() => window.__resolve(1, 'B'))
    await page.getByText('Course B', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__rpcCalls.length), 2)
    observations.disabledReenabled = { calls: 2, oldSignalAborted: true, lateAIgnored: true }
    await page.close()
  }
  console.log(JSON.stringify({ scope: 'Actual useCourseJournal hook; synthetic roster and RPC; no production auth or writes', observations }, null, 2))
} finally {
  await browser.close()
}
