// Отчёт родителю (функция parent_report, миграция 20261108110000_parent_reports.sql).
//
// Неделя: пятница 17:00 — сборка цифр и черновиков фраз; учитель правит и
// утверждает; воскресенье 18:00 — утверждённые уходят в Telegram родителю,
// без Telegram отчёт виден по постоянной ссылке. Все ручки — RPC с проверкой
// доступа к функции на сервере.
import { create } from 'zustand'
import { supabase } from './supabase'
import { getAuthUser } from './owner'

export type ReportStatus = 'draft' | 'approved' | 'skipped' | 'sent' | 'failed'
export type ReportFlag = 'absent_2' | 'drop_15' | 'thin_data' | 'new_student' | 'first_weeks' | 'no_channel'

export type ReportLesson = { date: string; title: string | null; present: boolean; grade: number | null }
export type ReportStats = {
  week_start: string
  child: string
  subject: string
  lessons_total: number
  lessons_attended: number
  lessons: ReportLesson[]
  hw_done: number
  hw_checked: number
  hw_returned: number
  avg_pct: number | null
  prev_avg_pct: number | null
  new_student: boolean
}
export type ParentContact = { id: string; name: string; relation: string | null; linked: boolean; stopped: boolean; pending: boolean }
export type ParentReport = {
  id: string
  studentId: string
  studentName: string
  weekStart: string
  stats: ReportStats
  strengths: string
  focus: string
  flags: ReportFlag[]
  status: ReportStatus
  sentAt: string | null
  sendError: string | null
  contacts: ParentContact[]
  hasLink: boolean
}

/** Что видит учитель в списке: черновик без флагов — «Готов». */
export type ReportState = 'ready' | 'flagged' | 'approved' | 'sent' | 'failed' | 'skipped'
export function reportState(r: Pick<ParentReport, 'status' | 'flags'>): ReportState {
  if (r.status === 'draft') return r.flags.length ? 'flagged' : 'ready'
  return r.status
}

