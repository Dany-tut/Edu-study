import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = 'http://127.0.0.1:5291'
const browser = await chromium.launch({ channel: process.env.ISKRA_BROWSER_CHANNEL })
try {
  const context = await browser.newContext({ serviceWorkers: 'block' })
  await context.route('**/*', route => new URL(route.request().url()).origin === base
    ? route.continue() : route.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/#/login')
  await page.locator('input[type=email]').fill('synthetic@example.invalid')
  await page.locator('input[type=password]').fill('synthetic-test-password')
  assert.ok(await page.getByRole('button', { name: 'Войти', exact: true }).isEnabled())
  assert.deepEqual(errors, [])
  console.log(process.platform, process.env.ISKRA_BROWSER_CHANNEL, browser.version(), 'login form passed')
} finally {
  await browser.close()
}
