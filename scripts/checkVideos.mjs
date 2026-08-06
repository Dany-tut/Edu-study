// Проверка, что все YouTube-ссылки в языковых курсах ещё живы.
//
// ЗАЧЕМ. Ролики удаляют, закрывают и делают приватными без предупреждения, а
// мёртвое видео в уроке ученик видит как сломанный продукт. Прогонять перед
// каждым большим релизом: node scripts/checkVideos.mjs
//
// Проверка идёт через публичный oembed: он отдаёт название и канал, если видео
// доступно, и 4xx, если нет. Ключей и квот не требует.

import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../src/data/languageVideos.ts', import.meta.url), 'utf8')
const ids = [...new Set([...src.matchAll(/yt\('([\w-]{11})'\)/g)].map(m => m[1]))]

if (!ids.length) {
  console.error('Не нашёл ни одного id — формат файла изменился, поправьте регулярку.')
  process.exit(1)
}

const dead = []
for (const id of ids) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  try {
    const res = await fetch(url)
    if (!res.ok) { dead.push(`${id} — HTTP ${res.status}`); continue }
    const data = await res.json()
    console.log(`✅ ${id} — ${data.author_name} :: ${data.title}`)
  } catch (err) {
    dead.push(`${id} — ${err.message}`)
  }
}

console.log(`\nПроверено: ${ids.length}, недоступно: ${dead.length}`)
if (dead.length) {
  dead.forEach(x => console.log('❌ ' + x))
  process.exit(1)
}
