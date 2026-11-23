// Exercise the actual transcription component, its local storage, and the
// same fallback order as TimecodeRail. No teacher login or backend writes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const { outputFiles } = await build({
  stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react'
    import {createRoot} from 'react-dom/client'
    import {TranscriptionAction} from './src/components/teacher/LocalTranscription'
    const root=createRoot(document.querySelector('#app'))
    window.show = (source, codes, opts={}) => root.render(<TranscriptionAction owner="qa" lessonKey="lesson" source={source}
      chapterVariants={opts.remote} existingChapters={codes} file={opts.file}
      existing={{transcript:{source,segments:[{start:0,end:1,text:'QA'}]},timecodes:codes}}
      onApply={async () => true}
      onApplyChapters={async value => { window.writes.push(value); return await window.respond() }}>
      {(action,rail,chapters) => {
        window.chapters=chapters
        const visible = chapters?.codes ?? rail?.draft.timecodes ?? codes
        return <>{action}<output data-mode={chapters?.mode}>{visible.map(c=>c.label).join('|')}</output></>
      }}</TranscriptionAction>)
  ` },
  bundle: true, format: 'iife', platform: 'browser', write: false,
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  loader: { '.css': 'empty', '.svg': 'dataurl', '.png': 'dataurl' },
  plugins: [{ name: 'isolated-browser', setup(api) {
    api.onResolve({ filter: /\/supabase$/ }, () => ({ path: 'db', namespace: 'fixture' }))
    api.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
      contents: 'export const supabase={auth:{onAuthStateChange(){}}};export const SUPABASE_URL="";export const SUPABASE_KEY=""',
    }))
    if (process.env.ISKRA_CHAPTER_BASELINE) api.onLoad({ filter: /\/LocalTranscription\.tsx$/ }, () => ({
      contents: execFileSync('git', ['show', process.env.ISKRA_CHAPTER_BASELINE + ':src/components/teacher/LocalTranscription.tsx'], { encoding: 'utf8' }), loader: 'tsx',
    }))
  } }],
})
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.setDefaultTimeout(3000)
  await page.route('**/*', route => route.request().url() === 'http://qa.test/' ?
    route.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' }) : route.abort())
  const key = 'iskra.transcription.job.' + JSON.stringify(['qa', 'lesson'])
  const chapters = label => [{ label, time: '00:01', seconds: 1 }]
  const server = chapters('Server chapters')
  async function mount(source, published, saved) {
    await page.goto('http://qa.test/')
    await page.evaluate(({ key, saved }) => {
      window.writes = []; window.respond = async () => true
      if (saved) { localStorage.clear(); localStorage.setItem(key + '.chapter-variants', JSON.stringify(saved)) }
    }, { key, saved })
    await page.addScriptTag({ content: outputFiles[0].text })
    await page.evaluate(({ source, published }) => window.show(source, published), { source, published })
    await page.locator('output').waitFor({state:'attached'})
  }
  const text = () => page.locator('output').innerText()
  const waitLabel = label => page.waitForFunction(expected => document.querySelector('output')?.textContent === expected, label)
  const save = page.getByRole('button', { name: 'Сохранить', exact: true })
  await mount('video-A', server, { source: 'video-A', revision: 99, active: 'slides', text: server, slides: [] })
  assert.equal(await text(), 'Server chapters', 'old empty mode shadows published chapters')
  assert.equal(await save.count(), 0)
  await page.evaluate(() => window.chapters.select('slides'))
  await waitLabel('')
  // Reload without a save. Switching to a mode without generated chapters is temporary.
  await mount('video-A', server)
  assert.equal(await text(), 'Server chapters')
  await page.evaluate(() => window.chapters.change([]))
  await waitLabel('')
  assert.ok(await save.isEnabled(), 'an explicit last deletion remains reviewable')
  await mount('video-A', server)
  assert.equal(await text(), '', 'explicit deletion survived reload')
  await page.evaluate(() => window.respond = async () => false)
  await save.click()
  await page.getByRole('alert').filter({ hasText: 'Черновик' }).waitFor()
  await page.evaluate(() => window.respond = async () => true)
  await save.click()
  await page.waitForFunction(() => window.writes.length === 2)
  assert.deepEqual(await page.evaluate(() => window.writes.at(-1).text), [])
  assert.ok(!(await page.evaluate(() => 'clearedFrom' in window.writes.at(-1))))
  // A later read from the backend may supersede the local ACK.
  await page.evaluate(codes => window.show('video-A', codes), chapters('Updated after ACK'))
  await waitLabel('Updated after ACK')
  await page.evaluate(() => localStorage.clear())
  await mount('video-A', [])
  await page.evaluate(codes => window.show('video-A', codes), server)
  await waitLabel('Server chapters')
  // Edit A, change recording, edit B. Each recording recovers its own edit.
  await page.evaluate(codes => window.chapters.change(codes), chapters('Draft A'))
  await waitLabel('Draft A')
  await page.evaluate(codes => window.show('video-B', codes), chapters('Server B'))
  await waitLabel('Server B')
  await page.evaluate(codes => window.chapters.change(codes), chapters('Draft B'))
  await waitLabel('Draft B')
  await page.evaluate(codes => window.show('video-A', codes), server)
  await waitLabel('Draft A')
  // A stale ACK must not discard B typed after dispatch.
  await page.evaluate(() => window.respond = () => new Promise(resolve => window.finish = resolve))
  await save.click()
  await page.waitForFunction(() => typeof window.finish === 'function')
  await page.evaluate(codes => { window.chapters.change(codes); window.finish(true) }, chapters('Newer edit'))
  await waitLabel('Newer edit')
  await mount('video-A', server)
  assert.equal(await text(), 'Newer edit')
  // A confirmed change in the database invalidates an older explicit empty intent.
  await page.evaluate(() => window.chapters.change([]))
  await waitLabel('')
  await mount('video-A', chapters('Changed in another tab'))
  assert.equal(await text(), 'Changed in another tab')
  // Offline local files can have the same empty source URL.
  const file = async name => {
    await page.evaluate(({ name, server }) => window.show('', server, { file: new File(['test'], name, { lastModified: 123 }) }), { name, server })
  }
  await file('a.mp4')
  await waitLabel('Server chapters')
  await page.evaluate(codes => window.chapters.change(codes), chapters('File A only'))
  await waitLabel('File A only')
  await file('b.mp4')
  await waitLabel('Server chapters')
  await file('a.mp4')
  await waitLabel('File A only')
  assert.deepEqual(errors, [])
  console.log('PASS actual React chapter hydration, legacy empty tab, explicit deletion/refusal/retry, late ACK, two recordings and reopen')
} finally { await browser.close() }
