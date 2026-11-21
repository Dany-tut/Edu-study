import { supabase } from './supabase'
import type { Student } from '../data/teacherMockData'
import type { CourseJournalData, JournalCell, JournalColumn, JournalWork } from './courseJournal'

/**
 * Перенос прошлых уроков и «был» на уроке в записи.
 *
 * Деньги: списывает только присутствие на живом уроке. Отметки переноса и записи
 * баланс не меняют. Это решает сервер по lesson_attendance.source (миграция
 * 20261121120000_journal_attendance_source). До неё колонки нет: перенос и запись
 * списали бы занятие, поэтому интерфейс сначала спрашивает attendanceSourceReady().
 */
export type AttendanceSource = 'live' | 'recording' | 'transfer'

let probe: Promise<boolean> | null = null
export function attendanceSourceReady(): Promise<boolean> {
  probe ??= (async () => {
    try {
      const { error } = await supabase.from('lesson_attendance').select('source').limit(1)
      return !error
    } catch { return false }
  })()
  return probe
}

export const isRecordingColumn = (column: Pick<JournalColumn, 'recording' | 'lesson'>) =>
  column.recording || column.lesson?.delivery_mode === 'recording'

/** Оценка 2–5 из ведомости → процент работы. Порог зачёта по умолчанию — 80 %. */
export const GRADE_PERCENT: Record<number, number> = { 5: 100, 4: 80, 3: 60, 2: 40 }

export type HomeworkMark = { done: true; percent: number | null; grade?: number } | { done: false }

export const isTransferWork = (work: Pick<JournalWork, 'attachments'> | null | undefined) =>
  !!work && !!(work.attachments as { transfer?: unknown } | null)?.transfer

/** Своя сдача ученика важнее переноса: её проверяют в «Работах», а не перезаписывают. */
export function transferHomeworkBlocked(cell: Pick<JournalCell, 'work'>): string | null {
  const w = cell.work
  if (!w || isTransferWork(w)) return null
  return ['submitted', 'returned', 'completed'].includes(w.status)
    ? 'У ученика есть своя сдача. Проверьте её во вкладке «Работы».' : null
}

export function columnSubject(data: CourseJournalData, cell: Pick<JournalCell, 'column' | 'event'>): string {
  const course = data.courses.find(c => c.id === cell.column.lesson?.course_id)
  return course?.subject || cell.event?.subject || ''
}

/** ДЗ «сдано» без работы ученика. INSERT не будит уведомления: они срабатывают только на проверку сдачи. */
export async function saveTransferHomework(cell: JournalCell, subject: string, mark: HomeworkMark) {
  if (!mark.done) {
    if (cell.work && isTransferWork(cell.work)) {
      const { error } = await supabase.from('lesson_progress').delete().eq('id', cell.work.id)
      if (error) throw error
    }
    return
  }
  const blocked = transferHomeworkBlocked(cell)
  if (blocked) throw new Error(blocked)
  if (!subject) throw new Error('Не удалось определить предмет урока.')
  const { error } = await supabase.from('lesson_progress').upsert({
    student_id: cell.student.id,
    lesson_ref: cell.column.id,
    subject,
    status: 'completed',
    score: mark.percent,
    attachments: { transfer: { at: new Date().toISOString(), ...(mark.grade ? { grade: mark.grade } : {}) } },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id,lesson_ref' })
  if (error) throw error
}

function plus90(time: string) {
  const [h, m] = time.split(':').map(Number)
  const total = (h * 60 + m + 90) % (24 * 60)
  return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0')
}

/**
 * «Указать дату» у урока без строки расписания. Строка сразу завершённая: она
 * прошлая, ученикам не приходит «Новое занятие», журнал не ждёт её заполнения.
 */
export async function createPastEvents(data: CourseJournalData, column: JournalColumn, students: Student[], date: string) {
  const lesson = column.lesson
  if (!lesson) throw new Error('Дату можно указать только уроку курса.')
  const subject = data.courses.find(c => c.id === lesson.course_id)?.subject
  if (!subject) throw new Error('Не удалось определить предмет урока.')
  const raw = (column.time || lesson.scheduled_time || '12:00').slice(0, 5)
  const time = /^\d{1,2}:\d{2}$/.test(raw) ? raw.padStart(5, '0') : '12:00'
  const common = { date, time_start: time, time_end: plus90(time), lesson_title: lesson.title, subject,
    lesson_id: lesson.id, node_type: column.recording ? 'rec' : 'lesson', status: 'completed', lesson_number: lesson.lesson_number }
  const groups = [...new Set(students.flatMap(s => s.groupId ? [s.groupId] : []))]
  const loose = students.filter(s => !s.groupId)
  const rows = [
    ...groups.map(group_id => ({ ...common, group_id, student_id: null })),
    ...loose.map(s => ({ ...common, group_id: null, student_id: s.id })),
  ]
  if (!rows.length) throw new Error('В списке нет учеников для этого урока.')
  const { error } = await supabase.from('schedule_lessons').insert(rows)
  if (error) throw error
}

// ── Вставка из Excel / Google Таблиц / CSV ──────────────────────────────────

export function parseSheet(text: string): string[][] {
  const source = text.replace(/\r\n?/g, '\n').replace(/^﻿/, '')
  const first = source.split('\n', 1)[0] ?? ''
  const delimiter = first.includes('\t') ? '\t'
    : (first.split(';').length > first.split(',').length ? ';' : ',')
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"' && cell === '') quoted = true
    else if (ch === delimiter) { row.push(cell.trim()); cell = '' }
    else if (ch === '\n') { row.push(cell.trim()); rows.push(row); row = []; cell = '' }
    else cell += ch
  }
  if (cell !== '' || row.length) { row.push(cell.trim()); rows.push(row) }
  return rows.filter(r => r.some(v => v !== '')).slice(0, 400).map(r => r.slice(0, 120))
}

export type SheetMark = { present: boolean; grade: number | null }
const PRESENT = new Set(['1', '+', 'был', 'была', 'да', 'п', 'v', '✓', '✔', 'присутствовал', 'присутствовала', 'пр'])
const ABSENT = new Set(['н', 'нб', 'н/б', '0', '-', '−', '—', 'пропуск', 'нет', 'отс', 'не был', 'не была', 'x', 'х'])

/** null — пустая клетка (не трогаем), undefined — непонятное значение. */
export function readAttendanceValue(raw: string): SheetMark | null | undefined {
  const v = raw.trim().toLowerCase().replace(/ё/g, 'е')
  if (!v) return null
  if (PRESENT.has(v)) return { present: true, grade: null }
  if (ABSENT.has(v)) return { present: false, grade: null }
  if (/^[2-5]$/.test(v)) return { present: true, grade: Number(v) }
  return undefined
}

export function readHomeworkValue(raw: string): HomeworkMark | null | undefined {
  const v = raw.trim().toLowerCase().replace(/ё/g, 'е').replace(',', '.')
  if (!v) return null
  if (['+', 'да', 'сдано', 'сдал', 'сдала', '✓', '✔', 'v'].includes(v)) return { done: true, percent: null }
  if (ABSENT.has(v) || ['не сдано', 'не сдал', 'не сдала'].includes(v)) return { done: false }
  if (/^[2-5]$/.test(v)) return { done: true, percent: GRADE_PERCENT[Number(v)], grade: Number(v) }
  const percent = v.match(/^(\d{1,3})(\.\d+)?\s*%?$/)
  if (percent && Number(percent[1]) <= 100) return { done: true, percent: Math.round(Number(percent[1] + (percent[2] ?? ''))) }
  return undefined
}

const tokens = (name: string) => name.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9.\s-]/g, ' ')
  .split(/[\s-]+/).map(t => t.replace(/\.+$/, '')).filter(Boolean)

