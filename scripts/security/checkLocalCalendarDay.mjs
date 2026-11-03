// Full teacher shell → real localhost Auth/profile/schedule → selected-day cards.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
const root=process.env.ISKRA_LOCAL_DIR||'/tmp/iskra-local-security'
const base=process.env.ISKRA_QA_BASE_URL||'http://127.0.0.1:5316'
const out=process.env.ISKRA_QA_OUTPUT||'/tmp/iskra-integrated-live-calendar'
const cfg=JSON.parse(readFileSync(`${root}/status.json`)),fx=JSON.parse(readFileSync(`${root}/fixture.json`))
for(const url of [base,cfg.API_URL,fx.url]) assert.equal(new URL(url).hostname,'127.0.0.1')
mkdirSync(out,{recursive:true})
const admin=createClient(cfg.API_URL,cfg.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const stamp=randomUUID(),rows=['2026-11-02','2026-11-03'].flatMap(date=>[0,1].map(index=>({...fx.rows.A.schedule,id:randomUUID(),date,time_start:`${13+index}:17`,time_end:`${14+index}:17`,lesson_title:`Calendar ${stamp} ${date}/${index}`,lesson_id:null})))
const errors=[],results=[]
let browser,lastPage
try{
 const inserted=await admin.from('schedule_lessons').insert(rows);assert.equal(inserted.error,null,JSON.stringify(inserted.error))
 browser=await chromium.launch({channel:'chrome',headless:true})
 for(const [width,height] of [[1280,820],[390,844]]){
  const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'})
  await context.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort())
  const page=await context.newPage();lastPage=page;page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message))
  await page.clock.setFixedTime(new Date('2026-11-03T05:00:00Z'))
  await page.goto(base+'/#/teacher/login')
  await page.getByPlaceholder('Email',{exact:true}).fill(fx.accounts.teacherA.email)
  await page.getByPlaceholder('Пароль',{exact:true}).fill(fx.accounts.teacherA.password)
  await page.getByRole('button',{name:'Войти',exact:true}).click()
  const later=page.getByRole('button',{name:'Позже',exact:true});if(await later.isVisible())await later.click()
  if(width<1024)await page.getByRole('button',{name:'Расписание и переносы',exact:true}).click()
  const feed=page.locator('[data-calendar-feed]:visible');await feed.waitFor()
  for(const [label,date] of [['пн 2 ноября','2026-11-02'],['вт 3 ноября','2026-11-03'],['ср 4 ноября','2026-11-04'],['вт 3 ноября','2026-11-03'],['пн 2 ноября','2026-11-02']]){
   await page.getByRole('button',{name:label,exact:true}).click()
   const expected=rows.filter(r=>r.date===date).map(r=>r.id).sort()
   await page.waitForFunction(({date,expected})=>{
    const feed=[...document.querySelectorAll('[data-calendar-feed]')].find(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height);if(feed?.dataset.calendarSelectedDate!==date)return false
    const entries=[...feed.querySelectorAll('[data-calendar-entry-id]')]
    return entries.every(e=>e.dataset.calendarEntryDate===date)&&expected.every(id=>entries.some(e=>e.dataset.calendarEntryId===id))
   },{date,expected})
   const actual=await feed.locator('[data-calendar-entry-id]').evaluateAll(entries=>entries.map(e=>({id:e.dataset.calendarEntryId,date:e.dataset.calendarEntryDate})))
   assert.ok(actual.every(r=>r.date===date));assert.deepEqual(actual.filter(r=>rows.some(x=>x.id===r.id)).map(r=>r.id).sort(),expected)
   results.push({width,height,date,expected,actual})
  }
  await page.reload();if(width<1024)await page.getByRole('button',{name:'Расписание и переносы',exact:true}).click();await feed.waitFor();await page.waitForFunction(()=>document.querySelectorAll('[data-calendar-entry-id]').length>=2)
  assert.equal(await feed.getAttribute('data-calendar-selected-date'),'2026-11-03')
  await page.screenshot({path:`${out}/${width}.png`});await context.close()
 }
 assert.deepEqual(errors,[])
 console.log('PASS: full teacher shell, real local sessions and schedule, equal-size different days, empty day, return and reload on desktop/mobile')
}catch(error){errors.push(String(error));if(lastPage){await lastPage.screenshot({path:`${out}/failure.png`});writeFileSync(`${out}/failure.txt`,await lastPage.locator('body').innerText())}throw error}
finally{
 if(browser)await browser.close()
 const cleaned=await admin.from('schedule_lessons').delete().in('id',rows.map(r=>r.id));if(cleaned.error)errors.push('Fixture cleanup failed')
 writeFileSync(`${out}/results.json`,JSON.stringify({results,errors,cleanup:!cleaned.error},null,2))
 assert.equal(cleaned.error,null,'Fixture cleanup must succeed')
}
