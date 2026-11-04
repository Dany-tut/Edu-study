import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const out = new URL('../../docs/qa/recording-link/', import.meta.url)
const browser = await chromium.launch({channel:'chrome'})
const evidence = []
try {
for (const [width,height] of [[320,568],[390,844],[768,1024],[1440,900],[844,390]]) for(const theme of ['light','dark']) {
  const page = await browser.newPage({viewport:{width,height}})
  const errors=[]
  page.on('pageerror',e=>errors.push(String(e)))
  await page.goto('http://localhost:4197/qa/recording-link/?'+theme)
  const input = page.getByLabel('Ссылка на запись')
  const save = page.getByRole('button',{name:'Сохранить',exact:true})
  await input.fill('https://youtu.be/vqNHf93jeF4')
  await page.evaluate(()=>{
    window.requests=[];window.frames=[]
    addEventListener('recording-submit',e=>window.requests.push(e.detail))
    function sample(){const b=document.querySelector('button:last-of-type');if(!b)return;const r=b.getBoundingClientRect();window.frames.push([r.x,r.y,r.width,r.height]);requestAnimationFrame(sample)}sample()
  })
  await save.dblclick({force:true})
  await page.getByRole('button',{name:'Сохраняем…'}).waitFor()
  assert(await input.evaluate(el=>el.readOnly))
  assert(await page.getByRole('button',{name:'Отмена'}).isDisabled())
  assert.equal(await page.evaluate(()=>window.requests.length),1)
  await page.waitForTimeout(350)
  if((width===390&&theme==='dark')||(width===1440&&theme==='light'))await page.screenshot({path:new URL(width+'-'+theme+'.png',out).pathname})
  const frames=await page.evaluate(()=>window.frames.slice())
  assert(frames.every(([x,y,w,h])=>x>=0&&x+w<=width+1&&y>=0&&y+h<=height+1))
  await page.evaluate(()=>dispatchEvent(new CustomEvent('recording-result',{detail:false})))
  await page.getByRole('alert').waitFor()
  assert.equal(await input.inputValue(),'https://youtu.be/vqNHf93jeF4')
  await input.fill('https://youtu.be/abcdefghijk')
  await input.press('Enter')
  await page.evaluate(()=>dispatchEvent(new CustomEvent('recording-result',{detail:true})))
  const reopen=page.getByRole('button',{name:'Открыть'})
  await reopen.click()
  await input.press('Escape')
  await reopen.click()
  await page.getByRole('button',{name:'Отмена'}).click()
  await reopen.waitFor()
  assert.deepEqual(await page.evaluate(()=>window.requests),['https://youtu.be/vqNHf93jeF4','https://youtu.be/abcdefghijk'])
  assert.deepEqual(errors,[])
  evidence.push({width,height,theme,frames})
  await page.close()
}
await writeFile(new URL('frames.json',out),JSON.stringify(evidence))
console.log(evidence.length+' scenarios passed')
} finally {await browser.close()}
