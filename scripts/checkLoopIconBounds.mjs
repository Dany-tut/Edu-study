import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Resvg } from '@resvg/resvg-js'

// Render the actual React exports, including Heart and the composed TeacherBook.
// An expanded viewport exposes ink that the normal SVG viewport would discard.
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = mkdtempSync(path.join(tmpdir(), 'iskra-icon-bounds-'))
try {
  const bundle = await build({
    stdin: { contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import * as artwork from './src/components/icons/loopArtwork';
      import { LoopSvg } from './src/components/icons/LoopIcon';
      module.exports = Object.entries(artwork).flatMap(([key, artwork]) =>
        [1, 2, 2.5, 3].map(strokeWidth => ({
          name: key.replace('LoopArtwork', ''), strokeWidth,
          svg: renderToStaticMarkup(<LoopSvg name={key} artwork={artwork} strokeWidth={strokeWidth} />),
        })));
    `, loader: 'tsx', resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  })
  const filename = path.join(temporary, 'icons.cjs')
  writeFileSync(filename, bundle.outputFiles[0].contents)
  const icons = createRequire(import.meta.url)(filename)
  const failures = []
  for (const { name, strokeWidth, svg } of icons) {
    const expanded = svg.replace('width="24"', 'width="320"')
      .replace('height="24"', 'height="320"')
      .replace('viewBox="0 0 32 32"', 'viewBox="-4 -4 40 40"')
      .replaceAll('var(--loop-detail, #F4A55A)', '#F4A55A')
      .replaceAll('var(--loop-soft, #ECE5FF)', '#ECE5FF')
    const image = new Resvg(expanded, { font: { loadSystemFonts: false } }).render()
    const pixels = image.pixels
    let outside = 0
    let ink = 0
    for (let y = 0; y < 320; y++) for (let x = 0; x < 320; x++) {
      ink += pixels[(y * 320 + x) * 4 + 3]
      if (x < 32 || x >= 288 || y < 32 || y >= 288) outside += pixels[(y * 320 + x) * 4 + 3]
    }
    if (!ink) failures.push(`${name}: empty artwork`)
    if (outside) failures.push(`${name} at strokeWidth=${strokeWidth}: ink outside SVG`)
  }
  assert.equal(failures.length, 0, failures.join('\n'))
  console.log(`Loop bounds: ${icons.length / 4} drawings × 4 stroke widths; no clipped ink.`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
