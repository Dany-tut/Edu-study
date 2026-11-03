// Browser regression corpus; requires a local Playwright installation.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const modulePath = process.env.ISKRA_PLAYWRIGHT_MODULE
if (!modulePath) throw new Error('Set ISKRA_PLAYWRIGHT_MODULE to the installed Playwright index.mjs')
const { chromium } = await import(modulePath)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
try {
  const page = await browser.newPage()
  await page.route('**/*', route => route.abort())
  const bundle = await build({ entryPoints: ['src/lib/sanitizeHtml.ts'], bundle: true, write: false, format: 'iife', globalName: 'richText' })
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  for (const payload of [
    '<a href="java&#10;script:window.__probe=1">click</a>',
    '<a href="&#9;javascript:window.__probe=1">click</a>',
    '<img src="invalid" onerror="window.__probe=1">',
    '<svg><script>window.__probe=1</script><a xlink:href="javascript:window.__probe=1">click</a></svg>',
    '<template><img src=x onerror="window.__probe=1"></template>',
    '<iframe srcdoc="<script>parent.__probe=1</script>"></iframe>',
    '<svg><animate onbegin="window.__probe=1"/></svg>',
    '<math><mtext><img src="invalid" onerror="window.__probe=1"></mtext></math>',
  ]) {
    const result = await page.evaluate(html => {
      window.__probe = 0
      document.body.innerHTML = richText.sanitizeHtml(html)
      for (const link of document.querySelectorAll('a')) link.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return document.body.innerHTML
    }, payload)
    await page.waitForTimeout(50)
    assert.equal(await page.evaluate(() => window.__probe), 0, result)
    assert.doesNotMatch(result, /(?:onerror|javascript:|<script)/i)
  }
  assert.equal(await page.evaluate(() => richText.sanitizeHtml('<p><strong>Ответ</strong> <em>ученика</em></p>')), '<p><strong>Ответ</strong> <em>ученика</em></p>')
  console.log('PASS: 8 browser XSS probes and harmless formatting. Saved-answer workflow is not covered.')
} finally { await browser.close() }
