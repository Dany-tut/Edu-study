import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});let results=[];
try{for(const touch of [false,true])for(const theme of ['light','dark']){
const p=await browser.newPage({viewport:{width:touch?390:1000,height:1000},isMobile:touch,hasTouch:touch});await p.goto('http://localhost:4407');await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);
const del=p.getByLabel('Удалить главу 1',{exact:true}),lesson=p.locator('#lesson-test .editor-delete-action');await del.waitFor();
const opacity=l=>l.evaluate(e=>getComputedStyle(e).opacity);
await p.mouse.move(0,0);await p.waitForTimeout(180);assert.equal(await opacity(del),touch?'1':'0');assert.equal(await opacity(lesson),touch?'1':'0');
const before=await del.boundingBox();const styles=l=>l.evaluate(e=>{const c=getComputedStyle(e);return [c.width,c.height,c.borderRadius,c.backgroundColor,e.querySelector('svg').getAttribute('width')]});assert.deepEqual(await styles(del),await styles(lesson));
if(!touch){await del.locator('..').hover();await p.waitForTimeout(180);assert.equal(await opacity(del),'1');assert.deepEqual(await del.boundingBox(),before);await p.mouse.move(0,0);await del.focus();await p.waitForTimeout(180);assert.equal(await opacity(del),'1');}
await p.screenshot({path:`delete-${touch?'touch':'desktop'}-${theme}.png`});
await del.press('Enter');assert.equal(await p.locator('.chapter-title').count(),24);assert.match(await p.getByLabel('Название главы 1',{exact:true}).inputValue(),/Глава 2:/);
await lesson.focus();await lesson.press('Enter');assert.equal(await p.getByText('Урок удалён',{exact:true}).count(),1);
results.push({touch,theme,geometryStable:true,consistentStyles:true,deleteChapter:true,deleteLesson:true});await p.close();}await fs.writeFile('delete-results.json',JSON.stringify(results,null,2));}finally{await browser.close()}
