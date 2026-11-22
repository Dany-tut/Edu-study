import { useEffect, useMemo, useState } from 'react'
import FadeText from '../FadeText'
import HScrollFade from '../HScrollFade'
import { Alert } from '../Alert'
import { CalendarCheck, Check, ClipboardPaste, RotateCcw } from '../icons/appIcons'
import type { Student } from '../../data/teacherMockData'
import { journalCell, type CourseJournalData, type JournalCell, type JournalColumn, type buildJournalIndex } from '../../lib/courseJournal'
import { useAttendance } from '../../lib/useGroups'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { attendanceSourceReady, isRecordingColumn } from '../../lib/journalTransfer'
import AttendanceEditor, { type AttendancePreset } from './journalStand/AttendanceEditor'
import { LessonDateDialog } from './journalStand/TransferTools'
import JournalImport from './JournalImport'
import type { ConfirmedAttendance } from '../../lib/confirmedAttendance'
import './mobileJournalTransfer.css'

const shortDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'дата?'
const dateOf = (c: JournalColumn) => c.events.find(e => e.status !== 'cancelled')?.date ?? c.date

/**
 * Перенос прошлого на телефоне: урок за уроком. Чипсы уроков сверху, «Все были»,
 * Был/Н по каждому ученику; оценка и ДЗ — по нажатию на ученика (лист). Отметки
 * сохраняются без списания с баланса. `onBar` отдаёт действия нижнему бару
 * экрана: на iPhone это нативное стекло, на Android — таблетки страницы.
 */
