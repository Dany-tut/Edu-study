import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import BackCircle from '../../BackCircle'
import { GlassPill } from '../../mobileChrome'
import { Alert } from '../../Alert'
import TeacherSchedule from '../schedule/TeacherSchedule'
import { TaskliIcon } from '../../icons/TaskliIcon'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Loader2, Plus, X } from '../../icons/appIcons'
import { confirmDialog } from '../../ConfirmHost'
import { btn, softBtn } from '../../../lib/pillStyles'
import { FIELD } from '../../../lib/fieldStyle'
import { PAIR } from '../../../lib/mobileTokens'
import { tactile } from '../../../lib/feedback'
import { useT, useTc, useLang } from '../../../lib/i18n'
import { useSwipeBack } from '../../../lib/useSwipeBack'
import { GLASS, glassMenu } from '../../../lib/nativeGlass'
import { useHomework } from '../../../lib/useHomework'
import { getViewAs } from '../../../lib/owner'
import { supabase } from '../../../lib/supabase'
import { sanitizeHtml } from '../../../lib/sanitizeHtml'
import { addDays, todayMsk, weekStart, useTeacherWeek, type SchedItem } from '../../../lib/teacherSchedule'
import { loadTeacherLesson, saveTeacherLesson, publishTeacherLesson, lessonSessionError,
  type LessonDetail, type LessonAttendance, type LessonHomeworkDraft, type TeacherLessonSession } from '../../../lib/teacherLessonSession'
import type { MTab } from './MobileTeacherNav'

const stack: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12 }
const cardStyle: CSSProperties = { ...stack, background: 'var(--color-surface)', border: '1px solid var(--color-border-soft)', borderRadius: 24, padding: 16 }
const muted: CSSProperties = { fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.45, margin: 0 }
const heading: CSSProperties = { margin: 0, fontSize: 19, lineHeight: 1.3, fontWeight: 700, textAlign: 'center', overflowWrap: 'anywhere' }
type View = 'detail' | 'attendance' | 'finish' | 'homework' | 'materials' | 'receipt'

