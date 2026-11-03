import {chromium} from 'playwright'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'chrome'})
const user={id:'e80611a9-db5e-4d31-ac5b-a74b5f60a36e',email:'qa@example.test',app_metadata:{role:'teacher'},user_metadata:{name:'Учитель длинное имя для проверки'}}
const output = process.env.QA_OUTPUT_DIR || '/tmp'

try {
for (const [width,height] of [[1440,900],[768,680],[390,844],[320,568]]) for (const theme of ['light','dark']) {
const p=await browser.newPage({viewport:{width,height}})
p.setDefaultTimeout(45000)
const errors=[];p.on('pageerror',e=>errors.push(e.message))
await p.addInitScript(({user,theme})=>{
localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user}))
},{user,theme})
await p.route('http://fixture.invalid/**',r=>r.fulfill({json:r.request().url().includes('/oauth/grants')?[{client:{id:'fixture-claude',name:'Claude'}}]:r.request().url().includes('/teacher_modules')?[{meta:{email:'fixture@test.local',tests:25}}]:r.request().url().includes('/auth/v1/user')?user:r.request().url().includes('desktop_friends')?{handle:'teacher',contacts:[],searchable:false}:[]}))

let data={handle:null,searchable:false,contacts:[{id:'in1',handle:'first_in',state:'incoming'},{id:'in2',handle:'other_in',state:'incoming'}]}
await p.route('**/rpc/desktop_friends',async route=>{
 const {operation,payload,expected_account}=route.request().postDataJSON()
 assert.equal(expected_account,user.id)
 let json=true
 if(operation==='snapshot')json=data
 else if(operation==='save')Object.assign(data,payload)
 else if(operation==='search')json={status:'found',handle:payload.handle,key:'key'}
 else if(operation==='send'){data.contacts.push({id:'out',handle:payload.handle,state:'outgoing'});json={status:'sent'}}
 else if(operation==='accept')data.contacts.find(c=>c.id===payload.id).state='friend'
 else if(['cancel','decline'].includes(operation))data.contacts=data.contacts.filter(c=>c.id!==payload.id)
 await route.fulfill({json})
})
await p.goto((process.env.QA_BASE_URL || 'http://localhost:4287')+'/qa/profile-integration/',{waitUntil:'domcontentloaded'})
await p.evaluate(th=>document.documentElement.dataset.theme=th,theme)
await p.getByRole('navigation',{name:'Разделы профиля'}).getByRole('button',{name:'Друзья'}).click()
const region=name=>p.getByRole('region',{name,exact:true})
const profile=region('Мой ник'), search=region('Поиск'),requests=region('Заявки'),friends=region('Друзья')
for(const panel of [search,requests,friends]) await panel.waitFor()
assert.equal(await profile.count(),0)
await search.getByRole('textbox').fill('friend_9')
await search.getByText('Найти',{exact:true}).click()
await search.getByText('Выбрать ник для заявки').click()
await profile.waitFor()
await profile.getByRole('textbox').fill('my_test')
await profile.getByRole('checkbox').check()
await profile.getByText('Сохранить',{exact:true}).click()
await profile.getByText('Настройки сохранены.').waitFor()
await p.getByRole('navigation',{name:'Разделы профиля'}).getByRole('button',{name:'Друзья'}).click()
await search.getByRole('textbox').fill('friend_9')
await search.getByRole('button',{name:'Найти',exact:true}).click()
await search.getByRole('button',{name:'Отправить заявку'}).click()
await region('Отправленные').getByText('@friend_9').waitFor()
await region('Отправленные').getByRole('button',{name:'Отменить',exact:true}).click()
await region('Отправленные').getByText('@friend_9').waitFor({state:'detached'})
await requests.locator('.friend-row').filter({hasText:'@first_in'}).getByText('Принять').click()
await friends.getByText('@first_in').waitFor()
await p.screenshot({path:output+'/friends-layout-populated-'+width+'-'+theme+'.png'});await requests.locator('.friend-row').filter({hasText:'@other_in'}).getByText('Отклонить').click()
await requests.getByText('Новых заявок нет.').waitFor()
if((width===1440 && theme==='light') || (width===320 && theme==='dark')){
 data.contacts.push(...Array.from({length:40},(_,i)=>({id:'friend-'+i,handle:'friend_'+i,state:'friend'})))
 await p.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await friends.getByText('@friend_39',{exact:true}).waitFor()
 for(const f of [0,.5,1]){
 const fraction=await p.evaluate(f=>{const sc=document.querySelector('.teacher-page-scroll');const max=sc.scrollHeight-sc.clientHeight;sc.scrollTop=max*f;return sc.scrollTop/max},f)
 assert(Math.abs(fraction-f)<.01)
 await p.waitForTimeout(100)
 await p.screenshot({path:output+'/friends-layout-'+width+'-'+f+'.png'})
 }
}
assert.deepEqual(errors,[]);console.log(width,theme,'pass');await p.close()
}}finally{await browser.close()}
