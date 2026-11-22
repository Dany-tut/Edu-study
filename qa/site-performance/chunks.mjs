import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import React from 'react'
import { renderToString } from 'react-dom/server'

const cache = 'node_modules/.cache/site-performance-chunks'
mkdirSync(cache, { recursive: true })
const imports = []
const pending = []
globalThis.__authoredChunkImport = name => {
  imports.push(name)
  return new Promise((resolve, reject) => pending.push({ name, resolve, reject }))
}
const exportsByName = { apChemistryLessons: 'AP_LESSON_CONTENT', bioCellLessons: 'BIO_CELL_LESSON_CONTENT', bioPreULessons: 'BIO_PREU_LESSON_CONTENT' }
await build({
  entryPoints: ['src/data/apLessonChunk.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `${cache}/loader.mjs`, logLevel: 'silent',
  plugins: [{ name: 'controlled-chunk-network', setup(b) {
    b.onLoad({ filter: /\/apLessonChunk\.ts$/ }, args => ({ contents: readFileSync(args.path, 'utf8').replace(/import\('\.\/(apChemistryLessons|bioCellLessons|bioPreULessons)'\)/g, (_, name) => `globalThis.__authoredChunkImport('${name}')`), loader: 'ts' }))
  } }],
})
const { loadApLessons, apLessonContent } = await import(pathToFileURL(`${process.cwd()}/${cache}/loader.mjs`))
await loadApLessons(['ordinary-lesson', 'apchemistry-0', 'toString-x', 'constructor-x'])
assert.deepEqual(imports, [], 'ordinary and inherited-object names must not download authored content')
const chemistry = loadApLessons(['apchem-ru-0', 'apchem-en-3'])
const chemistryAgain = loadApLessons(['apchem-ru-1~rec'])
assert.deepEqual(imports, ['apChemistryLessons'], 'same subject concurrent requests must share one import')
let complete = false
chemistry.then(() => { complete = true })
await Promise.resolve()
assert.equal(complete, false, 'caller waits for fallback content, not only import scheduling')
const cell = loadApLessons(['biocell-ru-0'])
const prep = loadApLessons(['bioprep-ru-0'])
const resolve = (name, content) => pending.find(x => x.name === name).resolve({ [exportsByName[name]]: content })
resolve('bioCellLessons', { 'biocell-ru-0': { title: 'Cell' } })
await cell
resolve('apChemistryLessons', { 'apchem-ru-0': { title: 'Chemistry' } })
await Promise.all([chemistry, chemistryAgain])
assert.equal(apLessonContent('biocell-ru-0').title, 'Cell', 'later completion preserves another subject')
assert.equal(apLessonContent('apchem-ru-0').title, 'Chemistry')
const oldError = console.error
console.error = () => {}
pending.find(x => x.name === 'bioPreULessons').reject(new Error('controlled network failure'))
await prep
console.error = oldError
const retry = loadApLessons(['bioprep-ru-0'])
assert.equal(imports.filter(x => x === 'bioPreULessons').length, 2, 'only failed subject can be retried')
pending.filter(x => x.name === 'bioPreULessons').at(-1).resolve({ BIO_PREU_LESSON_CONTENT: { 'bioprep-ru-0': { title: 'Prep' } } })
await retry
await loadApLessons()
assert.equal(imports.length, 4, 'legacy no-argument load reuses all fulfilled subjects')
assert.equal(apLessonContent('bioprep-ru-0').title, 'Prep')
assert.equal(apLessonContent('ordinary-lesson'), undefined)

let fresh = []
let modalImports = 0
let finishModal
const dismissFresh = () => {}
globalThis.__stickerFixture = () => ({ fresh, emblems: [], dismissFresh })
globalThis.__loadStickerModal = () => {
  modalImports++
  return new Promise(resolve => { finishModal = () => resolve({ default: ({ items, onClose }) => {
    assert.equal(onClose, dismissFresh)
    return React.createElement('div', null, `fresh:${items.length}`)
  } }) })
}
await build({ entryPoints: ['src/components/StickerRevealGate.tsx'], bundle: true, platform: 'node', format: 'esm', outfile: `${cache}/gate.mjs`, external: ['react', 'react/jsx-runtime'], logLevel: 'silent', plugins: [{ name: 'controlled-sticker-network', setup(b) {
  b.onLoad({ filter: /\/StickerRevealGate\.tsx$/ }, args => ({ contents: readFileSync(args.path, 'utf8').replace("import('./StickerRevealModal')", 'globalThis.__loadStickerModal()'), loader: 'tsx' }))
  b.onResolve({ filter: /\/stickers$/ }, () => ({ path: 'stickers', namespace: 'fixture' }))
  b.onResolve({ filter: /\/chunkError$/ }, () => ({ path: 'retry', namespace: 'fixture' }))
  b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: args.path === 'stickers' ? 'export const useStickers=globalThis.__stickerFixture' : 'export const retryImport=f=>f()' }))
} }] })
const { default: Gate } = await import(pathToFileURL(`${process.cwd()}/${cache}/gate.mjs`))
assert.equal(renderToString(React.createElement(Gate)), '')
assert.equal(modalImports, 0, 'student without fresh stickers does not download modal')
fresh = [{ id: 'sticker-a' }]
renderToString(React.createElement(Gate))
assert.equal(modalImports, 1)
finishModal()
await new Promise(resolve => setImmediate(resolve))
assert.match(renderToString(React.createElement(Gate)), /fresh:1/, 'resolved modal receives the actual fresh items')
fresh = []
assert.equal(renderToString(React.createElement(Gate)), '')
assert.equal(modalImports, 1, 'dismissed modal does not trigger another import')

const app = readFileSync('src/App.tsx', 'utf8')
assert.match(app, /const StickerRevealGate = lazy\(\(\) => retryImport\(\(\) => import\('\.\/components\/StickerRevealGate'\)\)\)/)
assert.doesNotMatch(app, /import StickerRevealGate from/)
assert.match(app, /consented && <Suspense fallback=\{null\}><StickerRevealGate \/><\/Suspense>/)
console.log('PASS chunks: ordinary lessons zero imports; per-subject dedup, completion/merge, failure retry, legacy all; lazy sticker modal only with fresh items; App consent/Suspense integration')
