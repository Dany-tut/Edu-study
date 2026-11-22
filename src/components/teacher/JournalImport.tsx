import OpticalText from '../OpticalText'
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type ReactNode } from 'react'
import Modal from '../Modal'
import MobileSheet from '../MobileSheet'
import NativeSelectField from '../NativeSelectField'
import TeacherSelect from './TeacherSelect'
import ScrollFade from '../ScrollFade'
import { Alert } from '../Alert'
import { ChevronRight, Upload } from '../icons/appIcons'
import { useScrollEdges } from './journalStand/useScrollEdges'
import type { Student } from '../../data/teacherMockData'
import type { CourseJournalData, JournalCell, JournalColumn } from '../../lib/courseJournal'
import { useAttendance } from '../../lib/useGroups'
import { useAsyncTask } from '../../lib/useAsyncTask'
import {
  attendanceSourceReady, columnSubject, matchColumn, matchStudent, parseSheet, readAttendanceValue,
  readHomeworkValue, saveTransferHomework, transferHomeworkBlocked, type HomeworkMark, type SheetColumnKind, type SheetMark,
} from '../../lib/journalTransfer'
import './journalImport.css'

type Step = 'paste' | 'map' | 'check'
type ColumnMap = { id: string; kind: SheetColumnKind }
type Plan = {
  attendance: { cell: JournalCell; mark: SheetMark }[]
  homework: { cell: JournalCell; mark: HomeworkMark }[]
  conflicts: string[]; noDate: number; invalid: number; unmatched: number
}

/** Таблица сопоставления листается в обе стороны: фейды у каждого края с содержимым (SCROLL-01). */
function TableFrame({ children }: { children: ReactNode }) {
  const { viewport, scroller } = useScrollEdges()
  return <div className="ji-frame" ref={viewport}>
    <div className="ji-scroll" ref={scroller}>{children}</div>
    {(['left', 'right', 'top', 'bottom'] as const).map(side => <i key={side} aria-hidden className={'ji-fade ji-fade-' + side} />)}
  </div>
}
const dateOf = (c: JournalColumn) => c.date ?? c.events.find(e => e.status !== 'cancelled')?.date ?? null
const shortDate = (d: string | null) => d ? new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'без даты'
const columnLabel = (c: JournalColumn) => `${c.lesson?.lesson_number ? c.lesson.lesson_number + '. ' : ''}${c.title} · ${shortDate(dateOf(c))}`

/**
 * Вставка ведомости из Excel / Google Таблиц (буфер) или CSV: первая строка —
 * уроки, первый столбец — ученики. Сопоставление → проверка → перенос. Уже
 * стоящие отметки не перезаписываются: расхождения показываются списком.
 */
