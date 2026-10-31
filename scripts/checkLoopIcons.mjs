import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const read = file => readFileSync(path.join(root, file), 'utf8')
const exported = new Set([...read('src/components/icons/appIcons.tsx').matchAll(/export const (\w+)/g)].map(m => m[1]))
const types = new Set(['LucideIcon', 'LucideProps', 'IconNode'])
const errors = []
let imports = 0
function scan(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name)
    if (ent.isDirectory()) { scan(file); continue }
    if (!/\.tsx?$/.test(file)) continue
    const rel = path.relative(root, file).replaceAll(path.sep, '/')
    const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
    function visit(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text
        const clause = node.importClause
        const desktopPicker = rel === 'src/pages/teacher/TeacherConstructorPage.tsx' && clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)
        if (spec === 'lucide-react' && !clause?.isTypeOnly && !desktopPicker && !rel.startsWith('src/components/icons/')) errors.push(`${rel}: use appIcons instead of importing Lucide directly`)
        if (spec.endsWith('/appIcons') && clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          imports++
          for (const item of clause.namedBindings.elements) {
            const name = (item.propertyName ?? item.name).text
            if (!item.isTypeOnly && !types.has(name) && name !== 'createLucideIcon' && !exported.has(name)) errors.push(`${rel}: missing Loop artwork for ${name}`)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
}
scan(path.join(root, 'src'))
const glyphs = JSON.parse(read('design/ios-concepts/loop-kit/glyphs.json'))
assert.equal(new Set(glyphs.map(g => g.name)).size, glyphs.length, 'Loop names must be unique')
for (const glyph of glyphs) {
  assert(exported.has(glyph.name), `Missing responsive export: ${glyph.name}`)
  assert.equal(read(`design/ios-concepts/loop-kit/svg/${glyph.name}.svg`), glyph.svg, `SVG source drift: ${glyph.name}`)
}
const native = JSON.parse(read('public/icons/loop/native-manifest.json'))
const swiftNames = read('ios/App/App/NativeGlassPlugin.swift').split('private static let names = [')[1].split(']')[0]
const pairs = [...swiftNames.matchAll(/"([^"]+)": "([^"]+)"/g)].map(m => [m[1], m[2]])
for (const [symbol, name] of pairs) {
  const entry = native.symbols[symbol]
  assert.equal(entry?.name, name, `Native mapping drift: ${symbol}`)
  const source = glyphs.find(g => g.name === name)
  assert.equal(createHash('sha256').update(source.svg).digest('hex'), entry.sourceSha256, `Native artwork is stale: ${name}`)
  for (const theme of ['light', 'dark']) {
    const png = readFileSync(path.join(root, `public/icons/loop/${name}-${theme}@3x.png`))
    assert.equal(png.readUInt32BE(16), native.pointSize * native.scale, `${name} PNG width`)
    assert.equal(png.readUInt32BE(20), native.pointSize * native.scale, `${name} PNG height`)
  }
}
assert.equal(errors.length, 0, errors.join('\n'))
console.log(`Loop coverage: ${glyphs.length} Figma glyphs + Heart, ${imports} icon imports, ${pairs.length} native symbols (light/dark). No mobile Lucide bypasses.`)
