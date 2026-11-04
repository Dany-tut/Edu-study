import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome'}),results=[]
for(const width of [320,390,1440])for(const theme of ['light','dark']){
const page=await browser.newPage({viewport:{width,height:900}})
await page.goto('http://127.0.0.1:4199/qa/lesson-row-hover/?'+theme)
const badge=page.locator('.lesson-row-open').first();await badge.waitFor()
assert((await badge.boundingBox()).width>24)
await page.evaluate(()=>{window.frames=[];function sample(){const r=document.querySelector('.lesson-row-open').getBoundingClientRect();window.frames.push([performance.now(),r.width,r.height]);window.raf=requestAnimationFrame(sample)}sample()})
await page.waitForTimeout(1800)
const rect=await badge.boundingBox();assert.equal(rect.width,24);assert.equal(rect.height,24)
assert.equal(await badge.getAttribute('aria-label'),'Открыт ученикам')
await page.locator('.lesson-row').first().hover();await page.waitForTimeout(200);assert.equal((await badge.boundingBox()).width,24)
await page.screenshot({path:`docs/qa/lesson-row-hover/${width}-${theme}-circle.png`})
results.push({width,theme,frames:await page.evaluate(()=>{cancelAnimationFrame(window.raf);return window.frames})});await page.close()
}
const page=await browser.newPage({reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4199/qa/lesson-row-hover/');await page.locator('.lesson-row-open').first().waitFor();await page.waitForTimeout(1500);assert.equal((await page.locator('.lesson-row-open').first().boundingBox()).width,24)
await writeFile('docs/qa/lesson-row-hover/collapse-frames.json',JSON.stringify(results));await browser.close();console.log('PASS collapse, circle, hover, reduced motion')
