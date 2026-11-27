/**
 * Generate SQL INSERT statements for populating task_bank with accounting
 * course exercises.
 *
 * Usage:  npx tsx scripts/populateAccBank.mts > scripts/acc-bank-inserts.sql
 *
 * Uses Vite's ssrLoadModule to resolve the full import graph (icons, figures,
 * accFigures etc.) without needing React in Node.
 */
import { createServer } from 'vite'

const vite = await createServer({
  configFile: './vite.config.ts',
  server: { middlewareMode: true },
  logLevel: 'error',
})

const { ACC_LESSONS } = await vite.ssrLoadModule(
  './src/data/accounting/accountingLessons.ts',
) as any

// ── Section / topic mapping ──────────────────────────────────────────────────
// Each AccModule.title → closest ACCOUNTING_SECTION. Lessons' .topics → topic.
const SECTION_MAP: Record<string, string> = {
  EXP00: 'Работа в 1С и Excel',
  EXP01: 'Работа в 1С и Excel',
  EXP02: 'Работа в 1С и Excel',
  EXP03: 'Работа в 1С и Excel',
  EXP04: 'Работа в 1С и Excel',
  EXP05: 'Первичные документы',
  EXP06: 'Закрытие месяца и года',
  EXP07: 'Работа в 1С и Excel',
  EXP08: 'Работа в 1С и Excel',
  EXP09: 'План счетов и проводки',
  EXP10: 'Работа в 1С и Excel',
  EXP11: 'Первичные документы',
  EXP12: 'Первичные документы',
  EXP13: 'Налоги и взносы',
  EXP14: 'Расчёт зарплаты',
  EXP15: 'Налоги и взносы',
  EXP16: 'Закрытие месяца и года',
  EXP17: 'Работа в 1С и Excel',
  EXP18: 'Работа в 1С и Excel',
  EXP19: 'Работа в 1С и Excel',
  EXP20: 'Работа в 1С и Excel',
  EXP21: 'Закрытие месяца и года',
  EXP22: 'Работа в 1С и Excel',
  EXP23: 'Закрытие месяца и года',
  EXP24: 'План счетов и проводки',
  EXP25: 'Работа в 1С и Excel',
  EXP26: 'Работа в 1С и Excel',
  EXT01: 'Работа в 1С и Excel',
  EXT02: 'Расчёт зарплаты',
  EXT03: 'Работа в 1С и Excel',
  EXT04: 'Работа в 1С и Excel',
  EXT05: 'Работа в 1С и Excel',
  EXT06: 'Работа в 1С и Excel',
  EXT07: 'Расчёт зарплаты',
}

// ── Quiz → bank Task row ─────────────────────────────────────────────────────
interface QuizQ {
  id: string
  prompt: string
  type?: string
  options: Array<{ id: string; text: string }>
  correctOptionId: string
  correctOptionIds?: string[]
  explanation: string
  pairs?: Array<{ left: string; right: string }>
  sequenceItems?: string[]
  columns?: string[]
  sortItems?: Array<{ text: string; column: number }>
  statements?: Array<{ text: string; verdict: string }>
  referenceAnswer?: string
  altAnswers?: string[]
  unit?: string
  numTolerance?: number
  numpad?: boolean
  decimal?: boolean
  gapText?: string
  gapChoices?: Array<{ options: string[]; correct: number }>
  table?: {
    headers: string[]
    rows: string[][]
    emptyCells?: Record<string, boolean>
  }
  hotspot?: unknown
  trainer?: unknown
}