export default function MobileJournalTransfer({ data, index, students, columns, today, time, nativeIphone, onExit, onSaved, onCommitted, onBar }: {
  data: CourseJournalData; index: ReturnType<typeof buildJournalIndex>; students: Student[]; columns: JournalColumn[]
  today: string; time: string; nativeIphone: boolean; onExit: () => void; onSaved: () => void
  onCommitted?: (edits: ConfirmedAttendance[]) => void
  onBar?: (bar: { dirty: number; busy: boolean; save: () => void; paste: () => void }) => void
}) {
  const past = useMemo(() => columns.filter(c => c.lesson && !c.assignment && c.lesson.kind !== 'test' && (!dateOf(c) || dateOf(c)! <= today)), [columns, today])
  const [columnId, setColumnId] = useState(() => { const held = past.filter(c => c.events.length); return held[held.length - 1]?.id ?? past[0]?.id ?? '' })
  const column = past.find(c => c.id === columnId) ?? past[0]
  const cells = useMemo(() => column ? students.map(s => journalCell(data, index, s, column, today, time)).filter(c => c.applicable && !c.cancelled) : [],
    [data, index, students, column, today, time])
  const [draft, setDraft] = useState<Record<string, boolean | null>>({})
  useEffect(() => setDraft({}), [columnId])
  const [editor, setEditor] = useState<{ cells: JournalCell[]; preset?: AttendancePreset } | null>(null)
  const [dateOpen, setDateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [ready, setReady] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void attendanceSourceReady().then(setReady) }, [])
  const { saveLesson } = useAttendance(null)
  const action = useAsyncTask()
  const marked = cells.filter(c => c.event)
  const missing = cells.filter(c => !c.event).map(c => c.student)
  const value = (c: JournalCell) => c.student.id in draft ? draft[c.student.id] : c.present
  const changes = marked.filter(c => c.student.id in draft && draft[c.student.id] !== c.present)
  const blocked = ready === false && changes.some(c => draft[c.student.id] === true)
  function save() {
    if (!changes.length || blocked) return
    setError('')
    void action.run(async signal => {
      const byEvent = new Map<string, JournalCell[]>()
      for (const c of changes) byEvent.set(c.event!.id, [...(byEvent.get(c.event!.id) ?? []), c])
      for (const group of byEvent.values()) {
        const event = group[0].event!
        await saveLesson(event.group_id, event.date, group.map(c => ({ studentId: c.student.id, present: draft[c.student.id], grade: draft[c.student.id] ? c.grade : null })),
          event.lesson_title, event.id, signal, 'transfer')
        signal.throwIfAborted()
        onCommitted?.(group.map(c => ({ event, studentId: c.student.id, present: draft[c.student.id],
          grade: draft[c.student.id] ? c.grade : null, source: 'transfer' })))
      }
    }, () => { setDraft({}); onSaved() }, cause => {
      onSaved()
      setError('Не всё сохранилось. Проверьте отметки и повторите.' + (cause instanceof Error && cause.message ? '\n' + cause.message : ''))
    })
  }
  useEffect(() => { onBar?.({ dirty: changes.length, busy: action.busy, save, paste: () => setImportOpen(true) }) })
  if (!column) return <div className="cj-empty"><p>В этом курсе нет прошедших уроков для переноса.</p><button type="button" className="cj-button" onClick={onExit}>Выйти из переноса</button></div>
  const recording = isRecordingColumn(column)
  return <div className="mjt">
    <div className="mjt-banner" role="status"><RotateCcw size={16} aria-hidden /><p><b>Перенос прошлого.</b> Без списания с баланса и без уведомлений.</p></div>
    <HScrollFade fadeMode="mask" fadeWidth={24} padTop={0} padBottom={0} style={{ minWidth: 0, maxWidth: '100%' }}>
      <div className="mjt-chips" role="group" aria-label="Урок">{past.map(c => <button type="button" key={c.id} aria-pressed={c.id === column.id}
        data-missing={!c.events.length || undefined} onClick={() => setColumnId(c.id)}>
        {c.lesson?.lesson_number ? c.lesson.lesson_number + ' · ' : ''}{c.events.length ? c.title : 'дата?'}</button>)}</div>
    </HScrollFade>
    <section className="mjt-card">
      <header><strong><FadeText>{column.title}</FadeText></strong>
        <small>{shortDate(dateOf(column))} · {recording ? 'урок в записи' : 'живой урок'} · {cells.length} {cells.length === 1 ? 'ученик' : 'учеников'}</small></header>
      {missing.length > 0 && <button type="button" className="mjt-date" onClick={() => setDateOpen(true)}><CalendarCheck size={16} />Указать дату{marked.length ? ` · ${missing.length} без даты` : ''}</button>}
      {marked.length > 0 && <div className="mjt-bulk">
        <button type="button" className="cj-button" onClick={() => setDraft(Object.fromEntries(marked.map(c => [c.student.id, true])))}><Check size={14} />Все были</button>
        <button type="button" className="cj-button" onClick={() => setEditor({ cells: marked, preset: 'homework' })}>ДЗ сдали все</button>
        <button type="button" className="cj-button" onClick={() => setDraft(Object.fromEntries(marked.map(c => [c.student.id, null])))}>Очистить</button>
      </div>}
      {marked.map(c => {
        const v = value(c)
        return <div className="mjt-row" key={c.student.id}>
          <button type="button" className="mjt-who" data-hover="row" onClick={() => setEditor({ cells: [c] })}>
            <strong><FadeText>{c.student.name}</FadeText></strong>
            <small>{v === true ? 'Был' : v === false ? (recording ? 'Не был' : 'Пропуск') : 'Нет отметки'}{c.grade ? ' · оценка ' + c.grade : ''} · ДЗ {c.state === 'passed' || c.state === 'submitted' || c.state === 'low' ? 'сдано' + (c.score !== null ? ' · ' + c.score + ' %' : '') : 'не отмечено'}{c.transferred ? ' · перенесено' : ''}</small>
          </button>
          <div className="mjt-toggle" role="group" aria-label={'Присутствие · ' + c.student.name}>
            <button type="button" aria-pressed={v === true} data-v="p" onClick={() => setDraft(d => ({ ...d, [c.student.id]: v === true ? null : true }))}>Был</button>
            <button type="button" aria-pressed={v === false} data-v="a" onClick={() => setDraft(d => ({ ...d, [c.student.id]: v === false ? null : false }))}>Н</button>
          </div>
        </div>
      })}
    </section>
    {blocked && <Alert tone="warning" text="Сервер ещё не обновлён: присутствие при переносе списало бы занятие. Сохранение откроется после обновления базы." />}
    {error && <Alert tone="danger" text={error} />}
    {!nativeIphone && <div className="mjt-bar">
      <button type="button" className="mjt-pill" onClick={() => setImportOpen(true)}><ClipboardPaste size={18} />Вставить</button>
      <button type="button" className="mjt-pill mjt-primary" disabled={action.busy || blocked} onClick={changes.length ? save : onExit}>
        {action.busy ? 'Сохранение…' : changes.length ? `Сохранить · ${changes.length}` : 'Готово'}</button>
    </div>}
    {editor && <AttendanceEditor mobile transfer data={data} cells={editor.cells} preset={editor.preset} onCommitted={onCommitted} onSaved={onSaved} onClose={() => setEditor(null)} />}
    {dateOpen && <LessonDateDialog mobile data={data} column={column} students={missing} today={today} onSaved={onSaved} onClose={() => setDateOpen(false)} />}
    {importOpen && <JournalImport mobile data={data} columns={past} students={students}
      cellOf={(student, col) => journalCell(data, index, student, col, today, time)} onSaved={onSaved} onClose={() => setImportOpen(false)} />}
  </div>
}
