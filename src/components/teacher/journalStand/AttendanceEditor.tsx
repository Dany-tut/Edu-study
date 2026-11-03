import { useRef, useState } from 'react'
import { useT } from '../../../lib/i18n'
import { useAsyncTask } from '../../../lib/useAsyncTask'
import Modal from '../../Modal'
import { Alert } from '../../Alert'
import { useAttendance } from '../../../lib/useGroups'
import type { JournalCell } from '../../../lib/courseJournal'
import './attendanceEditor.css'

type Mark = { present: boolean | null; grade: number | null }
const drafts = new Map<string, { base: Mark; value: Mark }>()
export default function AttendanceEditor({ cells, onClose, onSaved }: {
  cells: JournalCell[]; onClose: () => void; onSaved: () => void
}) {
  const t = useT()
  const { saveLesson } = useAttendance(null)
  const key = (i: number) => `iskra:attendance-draft:${cells[i].event!.id}:${cells[i].student.id}`
  const original = cells.map(c => ({ present: c.present, grade: c.grade }))
  const [draft, setDraft] = useState(() => original.map((mark, i) => {
    try { const saved = drafts.get(key(i)) ?? JSON.parse(sessionStorage.getItem(key(i)) || 'null'); return saved && JSON.stringify(saved.base) === JSON.stringify(mark) ? saved.value as Mark : mark } catch { return mark }
  }))
  const baseline = useRef(original)
  const action = useAsyncTask()
  const busy = action.busy
  const [error, setError] = useState('')
  const dirty = draft.some((m, i) => m.present !== baseline.current[i].present || m.grade !== baseline.current[i].grade)
  function remember(i: number, mark: Mark) {
    const value = { base: baseline.current[i], value: mark }
    drafts.set(key(i), value)
    try { sessionStorage.setItem(key(i), JSON.stringify(value)) } catch { /* Keep the in-memory draft if storage is unavailable. */ }
  }
  function update(i: number, mark: Mark) { remember(i, mark); setDraft(v => v.map((m, n) => n === i ? mark : m)) }
  function close() { action.cancel(); onSaved(); onClose() }
  function save() {
    if (!dirty || busy) return
    setError('')
    void action.run(async signal => {
      const events = new Map<string, number[]>()
      cells.forEach((c, i) => {
        if (c.event && (draft[i].present !== baseline.current[i].present || draft[i].grade !== baseline.current[i].grade))
          events.set(c.event.id, [...(events.get(c.event.id) ?? []), i])
      })
      for (const indices of events.values()) {
        signal.throwIfAborted()
        const event = cells[indices[0]].event!
        await saveLesson(event.group_id, event.date, indices.map(i => ({ studentId: cells[i].student.id, ...draft[i] })), event.lesson_title, event.id, signal)
        signal.throwIfAborted()
        baseline.current = baseline.current.map((m, i) => indices.includes(i) ? draft[i] : m)
        for (const i of indices) { drafts.delete(key(i)); try { sessionStorage.removeItem(key(i)) } catch { /* storage unavailable */ } }
      }
    }, () => { onSaved(); onClose() }, () => {
      onSaved()
      setError(t('Не удалось подтвердить сохранение всех отметок.\nЧерновик сохранён. Проверьте журнал и повторите оставшиеся изменения.'))
    })
  }
  return <Modal title={cells.length === 1 ? cells[0].student.name : 'Оценки за урок'}
    subtitle={cells[0]?.column.title} width={640} onClose={close}
    footer={<><button type="button" className="cj-button ja-action" onClick={close}>Отмена</button><button type="button" className="cj-button cj-primary ja-action" disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Сохранение…' : 'Сохранить'}</button></>}>
    <div className="course-journal ja-editor">
      <p className="cj-note">Оценка за урок — от 1 до 5. Сначала отметьте присутствие. «Без оценки» удаляет оценку.</p>
      {cells.length > 1 && <button type="button" className="cj-button" disabled={busy} onClick={() => { draft.forEach((m, i) => remember(i, { ...m, present: true })); setDraft(v => v.map(m => ({ ...m, present: true }))) }}>Все присутствовали</button>}
      {cells.map((cell, i) => <fieldset key={`${cell.event!.id}:${cell.student.id}`} disabled={busy} className="ja-row">
        <legend>{cell.student.name}</legend>
        <small>{cell.event!.date} · {cell.event!.time_start?.slice(0, 5)}</small>
        <div className="ja-options" role="group" aria-label={`Посещаемость · ${cell.student.name}`}>
          {([{ value: true, label: 'Был' }, { value: false, label: 'Пропуск' }, { value: null, label: 'Нет отметки' }] as const).map(o => <button type="button" key={o.label} className="cj-button" aria-pressed={draft[i].present === o.value} onClick={() => update(i, { present: o.value, grade: o.value ? draft[i].grade : null })}>{o.label}</button>)}
        </div>
        <div className="ja-options" role="group" aria-label={`Оценка · ${cell.student.name}`}>
          {[1, 2, 3, 4, 5, null].map(g => <button type="button" key={g ?? 'none'} disabled={draft[i].present !== true} className="cj-button" aria-pressed={draft[i].grade === g} onClick={() => update(i, { ...draft[i], grade: g })}>{g ?? 'Без оценки'}</button>)}
        </div>
      </fieldset>)}
      {error && <Alert tone="danger" text={error} />}
    </div>
  </Modal>
}
