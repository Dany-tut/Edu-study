import assert from 'node:assert/strict'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const load = (await build({ entryPoints: ['src/lib/courseConflictComparison.ts'], bundle: true, write: false, format: 'esm', platform: 'node' })).outputFiles[0].text
const { compareCourseVersions } = await import(`data:text/javascript;base64,${Buffer.from(load).toString('base64')}`)
const id = 'course'
const code = (s, label) => ({ time: '00:15', seconds: s, label })
const variant = { source: 'https://example.test/video', active: 'slides', revision: 2, text: [], slides: [code(15, 'Слайд')] }
const a = { short_id: 'random-a', title: 'Одинаковое название', lesson_number: 0, description: 'База А', timecodes: [code(15, 'Глава')], chapter_variants: variant }
const b = { ...a, short_id: 'random-b', lesson_number: 1, description: 'База Б' }
const db = { title: 'Курс', status: 'draft', group_ids: ['g'], student_ids: [], description: 'Начало\n' + 'длинноеслово'.repeat(50), lessons: [b, a] }
const local = { title: db.title, status: db.status, groupIds: ['g'], studentIds: [], description: '',
  lessons: [b, a].map(r => ({ id: 'local-' + r.short_id, persistedShortId: r.short_id, title: r.title, number: r.lesson_number + 1,
    description: r.description, timecodes: r.timecodes, chapterVariants: { ...r.chapter_variants, revision: 3 } })) }
const compare = () => compareCourseVersions(id, local, db, 'stamp', s => s)
assert.deepEqual(compare().lessonFields, [], 'a technical revision or different row order is not a content difference')
local.lessons[0].description = 'Только Б'
local.lessons[0].timecodes = [code(16, 'Глава')]
local.lessons[0].chapterVariants = { ...variant, active: 'text', source: 'https://example.test/other', slides: [{ ...code(15, 'Слайд'), originalTitle: 'Оригинал' }] }
const info = compare()
assert.equal(info.courseFields[0].database, db.description)
assert.equal(info.courseFields[0].tab, '')
assert.deepEqual(info.renamed, [])
assert.deepEqual(info.lessonFields.map(l => l.id), ['random-b'])
const rows = Object.fromEntries(info.lessonFields[0].fields.map(f => [f.label, f]))
assert.deepEqual(rows['Описание урока'], { label: 'Описание урока', database: 'База Б', tab: 'Только Б' })
assert.match(rows['Таймкоды в плеере'].tab, /16 с/)
assert.match(rows['Таймкоды по слайдам'].tab, /Оригинал/)
assert.deepEqual([rows['Выбранный вариант'].database, rows['Выбранный вариант'].tab], ['По слайдам','По тексту'])
assert.ok(rows['Источник таймкодов'])
const original = structuredClone(local)
original.lessons[0].description = b.description
original.description = db.description
const known = compareCourseVersions(id, local, db, 'stamp', s=>s, original)
assert.equal(known.courseFields[0].keep, 'tab')
assert.equal(known.lessonFields[0].fields.find(f=>f.label==='Описание урока').keep, 'tab')
assert.equal(known.lessonFields[0].fields.find(f=>f.label==='Таймкоды в плеере').keep, 'database')
local.lessons.pop()
assert.deepEqual(compare().added, ['Одинаковое название'])
assert.equal(compare().lessonFields[0].fields[0].tab, '')
db.lessons = [a]
assert.deepEqual(compare().localNew, ['Одинаковое название'])

