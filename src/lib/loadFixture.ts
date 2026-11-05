import type { Group, Student, HomeworkItem } from '../data/teacherMockData'
import type { HardSub } from './useHomework'
import type { PendingJournal } from './journalPending'
import type { TeacherTask } from '../store/teacherStore'

/*
 * ВРЕМЕННЫЙ нагрузочный стенд кабинета учителя: главная с «большим» кабинетом
 * без записи в базу. Только чтение — подменяем ответы общих запросов (группы,
 * ученики, ДЗ, сложные, журнал, расписание, задачи) сгенерированными данными.
 *
 * Включить:  ?load=1#/teacher   (параметры: groups, size, lessons, hw, hard, journal, debt, tasks)
 *   пример:  ?load=1&lessons=10&hw=50#/teacher
 * Выключить: ?load=0#/teacher
 * Флаг живёт в sessionStorage вкладки. Действия (проверить, перенести, отметить)
 * в этом режиме уйдут на сервер с выдуманными id и ни на что не повлияют.
 */

type Knobs = { groups: number; size: number; lessons: number; hw: number; hard: number; journal: number; debt: number; tasks: number }
const DEFAULTS: Knobs = { groups: 4, size: 20, lessons: 10, hw: 50, hard: 8, journal: 26, debt: 17, tasks: 12 }
const KEY = 'iskra.loadFixture'

function readKnobs(): Knobs | null {
  if (typeof window === 'undefined') return null
  try {
    const q = new URLSearchParams(window.location.search)
    const flag = q.get('load')
    if (flag === '0') { sessionStorage.removeItem(KEY); return null }
    if (flag) {
      const knobs = { ...DEFAULTS }
      for (const k of Object.keys(DEFAULTS) as (keyof Knobs)[]) {
        const v = Number(q.get(k))
        if (q.has(k) && Number.isFinite(v) && v >= 0) knobs[k] = Math.min(Math.floor(v), 500)
      }
      sessionStorage.setItem(KEY, JSON.stringify(knobs))
      return knobs
    }
    const saved = sessionStorage.getItem(KEY)
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : null
  } catch { return null }
}

export const LOAD_FIXTURE: Knobs | null = readKnobs()

/** Подменить загрузчик общего запроса фикстурой, когда стенд включён. */
export function withLoadFixture<T>(make: (k: Knobs) => T, fetcher: () => Promise<T>): () => Promise<T> {
  const knobs = LOAD_FIXTURE
  return knobs ? async () => make(knobs) : fetcher
}

// ── генерация ────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const id = (kind: string, n: number) => `load0000-${kind.padEnd(4, '0').slice(0, 4)}-4000-8000-${String(n).padStart(12, '0')}`

