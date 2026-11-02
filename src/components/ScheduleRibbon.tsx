import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { LoopSvg } from './icons/LoopIcon'
import { LoopArtworkMaximize, LoopArtworkMinimize, LoopArtworkCalendarDays, LoopArtworkChevronLeft, LoopArtworkChevronRight } from './icons/loopArtwork'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { fetchScheduleDays } from '../lib/db'
import { getStudentSession } from '../lib/studentSession'
import { personalDemoOwner } from '../lib/personalStudentDemo'
import { useStudentTz } from '../lib/studentTz'
import { wallDateTimeInTz } from '../lib/teacherTz'
import { useNow } from '../lib/useNow'
import { useLang, useT } from '../lib/i18n'
import type { ScheduleDay } from '../data/mockData'
import Skeleton from './Skeleton'
import './scheduleRibbon.css'

const dateOf = (key: string) => new Date(`${key}T12:00:00Z`)
const keyOf = (date: Date) => date.toISOString().slice(0, 10)
const shift = (key: string, days: number) => { const date = dateOf(key); date.setUTCDate(date.getUTCDate() + days); return keyOf(date) }
const monthRange = (month: string) => {
  const first = dateOf(`${month}-01`)
  const last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0)
  return { from: shift(keyOf(first), -2), to: shift(keyOf(last), 2) }
}
const glyphs = { Maximize: LoopArtworkMaximize, Minimize: LoopArtworkMinimize, CalendarDays: LoopArtworkCalendarDays, ChevronLeft: LoopArtworkChevronLeft, ChevronRight: LoopArtworkChevronRight }
function Icon({ name }: { name: keyof typeof glyphs }) { return <LoopSvg name={name} artwork={glyphs[name]} size={18} /> }

