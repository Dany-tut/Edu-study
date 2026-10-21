// Черты каны из KanjiVG → src/data/kanaStrokes.ts
//
// KanjiVG (Ulrich Apel, CC BY-SA 3.0, https://kanjivg.tagaini.net) хранит
// каждую черту SVG-кривой в квадрате 109×109, в порядке письма. Обводке нужны
// точки (см. ChamoTrace: расстояние до ломаной считается арифметикой), поэтому
// кривые здесь сэмплируются в ломаную с шагом ~4 единицы и переводятся в 0..100.
//
// Запуск: node scripts/buildKanaStrokes.mjs [папка-с-svg]
// Без папки качает файлы с GitHub (хирагана U+3041–3096, катакана U+30A1–30FA, ー).
import fs from 'fs'
import path from 'path'

const dir = process.argv[2]
const codes = []
for (let c = 0x3041; c <= 0x3096; c++) codes.push(c)
for (let c = 0x30a1; c <= 0x30fa; c++) codes.push(c)
codes.push(0x30fc)

async function load(code) {
  const name = code.toString(16).padStart(5, '0') + '.svg'
  if (dir) {
    const f = path.join(dir, name)
    return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
  }
  const r = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${name}`)
  return r.ok ? r.text() : null
}

function sample(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g)
  let i = 0, cmd = '', x = 0, y = 0, lc = null
  const out = []
  const num = () => parseFloat(toks[i++])
  const isNum = () => i < toks.length && !/[a-zA-Z]/.test(toks[i])
  const bez = (p0, p1, p2, p3) => {
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1])
    const n = Math.max(4, Math.ceil(len / 2))
    for (let k = 1; k <= n; k++) {
      const t = k / n, u = 1 - t
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ])
    }
  }
  while (i < toks.length) {
    if (!isNum()) cmd = toks[i++]
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    const b = rel ? [x, y] : [0, 0]
    if (C === 'M') { x = b[0] + num(); y = b[1] + num(); out.push([x, y]); cmd = rel ? 'l' : 'L'; lc = null }
    else if (C === 'L') { x = b[0] + num(); y = b[1] + num(); out.push([x, y]); lc = null }
    else if (C === 'C') {
      const p1 = [b[0] + num(), b[1] + num()], p2 = [b[0] + num(), b[1] + num()], p3 = [b[0] + num(), b[1] + num()]
      bez([x, y], p1, p2, p3); lc = p2; x = p3[0]; y = p3[1]
    } else if (C === 'S') {
      const p1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y]
      const p2 = [b[0] + num(), b[1] + num()], p3 = [b[0] + num(), b[1] + num()]
      bez([x, y], p1, p2, p3); lc = p2; x = p3[0]; y = p3[1]
    } else if (C === 'Z') lc = null
    else throw new Error(`неизвестная команда пути: ${cmd}`)
  }
  return out
}

/** Прореживание: точка не чаще чем через `step` по длине пути, конец сохраняется. */
function resample(p, step) {
  const out = [p[0]]
  let acc = 0
  for (let k = 1; k < p.length; k++) {
    acc += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1])
    if (acc >= step) { out.push(p[k]); acc = 0 }
  }
  const last = p[p.length - 1]
  const tail = out[out.length - 1]
  if (tail !== last) {
    if (out.length > 1 && Math.hypot(tail[0] - last[0], tail[1] - last[1]) < step * 0.4) out[out.length - 1] = last
    else out.push(last)
  }
  return out
}

const res = {}
for (const code of codes) {
  const svg = await load(code)
  if (!svg) { console.warn('нет файла', code.toString(16)); continue }
  const ds = [...svg.matchAll(/<path id="kvg:[0-9a-f]+-s\d+"[^>]*\sd="([^"]+)"/g)].map(m => m[1])
  if (!ds.length) continue
  res[String.fromCodePoint(code)] = ds
    .map(d => resample(sample(d), 4).map(([a, b]) => `${Math.round(a / 109 * 100)},${Math.round(b / 109 * 100)}`).join(' '))
    .join('|')
}

const body = Object.entries(res).map(([k, v]) => `  '${k}': '${v}',`).join('\n')
fs.writeFileSync(new URL('../src/data/kanaStrokes.ts', import.meta.url), `// СГЕНЕРИРОВАНО scripts/buildKanaStrokes.mjs — руками не править.
//
// Черты хираганы и катаканы в порядке письма. Источник — KanjiVG
// (© Ulrich Apel, CC BY-SA 3.0, https://kanjivg.tagaini.net), кривые
// пересчитаны в ломаные в квадрате 0..100. Формат: черты через «|», точки
// «x,y» через пробел. Файл грузится лениво — только когда на экране обводка
// каны, — поэтому в основной чанк не попадает.
export const KANA_STROKES: Record<string, string> = {
${body}
}
`)
console.log(`черты: ${Object.keys(res).length} знаков`)
