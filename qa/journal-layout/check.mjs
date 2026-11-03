// Run against the local Vite journal fixture with JOURNAL_URL if its port differs.
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const url = process.env.JOURNAL_URL ?? 'http://localhost:5173/journal-stand/?example=groups'
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || undefined })
try {
  const page = await browser.newPage()
  await page.goto(url)
  const tabs = page.locator('.js-tabs button')
  await tabs.first().waitFor()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [320, 390, 768, 1466]) {
    await page.setViewportSize({ width, height: 840 })
    const positions = () => tabs.evaluateAll(buttons => buttons.map(button => [
      button.offsetLeft, button.offsetTop, button.offsetWidth,
      button.querySelector('span').getBoundingClientRect().x,
    ]))
    const initial = await positions()
    for (const label of ['Работы', 'Посещаемость', 'Обзор']) {
      await tabs.filter({ hasText: label }).click()
      assert.deepEqual(await positions(), initial, label + ' at ' + width)
      if (label !== 'Обзор') {
        const titles = page.locator('.js-col-title')
        await titles.first().waitFor()
        assert(await titles.evaluateAll(elements => elements.every(title =>
          getComputedStyle(title).maskImage === 'none' && title.scrollHeight <= title.clientHeight + 1
        )))
      }
    }
    assert.equal(await page.locator('.js-filter-trigger').isVisible(), width < 1100)
    assert.equal(await page.locator('.js-filter-items').isVisible(), width >= 1100)
  }
} finally {
  await browser.close()
}
