import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const dir=new URL('.',import.meta.url)
await mkdir(new URL('evidence/',dir),{recursive:true})
const specs=[['pc',1440,900],['pc',1280,720],['iphone',390,844],['iphone',320,740],['ipad',820,1180],['ipad',1180,820],['android',412,915]]
const uas={pc:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36',iphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',ipad:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',android:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'}
const browser=await chromium.launch({channel:'chrome',headless:true})
const results=[]
for(const [platform,width,height]of specs)for(const theme of ['light','dark']){
 const page=await browser.newPage({viewport:{width,height},userAgent:uas[platform],isMobile:platform==='iphone'||platform==='android',hasTouch:platform!=='pc',reducedMotion:'reduce'})
 page.setDefaultTimeout(7000)
 const row={platform,width,height,theme,checks:[],errors:[]};page.on('pageerror',e=>row.errors.push(e.message))
 const mobile=width<1024
 try{
  await page.goto(`http://127.0.0.1:18767/qa/student-subjects/?theme=${theme}${mobile?'&mobile=1':''}`)
  if(mobile)await page.getByRole('button',{name:'Добавить ученика',exact:true}).click()
  const name=mobile?page.getByRole('textbox',{name:'Имя ученика',exact:true}):page.getByPlaceholder('Как зовут ученика?')
  await name.fill('Тимур QA')
  const field=page.getByRole('combobox',{name:'Выберите предметы',exact:true})
  await field.click()
  await page.getByRole('option',{name:'Физика',exact:true}).waitFor()
  for(const subject of ['Химия','Биология','Русский','Литература'])await page.getByRole('option',{name:subject,exact:true}).click()
  assert.equal(await page.getByRole('button',{name:/^Удалить:/}).count(),4)
  row.checks.push('Каталог полный, четыре выбранных предмета видимы')
  await page.getByRole('button',{name:'Удалить: Русский',exact:true}).click()
  await page.getByRole('option',{name:'Русский',exact:true}).click()
  row.checks.push('Удаление плашки и повторный выбор')
  const input=page.getByRole('textbox',{name:'Выберите предметы',exact:true})
  await input.fill('физ')
  assert.equal(await page.getByRole('option').count(),1)
  await input.fill('Экономика')
  await page.getByText('Добавить свой предмет «Экономика»',{exact:true}).click()
  await page.getByRole('button',{name:'Удалить: Экономика',exact:true}).click()
  row.checks.push('Поиск и свой предмет')
  for(const subject of ['Химия','Биология','Русский','Литература'])await page.getByRole('button',{name:`Удалить: ${subject}`,exact:true}).click()
  const submit=mobile?page.getByRole('dialog').getByRole('button',{name:'Добавить ученика',exact:true}):page.getByRole('button',{name:'Добавить ученика',exact:true})
  assert(await submit.isDisabled())
  if(!await input.isVisible())await field.click()
  for(const subject of ['Химия','Биология','Русский','Литература'])await page.getByRole('option',{name:subject,exact:true}).click()
  await page.keyboard.press('Escape')
  await page.getByRole('listbox').waitFor({state:'detached'})
  if(mobile)assert(await page.getByRole('dialog').isVisible(), 'Escape must close the subject list, not the student sheet')
  row.checks.push('Очистка блокирует сохранение, выбор восстанавливается')
  await page.screenshot({path:new URL(`evidence/${platform}-${width}-${theme}.png`,dir).pathname})
  await page.evaluate(()=>sessionStorage.setItem('qa.fail','1'))
  await submit.click()
  await page.getByText('QA: запись отклонена',{exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:/^Удалить:/}).count(),4)
  await page.evaluate(()=>sessionStorage.removeItem('qa.fail'))
  await submit.click()
  await page.getByText('Ученик добавлен',{exact:true}).waitFor()
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qa.subjectStudents')??'[]'))
  assert.equal(saved.length,1);assert.deepEqual(saved[0].subjects,['Химия','Биология','Русский','Литература']);assert.equal(saved[0].group_id,null)
  row.checks.push('Ошибка сохраняет черновик; повтор создаёт одну запись со всеми четырьмя предметами без группы')
  await page.reload()
  const loaded=page.getByTestId('loaded-students');await loaded.filter({hasText:'Тимур QA'}).waitFor()
  assert.deepEqual(JSON.parse(await loaded.innerText())[0].subjects,['Химия','Биология','Русский','Литература'])
  row.checks.push('Чтение реальным useGroups после reload сохраняет массив')
  assert.deepEqual(row.errors,[]);row.status='PASS'
 }catch(e){row.status='FAIL';row.error=e.stack;await page.screenshot({path:new URL(`evidence/FAIL-${platform}-${width}-${theme}.png`,dir).pathname})}
 results.push(row);await page.close()
}
await browser.close()
const files=['src/components/teacher/StudentSubjectsField.tsx','src/components/MultiSelectField.tsx','src/lib/studentSubject.ts','src/lib/useGroups.ts','src/lib/db.ts','src/store/studentDataStore.ts','src/pages/teacher/TeacherGroupsPage.tsx','src/components/teacher/mobile/MobileTeacherStudents.tsx']
const manifest={};for(const file of files)manifest[file]=createHash('sha256').update(await readFile(file)).digest('hex')
await writeFile(new URL('results.json',dir),JSON.stringify({base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Actual creation forms/hooks with fixture REST; not remote E2E or native apps',manifest,results},null,2))
console.log(JSON.stringify(results.map(({platform,width,theme,status,error,checks,errors})=>({platform,width,theme,status,checks:checks.length,error:error?.split('\n')[0],errors}))))
if(results.some(r=>r.status!=='PASS'))process.exitCode=1
