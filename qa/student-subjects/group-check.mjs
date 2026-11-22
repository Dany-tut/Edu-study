const origin=process.env.SUBJECTS_QA_ORIGIN || 'http://127.0.0.1:18767'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
await page.goto(`${origin}/qa/student-subjects/?theme=dark`)
await page.getByPlaceholder('Как зовут ученика?').fill('Группа QA')
await page.getByText('Пока без занятий',{exact:true}).click()
await page.getByText('Химия · ЕГЭ',{exact:true}).click()
assert.equal(await page.getByRole('button',{name:'Удалить: Химия',exact:true}).count(),1)
await page.getByRole('button',{name:'Удалить: Химия',exact:true}).click()
await page.getByText('Пока без занятий',{exact:true}).waitFor()
await page.getByRole('combobox',{name:'Выберите предметы',exact:true}).click()
for(const subject of ['Химия','Биология','Русский','Литература'])await page.getByRole('option',{name:subject,exact:true}).click()
await page.keyboard.press('Escape');await page.getByRole('listbox').waitFor({state:'detached'})
await page.getByRole('button',{name:'Добавить ученика',exact:true}).click()
await page.getByText('Ученик добавлен',{exact:true}).waitFor()
const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qa.subjectStudents'))[0])
const own=await page.evaluate(async id=>(await import('/src/lib/db.ts')).fetchStudentOwnSubjects(id),saved.id)
assert.deepEqual(own,['Химия','Биология','Русский','Литература'])
const result={status:'PASS',checks:['Group adds its subject','Removing group subject resets group','Selected subjects do not assign group','Student profile reader returns all four subjects'],profile:own}
await writeFile(new URL('./group-results.json',import.meta.url),JSON.stringify(result,null,2))
console.log(result)
await browser.close()
