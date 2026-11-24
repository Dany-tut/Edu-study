import OpticalText from '../../OpticalText'
import { useEffect, useRef, useState } from 'react'
import { useT } from '../../../lib/i18n'
import { useAsyncTask } from '../../../lib/useAsyncTask'
import Modal from '../../Modal'
import MobileSheet from '../../MobileSheet'
import { Alert } from '../../Alert'
import { useAttendance } from '../../../lib/useGroups'
import type { CourseJournalData, JournalCell } from '../../../lib/courseJournal'
import { COMPLETE_RATIO } from '../../../lib/videoProgress'
import {
  attendanceSourceReady, columnSubject, GRADE_PERCENT, isRecordingColumn, isTransferWork,
  saveTransferHomework, transferHomeworkBlocked, type HomeworkMark,
} from '../../../lib/journalTransfer'
import type { ConfirmedAttendance } from '../../../lib/confirmedAttendance'
import './attendanceEditor.css'

type Hw = 'keep' | 'done' | 'not'
type Mark = { present: boolean | null; grade: number | null; hw: Hw; hwGrade: number | null; hwPercent: string }
export type AttendancePreset = 'present' | 'homework' | 'clear'
const drafts = new Map<string, { base: Mark; value: Mark }>()
const sameMark = (a: Mark, b: Mark) => JSON.stringify(a) === JSON.stringify(b)
const attendanceChanged = (a: Mark, b: Mark) => a.present !== b.present || a.grade !== b.grade
const homeworkChanged = (a: Mark, b: Mark) => a.hw !== b.hw || a.hwGrade !== b.hwGrade || a.hwPercent !== b.hwPercent

function initialMark(cell: JournalCell, transfer: boolean): Mark {
  const own = transfer && isTransferWork(cell.work) && cell.work?.status === 'completed'
  const grade = own ? (cell.work!.attachments as { transfer?: { grade?: number } }).transfer?.grade ?? null : null
  return { present: cell.present, grade: cell.grade, hw: own ? 'done' : 'keep',
    hwGrade: grade, hwPercent: own && grade === null && cell.work!.score !== null ? String(cell.work!.score) : '' }
}
function applyPreset(mark: Mark, preset: AttendancePreset | undefined, blocked: boolean): Mark {
  if (preset === 'present') return { ...mark, present: true }
  if (preset === 'homework') return blocked ? mark : { ...mark, hw: 'done' }
  if (preset === 'clear') return { ...mark, present: null, grade: null, hw: blocked ? 'keep' : 'not', hwGrade: null, hwPercent: '' }
  return mark
}

/**
 * Окно отметок. Обычный режим — присутствие и оценка за урок. Урок в записи
 * можно отметить «Был»: учитель провёл его вживую. В режиме переноса прошлого
 * сюда же добавлено ДЗ «сдано» без работы ученика. Отметки переноса и записи
 * не списывают занятие с баланса (lesson_attendance.source).
 */
