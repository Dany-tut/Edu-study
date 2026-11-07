// OBJ-файлы BodyParts3D → один GLB с именованными узлами (по одному на часть).
// Запуск: node obj2glb.mjs <objDir> <out.glb> <partsJson>
// partsJson: { "partId": ["FJ1234", ...], ... }
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [objDir, out, partsJson, optJson] = process.argv.slice(2)
const parts = JSON.parse(partsJson)
// Опции: {"xMax": -5} — выкинуть треугольники правее порога (в базе «правый глаз» лежит вместе с левым).
const opt = optJson ? JSON.parse(optJson) : {}

function parseObj(text) {
  const pos = [], idx = []
  for (const line of text.split('\n')) {
    if (line.startsWith('v ')) { const p = line.split(/\s+/); pos.push(+p[1], +p[2], +p[3]) }
    else if (line.startsWith('f ')) {
      const v = line.trim().split(/\s+/).slice(1).map(t => parseInt(t.split('/')[0], 10) - 1)
      for (let i = 1; i + 1 < v.length; i++) idx.push(v[0], v[i], v[i + 1])
    }
  }
  return { pos, idx }
}
function normals(pos, idx) {
  const n = new Float32Array(pos.length)
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2]
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    for (const k of [a, b, c]) { n[k] += nx; n[k + 1] += ny; n[k + 2] += nz }
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1
    n[i] /= l; n[i + 1] /= l; n[i + 2] /= l
  }
  return n
}

const bufs = [], views = [], accessors = [], meshes = [], nodes = []
let offset = 0
const pad = (n) => (4 - (n % 4)) % 4
function addView(bytes, target) {
  const view = { buffer: 0, byteOffset: offset, byteLength: bytes.byteLength, target }
  bufs.push(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
  offset += bytes.byteLength
  const p = pad(offset); if (p) { bufs.push(Buffer.alloc(p)); offset += p }
  views.push(view); return views.length - 1
}

for (const [id, files] of Object.entries(parts)) {
  // Склеиваем все файлы части в один меш.
  const pos = [], idx = []
  for (const f of files) {
    const o = parseObj(readFileSync(join(objDir, `${f}.obj`), 'utf8'))
    const base = pos.length / 3
    pos.push(...o.pos); for (const i of o.idx) idx.push(i + base)
  }
  let keep = idx
  if (opt.xMax !== undefined) {
    keep = []
    for (let i = 0; i < idx.length; i += 3) {
      if (pos[idx[i] * 3] < opt.xMax && pos[idx[i + 1] * 3] < opt.xMax && pos[idx[i + 2] * 3] < opt.xMax) keep.push(idx[i], idx[i + 1], idx[i + 2])
    }
  }
  // Перенумеровать вершины, чтобы не тащить неиспользуемые.
  const map = new Map(); const pos2 = []; const idx2 = []
  for (const v of keep) { let m = map.get(v); if (m === undefined) { m = pos2.length / 3; map.set(v, m); pos2.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]) } idx2.push(m) }
  const P = new Float32Array(pos2), I = new Uint32Array(idx2), N = normals(pos2, idx2)
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i + k]); max[k] = Math.max(max[k], P[i + k]) }
  const pv = addView(P, 34962), nv = addView(N, 34962), iv = addView(I, 34963)
  accessors.push({ bufferView: pv, componentType: 5126, count: P.length / 3, type: 'VEC3', min, max })
  accessors.push({ bufferView: nv, componentType: 5126, count: N.length / 3, type: 'VEC3' })
  accessors.push({ bufferView: iv, componentType: 5125, count: I.length, type: 'SCALAR' })
  const a = accessors.length - 3
  meshes.push({ name: id, primitives: [{ attributes: { POSITION: a, NORMAL: a + 1 }, indices: a + 2 }] })
  nodes.push({ name: id, mesh: meshes.length - 1 })
  console.log(id, files.length, 'files', (P.length / 3) | 0, 'verts', (I.length / 3) | 0, 'tris')
}

const json = {
  asset: { version: '2.0', generator: 'iskra obj2glb', copyright: 'BodyParts3D, © The Database Center for Life Science, CC BY 4.0' },
  scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes, accessors, bufferViews: views,
  buffers: [{ byteLength: offset }],
}
// Выравнивание по БАЙТАМ: «©» в UTF-8 — два байта, по символам чанк выходил кривым.
let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8')
if (jsonBuf.length % 4) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(4 - (jsonBuf.length % 4), 0x20)])
const bin = Buffer.concat(bufs)
const header = Buffer.alloc(12); header.write('glTF', 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8)
const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4E4F534A, 4)
const bh = Buffer.alloc(8); bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004E4942, 4)
writeFileSync(out, Buffer.concat([header, jh, jsonBuf, bh, bin]))
console.log('→', out, ((12 + 16 + jsonBuf.length + bin.length) / 1024 / 1024).toFixed(2), 'MB')
