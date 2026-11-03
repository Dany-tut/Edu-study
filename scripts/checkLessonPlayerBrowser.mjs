// Run against Vite with a local MP4 fixture; no student data or remote media.
// PLAYER_BROWSER_MODULE=/path/to/playwright/index.mjs PLAYER_TEST_MEDIA=/path/to/file.mp4 node scripts/checkLessonPlayerBrowser.mjs
import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYER_BROWSER_MODULE || 'playwright')
const media = await readFile(process.env.PLAYER_TEST_MEDIA)
const output = process.env.PLAYER_TEST_OUTPUT || '/tmp/iskra-player-fullscreen'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYER_BROWSER_CHANNEL || 'chrome' })
try {
  for (const viewport of [{ width: 1280, height: 832 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route(url => url.pathname === '/__player-test.mp4', route => route.fulfill({ contentType: 'video/mp4', body: media }))
    await page.goto(`${process.env.PLAYER_TEST_ORIGIN || 'http://127.0.0.1:5189'}/design/video-player/preview.html?media=/__player-test.mp4`)
    await page.getByRole('button', { name: 'Смотреть', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('video')?.paused === false)
    const player = page.locator('.lesson-player')
    const pause = page.locator('.lesson-player-controls-row button').first()
    const centre = player.locator(':scope > button')
    const normalButton = await pause.boundingBox()
    await page.getByRole('button', { name: 'Во весь экран', exact: true }).click()
    await page.waitForFunction(() => !!document.fullscreenElement)
    await page.waitForTimeout(200)
    const fullButton = await pause.boundingBox()
    assert.equal(fullButton.height, normalButton.height)
    const box = await player.boundingBox()
    assert.ok(box.y + box.height - fullButton.y - fullButton.height >= 31, 'Fullscreen controls have bottom clearance')
    for (let i = 0; i < 5; i++) {
      await pause.click()
      await page.waitForFunction(() => document.querySelector('video').paused)
      await centre.click({ timeout: 2000 })
      await page.waitForFunction(() => !document.querySelector('video').paused)
    }
    // A browser rejection must preserve a working retry, without an unhandled rejection.
    await pause.click()
    await page.evaluate(() => {
      const video = document.querySelector('video')
      const play = video.play.bind(video)
      video.play = () => { video.play = play; return Promise.reject(new DOMException('Interrupted playback', 'AbortError')) }
    })
    await centre.click()
    await page.waitForTimeout(100)
    assert.equal(await pause.getAttribute('aria-label'), 'Продолжить')
    await centre.click()
    await page.waitForFunction(() => !document.querySelector('video').paused)
    await pause.click()
    await page.screenshot({ path: `${output}/${viewport.width}x${viewport.height}-paused.png` })
    await centre.click()
    // All popovers and timeline remain operable in the fullscreen top layer.
    await page.getByRole('button', { name: 'Громкость', exact: true }).click()
    await page.getByRole('slider', { name: 'Уровень громкости', exact: true }).fill('0.5')
    await page.getByRole('button', { name: 'Скорость', exact: true }).click()
    await page.getByRole('slider', { name: 'Скорость воспроизведения', exact: true }).fill('2')
    await page.getByRole('button', { name: 'Скорость', exact: true }).click()
    await player.hover()
    const rail = page.getByRole('slider', { name: 'Перемотка', exact: true })
    await rail.focus()
    for (const key of ['Home', 'ArrowRight', 'End']) await rail.press(key)
    await page.waitForTimeout(200)
    await rail.evaluate(element => element.blur())
    await page.screenshot({ path: `${output}/${viewport.width}x${viewport.height}.png` })
    if (await page.evaluate(() => !!document.fullscreenElement)) await page.getByRole('button', { name: 'Во весь экран', exact: true }).click()
    await page.waitForFunction(() => !document.fullscreenElement)
    assert.deepEqual(errors, [])
    console.log(`${viewport.width}x${viewport.height}: fullscreen geometry, 5 pause/resume cycles, rejected Play retry, volume/rate, seek and exit passed`)
    await page.close()
  }
} finally { await browser.close() }