function Card({ children, tone }: { children: ReactNode; tone?: 'focus' | 'success' | 'warning' }) {
  const pair = tone === 'focus' ? PAIR.focus : tone === 'success' ? PAIR.success : tone === 'warning' ? PAIR.review : null
  return <section style={{ ...cardStyle, ...(pair ? { background: pair.bg } : {}) }}>{children}</section>
}
function Action({ children, onClick, secondary = false, disabled = false }: { children: ReactNode; onClick: () => void; secondary?: boolean; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={() => { tactile(); onClick() }} style={{ ...btn('L', secondary ? 'secondary' : 'primary'), ...(secondary ? softBtn : {}), width: '100%', minHeight: 48, height: 'auto', padding: '13px 16px', borderRadius: 999, whiteSpace: 'normal', opacity: disabled ? .5 : 1 }}>{children}</button>
}
function PersonLine({ children, icon }: { children: ReactNode; icon: 'schedule' | 'review' | 'students' | 'courses' | 'done' }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><TaskliIcon name={icon} size={26} tone="accent" style={{ flexShrink: 0 }} /><div style={{ flex: 1, minWidth: 0 }}>{children}</div></div>
}
function AttendancePicker({ name, value, onChange, disabled }: { name: string; value: boolean | null; onChange: (v: boolean | null) => void; disabled: boolean }) {
  const t = useT()
  const options = [t('Не отмечен'), t('Был'), t('Не был')]
  const index = value === null ? 0 : value ? 1 : 2
  const pair = value === null ? null : value ? PAIR.success : PAIR.error
  const style: CSSProperties = { ...FIELD, minHeight: 44, width: 128, borderRadius: 14, background: pair?.bg ?? 'var(--color-bg-3)', color: pair?.text ?? 'var(--color-muted)' }
  if (GLASS) return <button type="button" disabled={disabled} aria-label={`${t('Посещаемость')}: ${name}`} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={async e => {
    const selected = await glassMenu(e.currentTarget, options.map((label, i) => ({ label, checked: i === index })), name)
    if (selected >= 0) onChange(selected === 0 ? null : selected === 1)
  }}>{options[index]}<ChevronDown size={14} /></button>
  return <select disabled={disabled} aria-label={`${t('Посещаемость')}: ${name}`} value={index} onChange={e => onChange(e.target.value === '0' ? null : e.target.value === '1')} style={style}>{options.map((label, i) => <option key={i} value={i}>{label}</option>)}</select>
}

/** The lesson workflow is mobile-only. All durable changes are owner-checked
 * transactions; the native title/back controls use the existing UIKit bridge. */
export default function MobileTeacherDay({ onNavigate, onDetailChange }: {
  onNavigate: (tab: MTab) => void; onDetailChange: (open: boolean) => void
}) {
  const t = useT()
  const { tn, tc } = useTc()
  const { lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : 'ru-RU'
  const [day, setDay] = useState(todayMsk)
  const start = weekStart(day)
  const { items, reload, error: scheduleError } = useTeacherWeek(start)
  const { homework, reload: reloadHomework } = useHomework()
  const [sessions, setSessions] = useState<Record<string, TeacherLessonSession>>({})
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState<SchedItem | null>(null)
  const [view, setView] = useState<View>('detail')
  const [detail, setDetail] = useState<LessonDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [note, setNote] = useState('')
  const savedNote = useRef('')
  const selectedId = useRef<string | undefined>(undefined)
  selectedId.current = selected?.id
  const [attendance, setAttendance] = useState<LessonAttendance>({})
  const [draft, setDraft] = useState<LessonHomeworkDraft>({ title: '', tasks: [] })
  const savedDraft = useRef('')
  const [dueDate, setDueDate] = useState('')
  const [publishOpen, setPublishOpen] = useState(false)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const alive = useRef(true)
  const readOnly = !!getViewAs()
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { onDetailChange(!!selected); return () => onDetailChange(false) }, [!!selected, onDetailChange])

  useEffect(() => {
    let current = true
    if (!items?.length) { setSessions({}); return }
    supabase.from('teacher_lesson_sessions').select('schedule_id, started_at, completed_at, homework_id')
      .in('schedule_id', items.map(i => i.id)).then(({ data, error: e }) => {
        if (!current) return
        if (e) { setError(lessonSessionError(e)); return }
        setSessions(Object.fromEntries((data ?? []).map(s => [s.schedule_id, s as TeacherLessonSession])))
      })
    return () => { current = false }
  }, [items, tick])

  useEffect(() => {
    let current = true
    if (!selected) return
    setLoading(true); setDetail(null); setError(''); setInfo('')
    loadTeacherLesson(selected).then(data => {
      if (!current) return
      setDetail(data); setNote(data.note); savedNote.current = data.note
      setAttendance(data.attendance)
      const initial = { ...data.draft, dueDate: data.draft.dueDate || addDays(todayMsk(), 2) }
      setDraft(initial); setDueDate(initial.dueDate); savedDraft.current = JSON.stringify(initial)
    }).catch(e => { if (current) setError(lessonSessionError(e)) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [selected?.id])

  // Background note writes don't disable navigation. Foreground actions join
  // the same per-event queue, so they always persist the latest text last.
  useEffect(() => {
    if (!selected || !detail || readOnly || note === savedNote.current) return
    const id = selected.id
    const timer = window.setTimeout(() => {
      void saveTeacherLesson(id, { note }).then(session => {
        if (!alive.current || selectedId.current !== id) return
        savedNote.current = note
        setDetail(d => d ? { ...d, session, note } : d)
      }).catch(e => { if (alive.current && selectedId.current === id) setError(lessonSessionError(e)) })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [note, selected?.id, !!detail, readOnly])

  const open = (item: SchedItem, screen: View = 'detail') => {
    setScheduleOpen(false); setView(screen); setSelected(item)
  }
  const run = async (task: () => Promise<void>) => {
    if (busyRef.current || readOnly) return false
    busyRef.current = true; setBusy(true); setError('')
    try { await task(); return true }
    catch (e) { if (alive.current) setError(lessonSessionError(e)); return false }
    finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  const mutate = async (patch: Parameters<typeof saveTeacherLesson>[1], next: View = view) => {
    if (!selected) return false
    return run(async () => {
      const session = await saveTeacherLesson(selected.id, patch)
      if (!alive.current) return
      setDetail(d => d ? { ...d, session, note: session.private_note, attendance: { ...d.attendance, ...session.attendance } } : d)
      if (patch.note !== undefined) savedNote.current = patch.note
      if (patch.draft) savedDraft.current = JSON.stringify(patch.draft)
      if (session.journalSkipped) setInfo(t('Отметки этого занятия сохранены отдельно. Запись другого урока в дневном журнале не изменена.'))
      if (patch.action === 'start' || patch.action === 'complete') {
        setSelected(s => s ? { ...s, status: patch.action === 'start' ? 'live' : 'completed' } : s)
      }
      setView(next); setTick(n => n + 1); reload()
    })
  }
  const back = async () => {
    if (busyRef.current) return
    if (view === 'attendance' && detail && JSON.stringify(attendance) !== JSON.stringify(detail.attendance)) {
      if (!await confirmDialog({ title: t('Выйти без сохранения отметок?'), message: t('Чтобы сохранить изменения, останьтесь и нажмите «Сохранить отметки».'), confirmLabel: t('Не сохранять'), cancelLabel: t('Остаться') })) return
      setAttendance(detail.attendance)
    }
    if (view === 'homework' && savedDraft.current !== JSON.stringify({ ...draft, dueDate })) {
      if (!await mutate({ draft: { ...draft, dueDate } }, 'detail')) return
    }
    if (savedNote.current !== note && !await mutate({ note })) return
    if (view === 'detail' || view === 'receipt') setSelected(null)
    else setView('detail')
  }
  useSwipeBack(selected ? () => { void back() } : null)

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])
  const list = (items ?? []).filter(i => i.date === day)
  const status = (item: SchedItem) => sessions[item.id]?.completed_at ? 'completed' : sessions[item.id]?.started_at ? 'live' : item.status ?? (item.cancelled ? 'cancelled' : 'upcoming')
  const next = list.find(i => status(i) === 'live') ?? list.find(i => status(i) === 'upcoming')
  const reviewCount = homework.filter(h => h.status !== 'closed').reduce((n, h) => n + Math.max(0, h.submittedCount - h.reviewedCount), 0)
  const dateLabel = (value: string) => { const label = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', weekday: 'long' }).format(new Date(`${value}T12:00:00`)); return label.charAt(0).toUpperCase() + label.slice(1) }
  const selectedStatus = selected ? detail?.session?.completed_at ? 'completed' : detail?.session?.started_at ? 'live' : selected.status ?? 'upcoming' : 'upcoming'
  const presentCount = Object.values(detail?.attendance ?? {}).filter(v => v === true).length
  const absentCount = Object.values(detail?.attendance ?? {}).filter(v => v === false).length
  const rosterCount = detail?.roster.length ?? 0
  const unmarked = rosterCount - presentCount - absentCount
  const attSummary = `${t('Были')}: ${presentCount} · ${t('Не были')}: ${absentCount}`
  const isPublished = !!detail?.published || !!detail?.session?.homework_id
  const pageTitle = !selected ? t('Мой день') : view === 'attendance' ? t('Посещаемость') : view === 'finish' ? t('Завершить занятие?') : view === 'homework' ? t('Домашняя работа') : view === 'materials' ? t('Материалы занятия') : view === 'receipt' ? t('ДЗ выдано') : tn(selected.who) || t('Занятие')
  const controls = (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, padding: '0 48px' }}>
      {selected && <BackCircle onClick={() => { void back() }} label="Мой день" style={{ position: 'absolute', left: 0, width: 44, height: 44 }} />}
      <GlassPill><h1 style={{ margin: 0, font: 'inherit', textAlign: 'center', overflowWrap: 'anywhere' }}>{pageTitle}</h1></GlassPill>
    </div>
  )
  const footer = selected && detail && !loading ? <div style={stack}>
    {view === 'detail' && selectedStatus === 'upcoming' && !selected.cancelled && <Action disabled={busy || readOnly} onClick={() => { void mutate({ action: 'start', note }, 'detail') }}>{t('Начать занятие')}</Action>}
    {view === 'detail' && selectedStatus === 'live' && <Action disabled={busy || readOnly} onClick={() => setView('finish')}>{t('Завершить занятие')}</Action>}
    {view === 'detail' && selectedStatus === 'completed' && <Action disabled={busy || readOnly} onClick={() => setView(isPublished ? 'receipt' : 'homework')}>{t(isPublished ? 'Сводка выдачи' : 'Подготовить ДЗ')}</Action>}
    {view === 'attendance' && <Action disabled={busy || readOnly} onClick={() => { void mutate({ attendance }, 'detail') }}>{busy ? <Loader2 size={18} className="animate-spin" /> : null}{t('Сохранить отметки')}</Action>}
    {view === 'finish' && <><Action disabled={busy || readOnly} onClick={() => { void mutate({ action: 'complete', note }, 'detail') }}>{t(unmarked ? 'Завершить без отметок' : 'Завершить занятие')}</Action><Action secondary disabled={busy} onClick={() => setView('detail')}>{t('Продолжить занятие')}</Action></>}
    {view === 'homework' && <Action disabled={busy || readOnly || !draft.tasks.length || !rosterCount || !dueDate || dueDate < todayMsk()} onClick={() => setPublishOpen(true)}>{t('Проверить перед выдачей')}</Action>}
    {view === 'receipt' && <Action onClick={() => setSelected(null)}>{t('К моему дню')}</Action>}
  </div> : undefined

  return <>
    <MobileScreen topZone={controls} glassHeader={{ leading: pageTitle, onBack: selected ? () => { void back() } : undefined, backLabel: t('Мой день') }} topPad={64}
      scrollKey={selected ? `${selected.id}-${view}` : `my-day-${day}`} bottomDock={footer} bottomDockRaise={selected ? 16 : 0}>
      <div style={stack}>
        {error && <Alert tone="danger" text={t(error)} />}
        {scheduleError && !selected && <Alert tone="danger" text={t('Не удалось загрузить расписание')} action={{ label: t('Повторить'), onClick: reload }} />}
        {info && <Alert tone="info" text={info} />}
        {readOnly && <Alert tone="info" text={t('Просмотр кабинета: изменения недоступны')} />}
        {!selected ? <>
          <p style={{ ...muted, textAlign: 'center' }}>{dateLabel(day)}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" aria-label={t('Предыдущая неделя')} style={btn('M', 'quiet')} onClick={() => setDay(addDays(day, -7))}><ChevronLeft size={20} /></button>
            <button type="button" style={btn('M', 'quiet')} onClick={() => setDay(todayMsk())}>{t('Сегодня')}</button>
            <button type="button" aria-label={t('Следующая неделя')} style={btn('M', 'quiet')} onClick={() => setDay(addDays(day, 7))}><ChevronRight size={20} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 5 }}>
            {week.map(d => <button type="button" key={d} aria-pressed={d === day} aria-label={dateLabel(d)} onClick={() => { tactile(); setDay(d) }} style={{ border: 'none', borderRadius: 20, minHeight: 64, padding: '8px 0', background: d === day ? PAIR.focus.bg : 'var(--color-surface)', color: d === day ? PAIR.focus.text : 'var(--color-text)' }}>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-muted)' }}>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${d}T12:00:00`))}</span><strong style={{ fontSize: 21 }}>{Number(d.slice(-2))}</strong>
            </button>)}
          </div>
          {items === null && <p style={{ ...muted, textAlign: 'center' }} role="status">{t('Загружаем занятия…')}</p>}
          {items !== null && !scheduleError && !list.length && <Card><TaskliIcon name="schedule" size={36} style={{ alignSelf: 'center' }} /><h2 style={heading}>{t('На этот день занятий нет')}</h2><p style={{ ...muted, textAlign: 'center' }}>{t('Выберите другую дату или добавьте занятие в расписании.')}</p></Card>}
          {[...(next ? [next] : []), ...list.filter(i => i.id !== next?.id)].map(item => {
            const state = status(item)
            const session = sessions[item.id]
            const missingHw = !!session?.completed_at && !session.homework_id
            return <Card key={item.id} tone={state === 'live' || item.id === next?.id ? 'focus' : state === 'completed' ? 'success' : undefined}>
              <p style={{ ...muted, textAlign: 'center', fontWeight: 600 }}>{t(state === 'live' ? 'Идёт сейчас' : state === 'completed' ? 'Завершено' : state === 'cancelled' ? 'Отменено' : item.id === next?.id ? 'Ближайшее занятие' : 'Занятие')}</p>
              <h2 style={{ ...heading, fontSize: item.id === next?.id ? 25 : 20 }}>{item.time}{item.endTime ? ` — ${item.endTime}` : ''}</h2>
              <PersonLine icon="schedule"><strong style={{ fontSize: 16 }}>{tn(item.who)}</strong><p style={muted}>{tc(item.title) || t('Тема не указана')}</p></PersonLine>
              {session?.homework_id && <p style={{ ...muted, color: PAIR.success.text }}>{t('Домашняя работа выдана')}</p>}
              {missingHw && <p style={{ ...muted, color: PAIR.review.text }}>{t('Домашняя работа пока не выдана')}</p>}
              {!item.cancelled && <Action secondary={item.id !== next?.id} onClick={() => open(item)}>{t(state === 'live' ? 'Вернуться к занятию' : state === 'completed' ? 'Открыть итог занятия' : 'Открыть занятие')}</Action>}
            </Card>
          })}
          <button type="button" onClick={() => onNavigate('review')} style={{ ...cardStyle, width: '100%', textAlign: 'left' }}><PersonLine icon="review"><strong>{t('Работы на проверке')}: {reviewCount}</strong><p style={muted}>{t('Открыть очередь проверки')}</p></PersonLine></button>
          <Action secondary onClick={() => setScheduleOpen(true)}><CalendarDays size={18} />{t('Расписание и переносы')}</Action>
        </> : <>
          <p style={{ ...muted, textAlign: 'center' }}>{selected.date && dateLabel(selected.date)} · {selected.time}{selected.endTime ? `–${selected.endTime}` : ''}</p>
          {loading && <p role="status" style={{ ...muted, textAlign: 'center' }}>{t('Загружаем занятие…')}</p>}
          {!loading && !detail && <Action secondary onClick={() => { const item = selected; setSelected(null); window.setTimeout(() => setSelected(item), 0) }}>{t('Повторить загрузку')}</Action>}
          {detail && !loading && view === 'detail' && <>
            <Card tone={selectedStatus === 'completed' ? 'success' : 'focus'}>
              <p style={{ ...muted, textAlign: 'center' }}>{t(selectedStatus === 'live' ? 'Занятие идёт' : selectedStatus === 'completed' ? 'Занятие завершено' : 'Тема занятия')}</p>
              <h2 style={heading}>{tc(selected.title) || t('Тема не указана')}</h2>
              <Action secondary onClick={() => setView('materials')}>{t('Открыть материалы')}</Action>
            </Card>
            <Card><PersonLine icon="students"><strong>{t('Посещаемость')}: {presentCount + absentCount} / {rosterCount}</strong><p style={muted}>{attSummary}{unmarked ? ` · ${t('Без отметки')}: ${unmarked}` : ''}</p></PersonLine><Action secondary disabled={!rosterCount} onClick={() => { setAttendance(detail.attendance); setView('attendance') }}>{t('Отметить посещаемость')}</Action></Card>
            {selectedStatus === 'completed' ? <Card tone={!isPublished ? 'warning' : undefined}><PersonLine icon="courses"><strong>{t(isPublished ? 'Домашняя работа выдана' : 'Домашняя работа пока не выдана')}</strong><p style={muted}>{isPublished ? detail.published?.title : `${t('Заданий в черновике')}: ${draft.tasks.length}`}</p></PersonLine><Action secondary onClick={() => setView(isPublished ? 'receipt' : 'homework')}>{t(isPublished ? 'Сводка выдачи' : 'Подготовить ДЗ')}</Action></Card> : <Card><PersonLine icon="courses"><strong>{t('Черновик ДЗ')}</strong><p style={muted}>{t('Заданий')}: {draft.tasks.length} · {t('Пока виден только вам')}</p></PersonLine></Card>}
            <Card><h2 style={heading}>{t('Заметка для себя')}</h2><textarea aria-label={t('Заметка для себя')} maxLength={10000} disabled={busy || readOnly} value={note} onChange={e => setNote(e.target.value)} placeholder={t('Что повторить на следующем уроке…')} style={{ ...FIELD, minHeight: 88, width: '100%', resize: 'vertical' }} /><p style={muted}>{t('Не видна ученикам')} · {t(note === savedNote.current ? 'Сохранено' : 'Не сохранено')}</p></Card>
          </>}
          {detail && view === 'attendance' && <>
            <Card tone="focus"><h2 style={heading}>{t('Отмечено')}: {Object.values(attendance).filter(v => v !== null).length} / {rosterCount}</h2><p style={{ ...muted, textAlign: 'center' }}>{t('Без отметки — не значит пропуск')}</p></Card>
            <Action secondary disabled={busy || readOnly} onClick={() => setAttendance(Object.fromEntries(detail.roster.map(p => [p.id, true])))}>{t('Все были')}</Action>
            <Card>{detail.roster.map(person => <div key={person.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 48 }}><span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, overflowWrap: 'anywhere' }}>{tn(person.name)}</span><div style={{ width: 128, flexShrink: 0 }}><AttendancePicker name={tn(person.name)} value={attendance[person.id] ?? null} disabled={busy || readOnly} onChange={value => setAttendance(a => ({ ...a, [person.id]: value }))} /></div></div>)}</Card>
          </>}
          {detail && view === 'finish' && <>
            <Card tone="focus"><h2 style={heading}>{unmarked ? t('Есть ученики без отметок') : attSummary}</h2><p style={{ ...muted, textAlign: 'center' }}>{unmarked ? `${t('Без отметки')}: ${unmarked}. ${t('Они не будут считаться отсутствовавшими.')}` : t('Все ученики отмечены')}</p><Action secondary onClick={() => setView('attendance')}>{t('Исправить посещаемость')}</Action></Card>
            <Card><h2 style={heading}>{t('Заметка для себя')}</h2><p style={muted}>{note || t('Заметки нет')}</p></Card>
            <Card tone="warning"><h2 style={heading}>{t('Домашка отправляется отдельно')}</h2><p style={{ ...muted, textAlign: 'center' }}>{t('После завершения можно подготовить ДЗ или выдать его позже.')}</p></Card>
          </>}
          {detail && view === 'homework' && <>
            {isPublished ? <Card tone="success"><h2 style={heading}>{t('Домашняя работа уже выдана')}</h2><Action secondary onClick={() => setView('receipt')}>{t('Сводка выдачи')}</Action></Card> : <>
              <Card><h2 style={heading}>{t('Черновик ДЗ')}</h2><input aria-label={t('Название домашней работы')} value={draft.title} maxLength={240} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} style={FIELD} /><p style={muted}>{t('Пока виден только вам')}</p></Card>
              <Card><PersonLine icon="students"><strong>{selected.groupId ? t('Вся группа') : t('Индивидуальное направление')} · {rosterCount}</strong><p style={muted}>{t('Включая отсутствовавших. Посещаемость не меняет получателей.')}</p></PersonLine><label style={stack}><span style={{ fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{t('Сдать до')}</span><input type="date" aria-label={t('Сдать до')} min={todayMsk()} value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...FIELD, minHeight: 44 }} /></label></Card>
              <Card><h2 style={heading}>{t('Задания')}: {draft.tasks.length}</h2>{draft.tasks.map((task, i) => <div key={task.id} style={{ borderBottom: '1px solid var(--color-border-soft)', padding: '8px 0' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><strong style={{ fontSize: 13 }}>{t('Задание')} {i + 1}</strong><button type="button" aria-label={t('Убрать задание')} disabled={busy} style={btn('M', 'quiet')} onClick={() => setDraft(d => ({ ...d, tasks: d.tasks.filter((_, index) => index !== i) }))}><X size={18} /></button></div><div className="rich-answer" style={{ fontSize: 14, overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.question ?? '') }} />{task.image && /^(https?:|data:image\/)/i.test(task.image) && <img src={task.image} alt={t('Задание')} style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 12, marginTop: 8 }} />}</div>)}{!draft.tasks.length && <p style={{ ...muted, textAlign: 'center' }}>{t('Добавьте задание с развёрнутым ответом или используйте задания, подготовленные в уроке.')}</p>}<Action secondary disabled={busy || draft.tasks.length >= 80} onClick={() => { setTaskText(''); setNewTaskOpen(true) }}><Plus size={18} />{t('Добавить задание')}</Action></Card>
              <Action secondary disabled={busy || readOnly} onClick={() => { void mutate({ draft: { ...draft, dueDate } }, 'homework') }}>{t('Сохранить черновик')}</Action>
            </>}
          </>}
          {detail && view === 'materials' && <>
            <Card><h2 style={heading}>{tc(selected.title) || t('Материалы занятия')}</h2>{detail.materials.description ? <div className="rich-answer" style={{ overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.materials.description) }} /> : <p style={{ ...muted, textAlign: 'center' }}>{t('Конспект к этому занятию пока не добавлен.')}</p>}
              {detail.materials.youtube_url && /^https?:\/\//i.test(detail.materials.youtube_url) && <a href={detail.materials.youtube_url} target="_blank" rel="noopener noreferrer" style={{ ...btn('L', 'secondary'), borderRadius: 999 }}>{t('Открыть видео')}</a>}
            </Card>
            <Card><h2 style={heading}>{t('Задания урока')}: {detail.draft.tasks.length}</h2>{detail.draft.tasks.map((task, i) => <div key={task.id} className="rich-answer" style={{ fontSize: 14, overflowWrap: 'anywhere' }}><strong>{i + 1}. </strong><span dangerouslySetInnerHTML={{ __html: sanitizeHtml(task.question ?? '') }} />{task.image && /^(https?:|data:image\/)/i.test(task.image) && <img src={task.image} alt={t('Задание')} style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 12, marginTop: 8 }} />}</div>)}</Card>
          </>}
          {detail && view === 'receipt' && <Card tone="success"><TaskliIcon name="done" size={36} tone="success" style={{ alignSelf: 'center' }} /><h2 style={heading}>{t(detail.published?.status === 'closed' ? 'Домашняя работа закрыта' : 'Домашняя работа доступна ученикам')}</h2><p style={{ ...muted, textAlign: 'center' }}>{detail.published?.title || draft.title}</p><p style={{ ...muted, textAlign: 'center' }}>{t('Получателей')}: {detail.published?.total_students ?? rosterCount}{detail.published?.due_date ? ` · ${t('Сдать до')} ${dateLabel(detail.published.due_date)}` : ''}</p></Card>}
        </>}
      </div>
    </MobileScreen>
    <MobileSheet open={scheduleOpen} title={t('Расписание')} onClose={() => setScheduleOpen(false)}><TeacherSchedule mobile onOpen={item => open(item)} onAttendance={item => open(item, 'attendance')} /></MobileSheet>
    <MobileSheet open={newTaskOpen} title={t('Новое задание')} onClose={() => setNewTaskOpen(false)} footer={<Action disabled={!taskText.trim()} onClick={() => { setDraft(d => ({ ...d, tasks: [...d.tasks, { id: crypto.randomUUID(), type: 'extended', isHard: true, question: taskText.trim() }] })); setNewTaskOpen(false) }}>{t('Добавить')}</Action>}>
      <p style={muted}>{t('Ученик отправит развёрнутый ответ. Вы проверите его в разделе «Проверка».')}</p><textarea autoFocus aria-label={t('Текст задания')} maxLength={20000} value={taskText} onChange={e => setTaskText(e.target.value)} style={{ ...FIELD, width: '100%', minHeight: 160, marginTop: 12 }} />
    </MobileSheet>
    <MobileSheet open={publishOpen} title={t('Выдать домашнюю работу?')} onClose={() => { if (!busy) setPublishOpen(false) }} footer={<Action disabled={busy || readOnly} onClick={() => { if (!selected) return; void run(async () => {
      await saveTeacherLesson(selected.id, { draft: { ...draft, dueDate } })
      await publishTeacherLesson(selected.id, dueDate)
      const fresh = await loadTeacherLesson(selected)
      if (!alive.current) return
      setDetail(fresh); savedDraft.current = JSON.stringify({ ...draft, dueDate }); setPublishOpen(false); setView('receipt'); setTick(n => n + 1); reload(); void reloadHomework()
    }) }}>{busy ? <Loader2 size={18} className="animate-spin" /> : null}{t('Выдать ученикам')}: {rosterCount}</Action>}>
      <div style={stack}>{error && <Alert tone="danger" text={t(error)} />}<h2 style={heading}>{draft.title || selected?.title}</h2><p style={{ ...muted, textAlign: 'center' }}>{t('Заданий')}: {draft.tasks.length} · {t('Получателей')}: {rosterCount}</p><p style={{ ...muted, textAlign: 'center' }}>{t('Сдать до')}: {dueDate ? dateLabel(dueDate) : '—'}</p><p style={muted}>{t('После выдачи задание появится у всей группы, включая отсутствовавших.')}</p></div>
    </MobileSheet>
  </>
}