const fixture = `import React from 'react';import{createRoot}from'react-dom/client';import Dialog from './src/components/teacher/ConflictDialog';
const fire = name => () => window.calls.push(name);
createRoot(document.querySelector('#root')).render(<Dialog info={window.info} onReload={fire('db')} onOverwrite={fire('tab')} onClose={fire('close')} report={{label:'Сообщить об ошибке',onClick:fire('report')}}/>);`
const script = (await build({ stdin: {contents: fixture, loader:'tsx',resolveDir:process.cwd()}, bundle: true, format:'iife', write:false, define:{'process.env.NODE_ENV':'"production"'} })).outputFiles[0].text
const css = readFileSync('src/index.css','utf8')
const chromiumOptions = process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : { channel: 'chrome' }
const browser = await chromium.launch({ headless:true, ...chromiumOptions })
const errors = []
try {
  for (const [width,height] of [[1440,900],[390,844],[320,568],[820,1180],[1180,820],[412,915]]) {
    for (const theme of ['light','dark']) {
      const page = await browser.newPage({viewport:{width,height}})
      page.on('pageerror',e => errors.push(e.message))
      await page.setContent(`<html data-theme="${theme}"><head><style>${css}</style><style>*{box-sizing:border-box}.flex{display:flex}.items-center{align-items:center}.flex-1{flex:1}.flex-shrink-0{flex-shrink:0}.min-w-0{min-width:0}button{font:inherit}</style></head><body><div id="root"></div></body></html>`)
      await page.evaluate(data => {window.info=data;window.calls=[]}, known)
      await page.addScriptTag({content:script})
      const dialog = page.getByRole('dialog')
      await dialog.waitFor()
      await dialog.getByRole('button',{name:'Закрыть'}).waitFor()
      await dialog.getByRole('button',{name:'Закрыть'}).focus()
      await page.keyboard.press('Shift+Tab')
      assert.equal(await dialog.getByRole('button',{name:'Оставить моё'}).evaluate(el=>el===document.activeElement), true)
      await page.keyboard.press('Tab')
      assert.equal(await dialog.getByRole('button',{name:'Закрыть'}).evaluate(el=>el===document.activeElement), true)
      if (process.env.ISKRA_CONFLICT_SCREENSHOTS) {
        mkdirSync(process.env.ISKRA_CONFLICT_SCREENSHOTS,{recursive:true})
        await page.screenshot({path:join(process.env.ISKRA_CONFLICT_SCREENSHOTS,`conflict-${width}-${theme}.png`),animations:'disabled'})
      }
      assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--color-bg-2').trim().toUpperCase()), theme==='dark'?'#1A1A1C':'#F9F9FB')
      assert.ok(await dialog.getByText('При «Оставить моё» здесь останется значение из базы.',{exact:true}).count()>0)
      assert.ok(await dialog.getByText('При «Оставить моё» здесь сохранится значение этой вкладки.',{exact:true}).count()>0)
      assert.equal(await dialog.getByText('Пусто',{exact:true}).count(),1)
      assert.equal(await dialog.getByText('Только Б',{exact:true}).count(),1)
      const geometry = await dialog.evaluate(el => {
        const box=el.getBoundingClientRect()
        const scroller=Array.from(el.querySelectorAll('div')).find(n=>getComputedStyle(n).overflowY==='auto')
        const footer=el.querySelector('footer').getBoundingClientRect()
        return [box.left>=0&&box.right<=innerWidth+1, footer.bottom<=innerHeight,scroller.scrollWidth<=scroller.clientWidth+1,scroller.scrollHeight>scroller.clientHeight]
      })
      assert.deepEqual(geometry,[true,true,true,true],`layout ${width}/${theme}`)
      const scroller=dialog.locator('div[style*="overflow-y: auto"]').first()
      for (const fraction of [0,.5,1]) {
        await scroller.evaluate((el,n)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*n},fraction)
        await page.waitForFunction(({fraction})=>{
          const el=Array.from(document.querySelectorAll('[role=dialog] div')).find(n=>getComputedStyle(n).overflowY==='auto')
          const [top,bottom]=Array.from(el.parentElement.children).slice(-2)
          return top.style.opacity===(fraction===0?'0':'1')&&bottom.style.opacity===(fraction===1?'0':'1')
        },{fraction})
      }
      for(const [name] of [['Сообщить об ошибке'],['Взять из базы'],['Оставить моё'],['Закрыть']]) await dialog.getByRole('button',{name}).click()
      await page.keyboard.press('Escape')
      assert.deepEqual(await page.evaluate(()=>window.calls),['report','db','tab','close','close'])
      await page.close()
    }
  }
} finally {await browser.close()}
assert.deepEqual(errors,[])
console.log('PASS ID-bound descriptions, empty values, timecode positions and variants; real dialog 12 viewport/theme cases, overflow/fades and all actions.')
