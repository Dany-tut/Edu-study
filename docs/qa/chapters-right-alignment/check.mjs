import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});const results=[];
try{for(const width of [320,390,768,870,1200])for(const theme of ['light','dark']){
const p=await browser.newPage({viewport:{width,height:800}});await p.goto('http://localhost:4407');await p.evaluate(t=>document.documentElement.dataset.theme=t,theme);await p.locator('.chapter-title').first().waitFor();
const bounds=await p.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,right:r.right,width:r.width}};return {tabs:rect('#tabs'),rail:rect('.timecode-editor'),player:rect('.recording-player-layout > :first-child'),overflow:document.documentElement.scrollWidth>innerWidth}});
assert(Math.abs(bounds.tabs.right-bounds.rail.right)<1,JSON.stringify({width,theme,bounds}));assert(!bounds.overflow);
await p.getByLabel('Название главы 1',{exact:true}).fill('Проверенная глава A');assert.equal(await p.getByLabel('Название главы 1',{exact:true}).inputValue(),'Проверенная глава A');
for(const fraction of [0,.5,1]){await p.evaluate(f=>{for(const e of document.querySelectorAll('*')){if(getComputedStyle(e).overflowY==='auto'&&e.scrollHeight>e.clientHeight)e.scrollTop=f*(e.scrollHeight-e.clientHeight)}},fraction);await p.waitForTimeout(100);await p.screenshot({path:`${width}-${theme}-${fraction}.png`});}
results.push({width,theme,...bounds});await p.close();}await fs.writeFile('results.json',JSON.stringify(results,null,2));}finally{await browser.close()}
