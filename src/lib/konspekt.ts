// ─────────────────────────────────────────────────────────────────────────────
// Конспект: абзац урока → визуальные блоки (Figma «Искра», стр. 31).
//
// ЗАЧЕМ. Уроки написаны абзацами с жирным лид-словом: «**Шаг 1.** …»,
// «**Типичные ошибки.** — … Исправление: …», «**Подсказка.** …». Раньше всё это
// рисовалось одинаковым сплошным текстом. Здесь мы узнаём смысл абзаца по его
// лид-слову и строкам — БЕЗ правки текста 335 уроков — и отдаём рендереру
// типизированные блоки: шаги, формулы, выноски, ошибки, заголовки разделов.
//
// ПРАВИЛА РАЗБОРА (узко, чтобы не ломать чужие курсы):
//  - неизвестное лид-слово остаётся жирным началом абзаца, как было;
//  - строка, целиком состоящая из `кода`, — формула; следующая «Англ.: `…`» —
//    вторая строка той же формулы (английский Excel), без переключателя;
//  - разметка автора для курсов без лид-слов: «## », «### », «> »;
//  - текст блоков не меняется — рендерер рисует его тем же Prose/GlossedText.
// ─────────────────────────────────────────────────────────────────────────────

export type CalloutTone = 'tip' | 'warn' | 'danger'

export type KBlock =
  | { k: 'hero'; eyebrow: string; text: string }
  | { k: 'meta'; label: string; text: string }
  | { k: 'h2'; text: string }
  | { k: 'h3'; text: string }
  | { k: 'text'; text: string }
  | { k: 'quote'; text: string }
  | { k: 'formula'; code: string; en?: string }
  | { k: 'steps'; items: { text: string; extra: KBlock[] }[] }
  | { k: 'errors'; items: { bad: string; fix?: string }[] }
  | { k: 'callout'; tone: CalloutTone; title: string; body: KBlock[] }
  | { k: 'details'; title: string; body: KBlock[] }
  | { k: 'prompt'; text: string; note: string }

