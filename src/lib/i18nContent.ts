// Перевод КОНТЕНТНЫХ подписей: названия курсов, модулей, уроков, описание
// курса, имена людей.
//
// ЧЕМ ОТЛИЧАЕТСЯ ОТ t(). Интерфейсная строка написана в коде один раз и в
// словаре лежит целиком. Подпись контента собрана из кусков и приходит из БД:
// «12. Рассказ о прошлом · часть 3», «Юнит 4. …», «24 юнитов (96 занятий), …».
// Сквозной номер и номер части у каждого урока свои, и класть в словарь все
// сочетания бессмысленно. Поэтому здесь каркас снимается, середина ищется в
// словаре (сиды курсов — lib/i18nContentEn.ts), и каркас надевается обратно.
//
// Внутренности урока — конспект, задания, слова — НЕ переводятся: это сам
// учебный материал. Переводится только то, по чему учитель и ученик
// ориентируются: подписи в списках и шапках.
//
// Незнакомая подпись (свой курс учителя) остаётся как есть — как и у t().

type Lookup = (ru: string) => string | undefined

const CYR = /[А-Яа-яЁё]/

function part(ru: string, look: Lookup): string {
  const s = ru.trim()
  if (!s || !CYR.test(s)) return ru
  const hit = look(s)
  if (hit !== undefined) return hit

  // «12. Тема» — сквозной номер урока.
  let m = s.match(/^(\d+)\.\s+(.+)$/)
  if (m) { const inner = part(m[2], look); if (inner !== m[2]) return `${m[1]}. ${inner}` }

  // «Юнит 4. Тема»
  m = s.match(/^Юнит (\d+)\.\s+(.+)$/)
  if (m) return `Unit ${m[1]}. ${part(m[2], look)}`

  // «Тема · часть 3»
  m = s.match(/^(.+) · часть (\d+)$/)
  if (m) return `${part(m[1], look)} · part ${m[2]}`

  // Шапка описания сид-курса: числа свои у каждой сборки.
  m = s.match(/^(\d+) юнитов \((\d+) занятий\), (\d+) слов, (\d+) заданий\. Ориентир — (.+?) учебных часов\.?\s*([\s\S]*)$/)
  if (m) {
    const hours = look(m[5]) ?? m[5]
    const head = `${m[1]} units (${m[2]} lessons), ${m[3]} words, ${m[4]} tasks. Guided time: ${hours} study hours.`
    return m[6] ? `${head} ${part(m[6], look)}` : head
  }

  // «Английский · Корейский» — перечни предметов.
  if (s.includes(' · ')) {
    const bits = s.split(' · ')
    const out = bits.map(b => part(b, look))
    if (out.some((o, i) => o !== bits[i])) return out.join(' · ')
  }
  return ru
}

export function translateContent(ru: string | null | undefined, look: Lookup): string {
  if (ru == null) return ''
  return part(ru, look)
}

// ─── Имена ───────────────────────────────────────────────────────────────────
// Имя не переводится, а пишется латиницей — как в загранпаспорте (ICAO-ish,
// но читаемее: й → y, х → kh, щ → shch). Латинское имя проходит насквозь.

const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function transliterateName(ru: string | null | undefined): string {
  if (ru == null) return ''
  if (!CYR.test(ru)) return ru
  let out = ''
  const chars = [...ru]
  chars.forEach((ch, i) => {
    const low = ch.toLowerCase()
    let lat = MAP[low]
    if (lat === undefined) { out += ch; return }
    // «е» всегда «e»: Елена → Elena привычнее, чем Yelena.
    // «ия» на конце — «iya» → привычное «ia»: Мария → Maria, Наталия → Natalia.
    if (low === 'я' && chars[i - 1]?.toLowerCase() === 'и' && !/[А-Яа-яЁё]/.test(chars[i + 1] ?? '')) lat = 'a'
    // «ий» на конце — «iy» → «y»: Дмитрий → Dmitry, Юрий → Yury.
    if (low === 'й' && chars[i - 1]?.toLowerCase() === 'и' && !/[А-Яа-яЁё]/.test(chars[i + 1] ?? '')) {
      out = out.slice(0, -1); lat = 'y'
    }
    if (ch !== low && lat) {
      const next = chars[i + 1]
      const nextUpper = next && next !== next.toLowerCase()
      lat = nextUpper ? lat.toUpperCase() : lat[0].toUpperCase() + lat.slice(1)
    }
    out += lat
  })
  return out
}
