import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.argv[2] ?? 'dist')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')
const entry = html.match(/src="\/(assets\/app-[^"]+\.js)"/)?.[1]
assert.ok(entry, 'The startup entry must have its own filename, separate from lazy index chunks')
assert.ok(statSync(resolve(root, entry)).size < 500_000, 'Startup entry exceeds 500KB; defer optional screens/dependencies')
const styles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^"]+)"/g)].map(m => m[1])
const vendor = html.match(/href="\/(assets\/vendor-core-[^"]+\.js)"/)?.[1]
assert.ok(vendor, 'Stable baseline libraries must remain independently cacheable')
const shell = new Set([entry, vendor, ...styles, 'manifest.webmanifest', 'icon.svg', 'icon-teacher.svg'])
const cached = [...readFileSync(resolve(root, 'sw.js'), 'utf8').matchAll(/url:"([^"]+)"/g)].map(m => m[1])
for (const url of cached) assert.ok(shell.has(url), `Optional asset must load on demand: ${url}`)
for (const url of shell) assert.ok(cached.includes(url), `Offline shell missing: ${url}`)
const bytes = cached.reduce((sum, url) => sum + statSync(resolve(root, url)).size, 0)
assert.ok(bytes < 1_200_000, 'Precache exceeds 1.2MB and competes with first-page data')
console.log(`Startup assets: ${statSync(resolve(root, entry)).size}B entry; ${bytes}B shell; optional screens/images excluded`)
