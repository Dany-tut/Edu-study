// Actual attendance dialog / email-code form with deferred service calls.
// No database, email, native plugin or external network is used.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const { chromium } = await import(process.env.ISKRA_PLAYWRIGHT_MODULE || '/tmp/iskra-icon-qa/node_modules/playwright/index.mjs')
const out = resolve(process.env.ISKRA_QA_OUTPUT || 'docs/qa/readiness-2026-11-03/interrupted-forms')
mkdirSync(out, { recursive: true })
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import Attendance from './src/components/teacher/journalStand/AttendanceEditor';
import EmailCode from './src/components/teacher/TeacherEmailCodeLogin';
import TeacherLogin from './src/pages/teacher/TeacherLoginPage';
import StudentLogin from './src/pages/StudentLoginPage';
const cells=[0,1].slice(0,window.__view==='partial'?2:1).map(i=>({student:{id:'s'+i,name:'QA Ученик '+i},column:{title:'QA Урок'},event:{id:'event'+i,group_id:'group',date:'2026-11-03',time_start:'10:00',lesson_title:'QA Урок'},present:null,grade:null}));
let root=createRoot(document.getElementById('root'));const screen=()=>window.__view==='student'?<StudentLogin/>:window.__view==='login'?<TeacherLogin onLogin={()=>window.__loggedIn++}/>:window.__view==='otp'?<EmailCode onLogin={()=>window.__loggedIn++}/>:<Attendance cells={cells} onClose={()=>window.__closed++} onSaved={()=>window.__saved++}/>;window.__remount=()=>{root.unmount();root=createRoot(document.getElementById('root'));root.render(screen())};root.render(screen());`
const mocks = {
  groups: `export const useAttendance=()=>({saveLesson:(...args)=>window.__service(...args)});`,
  auth: `export const supabase={auth:{signInWithOtp:(...args)=>window.__service(...args),verifyOtp:(...args)=>window.__service(...args),signInWithPassword:(...args)=>window.__service(...args),resetPasswordForEmail:(...args)=>window.__service(...args)}};`,
  i18n: `export const useT=()=>value=>value;`,
  native: `export const useNativeOverlay=()=>{};`,
  keyboard: `export const useKeyboardState=()=>({inset:0,open:false});`,
  social: `export default function Social(){return null}`,
  session: `export const clearStudentSession=()=>{};export const setStudentSession=()=>{};`,
  analytics: `export const trackNow=async()=>{};export const trackEvent=()=>{};`,
  actions: `export const studentPasswordSignIn=async(...args)=>{const r=await window.__service(...args);if(r?.error)throw r.error;return r?.profile??null};export const passwordSignIn=async(...args)=>{const r=await window.__service(...args);if(r?.error)throw r.error};export const verifyEmailCode=async(...args)=>{const r=await window.__service(...args);if(r?.error)throw r.error};`,
  capacitor: `export const Capacitor={isNativePlatform:()=>true};`,
}
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, format: 'iife', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'deferred-services', setup(b) {
    b.onResolve({ filter: /SocialLoginButtons$|lib\/(studentSession|analytics|authActions)$|^@capacitor\/core$/ }, a => ({ path: /SocialLoginButtons$/.test(a.path) ? 'social' : /studentSession$/.test(a.path) ? 'session' : /analytics$/.test(a.path) ? 'analytics' : /authActions$/.test(a.path) ? 'actions' : 'capacitor', namespace: 'qa' }))
    b.onResolve({ filter: /lib\/(useGroups|supabase|i18n|nativeGlass|useKeyboardInset)$/ }, a => ({ path: /useGroups$/.test(a.path) ? 'groups' : /supabase$/.test(a.path) ? 'auth' : /i18n$/.test(a.path) ? 'i18n' : /nativeGlass$/.test(a.path) ? 'native' : 'keyboard', namespace: 'qa' }))
    b.onLoad({ filter: /.*/, namespace: 'qa' }, a => ({ contents: mocks[a.path], resolveDir: process.cwd() }))
  } }], logLevel: 'silent',
})
const results = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
async function fixture(view) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<html lang="ru"><body><div id="root"></div></body></html>' }))
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:5291/qa-forms')
  await page.clock.install()
  await page.evaluate(view => {
    window.__view = view; window.__closed = 0; window.__saved = 0; window.__loggedIn = 0; window.__calls = []
    window.__service = (...args) => new Promise((resolve, reject) => { window.__calls.push(args); window.__resolve = resolve; window.__reject = reject })
  }, view)
  await page.addStyleTag({ content: ':root{--color-bg-2:white;--color-bg:white;--color-text:#171717;--color-border:#ccc}body{font:16px system-ui}button{min-height:44px}button:disabled{opacity:.5}' })
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  return { context, page }
}
async function record(name, page, passed, detail) {
  results.push({ name, status: passed ? 'PASS' : 'FAIL', ...detail })
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
}
try {
  {
    const { context, page } = await fixture('attendance')
    await page.getByRole('button', { name: 'Был', exact: true }).click()
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.clock.runFor(181000)
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
    const closed = await page.evaluate(() => window.__closed)
    const cancelDisabled = await page.getByRole('button', { name: 'Отмена', exact: true }).isDisabled()
    const saving = await page.getByRole('button', { name: 'Сохранение…', exact: true }).count() > 0
    await record('attendance-pending', page, closed > 0 || !cancelDisabled || !saving, { closed, cancelDisabled, saving, virtualSeconds: 181, expectation: 'A hung save has a bounded recovery or explicit exit without losing the draft' })
    await context.close()
  }
  {
    const { context, page } = await fixture('otp')
    await page.getByRole('button', { name: 'Войти по коду из письма', exact: true }).click()
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('qa@example.invalid')
    await page.getByRole('button', { name: 'Отправить код', exact: true }).click()
    await page.evaluate(() => window.__resolve({ error: null }))
    await page.getByRole('textbox', { name: 'Код из письма', exact: true }).fill('123456')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.clock.runFor(181000)
    const changeDisabled = await page.getByRole('button', { name: 'Изменить почту', exact: true }).isDisabled()
    const submitDisabled = await page.getByRole('button', { name: 'Загрузка...', exact: true }).count() > 0
    await record('otp-verification-pending', page, !changeDisabled || !submitDisabled, { changeDisabled, submitDisabled, virtualSeconds: 181 })
    await context.close()
  }
  {
    const { context, page } = await fixture('login')
    await page.getByPlaceholder('Email', { exact: true }).fill('qa@example.invalid')
    await page.getByPlaceholder('Пароль', { exact: true }).fill('synthetic-password')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.getByText('Забыли пароль?', { exact: true }).click()
    await page.clock.runFor(181000)
    const resetBlocked = await page.locator('form button[type=submit]').isDisabled()
    await page.getByText(/Назад ко входу/).last().click()
    const passwordBlocked = await page.locator('form button[type=submit]').isDisabled()
    await record('password-reset-switch-pending', page, !resetBlocked && !passwordBlocked, { resetBlocked, passwordBlocked, otherMethodAvailable: await page.getByRole('button', { name: 'Войти по коду из письма', exact: true }).isEnabled(), virtualSeconds: 181, expectation: 'Switching from a stalled password request does not block recovery and the next login' })
    await context.close()
  }
  {
    const { context, page } = await fixture('attendance')
    await page.getByRole('button', { name: 'Был', exact: true }).click()
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.evaluate(() => window.__reject(Error('Network failed')))
    await page.getByRole('alert').waitFor()
    const draftRetained = await page.getByRole('button', { name: 'Был', exact: true }).getAttribute('aria-pressed') === 'true'
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.evaluate(() => window.__resolve())
    await page.waitForFunction(() => window.__closed === 1)
    await record('attendance-reject-retry', page, draftRetained, { draftRetained, calls: await page.evaluate(() => window.__calls.length) })
    await context.close()
  }
  {
    const { context, page } = await fixture('partial')
    await page.getByRole('button', { name: 'Все присутствовали', exact: true }).click()
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.evaluate(() => window.__resolve())
    await page.waitForFunction(() => window.__calls.length === 2)
    await page.evaluate(() => window.__reject(Error('Second event failed')))
    await page.getByRole('alert').waitFor()
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.waitForFunction(() => window.__calls.length === 3)
    const events = await page.evaluate(() => window.__calls.map(args => args[4]))
    await page.evaluate(() => window.__resolve())
    await page.waitForFunction(() => window.__closed === 1)
    await record('attendance-partial-retry', page, JSON.stringify(events) === JSON.stringify(['event0', 'event1', 'event1']), { events, expectation: 'Retry writes only the failed event; the earlier saved attendance is preserved' })
    await context.close()
  }
  {
    const { context, page } = await fixture('otp')
    const toggle = page.getByRole('button', { name: 'Войти по коду из письма', exact: true })
    await toggle.click()
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('qa@example.invalid')
    await page.getByRole('button', { name: 'Отправить код', exact: true }).click()
    await page.clock.runFor(181000)
    await toggle.click(); await toggle.click()
    const locked = await page.getByRole('button', { name: 'Загрузка...', exact: true }).count() > 0
    await record('otp-pending-reopen', page, !locked, { lockedAfterReopen: locked, virtualSeconds: 181, expectation: 'The email-code method can be retried after a stalled request; collapse/reopen must not keep it locked' })
    await context.close()
  }
  {
    const { context, page } = await fixture('attendance')
    await page.getByRole('button', { name: 'Был', exact: true }).click()
    await page.getByRole('button', { name: '5', exact: true }).click()
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
    await page.evaluate(() => { window.__oldResolve = window.__resolve })
    await page.getByRole('button', { name: 'Отмена', exact: true }).click()
    await page.evaluate(() => window.__remount())
    await page.getByRole('button', { name: 'Был', exact: true }).waitFor()
    const retained = await page.getByRole('button', { name: 'Был', exact: true }).getAttribute('aria-pressed') === 'true'
      && await page.getByRole('button', { name: '5', exact: true }).getAttribute('aria-pressed') === 'true'
    const before = await page.evaluate(() => ({closed: window.__closed, saved: window.__saved}))
    await page.evaluate(() => window.__oldResolve())
    await page.waitForTimeout(60)
    const after = await page.evaluate(() => ({closed: window.__closed, saved: window.__saved}))
    await record('attendance-cancel-late-response', page, retained && JSON.stringify(before) === JSON.stringify(after), {retained, before, after})
    await context.close()
  }
  {
    const { context, page } = await fixture('otp')
    const toggle = page.getByRole('button', {name:'Войти по коду из письма',exact:true})
    await toggle.click()
    await page.getByRole('textbox',{name:'Email',exact:true}).fill('first@example.invalid')
    await page.getByRole('button',{name:'Отправить код',exact:true}).click()
    await page.evaluate(() => {window.__oldResolve=window.__resolve})
    await toggle.click();await toggle.click()
    await page.getByRole('textbox',{name:'Email',exact:true}).fill('second@example.invalid')
    await page.getByRole('button',{name:'Отправить код',exact:true}).click()
    await page.evaluate(() => window.__oldResolve({error:null}))
    await page.waitForTimeout(50)
    const oldIgnored=await page.getByRole('textbox',{name:'Код из письма',exact:true}).count()===0
    await page.evaluate(() => window.__resolve({error:null}))
    await page.getByText('Введите код из письма: second@example.invalid',{exact:true}).waitFor()
    await record('otp-cancel-retry-late-response', page, oldIgnored, {oldIgnored})
    await context.close()
  }
  {
    const { context, page } = await fixture('login')
    await page.getByPlaceholder('Email', { exact: true }).fill('qa@example.invalid')
    await page.getByPlaceholder('Пароль', { exact: true }).fill('synthetic-password')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.getByText('Забыли пароль?', { exact: true }).click()
    await page.evaluate(() => window.__resolve({ error: null }))
    await page.waitForTimeout(50)
    const loginIgnored = await page.evaluate(() => window.__loggedIn === 0)
    await page.getByRole('button', { name: 'Отправить письмо', exact: true }).click()
    await page.getByRole('button', { name: 'Отмена', exact: true }).click()
    await page.evaluate(() => window.__resolve({ error: null }))
    await page.waitForTimeout(50)
    const resetIgnored = await page.getByRole('button', { name: 'Отправить письмо', exact: true }).isVisible()
      && await page.evaluate(() => localStorage.getItem('iskra:password-recovery-role') === null)
    await record('password-reset-cancel-late-response', page, loginIgnored && resetIgnored, { loginIgnored, resetIgnored })
    await context.close()
  }
  {
    const { context, page } = await fixture('student')
    await page.getByPlaceholder('Email', { exact: true }).fill('qa@example.invalid')
    await page.getByPlaceholder('Пароль', { exact: true }).fill('synthetic-password')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.getByRole('button', { name: 'Забыли пароль?', exact: true }).click()
    await page.evaluate(() => window.__resolve({ profile: { id: 'old', name: 'Old', group_id: null } }))
    await page.waitForTimeout(50)
    const stayedOnRecovery = await page.getByRole('button', { name: 'Отправить письмо', exact: true }).isVisible()
    await page.getByRole('button', { name: 'Отправить письмо', exact: true }).click()
    await page.getByRole('button', { name: 'Отмена', exact: true }).click()
    await page.evaluate(() => window.__resolve({ error: null }))
    await page.waitForTimeout(50)
    const lateResetIgnored = await page.getByRole('button', { name: 'Отправить письмо', exact: true }).isVisible()
      && await page.evaluate(() => localStorage.getItem('iskra:password-recovery-role') === null)
    await record('student-cancel-late-response', page, stayedOnRecovery && lateResetIgnored, { stayedOnRecovery, lateResetIgnored })
    await context.close()
  }
  {
    const { context, page } = await fixture('student')
    await page.getByPlaceholder('Email', { exact: true }).fill('qa@example.invalid')
    await page.getByPlaceholder('Пароль', { exact: true }).fill('synthetic-password')
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.clock.runFor(31000)
    const recovered = await page.getByRole('button', { name: 'Войти', exact: true }).isEnabled()
    const retained = await page.getByPlaceholder('Пароль', { exact: true }).inputValue() === 'synthetic-password'
    await record('student-timeout-retains-form', page, recovered && retained, { recovered, retained })
    await page.getByRole('button', { name: 'Войти', exact: true }).click()
    await page.evaluate(() => window.__reject(Error('Profile database unavailable')))
    await page.getByRole('alert').waitFor()
    const safeError = !(await page.getByRole('alert').innerText()).includes('database')
    await record('student-error-retry', page, safeError && await page.getByRole('button', { name: 'Войти', exact: true }).isEnabled(), { safeError })
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(`${out}/results.json`, JSON.stringify({ scope: 'Actual React forms and Modal; deferred Auth/attendance services; no real network or database', results }, null, 2))
for (const r of results) console.log(r.status, r.name)
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1
