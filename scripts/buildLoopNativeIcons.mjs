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
const symbols = { house: 'Home', calendar: 'CalendarCheck', 'person.2': 'Users', 'checkmark.rectangle.stack': 'CheckCircle2', checklist: 'NotebookPen', 'person.crop.circle': 'UserCircle', 'book': 'BookOpen', 'dumbbell': 'Dumbbell', 'magnifyingglass': 'Search', 'slider.horizontal.3': 'SlidersHorizontal' }
const manifest = { pointSize: 24, scale: 3, interiorFill: 'none', symbols: {} }
for (const [symbol, name] of Object.entries(symbols)) {
  const svg = glyphs.find(g => g.name === name).svg
  manifest.symbols[symbol] = { name, sourceSha256: createHash('sha256').update(svg).digest('hex') }
  for (const theme of ['light', 'dark']) {
    const transparent = svg.replaceAll('fill="#ECE5FF"', 'fill="none"')
    const source = theme === 'light' ? transparent : transparent.replaceAll('#5C47BD', '#C6B7FF').replaceAll('#F4A55A', '#FFBA78').replaceAll('#ECE5FF', '#382F55')
    writeFileSync(new URL(`${name}-${theme}@3x.png`, out), new Resvg(source, { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: 72 } }).render().asPng())
  }
}
writeFileSync(new URL('native-manifest.json', out), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Exported ${Object.keys(symbols).length * 2} native Loop images to ${fileURLToPath(out)}`)