/** Совпадение имени: «Ким Анна», «Анна Ким», «Лебедев Б.» → одна карточка или список кандидатов. */
export function matchStudent(raw: string, students: Student[]): { id: string | null; candidates: string[] } {
  const want = tokens(raw)
  if (!want.length) return { id: null, candidates: [] }
  const scored = students.map(s => {
    const have = tokens(s.name)
    const hits = want.filter(w => have.some(h => h === w || (w.length === 1 ? h.startsWith(w) : h.startsWith(w) && w.length >= 3)))
    return { id: s.id, full: hits.length === want.length, exact: hits.length === want.length && have.length === want.length }
  })
  const exact = scored.filter(s => s.exact)
  if (exact.length === 1) return { id: exact[0].id, candidates: [] }
  const full = scored.filter(s => s.full)
  if (full.length === 1) return { id: full[0].id, candidates: [] }
  return { id: null, candidates: full.map(s => s.id) }
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
function headerDate(raw: string, year: number): string | null {
  const v = raw.toLowerCase()
  let m = v.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = v.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/)
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : year
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  m = v.match(/\b(\d{1,2})\s+([а-я]{3})/)
  const month = m ? MONTHS.findIndex(x => m![2].startsWith(x.slice(0, 3)) || (x === 'мая' && m![2].startsWith('ма'))) : -1
  if (m && month >= 0) return `${year}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}

export type SheetColumnKind = 'attendance' | 'homework'
/** Столбец ведомости → урок журнала: по дате, номеру «25.» или названию. «ДЗ …» — столбец домашней работы. */
export function matchColumn(header: string, columns: JournalColumn[], dateOf: (c: JournalColumn) => string | null):
  { id: string | null; kind: SheetColumnKind } {
  const kind: SheetColumnKind = /^\s*(дз|д\/з|hw|домаш)/i.test(header) ? 'homework' : 'attendance'
  const text = header.replace(/^\s*(дз|д\/з|hw|домашн\S*)\s*[·:.-]?\s*/i, '').trim()
  const years = columns.map(dateOf).filter(Boolean).map(d => Number(d!.slice(0, 4)))
  const year = years.length ? Math.max(...years) : new Date().getFullYear()
  const date = headerDate(text, year)
  if (date) {
    const byDate = columns.filter(c => dateOf(c) === date || (!/\d{4}/.test(text) && dateOf(c)?.slice(5) === date.slice(5)))
    if (byDate.length === 1) return { id: byDate[0].id, kind }
  }
  const number = text.match(/^(?:урок\s*)?(\d{1,3})(?:[.)\s]|$)/i)
  if (number) {
    const byNumber = columns.filter(c => c.lesson?.lesson_number === Number(number[1]))
    if (byNumber.length === 1) return { id: byNumber[0].id, kind }
  }
  const title = text.toLowerCase().replace(/^\d+[.)]\s*/, '')
  const exact = columns.filter(c => c.title.toLowerCase().trim() === title)
  if (exact.length === 1) return { id: exact[0].id, kind }
  if (title.length >= 3) {
    const byTitle = columns.filter(c => c.title.toLowerCase().includes(title) || title.includes(c.title.toLowerCase()))
    if (byTitle.length === 1) return { id: byTitle[0].id, kind }
  }
  return { id: null, kind }
}