export default function AttendanceEditor({ cells, onClose, onSaved, onCommitted, transfer = false, preset, data, mobile = false }: {
  cells: JournalCell[]; onClose: () => void; onSaved: () => void
  onCommitted?: (edits: ConfirmedAttendance[]) => void
  transfer?: boolean; preset?: AttendancePreset; data?: CourseJournalData
  /** Телефон и айпад в портрете: лист снизу вместо окна. */
  mobile?: boolean
}) {
  const t = useT()
  const { saveLesson } = useAttendance(null)
  const key = (i: number) => `iskra:attendance-draft:${transfer ? 'transfer:' : ''}${cells[i].event!.id}:${cells[i].student.id}`
  const original = cells.map(c => initialMark(c, transfer))
  const blockedBy = cells.map(c => transfer ? transferHomeworkBlocked(c) : null)
  const [draft, setDraft] = useState(() => original.map((mark, i) => {
    try {
      const saved = drafts.get(key(i)) ?? JSON.parse(sessionStorage.getItem(key(i)) || 'null')
      if (saved && sameMark(saved.base, mark) && 'hw' in saved.value) return saved.value as Mark
    } catch { /* fall through to the stored mark */ }
    return applyPreset(mark, preset, !!blockedBy[i])
  }))
  const baseline = useRef(original)
  const action = useAsyncTask()
  const busy = action.busy
  const [error, setError] = useState('')
  const [ready, setReady] = useState<boolean | null>(null)
  useEffect(() => { void attendanceSourceReady().then(setReady) }, [])
  const recordings = cells.map(c => isRecordingColumn(c.column))
  const anyRecording = recordings.some(Boolean)
  // До миграции сервер списал бы занятие за перенос и за «был» на записи.
  const waitsForServer = (i: number) => ready === false && draft[i].present === true
    && baseline.current[i].present !== true && (transfer || recordings[i])
  const blocked = draft.some((_, i) => waitsForServer(i))
  const dirty = draft.some((m, i) => !sameMark(m, baseline.current[i]))
  const invalidPercent = draft.some(m => m.hw === 'done' && m.hwPercent.trim() !== ''
    && !(/^\d{1,3}$/.test(m.hwPercent.trim()) && Number(m.hwPercent) <= 100))
  function remember(i: number, mark: Mark) {
    const value = { base: baseline.current[i], value: mark }
    drafts.set(key(i), value)
    try { sessionStorage.setItem(key(i), JSON.stringify(value)) } catch { /* Keep the in-memory draft if storage is unavailable. */ }
  }
  function update(i: number, mark: Mark) { remember(i, mark); setDraft(v => v.map((m, n) => n === i ? mark : m)) }
  function updateAll(change: (m: Mark, i: number) => Mark) {
    setDraft(v => v.map((m, i) => { const next = change(m, i); remember(i, next); return next }))
  }
  function close() { action.cancel(); onSaved(); onClose() }
  function homeworkMark(m: Mark): HomeworkMark {
    if (m.hw !== 'done') return { done: false }
    if (m.hwGrade) return { done: true, percent: GRADE_PERCENT[m.hwGrade], grade: m.hwGrade }
    return { done: true, percent: m.hwPercent.trim() === '' ? null : Number(m.hwPercent) }
  }
  function save() {
    if (!dirty || busy || blocked || invalidPercent) return
    setError('')
    // Что-то уже записано — журнал перечитываем; иначе не грузим занятую базу повторно.
    let committed = false
    void action.run(async signal => {
      const events = new Map<string, number[]>()
      cells.forEach((c, i) => {
        if (c.event && attendanceChanged(draft[i], baseline.current[i]))
          events.set(c.event.id, [...(events.get(c.event.id) ?? []), i])
      })
      for (const indices of events.values()) {
        signal.throwIfAborted()
        const event = cells[indices[0]].event!
        await saveLesson(event.group_id, event.date, indices.map(i => ({ studentId: cells[i].student.id, present: draft[i].present, grade: draft[i].grade })),
          event.lesson_title, event.id, signal, transfer ? 'transfer' : undefined)
        signal.throwIfAborted()
        committed = true
        onCommitted?.(indices.map(i => ({ event, studentId: cells[i].student.id,
          present: draft[i].present, grade: draft[i].grade,
          source: transfer ? 'transfer' : recordings[i] ? 'recording' : 'live' })))
        baseline.current = baseline.current.map((m, i) => indices.includes(i) ? { ...m, present: draft[i].present, grade: draft[i].grade } : m)
      }
      for (let i = 0; i < cells.length; i++) {
        if (!transfer || !data || !homeworkChanged(draft[i], baseline.current[i]) || draft[i].hw === 'keep' || blockedBy[i]) continue
        signal.throwIfAborted()
        await saveTransferHomework(cells[i], columnSubject(data, cells[i]), homeworkMark(draft[i]))
        committed = true
        baseline.current = baseline.current.map((m, n) => n === i ? { ...m, hw: draft[i].hw, hwGrade: draft[i].hwGrade, hwPercent: draft[i].hwPercent } : m)
      }
      cells.forEach((_, i) => { drafts.delete(key(i)); try { sessionStorage.removeItem(key(i)) } catch { /* storage unavailable */ } })
    }, () => { onSaved(); onClose() }, cause => {
      if (committed) onSaved()
      const reason = cause instanceof Error && /Проверьте|сдача|предмет/.test(cause.message) ? '\n' + cause.message : ''
      setError(t('Не удалось подтвердить сохранение всех отметок.\nЧерновик сохранён. Проверьте журнал и повторите оставшиеся изменения.') + reason)
    })
  }
  const watchPercent = Math.round(COMPLETE_RATIO * 100)
  const title = cells.length === 1 ? cells[0].student.name : transfer ? 'Перенос прошлых уроков' : 'Оценки за урок'
  const subtitle = [...new Set(cells.map(c => c.column.title))].slice(0, 3).join(' · ')
  const footer = <><button type="button" className="cj-button ja-action" onClick={close}><OpticalText as="iskra-button-label">Отмена</OpticalText></button><button type="button" className="cj-button cj-primary ja-action" disabled={busy || !dirty || blocked || invalidPercent} onClick={() => void save()}><OpticalText as="iskra-button-label">{busy ? 'Сохранение…' : 'Сохранить'}</OpticalText></button></>
  const body = <div className={'course-journal ja-editor' + (mobile ? ' cj-mobile' : '')}>
      {mobile && subtitle && <p className="cj-note ja-subtitle">{subtitle}</p>}
      {transfer && <p className="ja-banner" data-tone="transfer">Перенос: отметки не меняют баланс и не уведомляют учеников. ДЗ можно отметить сданным без работы ученика.</p>}
      {anyRecording && <p className="ja-banner" data-tone="recording">Урок в записи. «Был» — ученик был на трансляции: урок засчитан, ДЗ открыто сразу. Отметка необязательна: без неё урок засчитает просмотр записи от {watchPercent} %.</p>}
      {!transfer && !anyRecording && <p className="cj-note">Оценка за урок — от 1 до 5. Сначала отметьте присутствие. «Без оценки» удаляет оценку.</p>}
      {blocked && <Alert tone="warning" text="Сервер ещё не обновлён: такая отметка списала бы занятие с баланса. Сохранение откроется после обновления базы." />}
      {cells.length > 1 && <div className="ja-options ja-bulk">
        <button type="button" className="cj-button" disabled={busy} onClick={() => updateAll(m => ({ ...m, present: true }))}><OpticalText as="iskra-button-label">{transfer ? 'Все были' : 'Все присутствовали'}</OpticalText></button>
        {transfer && <button type="button" className="cj-button" disabled={busy} onClick={() => updateAll((m, i) => blockedBy[i] ? m : { ...m, hw: 'done' })}><OpticalText as="iskra-button-label">Все сдали ДЗ</OpticalText></button>}
      </div>}
      {cells.map((cell, i) => {
        const recording = recordings[i]
        const m = draft[i]
        return <fieldset key={`${cell.event!.id}:${cell.student.id}`} disabled={busy} className="ja-row">
          {cells.length > 1 && <legend>{new Set(cells.map(c => c.student.id)).size === 1 ? cell.column.title : cell.student.name}</legend>}
          <small>{cell.event!.date} · {cell.event!.time_start?.slice(0, 5)}{recording ? ' · урок в записи' : ''}</small>
          <div className="ja-options" role="group" aria-label={`Посещаемость · ${cell.student.name}`}>
            {([{ value: true, label: 'Был' }, { value: false, label: recording ? 'Не был' : 'Пропуск' }, { value: null, label: 'Нет отметки' }] as const).map(o =>
              <button type="button" key={o.label} className="cj-button" aria-pressed={m.present === o.value}
                onClick={() => update(i, { ...m, present: o.value, grade: o.value ? m.grade : null })}><OpticalText as="iskra-button-label">{o.label}</OpticalText></button>)}
          </div>
          <div className="ja-options" role="group" aria-label={`Оценка · ${cell.student.name}`}>
            {[1, 2, 3, 4, 5, null].map(g => <button type="button" key={g ?? 'none'} disabled={m.present !== true} className="cj-button" aria-pressed={m.grade === g} onClick={() => update(i, { ...m, grade: g })}><OpticalText as="iskra-button-label">{g ?? 'Без оценки'}</OpticalText></button>)}
          </div>
          {transfer && (blockedBy[i] ? <p className="cj-note">{blockedBy[i]}</p> : <>
            <div className="ja-options" role="group" aria-label={`Домашнее задание · ${cell.student.name}`}>
              {([['done', 'ДЗ сдано'], ['not', 'Не сдано'], ['keep', '—']] as const).map(([value, label]) =>
                <button type="button" key={value} className="cj-button" aria-pressed={m.hw === value}
                  onClick={() => update(i, { ...m, hw: value })}><OpticalText as="iskra-button-label">{label}</OpticalText></button>)}
            </div>
            {m.hw === 'done' && <div className="ja-options ja-hw-score" role="group" aria-label={`Оценка ДЗ · ${cell.student.name}`}>
              {[2, 3, 4, 5].map(g => <button type="button" key={g} className="cj-button" aria-pressed={m.hwGrade === g}
                onClick={() => update(i, { ...m, hwGrade: m.hwGrade === g ? null : g, hwPercent: '' })}><OpticalText as="iskra-button-label">{g}</OpticalText></button>)}
              <span className="ja-or">или</span>
              <label className="ja-percent"><input inputMode="numeric" aria-label="Результат ДЗ, %" placeholder="—" value={m.hwPercent}
                onChange={e => update(i, { ...m, hwPercent: e.target.value.replace(/[^\d]/g, '').slice(0, 3), hwGrade: null })} /><span>%</span></label>
            </div>}
          </>)}
        </fieldset>
      })}
      {invalidPercent && <Alert tone="danger" text="Результат ДЗ — число от 0 до 100." />}
      {error && <Alert tone="danger" text={error} />}
    </div>
  return mobile
    ? <MobileSheet open onClose={close} title={title} footer={<div className="ja-sheet-footer">{footer}</div>}>{body}</MobileSheet>
    : <Modal title={title} subtitle={subtitle} width={640} onClose={close} footer={footer}>{body}</Modal>
}
