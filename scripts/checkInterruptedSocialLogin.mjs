// Real SocialLoginButtons + socialAuth with controlled native/provider boundaries.
// This tests recovery from interruption, not Apple's or Google's authentication.
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const { chromium } = await import(process.env.ISKRA_PLAYWRIGHT_MODULE || '/tmp/iskra-icon-qa/node_modules/playwright/index.mjs')
const out = resolve(process.env.ISKRA_QA_OUTPUT || 'docs/qa/readiness-2026-11-03/interrupted-login')
mkdirSync(out, { recursive: true })
const results = []
const bundle = await build({
  stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import Buttons from './src/components/SocialLoginButtons';import{initializeNativeOAuth}from'./src/lib/socialAuth';void initializeNativeOAuth(message=>window.dispatchEvent(new CustomEvent('iskra:auth-error',{detail:message})));createRoot(document.getElementById('root')).render(<Buttons role="teacher"/>);`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'controlled-native-boundaries', setup(b) {
    b.onResolve({ filter: /^@capacitor\/(app|browser|core)$/ }, a => ({ path: a.path, namespace: 'qa' }))
    b.onResolve({ filter: /^(\.\/supabase|\.\/studentSession|\.\/analytics|\.\.\/lib\/i18n|\.\/Alert)$/ }, a => ({ path: a.path, namespace: 'qa' }))
    b.onLoad({ filter: /.*/, namespace: 'qa' }, ({ path }) => ({ resolveDir: process.cwd(), contents:
      path === '@capacitor/core' ? `export const Capacitor={isNativePlatform:()=>true};` :
      path === '@capacitor/app' ? `export const App={addListener:async(name,fn)=>{window.__appListeners[name]=fn;return{remove(){}}},getLaunchUrl:async()=>({})};` :
      path === '@capacitor/browser' ? `export const Browser={open:async()=>{window.__opens++;if(window.__mode==='reject')throw Error('Не удалось открыть страницу входа');if(window.__mode.startsWith('pending'))await new Promise(()=>{});},close:async()=>{},addListener:async(name,fn)=>{window.__browserListeners[name]=fn;return{remove(){}}}};` :
      path === './supabase' ? `export const supabase={auth:{signInWithOAuth:async()=>({data:{url:'https://provider.example.invalid/authorize'},error:null}),getUser:async()=>({data:{user:null},error:null})}};` :
      path === './studentSession' ? `export const clearStudentSession=()=>{};export const setStudentSession=()=>{};` :
      path === './analytics' ? `export const trackNow=async()=>{};export const trackEvent=()=>{};` :
      path === '../lib/i18n' ? `export const useT=()=>value=>value;` :
      `import React from'react';export const Alert=({text})=>React.createElement('p',{role:'alert'},text);`
    }))
  } }], logLevel: 'silent',
})
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const mode of ['resolve', 'reject', 'callback-denied', 'pending', 'pending-timeout']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    // A local origin enables storage. All network requests receive an empty fixture.
    await context.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<html lang="ru"><body><div id="root"></div></body></html>' }))
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:5291/qa-interruption')
    await page.clock.install()
    await page.evaluate(mode => { window.__mode = mode; window.__opens = 0; window.__appListeners = {}; window.__browserListeners = {} }, mode)
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.getByRole('button', { name: 'Продолжить с Apple', exact: true }).click()
    await page.evaluate(async mode => {
      if (mode === 'resolve') await window.__browserListeners.browserFinished?.()
      if (mode === 'callback-denied') await window.__appListeners.appUrlOpen?.({ url: 'iskra://auth/callback?error=access_denied' })
      await window.__appListeners.appStateChange?.({ isActive: true })
      window.dispatchEvent(new Event('focus'))
      window.dispatchEvent(new Event('pageshow'))
      document.dispatchEvent(new Event('visibilitychange'))
    }, mode)
    await page.clock.runFor(mode === 'pending-timeout' ? 181000 : 120000)
    // Native listeners intentionally fire-and-forget. Settle their microtasks
    // and React's MessageChannel work before inspecting the resulting screen.
    await page.evaluate(async () => { for (let i = 0; i < 20; i++) await Promise.resolve() })
    await page.waitForTimeout(50)
    const offeredCancel = await page.getByRole('button', { name: 'Отменить вход', exact: true }).count() > 0
    if (mode === 'pending' && offeredCancel) await page.getByRole('button', { name: 'Отменить вход', exact: true }).click()
    const state = await page.getByRole('button').evaluateAll(xs => xs.map(b => ({ text: b.innerText, disabled: b.disabled })))
    const googleEnabled = state.some(b => b.text.includes('Google') && !b.disabled)
    const appleEnabled = state.some(b => b.text.includes('Apple') && !b.disabled)
    const canCancel = await page.getByRole('button', { name: /Отменить|Закрыть|Другой способ/ }).count() > 0
    const pendingRole = await page.evaluate(() => localStorage.getItem('iskra:oauth-role'))
    const errorText = await page.getByRole('alert').allTextContents()
    const safeMessage = !errorText.some(text => /access_denied|server_error|invalid_grant/.test(text))
    const passed = googleEnabled && appleEnabled && !pendingRole && safeMessage
    results.push({ scenario: mode === 'resolve' ? 'Native browser opened, then closed without callback; foreground return' : mode === 'reject' ? 'Native browser refuses to open' : mode === 'callback-denied' ? 'Provider returns access_denied in native callback' : mode === 'pending-timeout' ? 'Native browser open never resolves; timeout after 181 seconds' : 'Native browser open never resolves; user cancels after two minutes', status: passed ? 'PASS' : 'FAIL', state, canCancel: offeredCancel || canCancel, pendingRole, controlsRecovered: googleEnabled && appleEnabled, safeMessage, errorText, scope: 'Actual React component and socialAuth; native bridge and provider are fixtures' })
    await page.screenshot({ path: `${out}/${mode}.png`, fullPage: true })
    await context.close()
  }
} finally { await browser.close() }
writeFileSync(`${out}/results.json`, JSON.stringify({ productionModified: false, realIPhoneTested: false, results }, null, 2))
for (const r of results) console.log(r.status, r.scenario)
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1