export const FLAG_LABEL: Record<ReportFlag, string> = {
  absent_2: 'пропуски',
  drop_15: 'балл упал',
  thin_data: 'мало данных',
  new_student: 'новый ученик',
  first_weeks: 'первые недели',
  no_channel: 'родитель не подключён',
}
/** Почему отчёт отмечен — одной фразой для учителя. */
export function flagReason(r: Pick<ParentReport, 'flags' | 'stats'>): string {
  const s = r.stats
  const parts: string[] = []
  if (r.flags.includes('absent_2')) parts.push(`пропущено ${s.lessons_total - s.lessons_attended} из ${s.lessons_total} уроков`)
  if (r.flags.includes('drop_15') && s.avg_pct != null && s.prev_avg_pct != null) parts.push(`балл упал: ${s.prev_avg_pct}% → ${s.avg_pct}%`)
  if (r.flags.includes('thin_data')) parts.push('за неделю мало событий')
  if (r.flags.includes('new_student')) parts.push('ученик новый')
  if (r.flags.includes('no_channel')) parts.push('родитель не подключён: нет Telegram и ссылки')
  if (r.flags.includes('first_weeks')) parts.push('первые 2 недели все отчёты — на проверку')
  return parts.join('; ')
}
/** Короткая метка флага для строки. */
export function flagChip(r: Pick<ParentReport, 'flags' | 'stats'>): string {
  const s = r.stats
  if (r.flags.includes('absent_2')) return `${s.lessons_total - s.lessons_attended} пропуска`
  if (r.flags.includes('drop_15') && s.avg_pct != null && s.prev_avg_pct != null) return `балл −${s.prev_avg_pct - s.avg_pct}%`
  const first = r.flags.find(f => f !== 'first_weeks') ?? r.flags[0]
  return first ? FLAG_LABEL[first] : ''
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
/** «2–8 ноября» / «26 октября – 1 ноября». */
export function weekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(start.getTime() + 6 * 864e5)
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]}`
    : `${start.getUTCDate()} ${MONTHS[start.getUTCMonth()]} – ${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]}`
}
/** Понедельник недели (по Москве) со сдвигом в неделях. */
export function mondayMsk(offsetWeeks = 0): string {
  const now = new Date(Date.now() + 3 * 3600e3)
  const day = (now.getUTCDay() + 6) % 7
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + offsetWeeks * 7))
  return mon.toISOString().slice(0, 10)
}

type Row = {
  id: string; student_id: string; student_name: string; week_start: string; stats: ReportStats
  strengths: string | null; focus: string | null; flags: ReportFlag[]; status: ReportStatus
  sent_at: string | null; send_error: string | null; contacts: ParentContact[]; has_link: boolean
}
const fromRow = (r: Row): ParentReport => ({
  id: r.id, studentId: r.student_id, studentName: r.student_name, weekStart: r.week_start, stats: r.stats,
  strengths: r.strengths ?? '', focus: r.focus ?? '', flags: r.flags ?? [], status: r.status,
  sentAt: r.sent_at, sendError: r.send_error, contacts: r.contacts ?? [], hasLink: r.has_link,
})

// ── DEV: превью без входа учителя ───────────────────────────────────────────
// Как teacherDevDemo: только import.meta.env.DEV и только без пользователя.
// id начинаются с demo- — записи в базу не уходят.
let demo: ParentReport[] | null = null
function demoWeek(week: string): ParentReport[] {
  if (demo && demo[0]?.weekStart === week) return demo
  const L = (date: string, title: string, present = true): ReportLesson => ({ date, title, present, grade: null })
  const d = (n: number) => { const [y, m, dd] = week.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10) }
  const base = (child: string, extra: Partial<ReportStats>): ReportStats => ({
    week_start: week, child, subject: 'Химия', lessons_total: 3, lessons_attended: 3,
    lessons: [L(d(0), 'ОВР: метод баланса'), L(d(2), 'Тест «ОВР»'), L(d(3), 'Клетка, линия 3')],
    hw_done: 3, hw_checked: 3, hw_returned: 0, avg_pct: 84, prev_avg_pct: 80, new_student: false, ...extra,
  })
  const linked: ParentContact[] = [{ id: 'demo-c1', name: 'Ольга', relation: 'мама', linked: true, stopped: false, pending: false }]
  const R = (i: number, name: string, stats: ReportStats, strengths: string, focus: string, flags: ReportFlag[] = [], status: ReportStatus = 'draft', contacts = linked): ParentReport => ({
    id: `demo-r${i}`, studentId: `demo-s${i}`, studentName: name, weekStart: week, stats, strengths, focus, flags, status,
    sentAt: null, sendError: status === 'failed' ? 'Родитель заблокировал бота' : null, contacts, hasLink: i % 2 === 0,
  })
  demo = [
    R(1, 'Артём Ким', base('Артём', { lessons_attended: 1, lessons: [L(d(0), 'ОВР: метод баланса', false), L(d(2), 'Тест «ОВР»', false), L(d(3), 'Клетка, линия 3')], hw_done: 0, hw_checked: 0, avg_pct: null }),
      'Хорошо отвечал устно на единственном уроке недели.', '', ['absent_2'], 'draft',
      [{ id: 'demo-c2', name: 'Сергей', relation: 'папа', linked: false, stopped: false, pending: true }]),
    R(2, 'Ева Смирнова', base('Ева', { avg_pct: 58, prev_avg_pct: 79 }), 'Сдаёт все работы вовремя и аккуратно.', '', ['drop_15']),
    R(3, 'Маша Соколова', base('Маша', { hw_done: 2, avg_pct: 81, prev_avg_pct: 74 }), 'Уверенно расставляет коэффициенты в ОВР, тест 12 из 15.', 'Сроки домашки: договорились начинать её в день урока.'),
    R(4, 'Лиза Орлова', base('Лиза', { avg_pct: 92 }), 'Сама нашла ошибку в цепочке превращений и исправила её.', ''),
    R(5, 'Никита Белов', base('Никита', { lessons_attended: 2, hw_done: 2, avg_pct: 70, prev_avg_pct: 66 }), 'Стал задавать вопросы на уроке, раньше молчал.', 'Подтягиваем точность в развёрнутых ответах.'),
    R(6, 'Соня Ли', base('Соня', { avg_pct: 88 }), 'Без ошибок решила задачи на массовую долю.', '', [], 'approved'),
    R(7, 'Тимур Ахмедов', base('Тимур', { hw_done: 1, avg_pct: 64, prev_avg_pct: 61 }), 'Хорошо разбирается в строении атома.', 'Домашка: сдана 1 из 3.', [], 'failed'),
    R(8, 'Вера Панова', base('Вера', { avg_pct: 90 }), 'Подробные и точные ответы в развёрнутых заданиях.', '', [], 'sent'),
  ]
  return demo
}
const isDemo = (id: string) => id.startsWith('demo-')

// ── Хранилище ──────────────────────────────────────────────────────────────

type State = {
  week: string
  reports: ParentReport[]
  loading: boolean
  error: string | null
  loadedWeek: string | null
  setWeek: (week: string) => void
  load: (week?: string) => Promise<void>
  patch: (id: string, p: Partial<ParentReport>) => void
}

export const useParentReports = create<State>((set, get) => ({
  week: mondayMsk(),
  reports: [],
  loading: false,
  error: null,
  loadedWeek: null,
  setWeek: week => { set({ week }); void get().load(week) },
  load: async (week = get().week) => {
    set({ loading: true, error: null })
    const user = await getAuthUser()
    if (!user) {
      set({ loading: false, loadedWeek: week, reports: import.meta.env.DEV ? demoWeek(week) : [] })
      return
    }
    // Текущая неделя: если отчётов ещё нет (пятница не наступила), собираем
    // по кнопке; прошлые недели только читаем.
    const { data, error } = await supabase.rpc('parent_reports_week', { p_week: week })
    if (get().week !== week) return // пока ждали, учитель переключил неделю
    if (error) { set({ loading: false, error: 'Не удалось загрузить отчёты.\nПроверьте соединение и обновите страницу.' }); return }
    set({ loading: false, loadedWeek: week, reports: ((data ?? []) as Row[]).map(fromRow) })
  },
  patch: (id, p) => {
    if (demo && isDemo(id)) demo = demo.map(r => r.id === id ? { ...r, ...p } : r)
    set({ reports: get().reports.map(r => r.id === id ? { ...r, ...p } : r) })
  },
}))

export async function buildWeek(week: string): Promise<boolean> {
  if (!(await getAuthUser())) return true
  const { error } = await supabase.rpc('parent_reports_build_mine', { p_week: week })
  if (error) return false
  await useParentReports.getState().load(week)
  return true
}

export async function saveReportText(id: string, strengths: string, focus: string): Promise<boolean> {
  const st = useParentReports.getState()
  st.patch(id, { strengths, focus })
  if (isDemo(id)) return true
  const { error } = await supabase.rpc('parent_report_save', { p_id: id, p_strengths: strengths, p_focus: focus })
  return !error
}

export async function decideReports(ids: string[], action: 'approve' | 'skip' | 'reopen'): Promise<string[] | null> {
  const st = useParentReports.getState()
  const next: Record<typeof action, ReportStatus> = { approve: 'approved', skip: 'skipped', reopen: 'draft' }
  if (ids.every(isDemo)) { ids.forEach(id => st.patch(id, { status: next[action], sendError: null })); bump(); return ids }
  const { data, error } = await supabase.rpc('parent_report_decide', { p_ids: ids, p_action: action })
  if (error) return null
  const done = (data ?? []) as string[]
  done.forEach(id => st.patch(id, { status: next[action], sendError: action === 'approve' ? null : undefined }))
  bump()
  return done
}

/** Отправить утверждённые сейчас, не дожидаясь воскресенья. */
export async function sendApprovedNow(): Promise<{ sent: number; failed: number } | null> {
  const st = useParentReports.getState()
  if (!st.reports.length || st.reports.every(r => isDemo(r.id))) {
    if (!(import.meta.env.DEV && demo)) return null
    let sent = 0
    demo.filter(r => r.status === 'approved').forEach(r => { st.patch(r.id, { status: 'sent' }); sent++ })
    bump(); return { sent, failed: 0 }
  }
  const { data, error } = await supabase.functions.invoke('parent-report', { body: { mode: 'send' } })
  if (error || !data || typeof data.sent !== 'number') return null
  await st.load(); bump()
  return data as { sent: number; failed: number }
}

let botName: string | null = null
async function botUsername(): Promise<string | null> {
  if (botName) return botName
  const { data } = await supabase.functions.invoke('parent-report', { body: { mode: 'bot' } })
  botName = typeof data?.username === 'string' ? data.username : null
  return botName
}

/** Пригласить родителя в бота: контакт + ссылка t.me/<бот>?start=p_<код>. */
export async function inviteParent(studentId: string, name: string, relation: string): Promise<string | null> {
  if (isDemo(studentId)) return 'https://t.me/iskra_bot?start=p_demo1234567'
  const { data, error } = await supabase.rpc('parent_contact_add', { p_student: studentId, p_name: name, p_relation: relation || null })
  const code = (data as { code: string }[] | null)?.[0]?.code
  if (error || !code) return null
  const bot = await botUsername()
  await useParentReports.getState().load()
  return bot ? `https://t.me/${bot}?start=p_${code}` : null
}

