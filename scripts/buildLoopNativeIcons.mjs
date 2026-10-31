import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Build-time only. PNGs are checked in; the app has no rasterizer dependency.
const renderer = process.argv.find(a => a.startsWith('--renderer='))?.slice('--renderer='.length) ?? '@resvg/resvg-js'
const { Resvg } = createRequire(import.meta.url)(renderer)
const root = new URL('../', import.meta.url)
const glyphs = JSON.parse(readFileSync(new URL('design/ios-concepts/loop-kit/glyphs.json', root), 'utf8'))
const out = new URL('public/icons/loop/', root)
mkdirSync(out, { recursive: true })
const symbols = { house: 'Home', calendar: 'CalendarCheck', 'person.2': 'Users', 'checkmark.rectangle.stack': 'CheckCircle2', checklist: 'NotebookPen', 'person.crop.circle': 'UserCircle' }
const manifest = { pointSize: 24, scale: 3, symbols: {} }
for (const [symbol, name] of Object.entries(symbols)) {
  const svg = glyphs.find(g => g.name === name).svg
  manifest.symbols[symbol] = { name, sourceSha256: createHash('sha256').update(svg).digest('hex') }
  for (const theme of ['light', 'dark']) {
    const source = theme === 'light' ? svg : svg.replaceAll('#5C47BD', '#C6B7FF').replaceAll('#F4A55A', '#FFBA78').replaceAll('#ECE5FF', '#382F55')
    writeFileSync(new URL(`${name}-${theme}@3x.png`, out), new Resvg(source, { fitTo: { mode: 'width', value: 72 } }).render().asPng())
  }
}
writeFileSync(new URL('native-manifest.json', out), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Exported 12 native Loop images to ${fileURLToPath(out)}`)
