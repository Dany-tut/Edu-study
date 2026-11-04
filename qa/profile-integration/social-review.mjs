import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const b=await chromium.launch({channel:'chrome'});const results=[]
try {for(const width of [1440,390,320])for(const theme of ['light','dark']){
const p=await b.newPage({viewport:{width,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message))
await p.goto('http://localhost:4201/qa/profile-integration/preview.html')
await p.evaluate(th=>document.documentElement.dataset.theme=th,theme)
await p.getByRole('navigation',{name:'Разделы профиля'}).getByRole('button',{name:'Друзья',exact:true}).click()
await p.getByText('Добавьте первого друга').waitFor()
await p.evaluate(()=>{window.socialFrames=[];function sample(){const el=document.querySelector('.profile-social-list');if(!el)return;const r=el.getBoundingClientRect();window.socialFrames.push([r.x,r.width]);requestAnimationFrame(sample)}sample()})
await p.screenshot({path:`docs/qa/profile-redesign/social-${width}-${theme}.png`})
for(let i=0;i<5;i++){
 await p.getByRole('button',{name:'Изменить ник и видимость'}).click()
 await p.getByLabel('Твой ник',{exact:true}).waitFor()
 await p.getByRole('button',{name:'Готово',exact:true}).click()
}
await p.getByRole('button',{name:'Изменить ник и видимость'}).click()
await p.getByLabel('Твой ник',{exact:true}).fill('new_teacher')
await p.getByRole('checkbox').uncheck()
await p.getByRole('button',{name:'Сохранить',exact:true}).click()
await p.getByText('Настройки сохранены.',{exact:true}).waitFor()
await p.screenshot({path:`docs/qa/profile-redesign/social-edit-${width}-${theme}.png`})
await p.getByRole('button',{name:'Готово',exact:true}).click()
await p.getByText('@new_teacher',{exact:true}).waitFor()
await p.getByText('Поиск по нику выключен',{exact:true}).waitFor()
await p.getByRole('textbox',{name:'Точный ник',exact:true}).fill('someone')
await p.getByRole('button',{name:'Найти',exact:true}).click()
await p.getByText('Ник не найден.',{exact:false}).waitFor()
for(const [label,part]of [['start',0],['middle',.5],['end',1]]){
await p.locator('.teacher-page-scroll').evaluate((e,v)=>e.scrollTop=(e.scrollHeight-e.clientHeight)*v,part)
await p.waitForTimeout(120)
await p.screenshot({path:`docs/qa/profile-redesign/social-scroll-${width}-${theme}-${label}.png`})
}
assert.deepEqual(errors,[])
const geometry=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,frames:window.socialFrames}))
assert.equal(geometry.overflow,false);results.push({width,theme,errors,geometry});await p.close()
}await fs.writeFile('docs/qa/profile-redesign/social-results.json',JSON.stringify(results,null,2))}finally{await b.close()}
