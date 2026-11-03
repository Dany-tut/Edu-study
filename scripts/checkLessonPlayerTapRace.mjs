// Vite fixture UI, real pointer events and native media time (no student data).
// PLAYER_BROWSER_MODULE=/path/to/playwright/index.mjs PLAYER_TEST_MEDIA=/path/to/file.mp4 node scripts/checkLessonPlayerTapRace.mjs
// PLAYER_REINTRODUCE_TAP_RACE=1 disables cancellation in the served module: this run must fail.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const { chromium } = await import(process.env.PLAYER_BROWSER_MODULE || 'playwright')
const media = await readFile(process.env.PLAYER_TEST_MEDIA)
const output = process.env.PLAYER_TEST_OUTPUT || '/tmp/iskra-player-tap-race'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYER_BROWSER_CHANNEL || 'msedge', headless: true })
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const page = await browser.newPage({ viewport })
    page.setDefaultTimeout(5000)
    page.setDefaultNavigationTimeout(60000)
    const errors = []
    // Poll native media/fullscreen independently of the player's render loop.
    const waitUntil = async (predicate, argument) => {
      const deadline = Date.now() + 10000
      while (!await page.evaluate(predicate, argument)) {
        assert.ok(Date.now() < deadline, 'Native media/fullscreen readiness timed out')
        await new Promise(resolve => setTimeout(resolve, 30))
      }
    }
    page.on('pageerror', error => errors.push(error.message))
    await page.route(url => url.pathname === '/__player-race.mp4', route => route.fulfill({ contentType: 'video/mp4', body: media }))
    // Extend only the ambiguous-tap deadline in this instrumented run. Native
    // video, rAF and real mouse events keep running normally, even on a slow host.
    await page.route(url => url.pathname === '/src/components/LessonVideoPlayer.tsx', async route => {
        const response = await route.fetch()
        const body = await response.text()
        const statement = 'if (tapTimer.current !== null) window.clearTimeout(tapTimer.current);'
        let mutated = body.replace('const TAP_MS = 220;', 'const TAP_MS = 1000;')
        assert.notEqual(mutated, body, 'Instrument the actual tap deadline')
        if (process.env.PLAYER_REINTRODUCE_TAP_RACE) {
          const index = process.env.PLAYER_REINTRODUCE_TAP_RACE === 'orphan' ? mutated.lastIndexOf(statement) : mutated.indexOf(statement)
          assert.ok(index >= 0)
          mutated = mutated.slice(0, index) + mutated.slice(index).replace(statement, '')
        }
        await route.fulfill({ response, body: mutated })
      })
    try {
      await page.goto(`${process.env.PLAYER_TEST_ORIGIN || 'http://127.0.0.1:5189'}/design/video-player/preview.html?media=/__player-race.mp4`)
      await page.evaluate(() => {
        window.playerTrace = []
        for (const type of ['pointerdown', 'pointerup', 'click', 'play', 'playing', 'pause', 'waiting', 'ended', 'fullscreenchange']) {
          document.addEventListener(type, event => {
            const video = document.querySelector('video')
            window.playerTrace.push({ type, at: performance.now(), target: event.target.closest?.('button')?.getAttribute('aria-label') || event.target.tagName,
              time: video?.currentTime, paused: video?.paused, fullscreen: !!document.fullscreenElement })
          }, true)
        }
      })
      await page.getByRole('button', { name: 'Смотреть', exact: true }).click({ timeout: 30000 })
      await waitUntil(() => document.querySelector('video')?.currentTime > 0)
      const player = page.locator('.lesson-player')
      const control = page.locator('.lesson-player-controls-row button').first()
      const video = page.locator('video')
      const clickControl = async locator => {
        const r = await locator.boundingBox()
        await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2)
        // Real users move to hidden controls first; Playwright locator.click
        // otherwise waits for hit testing before moving the pointer to wake them.
        await page.waitForTimeout(20)
        const next = await locator.boundingBox()
        const hit = await locator.evaluate(element => {
          const r = element.getBoundingClientRect()
          return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
        })
        assert.ok(hit, 'The visible control owns its hit target')
        await page.mouse.click(next.x + next.width / 2, next.y + next.height / 2)
      }
      const frameTap = async () => {
        const r = await player.boundingBox()
        await page.mouse.click(r.x + r.width * .45, r.y + r.height * .12)
      }
      const setPaused = async () => {
        if (!await video.evaluate(v => v.paused)) await clickControl(control)
        await waitUntil(() => document.querySelector('video').paused)
      }
      const checkAdvancing = async label => {
        const before = await video.evaluate(v => v.currentTime)
        await page.waitForTimeout(1150)
        await page.waitForTimeout(100) // Beyond the 220ms delayed frame action.
        const after = await video.evaluate(v => ({ time: v.currentTime, paused: v.paused }))
        assert.equal(after.paused, false, label)
        assert.ok(after.time > before + .1, `${label}: media currentTime advances`)
      }
      const fullscreenButton = page.getByRole('button', { name: 'Во весь экран', exact: true })
      const modes = viewport.width > 600 ? [false, true, false] : [true, false, true]
      for (const fullscreen of modes) {
        if (await page.evaluate(() => !!document.fullscreenElement) !== fullscreen) await clickControl(fullscreenButton)
        await waitUntil(expected => !!document.fullscreenElement === expected, fullscreen)
        // Test native .75× as in the report; no synthetic play/pause state changes.
        await video.evaluate(v => { v.playbackRate = .75 })
        await setPaused()
        await frameTap()
        await page.waitForTimeout(60)
        await clickControl(control)
        await checkAdvancing('Pending frame resume must not undo toolbar Play')
        await setPaused()
        await frameTap()
        await page.waitForTimeout(60)
        // Centre is checked in fullscreen and in desktop normal geometry.
        if (fullscreen || viewport.width > 600) {
          await clickControl(player.locator(':scope > button'))
          await checkAdvancing('Pending frame resume must not undo centre Play')
        } else {
          await clickControl(control)
          await checkAdvancing('Mobile toolbar Play')
        }
        await frameTap()
        await page.waitForTimeout(60)
        await clickControl(control)
        await page.waitForTimeout(1150)
        assert.ok(await video.evaluate(v => v.paused), 'Explicit Pause must not be undone by a pending tap')
        // The ordinary single frame tap still resumes playback.
        await frameTap()
        await page.waitForTimeout(1150)
        await checkAdvancing('Single frame tap')
        await setPaused()
        await frameTap()
        await page.waitForTimeout(40)
        // A tap in another zone used to orphan the first timer. Cancelling
        // only the newest timer is insufficient for repeated mixed clicks.
        const bounds = await player.boundingBox()
        await page.mouse.click(bounds.x + bounds.width * .8, bounds.y + bounds.height * .12)
        await page.waitForTimeout(40)
        await clickControl(control)
        await checkAdvancing('Two frame zones must not leave an orphan timer after Play')
      }
      // Ordinary frame double tap still enters/exits fullscreen.
      if (await page.evaluate(() => !!document.fullscreenElement)) await clickControl(fullscreenButton)
      const r = await player.boundingBox()
      await page.mouse.dblclick(r.x + r.width * .45, r.y + r.height * .12, { delay: 60 })
      await page.waitForTimeout(100)
      await waitUntil(() => !!document.fullscreenElement)
      await setPaused()
      await page.screenshot({ path: `${output}/${viewport.width}-paused.png` })
      assert.deepEqual(errors, [])
      console.log(`${viewport.width}x${viewport.height}: rapid mixed clicks, repeated fullscreen/exit, toolbar/centre Play, Pause ownership, frame single/double taps, hit targets and time advancement passed`)
    } finally {
      await writeFile(`${output}/${viewport.width}-trace.json`, JSON.stringify(await page.evaluate(() => window.playerTrace || []), null, 2))
      await page.close()
    }
  }
} finally { await browser.close() }
