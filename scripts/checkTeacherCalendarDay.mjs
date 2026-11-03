// Runs the populated stand against real production components, without backend writes.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { createServer } from 'vite'
process.env.VITE_SUPABASE_URL ||= 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||= 'calendar-fixture'
const out = process.env.ISKRA_QA_OUTPUT || '/tmp/iskra-calendar-day-qa'
mkdirSync(out, { recursive: true })
const server = await createServer({ cacheDir: `node_modules/.cache/calendar-vite-${createHash('sha256').update(process.cwd()+(process.env.ISKRA_QA_PORT||5178)).digest('hex').slice(0,12)}`, optimizeDeps: { entries: ['qa/calendar/index.html'] }, server: { hmr: false, watch: { ignored: ['**/*'] }, host: '127.0.0.1', port: Number(process.env.ISKRA_QA_PORT || 5178), strictPort: true } })
await server.listen()
const browser = await chromium.launch(process.env.CI ? { headless: true } : { channel: 'chrome', headless: true })
const results = [], errors = []
try {
for (const [width,height] of [[1280,820],[390,844],[320,568],[768,1024],[1280,600]]) {
 for (const theme of ['light','dark']) {
  console.log('Checking',width,height,theme)
  const context = await browser.newContext({ viewport: { width,height }, reducedMotion: width === 768 ? 'reduce' : 'no-preference' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(30000)
  if (process.env.ISKRA_CALENDAR_MUTANT) await page.route('**/src/components/teacher/schedule/TeacherSchedule.tsx*', async r => {
   const response=await r.fetch(); const source=await response.text();
   assert.ok(source.includes('i.date === day'));
   await r.fulfill({response,body:source.replace('i.date === day','true')})
  })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
   window.__calendarSamples = []
   const capture = source => {
    const feed = document.querySelector('[data-calendar-feed]')
    if (!feed?.dataset.calendarSelectedDate) return
    const entries = [...feed.querySelectorAll('[data-calendar-entry-id]')]
    window.__calendarSamples.push({ source, at: performance.now(), selected: feed.dataset.calendarSelectedDate,
      entries: entries.map(e => ({ id: e.dataset.calendarEntryId, date: e.dataset.calendarEntryDate })) })
   }
   new MutationObserver(() => capture('mutation')).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-calendar-selected-date','data-calendar-entry-id','data-calendar-entry-date'] })
   const frame = () => { capture('frame'); requestAnimationFrame(frame) }; requestAnimationFrame(frame)
  })
  await page.clock.setFixedTime(new Date('2026-11-03T08:00:00Z'))
  await page.route('**/rest/v1/**', r => r.fulfill({ json: [] }))
  await page.goto(`http://127.0.0.1:${process.env.ISKRA_QA_PORT || 5178}/qa/calendar/`,{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:'вт 3 ноября',exact:true}).waitFor()
  if (theme === 'dark') await page.getByRole('button',{name:'Сменить тему'}).click()
  if (process.env.ISKRA_CALENDAR_TRANSIENT_MUTANT) await page.evaluate(async () => {
   const entry=document.querySelector('[data-calendar-entry-id]'),original=entry.dataset.calendarEntryId
   entry.dataset.calendarEntryId='injected-stale-entry'
   await new Promise(resolve=>setTimeout(resolve,40))
   entry.dataset.calendarEntryId=original
  })
  const cards = page.locator('.calendar-widget-lesson')
  const validateTimeline = async () => {
   const samples = await page.evaluate(() => window.__calendarSamples.splice(0))
   assert.ok(samples.length, 'Monitoring must start before the click')
   for (const sample of samples) {
    const date = new Date(`${sample.selected}T12:00:00Z`), index = (date.getUTCDay()+6)%7
    date.setUTCDate(date.getUTCDate()-index)
    const monday = date.toISOString().slice(0,10), count = [12,2,0,3,1,1,0][index]
    const expected = Array.from({length:count},(_,i)=>({id:`${monday}/${index}/${i}`,date:sample.selected}))
    assert.deepEqual(sample.entries, expected, `Stale/missing/duplicate data during ${sample.source}: ${sample.selected}`)
   }
   results.push({width,height,theme,timeline:samples})
  }
  const choose = async (label,date,count,keyboard=false) => {
   const button = page.getByRole('button',{name:label,exact:true})
   if(keyboard) { await button.focus(); await page.keyboard.press('Enter') } else await button.click()
   await page.waitForFunction(({date,count}) => {
    const cards = [...document.querySelectorAll('.calendar-widget-lesson')]
    return cards.length === count && cards.every(c => c.textContent.includes(date))
   },{date,count})
   if(date.endsWith('-06')) assert.ok(await cards.getByText('Запись',{exact:true}).isVisible())
   if(date.endsWith('-07')) assert.ok(await cards.getByText('Отменено',{exact:true}).isVisible())
   assert.equal(await button.getAttribute('aria-pressed'),'true')
   assert.ok((await page.locator('.calendar-widget-date').innerText()).includes(label))
   // Every animation frame must contain only the selected date's actual data.
   const frames = await page.evaluate(async ({date,count}) => {
    const frames=[]
    for(let i=0;i<12;i++) {
     await new Promise(resolve => { const timer=setTimeout(resolve,100); requestAnimationFrame(()=>{clearTimeout(timer);resolve()}) })
     const cards=[...document.querySelectorAll('.calendar-widget-lesson')]
     frames.push({count:cards.length, correct:cards.every(c=>c.textContent.includes(date)), visible:cards.every(c=>getComputedStyle(c).opacity!=='0')})
    }
    return frames
   },{date,count})
   assert.ok(frames.every(f=>f.count===count&&f.correct&&f.visible))
   await validateTimeline()
   results.push({width,height,theme,label,date,count,keyboard,frames})
  }
  for(const [label,date,count] of [['пн 2 ноября','2026-11-02',12],['вт 3 ноября','2026-11-03',2],['ср 4 ноября','2026-11-04',0],['чт 5 ноября','2026-11-05',3],['пт 6 ноября','2026-11-06',1],['сб 7 ноября','2026-11-07',1],['вт 3 ноября','2026-11-03',2]]) await choose(label,date,count)
  await choose('ср 4 ноября','2026-11-04',0,true)
  assert.ok(await page.getByText('Занятий нет',{exact:true}).isVisible())
  await choose('пн 2 ноября','2026-11-02',12)
  const feed = page.locator('[data-calendar-feed]')
  for(const [position,fraction] of [['start',0],['middle',0.5],['end',1]]) {
   await feed.evaluate((el,f)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*f},fraction)
   await page.waitForTimeout(80)
   const state=await feed.evaluate(el=>({top:el.scrollTop,max:el.scrollHeight-el.clientHeight,mask:getComputedStyle(el).maskImage}))
   assert.ok(state.max>0)
   assert.notEqual(state.mask,'none')
   const colors = [...state.mask.matchAll(/rgba?\(([^)]+)\)/g)].map(m => { const values=m[1].split(',').map(Number);return values.length===4?values[3]:1 })
   assert.ok(colors.length>=2, state.mask)
   assert.equal(colors[0]===0,state.top>1, `${position}: wrong top fade`)
   assert.equal(colors.at(-1)===0,state.max-state.top>1, `${position}: wrong bottom fade`)
   await page.screenshot({path:`${out}/${width}-${height}-${theme}-${position}.png`})
   results.push({width,height,theme,position,...state})
  }
  for(let i=0;i<20;i++) await page.getByRole('button',{name:i%2?'вт 3 ноября':'чт 5 ноября',exact:true}).click()
  await choose('вт 3 ноября','2026-11-03',2)
  await page.getByRole('button',{name:'Следующая неделя',exact:true}).click()
  await page.getByRole('button',{name:'вт 10 ноября',exact:true}).click()
  await choose('вт 10 ноября','2026-11-10',2)
  await page.getByRole('button',{name:'Прошлая неделя',exact:true}).click()
  await page.getByRole('button',{name:'вт 3 ноября',exact:true}).waitFor()
  await page.getByRole('button',{name:'Следующая неделя',exact:true}).click()
  await page.getByRole('button',{name:'Сегодня',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'вт 3 ноября',exact:true}).getAttribute('aria-pressed'),'true')
  await choose('вт 3 ноября','2026-11-03',2)
  await context.close()
 }
}
assert.deepEqual(errors,[])

console.log(`PASS: ${results.length} calendar checks, exact date identities, empty/overflow/status days, 20 rapid clicks, weeks, keyboard, both themes, five viewports`)
} catch(error) { errors.push(String(error)); throw error }
finally {
 const files=['src/components/teacher/schedule/TeacherSchedule.tsx','src/components/teacher/widgets/WidgetTodaySchedule.tsx','qa/calendar/stand.tsx','scripts/checkTeacherCalendarDay.mjs']
 const sources=Object.fromEntries(files.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]))
 writeFileSync(`${out}/results.json`,JSON.stringify({sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sources,results,errors},null,2))
 await browser.close(); await server.close()
}
