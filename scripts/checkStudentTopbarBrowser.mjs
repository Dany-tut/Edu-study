// ISKRA_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/checkStudentTopbarBrowser.mjs
// Run against a local Vite server; student data requests are isolated fixtures.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
const { chromium } = await import(process.env.ISKRA_PLAYWRIGHT_MODULE || 'playwright')
const origin = process.env.ISKRA_QA_ORIGIN || 'http://127.0.0.1:5173'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Use a local QA origin')
const out = process.env.ISKRA_QA_OUTPUT || '/tmp/iskra-topbar-qa'
mkdirSync(out, { recursive: true })
const browser = await chromium.launch(process.env.ISKRA_CHROMIUM_PATH ? { executablePath: process.env.ISKRA_CHROMIUM_PATH, headless: true } : { channel: process.env.ISKRA_BROWSER_CHANNEL || 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 768 } })
await context.addInitScript(() => {
  const id = '00000000-0000-4000-8000-000000000001'
  localStorage.setItem('student_session', JSON.stringify({ id, name: 'Митя', groupId: '' }))
  localStorage.setItem(`student_consent_v1_${id}`, '1')
})
await context.route('**/rest/v1/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
// Allows running the identical regression against the original component.
let originalLoads = 0
if (process.env.ISKRA_TOPBAR_BEFORE) await context.route('**/src/pages/DashboardPage.tsx*', async r => {
  originalLoads++
  const response = await r.fetch({ url: `${origin}/src/pages/.topbar-before.tsx` })
  assert.ok((await response.text()).includes('pillMounted'), 'Baseline must contain the original positioning effect')
  await r.fulfill({ response })
})
const page = await context.newPage()
const errors = []
page.on('pageerror', e => errors.push(e.message))
const results = []
async function check(label) {
  const pill = page.locator('#widget-pill-target [data-widget-pill]')
  await pill.waitFor({ state: 'visible' })
  // Check throughout the entrance animation, rather than only its final frame.
  for (let frame = 0; frame < 12; frame++) {
    const box = await page.evaluate(() => {
      const target = document.querySelector('#widget-pill-target')
      const row = target.parentElement.getBoundingClientRect()
      const nav = target.previousElementSibling.getBoundingClientRect()
      const pill = target.querySelector('[data-widget-pill]').getBoundingClientRect()
      return { navRight: nav.right, navCenter: (nav.left + nav.right) / 2, rowCenter: (row.left + row.right) / 2, x: pill.left, right: pill.right, width: innerWidth }
    })
    assert.ok(Math.abs(box.x - box.navRight - 20) < 2, `${label}: widget left=${box.x}, nav right=${box.navRight}`)
    assert.ok(box.right <= box.width + 1, `${label}: widget outside viewport`)
    assert.ok(Math.abs(box.navCenter - box.rowCenter) < 2, `${label}: navigation no longer centered`)
    await page.waitForTimeout(40)
  }
  results.push(label)
}
async function scrollEvidence(label) {
  // Existing diary scrollers and horizontal filters retain their edge fades.
  for (const [state, fraction] of [['start', 0], ['middle', 0.5], ['end', 1]]) {
    await page.evaluate(fraction => {
      for (const el of document.querySelectorAll('main, .swj-filters, div')) {
        const style = getComputedStyle(el)
        if (el.getBoundingClientRect().width && /auto|scroll/.test(style.overflowY)) el.scrollTop = (el.scrollHeight - el.clientHeight) * fraction
        if (el.getBoundingClientRect().width && /auto|scroll/.test(style.overflowX)) el.scrollLeft = (el.scrollWidth - el.clientWidth) * fraction
      }
    }, fraction)
    await page.waitForTimeout(100)
    await page.screenshot({ path: `${out}/${label}-${state}.png` })
  }
}
try {
  await page.goto(`${origin}/#/diary`, { waitUntil: 'domcontentloaded' })
  await check('direct diary entry')
  if (process.env.ISKRA_TOPBAR_BEFORE) assert.ok(originalLoads > 0, 'Original component was not loaded')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await check('diary reload')
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('button', { name: 'Главная', exact: true }).click()
    await page.locator('#widget-pill-target').waitFor({ state: 'detached' })
    await page.waitForTimeout(1100) // outlive the old 800ms measurement burst
    await page.getByRole('button', { name: 'Дневник', exact: true }).click()
    await check(`home → diary ${i}`)
  }
  for (const width of [1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 720 })
    await check(`resize ${width}`)
    const pill = page.locator('[data-widget-pill]')
    for (let i = 0; i < 5; i++) { await pill.click(); await check(`expand/collapse ${width}/${i}`) }
    await page.screenshot({ path: `${out}/desktop-${width}.png` })
    if (width === 1280) await scrollEvidence(`desktop-${width}`)
  }
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 640 })
    await page.waitForTimeout(500)
    assert.equal(await page.locator('#widget-pill-target').count(), 0, 'Desktop widget must unmount on mobile')
    await page.screenshot({ path: `${out}/mobile-${width}.png` })
    await scrollEvidence(`mobile-${width}`)
    results.push(`mobile ${width}`)
    await page.setViewportSize({ width: 1280, height: 720 })
    await check(`mobile ${width} → desktop`)
  }
  assert.deepEqual(errors, [], 'Uncaught browser errors')
  writeFileSync(`${out}/results.json`, JSON.stringify({ results, errors, fixtures: 'Empty student data; no production writes' }, null, 2))
  console.log(`PASS: ${results.length} entry, remount, resize and interaction states; geometry checked throughout animations. Evidence: ${out}`)
} finally { await browser.close() }