const LEAD = /^\*\*([^*\n]+?)\*\*[ \t]*/
const CODE_LINE = /^`([^`\n]+)`$/
const EN_LINE = /^Англ\.?:\s*`([^`\n]+)`\s*$/
const STEP_LINE = /^\*\*Шаг\s+(\d+)\.\*\*\s*(.*)$/
const LIST_LINE = /^[—–-]\s+(.*)$/
const FIX = /\s*Исправление[.:]\s*/
// «ГЛАВНАЯ ОШИБКА РУССКОЯЗЫЧНЫХ.» — капслок-лид в языковых курсах.
const CAPS_LEAD = /^([А-ЯЁ][А-ЯЁ ,-]{7,}[А-ЯЁ])[.:!]\s+/

const norm = (s: string) => s.trim().replace(/[.:]+$/, '').trim()
const lc = (s: string) => norm(s).toLowerCase()

const HERO = new Set(['вопрос из работы', 'постановка'])
const META = new Set([
  'когда нужно и что получится', 'что получится', 'что нужно', 'исходный пример',
  'исходный пример (вымышленный)', 'входные данные', 'зачем', 'зачем это в отчёте',
  'в какой версии excel', 'в бухгалтерской работе',
])
const SECTION = new Set([
  'шаги', 'почему работает', 'почему так', 'ожидаемый результат', 'было → стало',
  'как автоматизировать', 'какой способ выбрать', 'поменяйте и проверьте',
  'что вставить в excel', 'схема текстом', 'расчёт текстом', 'формулы', 'эталон расчёта',
  'короче в новых версиях', 'если нужна помощь — спросите ии', 'синтаксис и аргументы',
  'где это у вас в работе', 'где подробнее в курсе', 'что говорит закон', 'пример таблицы (текстом)',
  'вариант с ндс', 'учебные файлы', 'опора', 'безопасность',
])
const SECTION_PREFIX = ['обратная задача', 'если файл откроют в excel']
const ERRORS = new Set(['типичные ошибки', 'типичная ошибка'])
const TIP = new Set(['подсказка', 'совет'])
const WARN_PREFIX = ['не путайте', 'внимание', 'важно', 'осторожно']
const DETAILS = new Set(['быстрее с ии'])

function isSection(label: string): boolean {
  const l = lc(label)
  return SECTION.has(l) || SECTION_PREFIX.some(p => l.startsWith(p))
}

/** Разбор тела абзаца по строкам: шаги, формулы, списки, текст. */
function parseBody(body: string, errorsMode = false): KBlock[] {
  const out: KBlock[] = []
  const lines = body.split('\n')
  let steps: Extract<KBlock, { k: 'steps' }> | null = null
  let errors: Extract<KBlock, { k: 'errors' }> | null = null
  const push = (b: KBlock) => {
    if (steps && steps.items.length) steps.items[steps.items.length - 1].extra.push(b)
    else out.push(b)
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const step = STEP_LINE.exec(line)
    if (step) {
      errors = null
      if (!steps) { steps = { k: 'steps', items: [] }; out.push(steps) }
      steps.items.push({ text: step[2], extra: [] })
      continue
    }
    const code = CODE_LINE.exec(line)
    // Текст для ИИ в обратных кавычках — промпт, а не формула (то же правило,
    // что в Prose: не начинается с «=» и от шести слов).
    if (code && !code[1].trimStart().startsWith('=') && code[1].trim().split(/\s+/).length >= 6) {
      push({ k: 'prompt', text: code[1], note: '' })
      continue
    }
    if (code) {
      const en = i + 1 < lines.length ? EN_LINE.exec(lines[i + 1].trim()) : null
      if (en) i++
      push({ k: 'formula', code: code[1], en: en?.[1] })
      continue
    }
    const li = LIST_LINE.exec(line)
    if (li && errorsMode) {
      steps = null
      if (!errors) { errors = { k: 'errors', items: [] }; out.push(errors) }
      const [bad, ...fix] = li[1].split(FIX)
      const f = fix.length ? fix.join(' Исправление: ').trim() : ''
      errors.items.push({ bad: bad.trim(), fix: f ? f[0].toUpperCase() + f.slice(1) : undefined })
      continue
    }
    // Строка-заголовок группы шагов внутри абзаца («**Объединить функцией.**»).
    const lead = LEAD.exec(line)
    if (lead && !line.slice(lead[0].length).trim()) { steps = null; out.push({ k: 'h3', text: norm(lead[1]) }); continue }
    if (errors) { errors = null }
    push({ k: 'text', text: line })
  }
  return out
}

/** Строки разметки автора: «## Раздел», «### Подраздел», «> цитата». */
function authorMarkup(text: string): KBlock[] | null {
  if (!/^(#{2,3} |> )/m.test(text)) return null
  const out: KBlock[] = []
  let buf: string[] = []
  const flush = () => { if (buf.length) { out.push(...parseBody(buf.join('\n'))); buf = [] } }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('### ')) { flush(); out.push({ k: 'h3', text: line.slice(4).trim() }) }
    else if (line.startsWith('## ')) { flush(); out.push({ k: 'h2', text: line.slice(3).trim() }) }
    else if (line.startsWith('> ')) { flush(); out.push({ k: 'quote', text: line.slice(2).trim() }) }
    else buf.push(raw)
  }
  flush()
  return out
}

/**
 * Абзац конспекта → блоки. Возвращает `null`, если разбирать нечего — тогда
 * абзац рисуется по-старому (обычный текст строками).
 */
export function parseKonspekt(text: string): KBlock[] | null {
  const marked = authorMarkup(text)
  if (marked) return marked

  const lead = LEAD.exec(text)
  if (lead) {
    const label = lead[1]
    const rest = text.slice(lead[0].length)
    const l = lc(label)
    // «Готовый промпт для ИИ. «текст» приписка» — карточка с копированием.
    if (l.startsWith('готовый промпт')) {
      const pr = splitPrompt(rest)
      return pr ? [{ k: 'prompt', text: pr[0].replace(/`/g, ''), note: pr[1] }] : null
    }
    if (HERO.has(l)) return [{ k: 'hero', eyebrow: norm(label), text: rest.trim() }]
    if (META.has(l) && !rest.includes('\n')) return [{ k: 'meta', label: norm(label), text: rest.trim() }]
    if (META.has(l) || l.startsWith('исходный пример')) return [{ k: 'h2', text: norm(label) }, ...parseBody(rest)]
    if (ERRORS.has(l)) return [{ k: 'h2', text: norm(label) }, ...parseBody(rest, true)]
    if (TIP.has(l)) return [{ k: 'callout', tone: 'tip', title: norm(label), body: parseBody(rest) }]
    if (WARN_PREFIX.some(p => l.startsWith(p))) return [{ k: 'callout', tone: 'warn', title: norm(label), body: parseBody(rest) }]
    if (DETAILS.has(l)) return [{ k: 'details', title: norm(label), body: parseBody(rest.replace(/^—\s*/, '')) }]
    if (l === 'короче в новых версиях') return [{ k: 'callout', tone: 'tip', title: norm(label), body: parseBody(rest) }]
    if (isSection(label)) return [{ k: 'h2', text: norm(label) }, ...parseBody(rest)]
    // Абзац, где лид — «Шаг 1.»: весь абзац — шаги.
    if (/^шаг\s+\d+$/.test(l)) return [...(l === 'шаг 1' ? [{ k: 'h2' as const, text: 'Шаги' }] : []), ...parseBody(text)]
    // Неизвестный лид, но внутри шаги или формулы — разбираем тело, лид
    // остаётся жирным началом первой строки.
    if (STEP_LINE.test(text.split('\n').find(s => STEP_LINE.test(s.trim()))?.trim() ?? '') || /\n`[^`\n]+`\s*(\n|$)/.test(text)) {
      const first = text.split('\n')[0]
      const leadOnly = !first.slice(lead[0].length).trim()
      const body = parseBody(leadOnly ? rest : text)
      return leadOnly ? [{ k: 'h3', text: norm(label) }, ...body] : body
    }
    return null
  }

  const caps = CAPS_LEAD.exec(text)
  if (caps) {
    const t = caps[1].toLowerCase()
    return [{ k: 'callout', tone: /ошибк/.test(t) ? 'danger' : 'warn', title: t[0].toUpperCase() + t.slice(1), body: parseBody(text.slice(caps[0].length)) }]
  }
  // Абзац без лида, но со строками шагов/формул (например, «Англ.:» после кода).
  if (text.includes('\n') && (/^`[^`\n]+`$/m.test(text) || /^\*\*Шаг\s+\d+\.\*\*/m.test(text))) return parseBody(text)
  return null
}

/** «текст промпта» хвост → [промпт, хвост]; вложенные «…» учитываются. */
function splitPrompt(rest: string): [string, string] | null {
  const t = rest.trimStart()
  if (!t.startsWith('«')) return null
  let depth = 0
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '«') depth++
    else if (t[i] === '»' && --depth === 0) return [t.slice(1, i), t.slice(i + 1).trim()]
  }
  return null
}

/** Заголовки разделов для оглавления: [id абзаца, номер блока, текст]. */
export function konspektToc(paragraphs: { id: string; text: string; image?: string }[]): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = []
  for (const p of paragraphs) {
    if (p.image) continue
    const blocks = parseKonspekt(p.text)
    blocks?.forEach((b, i) => { if (b.k === 'h2') out.push({ id: headingId(p.id, i), text: b.text }) })
  }
  return out
}

export const headingId = (pid: string, i: number) => `k-${pid}-${i}`.replace(/[^A-Za-z0-9_-]/g, '_')
