// Проверка курса «Бухгалтерия»: структура уроков, домашки, покрытие тем ТЗ,
// ссылки на источники, формулы.
//
//   node scripts/checkAccounting.mjs                 — весь курс (src/data/accounting/modules.ts)
//   node scripts/checkAccounting.mjs exp03.ts exp04.ts — только эти модули (во время авторинга)
//   --strict — непокрытые темы считаются ошибкой (для сдачи курса)
import { build } from 'esbuild'
import { mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const strict = args.includes('--strict')
const files = args.filter(a => !a.startsWith('--'))
const dir = resolve('src/data/accounting')
const entry = files.length
  ? files.map((f, i) => `import * as m${i} from ${JSON.stringify(resolve(dir, f))}`).join('\n') +
    `\nexport const MODULES = [${files.map((_, i) => `...Object.values(m${i}).filter(v => v && typeof v === 'object' && Array.isArray(v.lessons))`).join(', ')}]` +
    `\nexport { BLUEPRINT } from ${JSON.stringify(resolve(dir, 'blueprint.ts'))}`
  : `export { MODULES } from ${JSON.stringify(resolve(dir, 'modules.ts'))}\nexport { BLUEPRINT } from ${JSON.stringify(resolve(dir, 'blueprint.ts'))}`

mkdirSync('node_modules/.cache', { recursive: true })
const out = resolve('node_modules/.cache/checkAccounting.bundle.mjs')
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
  define: { 'import.meta.env': '{"VITE_SUPABASE_URL":"http://stub.local","VITE_SUPABASE_PUBLISHABLE_KEY":"stub"}' },
})
const { MODULES, BLUEPRINT } = await import(pathToFileURL(out).href + `?t=${Date.now()}`)

const errors = []
const warns = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const warn = (where, msg) => warns.push(`${where}: ${msg}`)

const bpById = new Map(BLUEPRINT.map(b => [b.id, b]))
const keys = new Set()
const quizIds = new Set()
let lessonsTotal = 0, quizTotal = 0, figTotal = 0
const covered = new Map() // moduleId -> Set(topic)

