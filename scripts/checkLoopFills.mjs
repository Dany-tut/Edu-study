import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { Resvg } from '@resvg/resvg-js'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = file => readFileSync(path.join(root, file), 'utf8')
const temporary = mkdtempSync(path.join(tmpdir(), 'iskra-loop-fills-'))
try {
  const bundle = await build({
    stdin: { contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import * as artwork from './src/components/icons/loopArtwork';
      import { LoopSvg } from './src/components/icons/LoopIcon';
      const render = (name, props = {}) => renderToStaticMarkup(<LoopSvg name={name} artwork={artwork['LoopArtwork' + name]} {...props} />);
      module.exports = { all: Object.keys(artwork).map(key => render(key.replace('LoopArtwork', ''))),
        circle: render('Circle'), filled: render('Circle', {fill: 'currentColor', color: '#b67b00'}),
        empty: render('Circle', {fill: 'none'}), white: render('Circle', {fill: '#fff'}),
        styled: render('Circle', {fill: '#fff', style: {fill: 'red'}}),
        heart: render('Heart', {style: {'--loop-soft': 'red'}}) };
    `, loader: 'tsx', resolveDir: root },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
  })
  const filename = path.join(temporary, 'icons.cjs')
  writeFileSync(filename, bundle.outputFiles[0].contents)
  const rendered = createRequire(import.meta.url)(filename)
  for (const svg of rendered.all) {
    assert(!svg.includes('#ECE5FF') && !svg.includes('#382F55'), 'Opaque default interior in artwork')
    for (const fill of svg.matchAll(/fill="([^"]+)"/g)) {
      assert(['none', 'currentColor', 'var(--loop-soft, none)', 'var(--loop-detail, #F4A55A)'].includes(fill[1]), `Unexpected default fill ${fill[1]}`)
    }
  }
  // Resolve the browser's inherited custom property before rasterizing the actual React SVG.
  function centerAlpha(svg) {
    const interior = /--loop-soft:([^;"]+)/.exec(svg)?.[1] ?? 'none'
    const source = svg.replaceAll('var(--loop-soft, none)', interior)
      .replaceAll('var(--loop-detail, #F4A55A)', '#F4A55A')
    return new Resvg(source, { font: { loadSystemFonts: false } }).render().pixels[(12 * 24 + 12) * 4 + 3]
  }
  assert.equal(centerAlpha(rendered.circle), 0, 'Default icon interior must expose its surface')
  assert.equal(centerAlpha(rendered.empty), 0, 'Explicit fill=none must remain transparent')
  for (const key of ['filled', 'white', 'styled', 'heart']) assert.equal(centerAlpha(rendered[key]), 255, `${key}: selected fill lost`)
  const selected = rendered.filled.replaceAll('var(--loop-soft, none)', 'currentColor').replaceAll('var(--loop-detail, #F4A55A)', '#F4A55A')
  const selectedPixels = new Resvg(selected).render().pixels
  assert.deepEqual([...selectedPixels.slice((12 * 24 + 12) * 4, (12 * 24 + 12) * 4 + 4)], [182, 123, 0, 255], 'Selected body must match the icon color, not inherited black')
  assert.match(rendered.styled, /--loop-soft:red/, 'style.fill must override the fill attribute')
  const css = read('src/index.css')
  const defaults = [...css.matchAll(/--loop-soft:\s*([^;]+);/g)].map(m => m[1])
  assert.deepEqual(defaults, ['transparent', 'transparent'], 'Both app themes must have transparent interiors')
  const glyphs = JSON.parse(read('design/ios-concepts/loop-kit/glyphs.json'))
  const manifest = JSON.parse(read('public/icons/loop/native-manifest.json'))
  assert.equal(manifest.interiorFill, 'none')
  for (const { name } of Object.values(manifest.symbols)) for (const theme of ['light', 'dark']) {
    let source = glyphs.find(g => g.name === name).svg.replaceAll('fill="#ECE5FF"', 'fill="none"')
    if (theme === 'dark') source = source.replaceAll('#5C47BD', '#C6B7FF').replaceAll('#F4A55A', '#FFBA78')
    const expected = new Resvg(source, { font: { loadSystemFonts: false }, fitTo: {mode: 'width', value: 72} }).render().asPng()
    assert.deepEqual(readFileSync(path.join(root, `public/icons/loop/${name}-${theme}@3x.png`)), expected, `${name} ${theme}: native palette drift`)
  }
  console.log(`Loop fills: ${rendered.all.length} web drawings, both themes, explicit active fills and 12 native assets verified.`)
} finally { rmSync(temporary, {recursive: true, force: true}) }
