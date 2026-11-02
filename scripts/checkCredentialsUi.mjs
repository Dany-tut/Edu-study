// Renders the actual credential component in an isolated synthetic panel.
// Not an authenticated app or backend E2E test.
import { readFileSync, mkdirSync } from 'node:fs'
import { build } from 'esbuild'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.ISKRA_PLAYWRIGHT_MODULE || '/missing/playwright/index.mjs')
const source = readFileSync('src/pages/teacher/TeacherGroupsPage.tsx','utf8')
const component = source.slice(source.indexOf('function CredentialsSpoiler('),source.indexOf('function StudentAvatar('))
const result = await build({ stdin: { contents: `
import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Check,Copy} from './src/components/icons/appIcons';
import {OverlayScrollArea} from './src/components/teacher/OverlayScroll';
const useT = () => (value:string) => value;
const copyToClipboard = async (value:string) => { window.__copied = value; return true; };
${component}
function Fixture() {
 const [password,setPassword] = useState('');
 window.__issue = () => setPassword('synthetic-one-time-password');
 return <div style={{height:'80vh',maxWidth:400,margin:'20px auto',display:'flex',flexDirection:'column',background:'var(--color-surface)',borderRadius:24}}>
 <h3 style={{padding:16}}>Доступ в кабинет</h3>
 <OverlayScrollArea style={{flex:1}} padding="16px 20px" scrollStyle={{display:'flex',flexDirection:'column',gap:16}}>
 <CredentialsSpoiler login="synthetic@example.invalid" password={password}/>
 <p>Пароль ученика не хранится. При необходимости выдайте новый.</p>
 {Array.from({length:16},(_,n)=><p key={n}>Синтетическое содержимое панели {n+1}</p>)}
 </OverlayScrollArea>
 </div>
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
`, resolveDir:process.cwd(),loader:'tsx' }, bundle:true,write:false,format:'iife',jsx:'automatic' })
mkdirSync('docs/qa/security-2026-11-02/credentials-ui',{recursive:true})
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
try {
 const page = await browser.newPage()
 await page.route('**/*',route=>route.abort())
 const errors=[]; page.on('pageerror',e=>errors.push(e.message))
 const css=readFileSync('src/index.css','utf8')
 for (const width of [390,1280]) {
 await page.setViewportSize({width,height:720})
 await page.setContent(`<style>${css}</style><div id="root"></div>`)
 await page.addScriptTag({content:result.outputFiles[0].text})
 await page.getByText('Доступ в кабинет',{exact:true}).waitFor()
 assert.equal(await page.getByLabel('Показать пароль',{exact:true}).count(),0)
 await page.evaluate(()=>window.__issue())
 await page.getByLabel('Показать пароль',{exact:true}).click()
 await page.getByText('synthetic-one-time-password',{exact:true}).waitFor()
 await page.getByLabel('Скопировать пароль',{exact:true}).click()
 assert.equal(await page.evaluate(()=>window.__copied),'synthetic-one-time-password')
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
 for (const [name,fraction] of [['start',0],['middle',.5],['end',1]]) {
  await page.evaluate(f=> { const el=[...document.querySelectorAll('*')].find(x=>x.scrollHeight>x.clientHeight+100 && ['auto','scroll'].includes(getComputedStyle(x).overflowY)); if(!el)throw Error('No scroll area');el.scrollTop=(el.scrollHeight-el.clientHeight)*f },fraction)
  await page.waitForTimeout(80)
  await page.screenshot({path:`docs/qa/security-2026-11-02/credentials-ui/${width}-${name}.png`})
 }
 }
 assert.deepEqual(errors,[])
 console.log('PASS: synthetic credential panel at 390/1280px, absent historical password, one-time reveal/copy, no horizontal overflow, scroll screenshots start/middle/end')
} finally {await browser.close()}
