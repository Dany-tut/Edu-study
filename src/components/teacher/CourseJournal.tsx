import { useEffect, useMemo, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, Check, ChevronRight, CircleAlert, Download, Plus, RefreshCw, Search, Users, X, Filter, BarChart2 } from '../icons/appIcons'
import JournalSkeleton from './JournalSkeleton'
import Modal from '../Modal'
import MobileSheet from '../MobileSheet'
import NativeSelectField from '../NativeSelectField'
import FadeText from '../FadeText'
import HScrollFade from '../HScrollFade'
import { useScrollEdges } from './journalStand/useScrollEdges'
import { Alert } from '../Alert'
import { useGlassBar, type GlassBar } from '../../lib/nativeGlass'
import { useT, useTc } from '../../lib/i18n'
import { useCourseJournal } from '../../lib/useCourseJournal'
import { useTeacher } from '../../store/teacherStore'
import { supabase } from '../../lib/supabase'
import { getOwnerId } from '../../lib/owner'
import { useTeacherTz, wallDateTimeInTz, convertWallTime } from '../../lib/teacherTz'
import { parseBasicAnswers } from '../../lib/basicAnswers'
import { reviewHomework } from '../../lib/useHomework'
import { journalTaskType, readJournalContext, JOURNAL_CONTEXT_KEY } from '../../lib/journalTasks'
import { buildJournalIndex, courseRoster, journalColumns, journalCell, journalSummary, journalCsv, OUTSIDE_COURSES,
  type JournalCell, type JournalColumn, type JournalWorkState, type CourseJournalData } from '../../lib/courseJournal'
import BasicAnswersList from './BasicAnswersList'
import LessonGradeModal from './LessonGradeModal'
import './courseJournal.css'
import type { AttendanceRecord } from '../../lib/useGroups'