function mskParts(now = new Date()) {
  const p: Record<string, string> = {}
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)) p[x.type] = x.value
  return { day: `${p.year}-${p.month}-${p.day}`, minutes: (Number(p.hour) % 24) * 60 + Number(p.minute) }
}
function shiftDay(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const hhmm = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`

const GROUP_DEFS = [
  { name: 'Хим ЕГЭ 2027 · А', subject: 'Химия', level: 'ЕГЭ', icon: '⚗️', color: '#786AD7', colorSoft: '#EEEBFB' },
  { name: 'Хим ЕГЭ 2027 · Б', subject: 'Химия', level: 'ЕГЭ', icon: '⚗️', color: '#5B8DEF', colorSoft: '#E7EFFD' },
  { name: 'Био ЕГЭ 2027', subject: 'Биология', level: 'ЕГЭ', icon: '🧬', color: '#3FCC8A', colorSoft: '#E3F7EE' },
  { name: 'Био ОГЭ 2027 интенсив', subject: 'Биология', level: 'ОГЭ', icon: '🧬', color: '#F59E0B', colorSoft: '#FDF1DC' },
] as const
const FIRST = ['Алиса', 'Максим', 'София', 'Артём', 'Ева', 'Михаил', 'Варвара', 'Тимофей', 'Полина', 'Лев', 'Анна', 'Марк', 'Виктория', 'Даниил', 'Ульяна', 'Егор', 'Мирослава', 'Константин', 'Александра', 'Святослав']
const LAST = ['Иванова', 'Смирнов', 'Кузнецова', 'Попов', 'Васильева', 'Петров', 'Соколова', 'Михайлов', 'Новикова', 'Фёдоров', 'Морозова', 'Волков', 'Алексеева', 'Лебедев', 'Семёнова', 'Егоров', 'Павлова', 'Козлов', 'Степанова-Огородникова', 'Николаев']
const TOPICS = ['Строение атома', 'Электролиз растворов', 'Гидролиз солей', 'Окислительно-восстановительные реакции', 'Клетка: органоиды', 'Фотосинтез и хемосинтез', 'Генетика: дигибридное скрещивание', 'Органическая химия: алкены', 'Задача № 33 на смеси', 'Пробник ЕГЭ', 'Эволюция: доказательства', 'Химическое равновесие']

let cache: { groups: Group[]; students: Student[] } | null = null
function roster(k: Knobs) {
  if (cache) return cache
  const today = mskParts().day
  const groups: Group[] = Array.from({ length: k.groups }, (_, i) => {
    const d = GROUP_DEFS[i % GROUP_DEFS.length]
    return { id: id('grp', i), name: i < GROUP_DEFS.length ? d.name : `${d.name} (${Math.floor(i / GROUP_DEFS.length) + 1})`,
      subject: d.subject, icon: d.icon, level: d.level, color: d.color, colorSoft: d.colorSoft,
      startDate: '2026-09-01', studentCount: k.size, lessonsCompleted: 18, totalLessons: 64, isIndividual: false, tracks: [] }
  })
  const students: Student[] = []
  groups.forEach((g, gi) => {
    for (let j = 0; j < k.size; j++) {
      const n = gi * k.size + j
      const stride = Math.max(1, Math.floor((k.groups * k.size) / Math.max(1, k.debt)))
      const debtor = k.debt > 0 && n % stride === 0 && n / stride < k.debt
      students.push({ id: id('stu', n), personId: id('per', n), groupId: g.id, subject: g.subject, isIndividual: false,
        name: `${FIRST[(n * 7) % FIRST.length]} ${LAST[(n * 3 + gi) % LAST.length]}`, phone: '', startedAt: '2026-09-01', lastVisit: today,
        hwScore: 40 + (n * 13) % 60, testScore: 30 + (n * 17) % 70, trialScore: null, desiredScore: 80, attendance: 70 + (n * 11) % 30,
        paymentDue: debtor ? shiftDay(today, (n % 12) - 6) : '', paymentAmount: debtor ? 6400 + (n % 4) * 1600 : 0,
        lessonBalance: debtor ? -((n % 3) + 1) : 4, debt: debtor ? 3200 : 0, avatarPath: null })
    }
  })
  return (cache = { groups, students })
}

export const fixtureGroups = (k: Knobs) => roster(k).groups
export const fixtureStudents = (k: Knobs) => roster(k).students

/** Занятия на сегодня: подряд с 08:00, статусы — по часам Москвы. */
export function fixtureToday(k: Knobs) {
  const { groups } = roster(k)
  const { minutes } = mskParts()
  const step = k.lessons > 10 ? Math.max(30, Math.floor(900 / k.lessons)) : 90
  return Array.from({ length: k.lessons }, (_, i) => {
    const g = groups[i % Math.max(1, groups.length)]
    const start = 8 * 60 + i * step, end = start + 90
    const status = minutes >= end ? 'completed' : minutes >= start ? 'live' : 'upcoming'
    return { id: id('les', i), time_start: hhmm(start), time_end: hhmm(end), lesson_title: TOPICS[i % TOPICS.length],
      lesson_number: 10 + i, group_id: g?.id ?? null, student_id: null, subject: g?.subject ?? 'Химия', status }
  })
}

/** Неделя календаря: сегодня — как fixtureToday, в остальные дни — поменьше. */
export function fixtureWeek(k: Knobs, start: string) {
  const { groups } = roster(k)
  const today = mskParts().day
  const out = []
  for (let d = 0; d < 7; d++) {
    const date = shiftDay(start, d)
    const rows = date === today ? fixtureToday(k) : Array.from({ length: 2 + (d * 3) % 5 }, (_, i) => ({
      id: id('wk' + d, i), time_start: hhmm(10 * 60 + i * 120), time_end: hhmm(11 * 60 + 30 + i * 120),
      lesson_title: TOPICS[(d + i) % TOPICS.length], lesson_number: 5 + i, group_id: groups[(d + i) % Math.max(1, groups.length)]?.id ?? null,
      student_id: null, subject: '', status: date < today ? 'completed' : 'upcoming' }))
    for (const r of rows) {
      const g = groups.find(x => x.id === r.group_id)
      out.push({ id: `${r.id}-${date}`, date, time: r.time_start, endTime: r.time_end ?? '', title: r.lesson_title, number: r.lesson_number,
        groupId: r.group_id, studentId: null, who: g?.name ?? '', color: g?.color ?? 'var(--color-purple)', subject: g?.subject, level: g?.level,
        isIndividual: false, cancelled: false, rec: false, fromCourse: true, lessonId: null, status: r.status as 'upcoming' })
    }
  }
  return out
}

/** ДЗ на проверке: k.hw работ, разложенных по заданиям по 1–6 штук. */
export function fixtureHomework(k: Knobs): HomeworkItem[] {
  const { groups } = roster(k)
  const today = mskParts().day
  const out: HomeworkItem[] = []
  let left = k.hw, i = 0
  while (left > 0 && groups.length) {
    const g = groups[i % groups.length]
    const pending = Math.min(left, 1 + (i * 5) % 6)
    const reviewed = (i * 3) % 5
    const waitedH = 2 + i * 9
    out.push({ id: id('hw', i), groupId: g.id, groupName: g.name, icon: g.icon, title: `${TOPICS[i % TOPICS.length]} — домашка`,
      assignedAt: shiftDay(today, -7 - (i % 5)), dueDate: shiftDay(today, (i % 7) - 3), submittedCount: pending + reviewed,
      totalCount: g.studentCount, reviewedCount: reviewed, oldestSubmittedAt: new Date(Date.now() - waitedH * 3_600_000).toISOString(),
      lastSubmittedAt: new Date(Date.now() - 3_600_000).toISOString(), color: g.color, status: 'active', isIndividual: false })
    left -= pending; i++
  }
  return out
}

export function fixtureHard(k: Knobs): HardSub[] {
  const { students } = roster(k)
  return Array.from({ length: Math.min(k.hard, students.length) }, (_, i) => {
    const s = students[(i * 7) % students.length]
    return { id: id('hard', i), lessonRef: `load-${i}`, baseRef: `load-${i}`, lessonTitle: `Сложное: ${TOPICS[(i + 3) % TOPICS.length]}`,
      studentId: s.id, studentName: s.name, score: 0, comment: '', reviewComment: '', status: 'submitted',
      updatedAt: new Date(Date.now() - (1 + i * 7) * 3_600_000).toISOString(), attachments: { photos: [], board: null },
      reviewAttachments: { photos: [], board: null }, isMultiTask: false, taskBlocks: [], reviewBlocks: [] }
  })
}

export function fixtureJournal(k: Knobs): PendingJournal[] {
  const { groups } = roster(k)
  const today = mskParts().day
  return Array.from({ length: groups.length ? k.journal : 0 }, (_, i) => {
    const g = groups[i % groups.length]
    return { scheduleId: id('jrn', i), date: shiftDay(today, -1 - Math.floor(i / 2)), title: TOPICS[i % TOPICS.length],
      timeStart: i % 2 ? '17:00' : '19:30', groupId: g.id, studentId: null, scopeName: g.name }
  })
}

export function fixtureTasks(k: Knobs): TeacherTask[] {
  const today = mskParts().day
  const titles = ['Позвонить родителям', 'Собрать пробник ЕГЭ', 'Проверить тетради', 'Записать разбор задачи 33', 'Обновить конспект по генетике', 'Выставить оценки за четверть']
  return Array.from({ length: k.tasks }, (_, i) => ({ id: id('task', i), typeId: null, typeLabel: null, typeBg: null, typeColor: null,
    title: `${titles[i % titles.length]}${i >= titles.length ? ` · ${Math.floor(i / titles.length) + 1}` : ''}`,
    date: shiftDay(today, i % 4), time: hhmm(9 * 60 + i * 45), comment: '', done: i % 5 === 4 }))
}

// Метка в углу, чтобы стенд нельзя было принять за настоящий кабинет.
if (LOAD_FIXTURE && typeof document !== 'undefined') {
  const mount = () => {
    if (document.getElementById('load-fixture-badge')) return
    const a = document.createElement('a')
    a.id = 'load-fixture-badge'
    a.href = `${location.pathname}?load=0${location.hash}`
    a.textContent = 'Нагрузочные данные · выключить'
    a.title = Object.entries(LOAD_FIXTURE).map(([k, v]) => `${k}=${v}`).join(' ')
    Object.assign(a.style, { position: 'fixed', left: '12px', bottom: '12px', zIndex: '99999', padding: '6px 12px', borderRadius: '999px',
      background: '#E5484D', color: '#fff', font: '600 12px/1.2 system-ui, sans-serif', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.18)' })
    document.body.appendChild(a)
  }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount)
}
