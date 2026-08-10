// Проверка, что все YouTube-ссылки в языковых курсах ещё живы.
//
// ЗАЧЕМ. Ролики удаляют, закрывают и делают приватными без предупреждения, а
// мёртвое видео в уроке ученик видит как сломанный продукт. Прогонять перед
// каждым большим релизом: node scripts/checkVideos.mjs
//
// ПОЧЕМУ СКАНИРУЕМ ВСЮ ПАПКУ, А НЕ СПИСОК ФАЙЛОВ. Первая версия читала два
// файла с картами видео — и пропускала одиннадцать роликов, которые лежали в
// конспектах (KOREAN_VIDEO в koreanTopikTheory.ts и другие такие же). То есть
// проверка говорила «всё хорошо», ни разу не взглянув на пятую часть ссылок.
// Список файлов устаревает молча; обход папки — нет.
//
// Проверка идёт через публичный oembed: он отдаёт название и канал, если видео
// доступно, и 4xx, если нет. Ключей и квот не требует. Ограниченный доступ
// (private, members-only, возрастное) отдаёт 401 — такие тоже негодны.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../src', import.meta.url).pathname

/** Все файлы исходников — видео может лежать в любом файле данных. */
function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return walk(full)
    return /\.tsx?$/.test(name) ? [full] : []
  })
}

const ids = new Map() // id → где встретился
for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  // Ловим и `yt('id')`, и полную ссылку — карты пишут по-разному.
  for (const m of src.matchAll(/(?:yt\('([\w-]{11})'\)|youtube\.com\/watch\?v=([\w-]{11}))/g)) {
    const id = m[1] ?? m[2]
    if (!ids.has(id)) ids.set(id, file.replace(ROOT, 'src'))
  }
}

if (!ids.size) {
  console.error('Не нашёл ни одной ссылки — формат изменился, поправьте регулярку.')
  process.exit(1)
}

const dead = []
for (const [id, where] of ids) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  try {
    const res = await fetch(url)
    if (!res.ok) { dead.push(`${id} — HTTP ${res.status} (${where})`); continue }
    const data = await res.json()
    console.log(`✅ ${id} — ${data.author_name} :: ${data.title}`)
  } catch (err) {
    dead.push(`${id} — ${err.message} (${where})`)
  }
}

console.log(`\nПроверено: ${ids.size}, недоступно: ${dead.length}`)
if (dead.length) {
  dead.forEach(x => console.log('❌ ' + x))
  process.exit(1)
}