const workLabels: Record<JournalWorkState, string> = {
  none: 'Без ДЗ', available: 'Не сдано', future: 'Впереди', progress: 'В процессе', pending: 'На проверке',
  returned: 'На доработке', passed: 'Зачтено', low: 'Ниже порога', submitted: 'Отправлено', overdue: 'Просрочено',
}
function JournalSelect({ mobile, displayValue, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { mobile: boolean; displayValue: string }) {
  return mobile ? <NativeSelectField {...props} displayValue={displayValue} /> : <select {...props} />
}
function JournalTabScroll({ mobile, children }: { mobile: boolean; children: ReactNode }) {
  return mobile ? <HScrollFade fadeMode="mask" fadeWidth={24} padTop={0} padBottom={0} style={{ minWidth: 0, maxWidth: '100%' }}>{children}</HScrollFade> : children
}
function JournalTable({ children }: { mobile: boolean; children: ReactNode }) {
  const {viewport,scroller}=useScrollEdges()
  return <div className="cj-table-frame" ref={viewport}><div className="cj-table-wrap" ref={scroller}>{children}</div>
    <i className="cj-table-fade cj-table-fade-right" aria-hidden="true"/>
  </div>
}
function dateLabel(value: string | null) {
  if (!value) return 'Без даты'
  return new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
function slotLabel(date: string | null, time: string | null | undefined, tz: string): string {
  if (!date || !time) return dateLabel(date)
  const local = convertWallTime(date, time.slice(0, 5), 'Europe/Moscow', tz)
  return `${dateLabel(local.day)} · ${local.time}`
}
function savedSelection(): { courseId?: string; groupId?: string; moduleId?: string } {
  try { return JSON.parse(sessionStorage.getItem('iskra:journal-selection') ?? '{}') ?? {} } catch { return {} }
}
function attendanceLabel(cell: JournalCell) {
  if (!cell.applicable) return 'Не назначено'
  if (cell.cancelled) return 'Отменено'
  if (cell.column.assignment) return 'Домашняя работа'
  if (cell.column.lesson?.kind === 'test') return 'Тест'
  if (cell.column.recording || cell.column.lesson?.delivery_mode === 'recording') return 'Запись'
  return cell.present === true ? 'Был' : cell.present === false ? 'Пропуск' : 'Нет отметки'
}
function WorkBadge({ cell }: { cell: JournalCell }) {
  const t = useT()
  if (cell.cancelled) return <span className="cj-muted">{t('Отменено')}</span>
  if (!cell.applicable) return <span className="cj-muted">—</span>
  return <span className={`cj-badge cj-${cell.state}`}>
    {cell.score !== null && !['pending', 'returned'].includes(cell.state) ? `${cell.score}%` : t(workLabels[cell.state])}
    {cell.state === 'passed' && <Check size={11} />}
  </span>
}
function Detail({ cell, data, courseId, onClose, onMark, onChange, mobile }: {
  cell: JournalCell; data: CourseJournalData; courseId: string; onClose: () => void
  onMark: (id: string) => void; onChange: (update?: (data: CourseJournalData) => CourseJournalData) => void; mobile: boolean
}) {
  const t = useT()
  const { tn, tc } = useTc()
  const tz = useTeacherTz(s => s.tz)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [score, setScore] = useState(cell.latestScore === null ? '' : String(cell.latestScore))
  const [comment, setComment] = useState(cell.work?.review_comment ?? '')
  const tasks = useTeacher(s => s.tasks)
  const course = data.courses.find(c => c.id === courseId)
  const payload = parseBasicAnswers(cell.work?.attachments)
  const typeId = journalTaskType({ courseId, columnId: cell.column.id, studentId: cell.student.id })
  const existingTask = tasks.some(task => task.typeId === typeId && !task.done)
  const [demoTask, setDemoTask] = useState(false)
  async function createTask() {
    setBusy(true); setError('')
    try {
      if (data.demo) { setDemoTask(true); setNotice(t('Задача добавлена в демопросмотре')); return }
      const owner = await getOwnerId()
      if (!owner) throw new Error(t('Нужно войти в кабинет'))
      const { error } = await supabase.from('teacher_tasks').insert({
        created_by: owner, type_id: typeId, type_label: t('Журнал'), type_bg: 'var(--color-purple-soft)', type_color: 'var(--color-accent)',
        title: `${cell.student.name} · ${cell.column.title}`, date: new Date().toLocaleDateString('ru-RU'), time: '',
        comment: `${course?.title ?? t('Вне курсов')} · ${cell.column.title}\n${t(workLabels[cell.state])}${comment ? `\n${comment}` : ''}`,
        student_id: cell.student.id, group_id: cell.student.groupId || null,
      })
      if (error) throw error
      await useTeacher.getState().loadTasks()
      setNotice(t('Задача добавлена. Она откроет эту работу из «Моих задач».'))
    } catch { setError(t('Не удалось создать задачу. Попробуйте ещё раз.')) }
    finally { setBusy(false) }
  }
  async function review(verdict: 'accepted' | 'returned') {
    if (!cell.work) return
    const finalScore = score.trim() === '' ? null : Number(score)
    if ((verdict === 'accepted' && finalScore === null) || (finalScore !== null && (!Number.isInteger(finalScore) || finalScore < 0 || finalScore > 100))) {
      setError(t('Укажите итоговый результат от 0 до 100')); return
    }
    setBusy(true); setError('')
    try {
      if (data.demo) {
        onChange(old => ({ ...old, work: old.work.map(row => row.id === cell.work!.id ? { ...row,
          status: verdict === 'accepted' ? 'completed' : 'returned', score: finalScore, review_comment: comment,
          attachments: { ...(row.attachments as object), reviewedAt: new Date().toISOString() } } : row),
          attempts: old.attempts.map(a => a.student_id === cell.student.id && a.lesson_ref === cell.work!.lesson_ref ? {
            ...a, status: verdict === 'accepted' ? 'completed' : 'returned', score: finalScore, review_comment: comment } : a) }))
      } else {
        const saved = await reviewHomework(cell.work.id, verdict, finalScore ?? 0, comment, undefined, payload?.attemptId)
        if (!saved) throw new Error('review failed')
        onChange()
      }
      onClose()
    } catch { setError(t('Не удалось сохранить проверку. Обновите работу и попробуйте ещё раз.')) }
    finally { setBusy(false) }
  }
  const body = <div className="course-journal cj-detail">
    <div className="cj-detail-context">{tc(course?.title ?? t('Вне курсов'))} <ChevronRight size={12} /> {tc(cell.column.title)}</div>
    <div className="cj-detail-facts">
      <div><span>{t('Занятие')}</span><strong>{t(attendanceLabel(cell))}</strong><small>{slotLabel(cell.event?.date ?? cell.column.date, cell.event?.time_start ?? cell.column.time, tz)}</small></div>
      <div><span>{t('Материал')}</span><strong>{t(cell.studied ? 'Изучен' : cell.watchStarted ? 'Просмотр начат' : 'Не изучен')}</strong><small>{t(cell.watched ? 'Запись просмотрена' : cell.present === true ? 'Зачтено присутствием' : 'Нет зачёта за изучение')}</small></div>
      <div><span>{t('Домашняя работа')}</span><WorkBadge cell={cell} /><small>{t('Порог')}: {cell.passingScore}%{cell.due ? ` · ${t('Срок')}: ${dateLabel(cell.due)}` : ''}</small></div>
    </div>
    {cell.present === false && cell.watched && <p className="cj-note">{t('Пропуск сохранён. Материал зачтён по просмотру записи.')}</p>}
    <div className="cj-detail-actions">
      {cell.event && !cell.cancelled && cell.column.lesson?.kind !== 'test' && <button className="cj-button" type="button" disabled={busy} onClick={() => onMark(cell.event!.id)}>{t('Отметить занятие')}</button>}
      <button className="cj-button" type="button" disabled={busy || existingTask || demoTask} onClick={() => void createTask()}><Plus size={14} />{t(existingTask || demoTask ? 'Задача уже создана' : 'Создать задачу')}</button>
    </div>
    {(cell.score !== null || cell.latestScore !== null) && <p className="cj-note">{t('Лучший результат')}: {cell.score ?? '—'}% · {t('Последний результат')}: {cell.latestScore ?? '—'}%</p>}
    {cell.attempts.length > 0 && <section><h3>{t('История попыток')}</h3><div className="cj-attempts">{cell.attempts.map(a => <div key={a.id}><strong>{t('Попытка')} {a.number}</strong><span>{a.score === null ? t('Без результата') : `${a.score}%`}</span><small>{t(a.status === 'returned' ? 'На доработке' : a.status === 'submitted' ? 'На проверке' : 'Проверено')}</small></div>)}</div></section>}
    {cell.work?.review_comment && <section><h3>{t('Комментарий преподавателя')}</h3><p className="cj-note">{cell.work.review_comment}</p></section>}
    {payload && !data.demo && <section><h3>{t('Работа ученика')}</h3><BasicAnswersList payload={payload} studentId={cell.student.id} /></section>}
    {['pending', 'returned'].includes(cell.state) && cell.work && <section className="cj-review"><h3>{t('Проверка работы')}</h3>
      <label>{t('Итоговый результат, %')}<input type="number" min="0" max="100" step="1" value={score} onChange={e => setScore(e.target.value)} /></label>
      <label>{t('Комментарий')}<textarea rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder={t('Что получилось и что нужно исправить')} /></label>
      <div className="cj-detail-actions"><button type="button" className="cj-button" disabled={busy} onClick={() => void review('returned')}>{t('Вернуть на доработку')}</button><button type="button" className="cj-button cj-primary" disabled={busy} onClick={() => void review('accepted')}>{t('Принять работу')}</button></div>
    </section>}
    {cell.related.filter(row => row.lesson_ref.endsWith('-hard')).length > 0 && <section><h3>{t('Сложная часть · необязательно')}</h3>
      {cell.related.filter(row => row.lesson_ref.endsWith('-hard')).map(row => <p className="cj-note" key={row.id}>{t(row.status === 'completed' ? 'Принято' : row.status === 'returned' ? 'На доработке' : 'На проверке')}{row.status === 'completed' && row.score !== null ? ` · ${row.score} ${t('баллов')}` : ''}</p>)}
    </section>}
    {error && <Alert tone="danger" text={error} />}{notice && <p role="status" className="cj-note">{notice}</p>}
  </div>
  return mobile ? <MobileSheet open onClose={onClose} title={tn(cell.student.name)}>{body}</MobileSheet>
    : <Modal title={tn(cell.student.name)} subtitle={tc(cell.column.title)} onClose={onClose} width={680}>{body}</Modal>
}

const journalSections = [
  ['overview', 'Обзор', 'square.grid.2x2'],
  ['attendance', 'Посещения', 'calendar'],
  ['work', 'Работы', 'checklist'],
  ['stats', 'Динамика', 'chart.bar'],
] as const
type JournalMode = typeof journalSections[number][0]

function NativeJournalBar({ bar, onTap, onMenu }: {
  bar: GlassBar
  onTap: (id: string) => void
  onMenu: (id: string, value: string) => void
}) {
  useGlassBar(bar, { onTap, onMenu })
  return null
}

export default function CourseJournal({ mobile = false, nativeIphone = false }: { mobile?: boolean; nativeIphone?: boolean }) {
  const t = useT()
  const { tc, tn } = useTc()
  const { data, error, loading, reload, setData } = useCourseJournal(false, true, nativeIphone)
  const tz = useTeacherTz(s => s.tz)
  const [clock, setClock] = useState(() => new Date().toISOString())
  // Schedule wall dates and homework deadlines are stored in Moscow time.
  const now = wallDateTimeInTz(clock, 'Europe/Moscow')
  const today = now.day
  const restored = useRef(readJournalContext())
  const remembered = useRef(savedSelection())
  const [courseId, setCourseId] = useState(restored.current?.courseId ?? remembered.current.courseId ?? '')
  const [groupId, setGroupId] = useState(restored.current ? 'all' : remembered.current.groupId ?? 'all')
  const [moduleId, setModuleId] = useState(restored.current ? 'all' : remembered.current.moduleId ?? 'all')
  const [query, setQuery] = useState('')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)
  const [mode, setMode] = useState<JournalMode>('overview')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [onlyAttention, setOnlyAttention] = useState(false)
  const [selected, setSelected] = useState<{ studentId: string; columnId: string } | null>(restored.current ?? null)
  const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({})
  const [markId, setMarkId] = useState<string | null>(null)
  const [demoPresent, setDemoPresent] = useState<Record<string, boolean | null>>({})
  const pendingId = useTeacher(s => s.pendingGradebookLessonId)
  const clearPending = useTeacher(s => s.clearPendingGradebookLesson)
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date().toISOString()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!data || courseId === OUTSIDE_COURSES || data.courses.some(c => c.id === courseId)) return
    setCourseId(data.courses[0]?.id ?? OUTSIDE_COURSES)
  }, [data, courseId])
  useEffect(() => {
    if (!courseId) return
    try { sessionStorage.setItem('iskra:journal-selection', JSON.stringify({ courseId, groupId, moduleId })) } catch { /* Optional preference. */ }
  }, [courseId, groupId, moduleId])
  useEffect(() => {
    if (!data || !pendingId) return
    const event = data.events.find(e => e.id === pendingId)
    if (!event) return
    const lesson = data.lessons.find(l => l.id === event.lesson_id)
    setCourseId(lesson?.course_id ?? OUTSIDE_COURSES)
    setGroupId('all'); setModuleId('all'); setMarkId(event.id); setSelected(null)
    clearPending()
  }, [data, pendingId, clearPending])
  useEffect(() => {
    if (!data || !restored.current) return
    try { sessionStorage.removeItem(JOURNAL_CONTEXT_KEY) } catch { /* Optional context. */ }
    restored.current = null
  }, [data])
  const index = useMemo(() => data ? buildJournalIndex(data) : null, [data])
  const roster = useMemo(() => data ? courseRoster(data, courseId) : [], [data, courseId])
  const allColumns = useMemo(() => data ? journalColumns(data, courseId) : [], [data, courseId])
  const needsEventRecords = !nativeIphone || markId !== null
  const eventRecords = useMemo(() => {
    const records: Record<string, AttendanceRecord[]> = {}
    if (!data || !index || !needsEventRecords) return records
    for (const column of allColumns) for (const student of roster) {
      const cell = journalCell(data, index, student, column, today, now.time)
      if (cell.present === null || !cell.event) continue
      const event = cell.event
      records[event.id] = [...(records[event.id] ?? []), { studentId: student.id, lessonDate: event.date, lessonTitle: event.lesson_title, present: cell.present, grade: cell.grade }]
    }
    return records
  }, [data, index, allColumns, roster, today, now.time, needsEventRecords])
  const columns = useMemo(() => allColumns.filter(c => moduleId === 'all' || c.moduleId === moduleId), [allColumns, moduleId])
  const cells = useMemo(() => {
    const map = new Map<string, JournalCell[]>()
    if (data && index) for (const student of roster) map.set(student.id, columns.map(column => journalCell(data, index, student, column, today, now.time)))
    return map
  }, [data, index, roster, columns, today, now.time])
  const rosterGroups = data?.groups.filter(g => roster.some(s => s.groupId === g.id)) ?? []
  const filteredRoster = roster.filter(s => (groupId === 'all' || (groupId === 'direct' ? !s.groupId || data?.groups.find(g => g.id === s.groupId)?.isIndividual : s.groupId === groupId))
    && (!query.trim() || `${tn(s.name)} ${s.email ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())))
  const students = filteredRoster.filter(s => !onlyAttention || cells.get(s.id)?.some(c => c.attention))
  const visibleCells = students.flatMap(s => cells.get(s.id) ?? [])
  const summary = journalSummary(visibleCells, today)
  const attentionStudents = filteredRoster.filter(s => cells.get(s.id)?.some(c => c.attention)).length
  const activeCourse = data?.courses.find(c => c.id === courseId)
  const selectedStudent = roster.find(s => s.id === selected?.studentId)
  const selectedColumn = allColumns.find(c => c.id === selected?.columnId)
  const detailCell = data && index && selectedStudent && selectedColumn ? journalCell(data, index, selectedStudent, selectedColumn, today, now.time) : null
  const markedEvent = data?.events.find(e => e.id === markId)
  const markRoster = data?.students.filter(s => markedEvent && (markedEvent.student_id === s.id || markedEvent.group_id === s.groupId)) ?? []
  const scheduleIds = allColumns.flatMap(c => c.events.filter(e => e.status !== 'cancelled').map(e => e.id))
  function changeCourse(id: string) {
    setCourseId(id); setGroupId('all'); setModuleId('all'); setSelected(null); setOnlyAttention(false); setExpandedStudents({})
  }
  function openMark(id: string) {
    setSelected(null); setMarkId(id)
    const attendance = data?.marks.find(m => m.schedule_id === id)?.attendance ?? {}
    setDemoPresent({ ...attendance })
  }
  function saveDemoMarks() {
    setData(old => old ? { ...old, marks: [...old.marks.filter(m => m.schedule_id !== markId), { schedule_id: markId!, attendance: demoPresent }] } : old)
    setMarkId(null)
  }
  function exportCsv() {
    const rows: (string | number | null)[][] = [[t('Курс'), t('Ученик'), t('Группа'), t('Урок'), t('Дата'), t('Посещение'), t('Материал'), t('Статус ДЗ'), t('Результат, %'), t('Попыток')]]
    for (const cell of visibleCells) rows.push([activeCourse?.title ?? t('Вне курсов'), cell.student.name, data?.groups.find(g => g.id === cell.student.groupId)?.name ?? t('Без группы'),
      cell.column.title, cell.event?.date ?? cell.column.date, t(attendanceLabel(cell)), t(cell.studied ? 'Изучен' : 'Не изучен'), t(workLabels[cell.state]), cell.score, cell.attempts.length])
    const url = URL.createObjectURL(new Blob([journalCsv(rows)], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = `iskra-journal-${today}.csv`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  if (!data && loading) return <JournalSkeleton table embedded />
  if (error || !data) return <div className="course-journal cj-empty" role="alert"><CircleAlert size={28} /><p>{t('Не удалось загрузить журнал')}</p><p className="cj-note">{error}</p><button className="cj-button" type="button" onClick={reload}>{t('Повторить')}</button></div>
  const modules = data.modules.filter(m => m.course_id === courseId).sort((a, b) => a.position - b.position)
  const pendingEvents = allColumns.flatMap(c => c.events).filter((event, i, all) => event.status !== 'cancelled'
    && all.findIndex(e => e.id === event.id) === i && visibleCells.some(cell => cell.event?.id === event.id && cell.needsAttendance))
  const courseTitle = tc(activeCourse?.title || t(courseId === OUTSIDE_COURSES ? 'Вне курсов' : 'Без названия'))
  const courseSelector = (<label className="cj-course-select"><span>{t('Курс или интенсив')}</span><div><BookOpen size={20} /><JournalSelect mobile={mobile} displayValue={courseTitle} aria-label={t('Курс или интенсив')} value={courseId} onChange={e => changeCourse(e.target.value)}>
        <optgroup label={t('Курсы')}>{data.courses.filter(c => c.kind !== 'intensive').map(c => <option key={c.id} value={c.id}>{tc(c.title || t('Без названия'))}</option>)}</optgroup>
        {data.courses.some(c => c.kind === 'intensive') && <optgroup label={t('Интенсивы')}>{data.courses.filter(c => c.kind === 'intensive').map(c => <option key={c.id} value={c.id}>{tc(c.title)}</option>)}</optgroup>}
        <option value={OUTSIDE_COURSES}>{t('Вне курсов')}</option>
      </JournalSelect></div></label>)
  const secondaryFilters = <><label><span>{t('Ученики')}</span><JournalSelect mobile={mobile} displayValue={groupId === 'all' ? t('Все ученики курса') : groupId === 'direct' ? t('Индивидуальные и без группы') : tc(rosterGroups.find(g => g.id === groupId)?.name ?? '')} aria-label={t('Группа')} value={groupId} onChange={e => setGroupId(e.target.value)}><option value="all">{t('Все ученики курса')}</option>{rosterGroups.filter(g => !g.isIndividual).map(g => <option key={g.id} value={g.id}>{tc(g.name)}</option>)}{roster.some(s => !s.groupId || data.groups.find(g => g.id === s.groupId)?.isIndividual) && <option value="direct">{t('Индивидуальные и без группы')}</option>}</JournalSelect></label>
        {modules.length > 0 && <label><span>{t('Модуль')}</span><JournalSelect mobile={mobile} displayValue={moduleId === 'all' ? t('Все модули') : tc(modules.find(m => m.id === moduleId)?.label || t('Без названия'))} aria-label={t('Модуль')} value={moduleId} onChange={e => setModuleId(e.target.value)}><option value="all">{t('Все модули')}</option>{modules.map(m => <option key={m.id} value={m.id}>{tc(m.label || t('Без названия'))}</option>)}</JournalSelect></label>}</>
  const studentSearch = (<label className="cj-search"><Search size={15} /><input aria-label={t('Поиск ученика')} placeholder={t('Найти ученика')} value={query} onChange={e => setQuery(e.target.value)} />{query && <button data-hover="layer" type="button" aria-label={t('Сбросить поиск')} onClick={() => setQuery('')}><X size={13} /></button>}</label>)
  const summaryCards = (<div className="cj-summaries">
      <div><span>{t('Изучено уроков')}</span><strong>{summary.studied}<small> / {summary.studyTotal}</small></strong><p>{t('Присутствие или просмотр записи')}</p></div>
      <div><span>{t('Зачтено работ')}</span><strong>{summary.passed}<small> / {summary.required}</small></strong><p>{t('Обязательные доступные работы')}</p></div>
      <div><span>{t('Средний результат')}</span><strong>{summary.score === null ? '—' : `${summary.score}%`}</strong><p>{t('По итоговым результатам работ')}</p></div>
      <button type="button" aria-pressed={onlyAttention} className={onlyAttention ? 'cj-summary-active' : ''} onClick={() => { setOnlyAttention(v => !v); if (mobile) setMobileSummaryOpen(false) }}><span>{mobile ? <FadeText>{t('Требуют внимания')}</FadeText> : t('Требуют внимания')} <ChevronRight size={13} /></span><strong>{attentionStudents}<small> / {filteredRoster.length}</small></strong><p>{t('Проверка, доработка или пропущенный срок')}</p></button>
    </div>)
  const activeMobileFilters = Number(groupId !== 'all') + Number(moduleId !== 'all')
  return <div className={`course-journal ${mobile ? 'cj-mobile' : ''}`}>
    {!mobile && <header className="cj-heading"><div><div className="cj-eyebrow">{t('Кабинет преподавателя')}</div><h1>{t('Журнал')}</h1><p>{t('Занятия, работы и прогресс — в контексте курса.')}</p></div>
      <div className="cj-heading-actions"><button className="cj-icon-button" type="button" aria-label={t('Обновить журнал')} disabled={loading} onClick={reload}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} /></button><button className="cj-button" type="button" onClick={exportCsv} disabled={!visibleCells.length}><Download size={15} />{mobile ? 'CSV' : t('Экспорт CSV')}</button></div>
    </header>}
    {data.demo && (mobile ? <div className="cj-mobile-demo-note"><span>{t('Демопросмотр')}</span><a data-hover="link" href="#/teacher/login">{t('Войти в аккаунт')}</a></div> : <div className="cj-demo"><span>{t('Демопросмотр')}</span>{t('Одна группа учится на химии, биологии и интенсиве. Изменения останутся в этом просмотре.')}<a data-hover="link" href="#/teacher/login">{t('Войти в аккаунт')}</a></div>)}
    {data.warnings.map(warning => <Alert key={warning} tone="warning" text={t(warning)} />)}
    {mobile ? <>
      {nativeIphone ? <>
        <NativeJournalBar bar={{
          bottom: [
            { id: 'journal-search', kind: 'circle', symbol: 'magnifyingglass', label: t('Поиск ученика'), active: !!query },
            { id: 'journal-course', kind: 'pill', title: courseTitle, menuTitle: t('Курс или интенсив'), menu: [
              ...data.courses.map(c => ({ value: c.id, title: tc(c.title || t('Без названия')), checked: c.id === courseId })),
              { value: OUTSIDE_COURSES, title: t('Вне курсов'), checked: courseId === OUTSIDE_COURSES },
            ] },
            { id: 'journal-section', kind: 'circle', label: t('Вид журнала') },
            { id: 'journal-settings', kind: 'circle', symbol: 'slider.horizontal.3', label: t('Фильтры'), active: activeMobileFilters > 0 },
          ],
          expandingSections: {
            trigger: 'journal-section',
            selected: mode,
            items: journalSections.map(([id, label, symbol]) => ({ id, title: t(label), symbol })),
          },
        }} onTap={id => {
          if (id === 'journal-search') setMobileSearchOpen(true)
          if (id === 'journal-settings') setMobileFiltersOpen(true)
        }} onMenu={(id, value) => {
          if (id === 'journal-course' && (value === OUTSIDE_COURSES || data.courses.some(c => c.id === value))) changeCourse(value)
          if (id === 'journal-section') {
            const next = journalSections.find(([key]) => key === value)
            if (next) setMode(next[0])
          }
        }} />
        <MobileSheet open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} title={t('Поиск ученика')}
          footer={<button className="cj-button cj-primary cj-mobile-panel-done" type="button" onClick={() => setMobileSearchOpen(false)}>{t('Готово')}</button>}>
          <div className="course-journal cj-mobile">{studentSearch}</div>
        </MobileSheet>
      </> : <>
        <section className="cj-context cj-mobile-compact-context" aria-label={t('Контекст журнала')}>
          {courseSelector}
          <button className="cj-icon-button" type="button" aria-label={t('Фильтры')} aria-haspopup="dialog" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen(true)}>
            <Filter size={18} />{activeMobileFilters > 0 && <span className="cj-mobile-filter-count">{activeMobileFilters}</span>}
          </button>
        </section>
        <div className="cj-mobile-search-row">{studentSearch}<button className="cj-icon-button" type="button" aria-label={t('Результаты')} aria-haspopup="dialog" aria-expanded={mobileSummaryOpen} onClick={() => setMobileSummaryOpen(true)}><BarChart2 size={18} /></button></div>
      </>}
      <MobileSheet open={mobileFiltersOpen} onClose={() => setMobileFiltersOpen(false)} title={t('Фильтры')} footer={<button className="cj-button cj-primary cj-mobile-panel-done" type="button" onClick={() => setMobileFiltersOpen(false)}>{t('Готово')}</button>}>
        <div className="course-journal cj-mobile cj-mobile-filter-panel">
          <div className="cj-filters">{secondaryFilters}</div>
          <button className="cj-button" type="button" disabled={activeMobileFilters === 0} onClick={() => { setGroupId('all'); setModuleId('all') }}>{t('Сбросить фильтры')}</button>
          <div className="cj-mobile-panel-actions"><button className="cj-button" type="button" disabled={loading} onClick={reload}><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />{t('Обновить журнал')}</button><button className="cj-button" type="button" onClick={exportCsv} disabled={!visibleCells.length}><Download size={15} />CSV</button></div>
          {nativeIphone && <button className="cj-button" type="button" onClick={() => { setMobileFiltersOpen(false); setMobileSummaryOpen(true) }}><BarChart2 size={17} />{t('Результаты')}</button>}
          {data.demo && <p className="cj-note">{t('Одна группа учится на химии, биологии и интенсиве. Изменения останутся в этом просмотре.')}</p>}
        </div>
      </MobileSheet>
      <MobileSheet open={mobileSummaryOpen} onClose={() => setMobileSummaryOpen(false)} title={t('Результаты')} footer={<button className="cj-button cj-primary cj-mobile-panel-done" type="button" onClick={() => setMobileSummaryOpen(false)}>{t('Готово')}</button>}>
        <div className="course-journal cj-mobile">{summaryCards}</div>
      </MobileSheet>
    </> : <>
      <section className="cj-context" aria-label={t('Контекст журнала')}>
        {courseSelector}
        <div className="cj-context-right"><span className="cj-course-kind">{t(courseId === OUTSIDE_COURSES ? 'Разовые занятия и ДЗ' : activeCourse?.kind === 'intensive' ? 'Интенсив' : 'Курс')}</span><span><Users size={14} />{roster.length} {t('учеников')}</span></div>
        <div className="cj-filters">{secondaryFilters}{studentSearch}</div>
      </section>
      {summaryCards}
    </>}
    {!nativeIphone && <div className="cj-toolbar"><JournalTabScroll mobile={mobile}><div className="cj-tabs" role="group" aria-label={t('Вид журнала')}>{([['overview', 'Обзор'], ['attendance', 'Посещаемость'], ['work', 'Работы'], ['stats', 'Статистика']] as const).map(([id, label]) => <button data-hover="layer" key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>{t(label)}</button>)}</div></JournalTabScroll>
      {!mobile && <button className="cj-button cj-primary" type="button" disabled={!scheduleIds.length} onClick={() => openMark(pendingEvents[0]?.id ?? scheduleIds[0])}><Plus size={15} />{t('Отметить занятие')}</button>}
    </div>}
    {onlyAttention && <div className="cj-active-filter"><CircleAlert size={14} /><span>{t('Показаны ученики, которым нужно внимание')}</span><button data-hover="layer" type="button" onClick={() => setOnlyAttention(false)}>{t('Сбросить')}</button></div>}
    {pendingEvents.length > 0 && <div className="cj-pending-alert"><CircleAlert size={17} /><span>{t('Есть незаполненные занятия')}: {pendingEvents.length}</span><button data-hover="layer" type="button" onClick={() => openMark(pendingEvents[0].id)}>{t('Заполнить')}<ChevronRight size={13} /></button></div>}
    {(!students.length || !columns.length) ? <div className="cj-empty"><BookOpen size={28} /><h3>{t(!roster.length ? 'На этот курс пока не назначены ученики' : !allColumns.length ? 'В журнале пока нет занятий' : 'Ничего не найдено')}</h3><p>{t(!roster.length ? 'Назначьте курс группе или отдельным ученикам в материалах курса.' : 'Попробуйте изменить фильтры или поиск.')}</p></div>
      : mobile && mode !== 'stats' ? <div className="cj-mobile-list">{students.map(student => {
        const row = cells.get(student.id) ?? []; const stats = journalSummary(row, today)
        const expanded = nativeIphone ? expandedStudents[student.id] ?? students.length === 1 : students.length === 1
        return <details key={student.id} open={expanded} onToggle={nativeIphone ? e => {
          const open = e.currentTarget.open
          if (open !== expanded) setExpandedStudents(current => ({ ...current, [student.id]: open }))
        } : undefined}><summary><span className="cj-avatar">{tn(student.name).split(' ').map(n => n[0]).slice(0, 2).join('')}</span><span><strong><FadeText>{tn(student.name)}</FadeText></strong><small>{t('Зачтено')}: {stats.passed}/{stats.required}{stats.attention ? ` · ${t('Внимание')}: ${stats.attention}` : ''}</small></span><ChevronRight size={16} /></summary>
          {(!nativeIphone || expanded) && <div>{row.map(cell => <button data-hover="row" type="button" key={cell.column.id} className="cj-mobile-lesson" onClick={() => setSelected({ studentId: student.id, columnId: cell.column.id })}><span><strong><FadeText>{tc(cell.column.title)}</FadeText></strong><small>{slotLabel(cell.event?.date ?? cell.column.date, cell.event?.time_start ?? cell.column.time, tz)} · {t(mode === 'work' ? workLabels[cell.state] : attendanceLabel(cell))}{cell.watched ? ` · ${t('Запись просмотрена')}` : ''}</small></span>{mode === 'attendance' ? <span className={`cj-badge ${cell.present === true ? 'cj-passed' : ''}`}>{t(attendanceLabel(cell))}</span> : <WorkBadge cell={cell} />}</button>)}</div>}
        </details>
      })}</div>
      : mode === 'stats' ? <JournalTable mobile={mobile}><table className="cj-table cj-stats"><thead><tr>{['Ученик', 'Изучено', 'Зачтено работ', 'Результат', 'Посещение', 'Требуют внимания'].map(label => <th key={label} scope="col">{t(label)}</th>)}</tr></thead><tbody>{students.map(student => {
        const row = cells.get(student.id) ?? []; const stats = journalSummary(row, today)
        return <tr key={student.id}><th scope="row">{tn(student.name)}</th><td>{stats.studied}/{stats.studyTotal}</td><td>{stats.passed}/{stats.required}</td><td>{stats.score === null ? '—' : `${stats.score}%`}</td><td>{stats.marked ? `${Math.round(stats.present / stats.marked * 100)}%` : '—'}</td><td><button data-hover="layer" type="button" className="cj-text-button" disabled={!stats.attention} onClick={() => { const cell = row.find(c => c.attention)!; setSelected({ studentId: student.id, columnId: cell.column.id }) }}>{stats.attention || '—'}</button></td></tr>
      })}</tbody></table></JournalTable>
      : <JournalTable mobile={mobile}><table className="cj-table"><caption className="sr-only">{tc(activeCourse?.title ?? t('Вне курсов'))} · {t('Прогресс учеников по урокам')}</caption><thead><tr><th scope="col" className="cj-student-heading">{t('Ученик')}<small>{students.length} {t('в этом списке')}</small></th>{columns.map((column, i) => <th scope="col" key={column.id}><small>{tc(modules.find(m => m.id === column.moduleId)?.label ?? (column.lesson?.kind === 'test' ? t('Тест') : t('Занятие')))}</small><strong>{column.lesson ? `${i + 1}. ` : ''}{tc(column.title)}{column.recording ? ` · ${t('Запись')}` : ''}</strong><span>{slotLabel(column.date, column.time, tz)}</span></th>)}<th scope="col" className="cj-total">{t('Зачтено')}<small>{t('работ')}</small></th></tr></thead><tbody>{students.map(student => {
        const row = cells.get(student.id) ?? []; const stats = journalSummary(row, today)
        return <tr key={student.id}><th scope="row"><div className="cj-student"><span className="cj-avatar">{tn(student.name).split(' ').map(n => n[0]).slice(0, 2).join('')}</span><div><strong>{tn(student.name) || student.email || t('Без имени')}</strong><small>{tc(data.groups.find(g => g.id === student.groupId)?.name ?? t('Без группы'))}</small></div>{row.some(c => c.attention) && <span className="cj-attention-dot" aria-label={t('Требует внимания')} />}</div></th>{row.map(cell => <td key={cell.column.id}><button type="button" className={`cj-cell ${cell.attention ? 'cj-cell-attention' : ''}`} onClick={() => setSelected({ studentId: student.id, columnId: cell.column.id })} aria-label={`${tn(student.name)} · ${tc(cell.column.title)} · ${t(attendanceLabel(cell))} · ${t(workLabels[cell.state])}`}>
          {mode !== 'work' && <span className={`cj-attendance ${cell.cancelled ? 'cj-muted' : cell.present === true ? 'cj-present' : cell.present === false ? 'cj-absent' : ''}`}>{cell.present === true && !cell.cancelled && <Check size={12} />}{t(attendanceLabel(cell))}{cell.grade !== null && !cell.cancelled ? ` · ${cell.grade}` : ''}</span>}
          {mode !== 'attendance' && <WorkBadge cell={cell} />}
          {(cell.watched || cell.watchStarted) && <small className="cj-watched">{t(cell.watched ? 'Запись просмотрена' : 'Просмотр начат')}</small>}
          {mode === 'work' && cell.attempts.length > 1 && <small>{t('Попыток')}: {cell.attempts.length}</small>}
        </button></td>)}<td className="cj-total"><strong>{stats.passed}<span>/{stats.required}</span></strong><div className="cj-mini-progress"><i style={{ width: stats.required ? `${stats.passed / stats.required * 100}%` : '0%' }} /></div></td></tr>
      })}</tbody></table></JournalTable>}
    <footer className="cj-legend"><span><i className="cj-legend-green" />{t('Зачтено')}</span><span><i className="cj-legend-amber" />{t('Нужен следующий шаг')}</span><span><i className="cj-legend-gray" />{t('Нет отметки — не пропуск')}</span><p>{t('Сложная часть необязательна. Будущие работы не входят в доступный объём.')}</p></footer>
    <AnimatePresence>{detailCell && <Detail key={`${detailCell.student.id}:${detailCell.column.id}`} cell={detailCell} data={data} courseId={courseId} onClose={() => setSelected(null)} onMark={openMark} mobile={mobile} onChange={update => { if (update) setData(old => old ? update(old) : old); else reload() }} />}</AnimatePresence>
    {markId && !data.demo && <LessonGradeModal key={markId} groupId={markedEvent?.group_id ?? null} initialLessonId={markId} scheduleIds={scheduleIds} eventRecords={eventRecords} onClose={() => { setMarkId(null); reload() }} />}
    {markId && data.demo && <Modal title={t('Отметить занятие')} subtitle={`${markedEvent?.lesson_title} · ${dateLabel(markedEvent?.date ?? null)}`} onClose={() => setMarkId(null)} width={540} footer={<button className="cj-button cj-primary" type="button" onClick={saveDemoMarks}>{t('Сохранить отметки')}</button>}><div className="course-journal cj-demo-marks"><p className="cj-note">{t('Без отметки — не значит пропуск. Можно заполнить позже.')}</p><button type="button" className="cj-button" onClick={() => setDemoPresent(Object.fromEntries(markRoster.map(s => [s.id, true])))}>{t('Все присутствовали')}</button>{markRoster.map(student => <div key={student.id}><strong>{tn(student.name)}</strong><button type="button" className="cj-button" aria-pressed={demoPresent[student.id] === true} onClick={() => setDemoPresent(v => ({ ...v, [student.id]: v[student.id] === true ? null : true }))}>{t('Был')}</button><button type="button" className="cj-button" aria-pressed={demoPresent[student.id] === false} onClick={() => setDemoPresent(v => ({ ...v, [student.id]: v[student.id] === false ? null : false }))}>{t('Пропуск')}</button></div>)}</div></Modal>}
  </div>
}
