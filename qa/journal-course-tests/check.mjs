import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5188/qa/journal-course-tests/?load=1&groups=2&size=8', { waitUntil: 'domcontentloaded', timeout: 120000 })
  const table = page.locator('table').first()
  await table.locator('tbody tr').nth(2).waitFor()
  for (const width of [1440, 1280, 320, 390, 820, 1180, 412]) {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 900 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme)
      let previous = null
      const sorted = new Set()
      for (const mask of [...Array.from({ length: 16 }, (_, i) => i ^ (i >> 1)), 0]) {
        const flags = [0, 1, 2, 3].map(bit => !!(mask & (1 << bit)))
        const [homework, tests, trials, attendance] = flags
        const controls = [['Без ДЗ', 'С ДЗ'], ['Курс без тестов', 'Курс с тестом'], ['Без пробников', 'С пробником'], ['Только записи', 'С посещаемостью']]
        for (let i = 0; i < flags.length; i++) if (!previous || previous[i] !== flags[i]) {
          await page.getByRole('button', { name: controls[i][Number(flags[i])], exact: true }).click()
        }
        previous = flags
        await page.waitForTimeout(60)
        const count = 4 + flags.filter(Boolean).length
        assert.equal(await table.locator('thead th').count(), count)
        assert.equal(await table.locator('colgroup col').count(), count)
        assert.equal(await table.locator('tbody tr').first().locator('td').count(), count)
        for (const [label, shown] of [['ДЗ', homework], ['Тест', tests], ['Пробник', trials], ['Посещ.', attendance]]) {
          const heading = table.locator('thead th').filter({ hasText: label === 'Посещ.' ? /^Посещ\.$/ : new RegExp('^' + label + '$') })
          assert.equal(await heading.count(), Number(shown))
          if (shown && !sorted.has(label)) { await heading.click(); sorted.add(label) }
        }
        if (attendance) {
          const index = 2 + Number(homework) + Number(tests) + Number(trials)
          const values = await table.locator('tbody tr').evaluateAll((rows, i) => rows.map(row => row.children[i].textContent), index)
          assert(values.some(value => value === '—'), 'Recording-only learner must not show an old percentage')
          assert(values.some(value => value.includes('%')), 'Live learner retains attendance')
        }
      }
      console.log(`columns PASS ${width} ${theme}`)
      const search = page.getByPlaceholder('Поиск ученика…')
      if (await search.isVisible()) {
      await search.fill('Нет такого ученика')
      assert.equal(await table.locator('tbody td').getAttribute('colspan'), '4')
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
  console.log('PASS: real roster 4/5/6/7/8 columns, course switching, sorting, empty search, overflow positions; 7 widths × 2 themes; no page errors')
} finally { await browser.close() }
