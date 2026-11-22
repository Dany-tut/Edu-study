import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { basename, join, resolve } from 'node:path'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import * as playwright from 'playwright'

const engine = process.env.ISKRA_BROWSER_ENGINE || 'chromium'
assert(['chromium', 'webkit'].includes(engine))
const output = process.env.ISKRA_QA_OUTPUT || '.build/grow-minimum-qa'
const bundle = '.build/grow-minimum'
const baseline = process.env.ISKRA_GROW_BASELINE_REF
const component = 'src/components/GrowTextarea.tsx'
const source = baseline
  ? execFileSync('git', ['show', `${baseline}:${component}`], { encoding: 'utf8' })
  : await readFile(component, 'utf8')
await mkdir(output, { recursive: true })
await build({
  entryPoints: ['scripts/fixtures/growLatestMinimum.tsx'], entryNames: 'app',
  outdir: bundle, bundle: true, jsx: 'automatic', format: 'esm',
  loader: { '.svg': 'file', '.png': 'file', '.woff2': 'file' },
  plugins: baseline ? [{ name: 'historical-grow', setup(builder) {
    builder.onLoad({ filter: /[\\/]components[\\/]GrowTextarea\.tsx$/ }, () => ({
      contents: source, loader: 'tsx', resolveDir: resolve('src/components'),
    }))
  } }] : [],
})
await writeFile(join(bundle, 'app.css'), (await postcss([tailwindcss(), autoprefixer()])
  .process(await readFile(join(bundle, 'app.css'), 'utf8'), { from: join(bundle, 'app.css') })).css)
await writeFile(join(output, 'manifest.json'), JSON.stringify({
  base: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  baseline: baseline || null, componentSha256: createHash('sha256').update(source).digest('hex'), engine,
}, null, 2))
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    if (url.pathname === '/') {
      const platform = url.searchParams.get('platform') || 'pc'
      const theme = url.searchParams.get('theme') || 'light'
      const arial = url.searchParams.get('font') === 'Arial'
      response.setHeader('Content-Type', 'text/html; charset=utf-8')
      response.end(`<html data-platform="${platform}" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css">${process.env.ISKRA_QA_FONT_ROBOTO ? '<style>@font-face{font-family:Roboto;src:url(/Roboto.ttf);font-weight:100 900}</style>' : ''}</head><body${arial ? ' style="font-family:Arial"' : ''}><div id="root"></div><script type="module" src="/app.js"></script></body></html>`)
    } else if (url.pathname === '/Roboto.ttf' && process.env.ISKRA_QA_FONT_ROBOTO) {
      response.setHeader('Content-Type', 'font/ttf')
      response.end(await readFile(process.env.ISKRA_QA_FONT_ROBOTO))
    } else if (['/app.js', '/app.css'].includes(url.pathname)) {
      response.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8')
      response.end(await readFile(join(bundle, basename(url.pathname))))
    } else response.writeHead(404).end()
  } catch { response.writeHead(500).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await playwright[engine].launch(engine === 'chromium'
  ? { channel: process.env.ISKRA_BROWSER_CHANNEL || 'chromium', args: ['--disable-gpu', '--renderer-process-limit=1'] }
  : {})
const results = [], errors = []
try {
  for (const [platform, width, height, font] of [
    ['pc', 1440, 1000, 'app'], ['pc', 1024, 900, 'app'],
    ['iphone', 320, 800, 'app'], ['iphone', 390, 844, 'app'],
    ['ipad', 820, 1180, 'app'], ['ipad', 1194, 834, 'app'],
    ['android', 412, 915, 'app'], ['pc', 1440, 1000, 'Arial'],
  ]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: platform !== 'pc', hasTouch: platform !== 'pc' })
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    await page.goto(`${origin}/?platform=${platform}&theme=${theme}&font=${font}`)
    await page.getByRole('textbox', { name: 'border-box', exact: true }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    const steps = []
    const check = async minimum => {
      const geometry = await page.locator('textarea').evaluateAll(elements => elements.map(element => {
        const css = getComputedStyle(element)
        return { box: css.boxSizing, height: parseFloat(element.style.height), client: element.clientHeight,
          scroll: element.scrollHeight, value: element.value, font: css.font }
      }))
      for (const field of geometry) {
        assert(field.height >= minimum, JSON.stringify({ engine, platform, width, theme, minimum, field }))
        assert(field.client + 1 >= field.scroll, JSON.stringify({ engine, platform, width, theme, field }))
      }
      steps.push({ minimum, geometry })
    }
    await check(0)
    for (const [index, minimum] of [120, 40, 180, 0].entries()) {
      await page.evaluate(value => window.growQa.setMinimum(value), minimum)
      await page.waitForTimeout(35)
      await check(minimum)
      await page.evaluate(index => window.growQa.setPanelWidth(index % 2 ? '100%' : 'calc(100% - 24px)'), index)
      await page.waitForTimeout(70)
      await check(minimum)
    }
    for (const box of ['border-box', 'content-box']) {
      const field = page.getByRole('textbox', { name: box, exact: true })
      await field.fill('Первая строка\nВторая строка\nТретья строка\nЧетвёртая строка')
      await check(0)
      await field.fill('Одна строка')
      await check(0)
      await field.evaluate(element => element.setSelectionRange(1, 4))
      await page.evaluate(() => { window.growQa.setMinimum(160); window.growQa.setMinimum(80); window.growQa.setPanelWidth('calc(100% - 32px)') })
      await page.waitForTimeout(70)
      await check(80)
      assert.deepEqual(await field.evaluate(element => [element.selectionStart, element.selectionEnd]), [1, 4])
      await page.evaluate(() => window.growQa.setMinimum(0))
      await page.waitForTimeout(35)
    }
    await page.setViewportSize({ width: width - 20, height })
    await page.waitForTimeout(70)
    await check(0)
    const values = await page.evaluate(() => window.growEvents)
    assert.equal(values.length, 4)
    assert(values.every(value => value === 'Одна строка' || value.includes('Четвёртая строка')))
    await page.screenshot({ path: join(output, `${engine}-${platform}-${width}-${font}-${theme}.png`), fullPage: true })
    results.push({ platform, width, height, theme, font, steps, values })
    await page.close()
  }
  assert.deepEqual(errors, [])
  await writeFile(join(output, 'results.json'), JSON.stringify({ engine, results, errors }, null, 2))
  console.log(`PASS ${engine}: 16 platform/font/theme combinations; current minimum after resize, both box models, clipping, selection and values`)
} finally {
  await browser.close()
  server.close()
}