export async function renewInvite(contactId: string): Promise<string | null> {
  if (isDemo(contactId)) return 'https://t.me/iskra_bot?start=p_demo1234567'
  const { data, error } = await supabase.rpc('parent_contact_code', { p_id: contactId })
  if (error || typeof data !== 'string') return null
  const bot = await botUsername()
  return bot ? `https://t.me/${bot}?start=p_${data}` : null
}

export async function removeParent(contactId: string): Promise<boolean> {
  if (isDemo(contactId)) return true
  const { error } = await supabase.rpc('parent_contact_remove', { p_id: contactId })
  if (!error) await useParentReports.getState().load()
  return !error
}

/** Постоянная ссылка на страницу отчётов. Токен показывается один раз. */
export async function createReportLink(studentId: string): Promise<string | null> {
  const page = (tok: string) => `${window.location.origin}/#/r/${tok}`
  if (isDemo(studentId)) return page('demo')
  const { data, error } = await supabase.rpc('parent_report_link_create', { p_student: studentId })
  if (error || typeof data !== 'string') return null
  await useParentReports.getState().load()
  return page(data)
}

export async function revokeReportLinks(studentId: string): Promise<boolean> {
  if (isDemo(studentId)) return true
  const { error } = await supabase.rpc('parent_report_links_revoke', { p_student: studentId })
  if (!error) await useParentReports.getState().load()
  return !error
}

