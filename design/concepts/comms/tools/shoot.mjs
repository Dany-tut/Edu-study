// Скриншоты всех макетов: страница × вариант × тема (+ вид «Обоснование»).
// Запуск: PW_FROM=<путь к package.json проекта с playwright> node tools/shoot.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(process.env.PW_FROM || resolve(root, '../../../package.json'));
const { webkit, chromium } = require('playwright');
const out = join(root, 'screens'); mkdirSync(out, { recursive: true });
const pages = ['reminders', 'parent-report', 'payments'];
// WebKit из кэша Playwright, а если его нет — установленный Google Chrome.
const browser = await webkit.launch().catch(() => chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }));
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
async function shot(file, query, name) {
  await page.goto(pathToFileURL(join(root, file + '.html')).href + query);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, name + '.jpg'), fullPage: true, type: 'jpeg', quality: 78 });
  console.log('✓', name);
}
for (const t of ['light', 'dark']) await shot('index', `?t=${t}&view=mock`, `index-${t}`);
for (const t of ['light', 'dark']) await shot('access', `?t=${t}&view=mock`, `access-${t}`);
await shot('access', `?t=light&view=spec`, 'access-spec');
for (const p of pages) for (const v of ['c', 'a', 'b']) for (const t of ['light', 'dark']) await shot(p, `?v=${v}&t=${t}&view=mock`, `${p}-${v}-${t}`);
for (const p of pages) await shot(p, `?v=c&t=light&view=spec`, `${p}-spec`);
await browser.close();
console.log(errors.length ? 'Ошибки:\n' + [...new Set(errors)].join('\n') : 'Ошибок в консоли нет');
