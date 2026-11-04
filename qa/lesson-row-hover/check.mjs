import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome'}), results=[]
for(const width of [320,390,1440])for(const theme of ['light','dark']){
const page=await browser.newPage({viewport:{width,height:900}})
await page.goto('http://127.0.0.1:4199/qa/lesson-row-hover/?'+theme)
const row=page.locator('.lesson-row').first(), del=row.locator('.lesson-row-delete')
await row.waitFor();await page.mouse.move(width-1,899)
await page.evaluate(()=>{window.frames=[];function frame(){const el=document.querySelector('.lesson-row-delete');window.frames.push({time:performance.now(),width:el.getBoundingClientRect().width});window.raf=requestAnimationFrame(frame)}frame()})
assert.equal(await del.evaluate(e=>e.getBoundingClientRect().width),0)
for(let i=0;i<5;i++) {await row.hover();await page.waitForTimeout(200);assert.equal(await del.evaluate(e=>e.getBoundingClientRect().width),22);await page.mouse.move(width-1,899);await page.waitForTimeout(200);assert.equal(await del.evaluate(e=>e.getBoundingClientRect().width),0)}
await page.screenshot({path:`docs/qa/lesson-row-hover/${width}-${theme}-idle.png`})
await row.hover();await page.waitForTimeout(200);await page.screenshot({path:`docs/qa/lesson-row-hover/${width}-${theme}-hover.png`})
await del.click();assert.equal(await page.locator('body').getAttribute('data-deleted'),'yes')
await page.mouse.move(width-1,899);await del.focus();await page.waitForTimeout(200);assert.equal(await del.evaluate(e=>e.getBoundingClientRect().width),22)
await del.press('Enter')
for(const [name,fraction] of [['start',0],['middle',.5],['end',1]]){await page.evaluate(f=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*f),fraction);await page.screenshot({path:`docs/qa/lesson-row-hover/${width}-${theme}-${name}.png`})}
results.push({width,theme,frames:await page.evaluate(()=>{cancelAnimationFrame(window.raf);return window.frames})});await page.close()
}
const touch=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await touch.goto('http://127.0.0.1:4199/qa/lesson-row-hover/');assert.equal(await touch.locator('.lesson-row-delete').evaluate(e=>e.getBoundingClientRect().width),22)
await touch.emulateMedia({reducedMotion:'reduce'});assert.equal(await touch.locator('.lesson-row-delete').evaluate(e=>getComputedStyle(e).transitionDuration),'0s')
await writeFile('docs/qa/lesson-row-hover/frames.json',JSON.stringify(results));await browser.close();console.log('PASS 6 desktop viewports/themes; touch; reduced motion')