for (const mod of MODULES) {
  // EXP00 — вводный модуль курса (как учиться, справочник): тем ТЗ не закрывает.
  // EXT* — дополнительные модули сверх ТЗ (по решению Дани): темы ТЗ не закрывают,
  // их темы описаны в самом модуле. Покрытие 332 тем считается только по EXP*.
  const extra = mod.id === 'EXP00' || mod.id.startsWith('EXT')
  const bp = extra ? { id: mod.id, title: mod.title, topics: [] } : bpById.get(mod.id)
  if (!bp) { err(mod.id, 'нет такого модуля в BLUEPRINT'); continue }
  const srcIds = new Set()
  for (const s of mod.sources) {
    if (srcIds.has(s.id)) err(`${mod.id}/src ${s.id}`, 'повтор id источника')
    srcIds.add(s.id)
    if (!/^https:\/\//.test(s.url)) err(`${mod.id}/src ${s.id}`, `ссылка не https: ${s.url}`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.checked)) err(`${mod.id}/src ${s.id}`, 'checked не ГГГГ-ММ-ДД')
    if (!['opened', 'unreachable', 'not-checked'].includes(s.status)) err(`${mod.id}/src ${s.id}`, 'неизвестный status')
  }
  const cov = covered.get(mod.id) ?? new Set()
  if (!extra) covered.set(mod.id, cov)
  for (const l of mod.lessons) {
    lessonsTotal++
    const w = `${mod.id}/${l.key}`
    if (keys.has(l.key)) err(w, 'повтор ключа урока')
    keys.add(l.key)
    if (!l.title?.trim()) err(w, 'нет названия')
    if (!l.topics?.length && mod.id !== 'EXP00') err(w, 'урок не закрывает ни одной темы')
    for (const t of l.topics ?? []) {
      if (!extra && !bp.topics.includes(t)) err(w, `тема «${t}» не из ТЗ модуля (строка должна совпадать дословно)`)
      cov.add(t)
    }
    if (!l.sources?.length) warn(w, 'нет источников')
    for (const s of l.sources ?? []) if (!srcIds.has(s)) err(w, `источник ${s} не найден в реестре модуля`)
    if (!l.queries?.length) warn(w, 'нет рабочих вопросов для справочника')
    const c = l.content
    if (!c) { err(w, 'нет content'); continue }
    const text = c.paragraphs.filter(p => !p.image)
    if (text.length < 4) err(w, `в конспекте ${text.length} абзацев (нужно ≥4)`)
    const pids = new Set()
    for (const p of c.paragraphs) {
      if (pids.has(p.id)) err(w, `повтор id абзаца ${p.id}`)
      pids.add(p.id)
      if (p.image) {
        figTotal++
        if (!p.image.startsWith('data:image/svg+xml')) err(w, `схема ${p.id} не data-URI SVG`)
        if (!p.text?.trim()) err(w, `у схемы ${p.id} нет подписи`)
        continue
      }
      const ticks = (p.text.match(/`/g) ?? []).length
      if (ticks % 2) err(w, `абзац ${p.id}: непарные обратные кавычки формулы`)
      if (/base64,/.test(p.text)) err(w, `абзац ${p.id}: base64 в тексте`)
      if (/скриншот/i.test(p.text) && !/не скриншот|не снимок|реконструкц|схем/i.test(p.text)) warn(w, `абзац ${p.id}: слово «скриншот» — проверьте, что схема не выдаётся за снимок`)
    }
    if (!/Источник|источник/.test(text.map(p => p.text).join(' '))) warn(w, 'в конспекте нет строки с источниками')
    if ((c.quiz?.length ?? 0) < 4) err(w, `в домашке ${c.quiz?.length ?? 0} вопросов (нужно ≥4)`)
    for (const q of c.quiz ?? []) {
      quizTotal++
      const qw = `${w}/${q.id}`
      if (quizIds.has(q.id)) err(qw, 'повтор id вопроса во всём курсе')
      quizIds.add(q.id)
      if (!q.prompt?.trim()) err(qw, 'пустой вопрос')
      if (!q.explanation?.trim()) err(qw, 'нет объяснения')
      const t = q.type ?? 'single'
      const opt = new Set((q.options ?? []).map(o => o.id))
      if (t === 'single' || t === 'multi') {
        if ((q.options?.length ?? 0) < 2) err(qw, 'меньше двух вариантов')
        if (!opt.has(q.correctOptionId)) err(qw, 'верный вариант вне списка')
        for (const id of q.correctOptionIds ?? []) if (!opt.has(id)) err(qw, `верный ${id} вне списка`)
        const texts = (q.options ?? []).map(o => o.text.trim())
        if (new Set(texts).size !== texts.length) err(qw, 'одинаковые варианты')
      }
      if (t === 'matching' && (q.pairs?.length ?? 0) < 2) err(qw, 'меньше двух пар')
      if (t === 'matching') {
        const r = q.pairs.map(p => p.right.trim())
        if (new Set(r).size !== r.length) err(qw, 'одинаковые правые части пар — ответ неоднозначен')
      }
      if (t === 'sequence' && (q.sequenceItems?.length ?? 0) < 2) err(qw, 'меньше двух шагов')
      if (t === 'columnSort') for (const it of q.sortItems ?? []) if (it.column < 0 || it.column >= q.columns.length) err(qw, `«${it.text}» в несуществующем столбце`)
      if (t === 'fill' && !q.referenceAnswer?.trim()) err(qw, 'нет эталона')
      if (t === 'trueFalse' && (q.statements?.length ?? 0) < 2) err(qw, 'меньше двух утверждений')
    }
    if (!c.hardTask?.prompt?.trim()) err(w, 'нет практического (хард) задания')
  }
}

// Покрытие
let need = 0, got = 0
const gaps = []
for (const bp of BLUEPRINT) {
  const cov = covered.get(bp.id)
  if (!cov) continue
  need += bp.topics.length
  const miss = bp.topics.filter(t => !cov.has(t))
  got += bp.topics.length - miss.length
  if (miss.length) gaps.push(`${bp.id} «${bp.title}»: не покрыто — ${miss.map(m => `«${m}»`).join(', ')}`)
}
const absent = BLUEPRINT.filter(b => !covered.has(b.id)).map(b => b.id)

console.log(`Модулей: ${MODULES.length}, уроков: ${lessonsTotal}, вопросов: ${quizTotal}, схем: ${figTotal}`)
console.log(`Темы ТЗ в проверенных модулях: ${got}/${need}${absent.length && !files.length ? `; модулей нет вовсе: ${absent.join(', ')}` : ''}`)
for (const g of gaps) (strict ? errors : warns).push(g)
if (!files.length && absent.length) (strict ? errors : warns).push(`нет модулей: ${absent.join(', ')}`)
if (warns.length) console.log(`\nПредупреждения (${warns.length}):\n  ` + warns.join('\n  '))
if (errors.length) { console.log(`\nОШИБКИ (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1) }
console.log('\nOK')