export default function JournalImport({ mobile = false, data, columns, students, cellOf, onClose, onSaved }: {
  mobile?: boolean; data: CourseJournalData; columns: JournalColumn[]; students: Student[]
  cellOf: (student: Student, column: JournalColumn) => JournalCell | null
  onClose: () => void; onSaved: () => void
}) {
  const [step, setStep] = useState<Step>('paste')
  const [text, setText] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [studentMap, setStudentMap] = useState<string[]>([])
  const [ambiguous, setAmbiguous] = useState<boolean[]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap[]>([])
  const [mobileTab, setMobileTab] = useState<'students' | 'lessons'>('students')
  const [ready, setReady] = useState<boolean | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const { saveLesson } = useAttendance(null)
  const action = useAsyncTask()
  useEffect(() => { void attendanceSourceReady().then(setReady) }, [])

  function load(raw: string) {
    setText(raw)
    const sheet = parseSheet(raw)
    if (sheet.length < 2 || sheet[0].length < 2) { setRows([]); return }
    setRows(sheet)
    const body = sheet.slice(1)
    const matches = body.map(r => matchStudent(r[0] ?? '', students))
    setStudentMap(matches.map(m => m.id ?? ''))
    setAmbiguous(matches.map(m => !m.id && m.candidates.length > 1))
    setColumnMap(sheet[0].slice(1).map(h => { const m = matchColumn(h, columns, dateOf); return { id: m.id ?? '', kind: m.kind } }))
  }
  function onPaste(e: ClipboardEvent) {
    const raw = e.clipboardData.getData('text/plain')
    if (!raw) return
    e.preventDefault()
    load(raw)
  }
  async function pickFile(f: File | undefined) {
    if (!f) return
    if (f.size > 2_000_000) { setError('Файл больше 2 МБ. Вставьте нужный диапазон из таблицы.'); return }
    load(await f.text())
  }

  const plan = useMemo<Plan>(() => {
    const result: Plan = { attendance: [], homework: [], conflicts: [], noDate: 0, invalid: 0, unmatched: 0 }
    rows.slice(1).forEach((row, r) => {
      const student = students.find(s => s.id === studentMap[r])
      if (!student) { if (row[0]?.trim()) result.unmatched++; return }
      columnMap.forEach((map, c) => {
        const raw = row[c + 1] ?? ''
        const column = columns.find(col => col.id === map.id)
        if (!column || !raw.trim()) return
        const cell = cellOf(student, column)
        if (map.kind === 'homework') {
          const mark = readHomeworkValue(raw)
          if (mark === undefined) { result.invalid++; return }
          if (!mark || !cell || cell.cancelled) return
          const blocked = transferHomeworkBlocked(cell)
          if (blocked || (cell.work && cell.work.status === 'completed')) {
            if (mark.done) result.conflicts.push(`${student.name} · ДЗ ${column.title}: уже есть результат`)
            return
          }
          if (mark.done) result.homework.push({ cell, mark })
          return
        }
        const mark = readAttendanceValue(raw)
        if (mark === undefined) { result.invalid++; return }
        if (!mark) return
        if (!cell || !cell.event) { result.noDate++; return }
        if (cell.cancelled) return
        if (cell.present !== null && (cell.present !== mark.present || (mark.grade !== null && cell.grade !== mark.grade))) {
          result.conflicts.push(`${student.name} · ${column.title}: в журнале «${cell.present ? 'был' : 'пропуск'}${cell.grade ? ' · ' + cell.grade : ''}», в таблице «${raw.trim()}»`)
          return
        }
        if (cell.present === mark.present && (mark.grade === null || cell.grade === mark.grade)) return
        result.attendance.push({ cell, mark })
      })
    })
    return result
  }, [rows, studentMap, columnMap, students, columns, cellOf])

  const attendanceAllowed = ready === true
  const total = (attendanceAllowed ? plan.attendance.length : 0) + plan.homework.length
  function apply() {
    setError('')
    void action.run(async signal => {
      const byEvent = new Map<string, typeof plan.attendance>()
      if (attendanceAllowed) for (const item of plan.attendance) {
        const id = item.cell.event!.id
        byEvent.set(id, [...(byEvent.get(id) ?? []), item])
      }
      for (const items of byEvent.values()) {
        signal.throwIfAborted()
        const event = items[0].cell.event!
        await saveLesson(event.group_id, event.date, items.map(({ cell, mark }) => ({
          studentId: cell.student.id, present: mark.present, grade: mark.present ? mark.grade ?? cell.grade : null,
        })), event.lesson_title, event.id, signal, 'transfer')
      }
      for (const { cell, mark } of plan.homework) {
        signal.throwIfAborted()
        await saveTransferHomework(cell, columnSubject(data, cell), mark)
      }
      return total
    }, count => { setDone(`Перенесено отметок: ${count}.`); onSaved() }, cause => {
      onSaved()
      setError('Перенесено не всё. Уже сохранённые отметки остались в журнале — откройте вставку снова, повтор не создаст дублей.'
        + (cause instanceof Error && cause.message ? '\n' + cause.message : ''))
    })
  }

  const studentOptions = [{ value: '', label: 'Пропустить строку' }, ...students.map(s => ({ value: s.id, label: s.name }))]
  const columnOptions = [{ value: '', label: 'Не переносить' }, ...columns.map(c => ({ value: c.id, label: columnLabel(c) }))]
  const select = (value: string, options: { value: string; label: string }[], onChange: (v: string) => void, label: string, tone?: 'warn' | 'skip') =>
    mobile
      ? <NativeSelectField className="ji-native" data-tone={tone} aria-label={label} displayValue={options.find(o => o.value === value)?.label ?? ''} value={value} onChange={e => onChange(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </NativeSelectField>
      : <span className="ji-select" data-tone={tone}><TeacherSelect small search value={value} options={options} onChange={onChange} placeholder={options[0].label} /></span>
  const header = rows[0] ?? []
  const body = rows.slice(1)

  const steps = <div className="ji-steps" role="list">{(['paste', 'map', 'check'] as const).map((s, i) =>
    <span role="listitem" key={s} aria-current={step === s || undefined}>{i + 1} · {s === 'paste' ? 'Вставка' : s === 'map' ? 'Сопоставление' : 'Проверка'}</span>)}</div>
  const rules = <p className="ji-rules">Читаем значения: <b>1, +, был</b> — был · <b>н, 0, −</b> — пропуск · <b>2–5</b> — был с оценкой · в столбце «ДЗ …» — сдано с оценкой или % · пусто — не трогаем.</p>

  const pasteStep = <div className="ji-paste">
    <p className="cj-note">Скопируйте диапазон в Excel или Google Таблицах: первая строка — уроки (дата, номер или название), первый столбец — ученики. Столбец, который начинается с «ДЗ», читается как домашняя работа.</p>
    <textarea className="ji-area" aria-label="Таблица из Excel или Google Таблиц" placeholder={mobile ? 'Нажмите и вставьте скопированную таблицу' : 'Нажмите здесь и вставьте ⌘V / Ctrl+V'}
      value={text} onPaste={onPaste} onChange={e => load(e.target.value)} rows={mobile ? 6 : 8} />
    <div className="ji-paste-actions">
      <button type="button" className="cj-button" onClick={() => file.current?.click()}><Upload size={15} /><OpticalText as="iskra-button-label">Файл CSV</OpticalText></button>
      <input ref={file} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" hidden onChange={e => void pickFile(e.target.files?.[0])} />
      {rows.length > 0 && <span className="cj-note">Строк: {body.length} · столбцов: {header.length - 1}</span>}
    </div>
    {rules}
  </div>

  const studentRows = body.map((row, r) => <div className="ji-map-row" key={r}>
    <span className="ji-raw" title={row[0]}>{row[0] || '—'}</span><ChevronRight size={14} className="ji-arrow" aria-hidden />
    {select(studentMap[r] ?? '', studentOptions, v => setStudentMap(m => m.map((x, i) => i === r ? v : x)), `Ученик для строки «${row[0]}»`,
      !studentMap[r] ? (ambiguous[r] ? 'warn' : 'skip') : undefined)}
    {!studentMap[r] && ambiguous[r] && <small className="ji-hint">Несколько совпадений — выберите</small>}
  </div>)
  const lessonRows = header.slice(1).map((h, c) => <div className="ji-map-row" key={c}>
    <span className="ji-raw" title={h}>{h || '—'}</span><ChevronRight size={14} className="ji-arrow" aria-hidden />
    {select(columnMap[c]?.id ?? '', columnOptions, v => setColumnMap(m => m.map((x, i) => i === c ? { ...x, id: v } : x)), `Урок для столбца «${h}»`, columnMap[c]?.id ? undefined : 'skip')}
    {columnMap[c]?.kind === 'homework' && <small className="ji-hint">ДЗ</small>}
  </div>)

  const mapStep = mobile ? <div className="ji-map">
    <div className="ji-tabs" role="group" aria-label="Что сопоставить">
      <button type="button" aria-pressed={mobileTab === 'students'} onClick={() => setMobileTab('students')}><OpticalText as="iskra-button-label">Ученики · {body.length}</OpticalText></button>
      <button type="button" aria-pressed={mobileTab === 'lessons'} onClick={() => setMobileTab('lessons')}><OpticalText as="iskra-button-label">Уроки · {header.length - 1}</OpticalText></button>
    </div>
    {mobileTab === 'students' ? studentRows : lessonRows}
  </div> : <div className="ji-map">
    {rules}
    <TableFrame>
      <table className="ji-table">
        <thead><tr><th>Строка таблицы</th><th>Ученик в Искре</th>{header.slice(1).map((h, c) => <th key={c}>
          <div className="ji-raw">{h}</div>
          {select(columnMap[c]?.id ?? '', columnOptions, v => setColumnMap(m => m.map((x, i) => i === c ? { ...x, id: v } : x)), `Урок для столбца «${h}»`, columnMap[c]?.id ? undefined : 'skip')}
          {columnMap[c]?.kind === 'homework' && <small className="ji-hint">ДЗ</small>}
        </th>)}</tr></thead>
        <tbody>{body.map((row, r) => <tr key={r} data-skip={!studentMap[r] || undefined}>
          <td className="ji-raw">{row[0]}</td>
          <td>{select(studentMap[r] ?? '', studentOptions, v => setStudentMap(m => m.map((x, i) => i === r ? v : x)), `Ученик для строки «${row[0]}»`,
            !studentMap[r] ? (ambiguous[r] ? 'warn' : 'skip') : undefined)}</td>
          {header.slice(1).map((_, c) => <td key={c} className="ji-value">{row[c + 1] || '·'}</td>)}
        </tr>)}</tbody>
      </table>
    </TableFrame>
  </div>

  const summary = <div className="ji-sum">
    <div><b>{plan.attendance.length}</b>отметок присутствия</div>
    <div><b>{plan.homework.length}</b>ДЗ «сдано»</div>
    {plan.unmatched > 0 && <div data-tone="warn"><b>{plan.unmatched}</b>строк без ученика</div>}
    {plan.noDate > 0 && <div data-tone="warn"><b>{plan.noDate}</b>отметок у уроков без даты</div>}
    {plan.invalid > 0 && <div data-tone="warn"><b>{plan.invalid}</b>непонятных значений</div>}
    <div><b>0</b>списаний с баланса</div>
  </div>
  const checkStep = <div className="ji-check">
    {summary}
    {ready === false && plan.attendance.length > 0 && <Alert tone="warning" text="Сервер ещё не обновлён: присутствие при переносе списало бы занятия с баланса, поэтому сейчас перенесутся только ДЗ." />}
    {plan.noDate > 0 && <p className="cj-note">Урокам без даты сначала укажите дату в журнале («Указать дату» у столбца), затем повторите вставку.</p>}
    {plan.conflicts.length > 0 && <section><h3 className="ji-h">Не перезаписываем · {plan.conflicts.length}</h3>
      <ScrollFade maxHeight="min(24dvh, 200px)"><ul className="ji-conflicts">{plan.conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul></ScrollFade></section>}
    {done && <p role="status" className="ji-done">{done}</p>}
    {error && <Alert tone="danger" text={error} />}
  </div>

  const busy = action.busy
  const footer = <div className="ji-footer">
    {step !== 'paste' && !done && <button type="button" className="cj-button" disabled={busy} onClick={() => setStep(step === 'check' ? 'map' : 'paste')}><OpticalText as="iskra-button-label">Назад</OpticalText></button>}
    {step === 'paste' && <button type="button" className="cj-button cj-primary" disabled={!rows.length} onClick={() => setStep('map')}><OpticalText as="iskra-button-label">Дальше · сопоставление</OpticalText></button>}
    {step === 'map' && <button type="button" className="cj-button cj-primary" disabled={!studentMap.some(Boolean) || !columnMap.some(c => c.id)} onClick={() => setStep('check')}><OpticalText as="iskra-button-label">Дальше · проверка</OpticalText></button>}
    {step === 'check' && (done
      ? <button type="button" className="cj-button cj-primary" onClick={onClose}><OpticalText as="iskra-button-label">Готово</OpticalText></button>
      : <button type="button" className="cj-button cj-primary" disabled={busy || total === 0} onClick={apply}><OpticalText as="iskra-button-label">{busy ? 'Переносим…' : `Перенести · ${total}`}</OpticalText></button>)}
  </div>
  const content = <div className="course-journal ji">{!mobile && steps}{step === 'paste' ? pasteStep : step === 'map' ? mapStep : checkStep}</div>
  return mobile
    ? <MobileSheet open onClose={onClose} title="Вставка из таблицы" onPaste={step === 'paste' ? onPaste : undefined} footer={footer}>{content}</MobileSheet>
    : <Modal title="Вставка из таблицы" subtitle="Перенос прошлых уроков · без списания с баланса" width={step === 'map' ? 1040 : 720} onClose={onClose}
        onPaste={step === 'paste' ? onPaste : undefined} footer={footer}>{content}</Modal>
}