function esc(s: string): string {
  return s.replace(/'/g, "''")
}

function jsonLit(v: unknown): string {
  return `'${esc(JSON.stringify(v))}'::jsonb`
}

function nullOrStr(v: string | null | undefined): string {
  return v == null ? 'NULL' : `'${esc(v)}'`
}

function nullOrArr(v: unknown[] | null | undefined): string {
  if (!v || v.length === 0) return 'NULL'
  return jsonLit(v)
}

function quizToInsertValues(
  q: QuizQ,
  lessonShortId: string,
  section: string,
  topic: string,
): string | null {
  const qtype = q.type || 'single'

  // Skip excelTrainer — not a bankable task type
  if (qtype === 'excelTrainer') return null

  let answerType: string
  let question = q.prompt
  let answer = ''
  let choices = 'NULL'
  let matchLeft = 'NULL'
  let matchRight = 'NULL'
  let sequenceItems = 'NULL'
  let questionTable = 'NULL'
  let payload: Record<string, unknown> = {}
  let scoring: string | null = null

  switch (qtype) {
    case 'single': {
      answerType = 'single'
      const correctId = q.correctOptionId
      choices = jsonLit(
        q.options.map(o => ({
          id: o.id,
          text: o.text,
          correct: o.id === correctId,
        })),
      )
      const correct = q.options.find(o => o.id === correctId)
      answer = correct?.text ?? ''
      scoring = 'all_or_nothing'
      break
    }
    case 'multi': {
      answerType = 'multi'
      const correctIds = new Set(q.correctOptionIds ?? [q.correctOptionId])
      choices = jsonLit(
        q.options.map(o => ({
          id: o.id,
          text: o.text,
          correct: correctIds.has(o.id),
        })),
      )
      answer = q.options
        .filter(o => correctIds.has(o.id))
        .map(o => o.text)
        .join('; ')
      scoring = 'per_item'
      break
    }
    case 'fill': {
      answerType = 'fill'
      answer = q.referenceAnswer ?? ''
      if (q.altAnswers?.length) {
        payload.altAnswers = q.altAnswers
      }
      scoring = 'all_or_nothing'
      break
    }
    case 'numeric': {
      answerType = 'numeric'
      answer = q.referenceAnswer ?? ''
      if (q.unit) payload.unit = q.unit
      if (q.numTolerance) payload.tolerance = q.numTolerance
      scoring = 'all_or_nothing'
      break
    }
    case 'matching': {
      answerType = 'matching'
      const pairs = q.pairs ?? []
      matchLeft = jsonLit(pairs.map(p => p.left))
      matchRight = jsonLit(pairs.map(p => p.right))
      answer = pairs.map(p => `${p.left} → ${p.right}`).join('; ')
      scoring = 'per_item'
      break
    }
    case 'sequence': {
      answerType = 'sequence'
      sequenceItems = jsonLit(q.sequenceItems ?? [])
      answer = (q.sequenceItems ?? []).join(' → ')
      scoring = 'per_item'
      break
    }
    case 'trueFalse': {
      answerType = 'trueFalse'
      payload.statements = q.statements
      answer = (q.statements ?? []).map(s => `${s.text}: ${s.verdict}`).join('; ')
      scoring = 'per_item'
      break
    }
    case 'columnSort': {
      answerType = 'columnSort'
      payload.columns = q.columns
      payload.sortItems = q.sortItems
      answer = (q.sortItems ?? []).map(s => `${s.text} → ${q.columns?.[s.column]}`).join('; ')
      scoring = 'per_item'
      break
    }
    case 'dropdownGap': {
      answerType = 'dropdownGap'
      payload.gapText = q.gapText
      payload.gapChoices = q.gapChoices
      answer = (q.gapChoices ?? []).map(g => g.options[g.correct]).join('; ')
      scoring = 'per_item'
      break
    }
    case 'tableFill': {
      answerType = 'tableFill'
      if (q.table) {
        questionTable = jsonLit(q.table)
      }
      answer = 'см. таблицу'
      scoring = 'per_item'
      break
    }
    case 'screenHotspot': {
      answerType = 'screenHotspot'
      payload.hotspot = q.hotspot
      answer = ''
      scoring = 'all_or_nothing'
      break
    }
    default:
      console.error(`Unknown quiz type: ${qtype} in ${q.id}`)
      return null
  }

  const cols = [
    'subject', 'section', 'topic', 'part', 'line', 'source',
    'question', 'answer', 'solution', 'difficulty',
    'question_table', 'choices', 'answer_type',
    'match_left', 'match_right', 'sequence_items',
    'payload', 'scoring', 'lesson_id',
  ]

  const vals = [
    `'accounting'`,
    `'${esc(section)}'`,
    `'${esc(topic)}'`,
    '1',                            // part
    '1',                            // line (not used for course bank)
    `''`,                           // source
    `'${esc(question)}'`,
    `'${esc(answer)}'`,
    `'${esc(q.explanation)}'`,      // solution = explanation
    `'medium'`,
    questionTable,
    choices,
    `'${answerType}'`,
    matchLeft,
    matchRight,
    sequenceItems,
    Object.keys(payload).length ? jsonLit(payload) : `'{}'::jsonb`,
    scoring ? `'${scoring}'` : 'NULL',
    `'${esc(lessonShortId)}'`,
  ]

  return `(${vals.join(', ')})`
}

// ── Main ─────────────────────────────────────────────────────────────────────
const lessons = ACC_LESSONS as Array<{
  shortId: string
  index: number
  module: { id: string; title: string }
  lesson: { title: string; topics: string[]; content: { quiz: QuizQ[] } }
}>

console.log('-- Accounting task_bank population')
console.log('-- Generated:', new Date().toISOString())
console.log(`-- Total lessons: ${lessons.length}`)
console.log()

const cols = [
  'subject', 'section', 'topic', 'part', 'line', 'source',
  'question', 'answer', 'solution', 'difficulty',
  'question_table', 'choices', 'answer_type',
  'match_left', 'match_right', 'sequence_items',
  'payload', 'scoring', 'lesson_id',
]

let totalInserted = 0
let skippedXl = 0
const typeCounts: Record<string, number> = {}

// Batch by 50 rows per INSERT
const allValues: string[] = []

for (const l of lessons) {
  const section = SECTION_MAP[l.module.id] ?? 'Работа в 1С и Excel'
  const topic = l.lesson.topics[0] ?? l.lesson.title

  for (const q of l.lesson.content.quiz) {
    const qtype = q.type || 'single'
    if (qtype === 'excelTrainer') {
      skippedXl++
      continue
    }
    const val = quizToInsertValues(q, l.shortId, section, topic)
    if (!val) continue
    typeCounts[qtype] = (typeCounts[qtype] || 0) + 1
    allValues.push(val)
    totalInserted++
  }
}

// Emit INSERT in batches of 50
for (let i = 0; i < allValues.length; i += 50) {
  const batch = allValues.slice(i, i + 50)
  console.log(`INSERT INTO public.task_bank (${cols.join(', ')})`)
  console.log('VALUES')
  console.log(batch.join(',\n') + ';')
  console.log()
}

console.log(`-- Total inserted: ${totalInserted}`)
console.log(`-- Skipped (excelTrainer): ${skippedXl}`)
console.log('-- By type:', JSON.stringify(typeCounts))

await vite.close()
