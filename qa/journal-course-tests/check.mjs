import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5188/qa/journal-course-tests/?load=1&groups=2&size=8')
  const table = page.locator('table').first()
  await table.locator('tbody tr').nth(2).waitFor()
  for (const width of [1440, 1280, 320, 390, 820, 1180, 412]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
      for (const [tests, trials] of [[false, false], [true, false], [true, true], [false, true], [false, false]]) {
        await page.getByRole('button', { name: tests ? 'Курс с тестом' : 'Курс без тестов', exact: true }).click()
        await page.getByRole('button', { name: trials ? 'С пробником' : 'Без пробников', exact: true }).click()
        await page.waitForTimeout(100)
        const count = 6 + Number(tests) + Number(trials)
        assert.equal(await table.locator('thead th').count(), count)
        assert.equal(await table.locator('colgroup col').count(), count)
        assert.equal(await table.locator('tbody tr').first().locator('td').count(), count)
        for (const [label, shown] of [['Тест', tests], ['Пробник', trials]]) {
          const heading = table.locator('thead th').filter({ hasText: new RegExp(`^${label}$`) })
          assert.equal(await heading.count(), Number(shown))
          if (shown) await heading.click()
        }
      }
      console.log(`columns PASS ${width} ${theme}`)
      const search = page.getByPlaceholder('Поиск ученика…')
      if (await search.isVisible()) {
      await search.fill('Нет такого ученика')
      assert.equal(await table.locator('tbody td').getAttribute('colspan'), '6')
      await search.fill('')
      }
      for (const ratio of [0, .5, 1]) await table.evaluate((el, r) => {
        let p = el.parentElement
        while (p && p.scrollWidth <= p.clientWidth) p = p.parentElement
        if (p) p.scrollLeft = (p.scrollWidth - p.clientWidth) * r
      }, ratio)
      if ([1440, 390].includes(width)) await page.screenshot({ path: `/tmp/iskra-journal-${width}-${theme}.png` })
    }
  }
  assert.deepEqual(errors, [])
  console.log('PASS: real roster 6/7/8 columns, course switching, sorting, empty search, overflow positions; 7 widths × 2 themes; no page errors')
} finally { await browser.close() }