export default function ScheduleRibbon({ children }: { children: (days: ScheduleDay[], index: number, onSelect: (index: number) => void, loaded: boolean) => ReactNode }) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const locale = lang === 'en' ? 'en-GB' : 'ru-RU'
  const days = useStudentData(s => s.scheduleDays)
  const loaded = useStudentData(s => s.loaded)
  const index = useDashboard(s => s.scheduleIndex)
  const setIndex = useDashboard(s => s.setScheduleIndex)
  const timeZone = useStudentTz(s => s.tz)
  const now = useNow(30_000)
  const today = wallDateTimeInTz(now.toISOString(), timeZone).day
  const [selected, setSelected] = useState(() => days[index]?.date ?? today)
  const [month, setMonth] = useState(() => selected.slice(0, 7))
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (open) { setVisible(true); return }
    const timer = window.setTimeout(() => setVisible(false), 150)
    return () => window.clearTimeout(timer)
  }, [open])
  const [expanded, setExpanded] = useState(false)
  const expandedDialog = useRef<HTMLDialogElement>(null)
  const [remote, setRemote] = useState<ScheduleDay[]>([])
  const [pending, setPending] = useState(true)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const picker = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const dialogId = useId()
  const session = getStudentSession()
  const studentId = session?.id, groupId = session?.groupId
  const personalExample = !!personalDemoOwner(session)
  const selectedMonth = selected.slice(0, 7)
  const requestedMonths = [...new Set([selectedMonth, ...(open ? [month] : [])])].join('|')

  // The rest of the dashboard can reset its selected day (e.g. via Home).
  const indexedDate = days[index]?.date
  useEffect(() => { if (indexedDate) setSelected(indexedDate) }, [indexedDate])
  useEffect(() => { setSelected(today); setMonth(today.slice(0, 7)) }, [today, timeZone])
  useEffect(() => {
    let active = true
    // The explicitly selected browser-only example must remain browser-only.
    // Remote empty days otherwise replace its filled cards after first paint.
    if (personalExample) { setRemote([]); setPending(false); setFailed(false); return }
    if (!studentId) { setPending(false); return }
    setPending(true); setFailed(false)
    Promise.all(requestedMonths.split('|').map(value => fetchScheduleDays(groupId ?? '', studentId, monthRange(value))))
      .then(values => { if (active) setRemote(values.flat()) })
      .catch(() => { if (active) setFailed(true) })
      .finally(() => { if (active) setPending(false) })
    return () => { active = false }
  }, [requestedMonths, studentId, groupId, days, timeZone, retry, personalExample])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => { if (event.target instanceof Node && !picker.current?.contains(event.target)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [open])
  useEffect(() => {
    if (visible && expanded) expandedDialog.current?.showModal()
  }, [visible, expanded])
  const byDate = new Map([...days, ...remote].map(day => [day.date, day]))
  const loading = !byDate.has(selected) && !failed && (pending || !loaded)
  const label = (key: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) => dateOf(key).toLocaleDateString(locale, { ...options, timeZone: 'UTC' })
  function choose(key: string) {
    setSelected(key); setMonth(key.slice(0, 7)); setOpen(false)
    const next = days.findIndex(day => day.date === key)
    if (next >= 0) setIndex(next)
    if (open) trigger.current?.focus()
  }
  const first = dateOf(`${month}-01`)
  const leading = (first.getUTCDay() + 6) % 7
  const last = new Date(first); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0)
  function changeMonth(amount: number) { const date = dateOf(`${month}-01`); date.setUTCMonth(date.getUTCMonth() + amount); setMonth(keyOf(date).slice(0, 7)) }

  const calendar = <div className={`ssr-month${expanded ? ' ssr-month-expanded' : ''}${!open ? ' ssr-month-closing' : ''}`} role={expanded ? undefined : 'dialog'} aria-label={t('Выбор даты')} id={dialogId}>
            <div className="ssr-month-heading"><strong>{label(`${month}-01`, { month: 'long', year: 'numeric' })}</strong><div>
              <button type="button" className="ssr-button ssr-icon ssr-expand" aria-label={t(expanded ? 'Свернуть' : 'Расширить')} title={t(expanded ? 'Свернуть' : 'Расширить')} onClick={() => setExpanded(value => !value)}><Icon name={expanded ? 'Minimize' : 'Maximize'} /></button>
              <button type="button" className="ssr-button ssr-icon" aria-label={t('Предыдущий месяц')} onClick={() => changeMonth(-1)}><Icon name="ChevronLeft" /></button>
              <button type="button" className="ssr-button ssr-icon" aria-label={t('Следующий месяц')} onClick={() => changeMonth(1)}><Icon name="ChevronRight" /></button>
            </div></div>
            <div className="ssr-month-grid">{Array.from({ length: 7 }, (_, i) => <span className="ssr-weekday" key={`week-${i}`}>{label(shift('2026-11-02', i), { weekday: 'short' })}</span>)}
              {Array.from({ length: leading }, (_, i) => <span key={`space-${i}`} />)}
              {Array.from({ length: last.getUTCDate() }, (_, i) => {
                const key = shift(`${month}-01`, i), hasLesson = byDate.get(key)?.lessons.some(lesson => lesson.status !== 'cancelled')
                return <button type="button" key={key} className={`ssr-month-day${key === today ? ' ssr-now' : ''}`} aria-label={`${label(key)}${hasLesson ? ` · ${t('Есть занятие')}` : ''}`} aria-pressed={key === selected} onClick={() => choose(key)}><span className="ssr-day-number">{i + 1}</span>{hasLesson && <i aria-hidden="true" />}</button>
              })}
            </div><div className="ssr-calendar-note" role="status">{pending ? t('Загрузка…') : failed ? <button type="button" className="ssr-retry" onClick={() => setRetry(value => value + 1)}>{t('Не удалось загрузить расписание')} · {t('Повторить загрузку')}</button> : <><i />{t('Есть занятие')}</>}</div>
          </div>

  return <section className="student-schedule-ribbon" aria-label={t('Расписание')}>
    <header className="ssr-toolbar">
      {loading ? <div className="ssr-controls ssr-skeleton-controls" aria-hidden="true">
        <Skeleton w={78} h={38} radius={12} /><Skeleton w={38} h={38} radius={12} /><Skeleton w={38} h={38} radius={12} /><Skeleton w={120} h={38} radius={12} />
      </div> : <div className="ssr-controls">
        <button type="button" className="ssr-button" onClick={() => choose(today)}>{t('Сегодня')}</button>
        <button type="button" className="ssr-button ssr-icon" aria-label={t('Предыдущий день')} onClick={() => choose(shift(selected, -1))}><Icon name="ChevronLeft" /></button>
        <button type="button" className="ssr-button ssr-icon" aria-label={t('Следующий день')} onClick={() => choose(shift(selected, 1))}><Icon name="ChevronRight" /></button>
        <div className="ssr-picker" ref={picker}>
          <button type="button" className="ssr-button ssr-trigger" ref={trigger} aria-expanded={open} aria-controls={dialogId} onClick={() => { if (!open) { setMonth(selectedMonth); setExpanded(false) } setOpen(value => !value) }}><Icon name="CalendarDays" />{t('Календарь')}</button>
          {visible && (expanded ? <dialog ref={expandedDialog} className="ssr-expanded-dialog" aria-label={t('Календарь')} onCancel={event => { event.preventDefault(); setOpen(false); trigger.current?.focus() }} onClick={event => { if (event.target === event.currentTarget) { setOpen(false); trigger.current?.focus() } }}>{calendar}</dialog> : calendar)}
        </div>
      </div>}
    </header>
    {failed ? (
      <div className="ssr-load-error" role="alert">{t('Не удалось загрузить расписание')} <button type="button" className="ssr-retry" onClick={() => setRetry(value => value + 1)}>{t('Повторить загрузку')}</button></div>
    ) : loading ? children([], 0, () => {}, false) : byDate.has(selected) ? children([-3, -2, -1, 0, 1, 2, 3].map(offset => {
      const date = shift(selected, offset)
      return { ...(byDate.get(date) ?? { date, label: label(date), lessons: [] }), isToday: date === today }
    }), 3, next => choose(shift(selected, next - 3)), loaded) : children([], 0, () => {}, !pending && loaded)}
  </section>
}