// ── Сводка для виджета ─────────────────────────────────────────────────────

export type ReportSummary = {
  week_start: string; total: number; ready: number; flagged: number; approved: number; sent: number; failed: number
  ready_ids: string[]; attention: { id: string; name: string; flags: ReportFlag[]; status: ReportStatus }[]
}
type SummaryState = { summary: ReportSummary | null; rev: number; load: () => Promise<void> }
export const useReportSummary = create<SummaryState>((set) => ({
  summary: null,
  rev: 0,
  load: async () => {
    const user = await getAuthUser()
    if (!user) {
      if (!import.meta.env.DEV) { set({ summary: null }); return }
      const reports = demoWeek(mondayMsk())
      set({ summary: summarize(mondayMsk(), reports) })
      return
    }
    const { data, error } = await supabase.rpc('parent_reports_summary')
    set({ summary: error ? null : data as ReportSummary })
  },
}))
function summarize(week: string, reports: ParentReport[]): ReportSummary {
  const by = (s: ReportState) => reports.filter(r => reportState(r) === s)
  return {
    week_start: week, total: reports.length, ready: by('ready').length, flagged: by('flagged').length,
    approved: by('approved').length, sent: by('sent').length, failed: by('failed').length,
    ready_ids: by('ready').map(r => r.id),
    attention: reports.filter(r => ['flagged', 'failed'].includes(reportState(r)))
      .map(r => ({ id: r.id, name: r.studentName, flags: r.flags, status: r.status })),
  }
}
/** После решения учителя виджет пересчитывает сводку. */
function bump() {
  if (import.meta.env.DEV && demo && useParentReports.getState().reports.every(r => isDemo(r.id))) {
    useReportSummary.setState({ summary: summarize(demo[0]?.weekStart ?? mondayMsk(), demo) })
    return
  }
  void useReportSummary.getState().load()
}

/** Детали отчёта из сводки виджета: открыть экран сразу на нужном ученике. */
export const useReportFocus = create<{ id: string | null; set: (id: string | null) => void }>(set => ({ id: null, set: id => set({ id }) }))
