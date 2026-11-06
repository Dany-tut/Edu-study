import { useState } from 'react'
import { ChevronRight } from '../../icons/appIcons'
import type { RosterEntry } from './overviewStats'
import type { WorkSlot } from './studentWorks'
import { HomeworkStatus } from './HomeworkHub'
import { workDueLabel } from './homeworkStand'

export default function HomeworkList({ entries, slots, search, attention, onStudent, onAssignment }: {
  entries: RosterEntry[]; slots: WorkSlot[]; search: string; attention: boolean
  onStudent: (studentId: string, ref: string) => void; onAssignment: (ref: string) => void
}) {
  const [open, setOpen] = useState(() => new Set([slots.find(s => entries.some(e => e.works.some(w => w.slot.ref === s.ref && w.status === 'На проверке')))?.ref ?? slots[0]?.ref]))
  const needle = search.trim().toLocaleLowerCase('ru')
  const groups = slots.flatMap(slot => {
    const rows = entries.flatMap(entry => entry.works.filter(w => w.slot.ref === slot.ref && (w.slot.required || w.submitted)
      && (!needle || (entry.student.name + ' ' + slot.title).toLocaleLowerCase('ru').includes(needle))
      && (!attention || ['На проверке', 'На доработке', 'Просрочено', 'Ниже порога'].includes(w.status)))
      .map(work => ({ key: entry.student.id + ':' + slot.ref, student: entry.student, work })))
    return rows.length ? [{slot, rows}] : []
  })
  return <div className="jh-homework-list" aria-label="Домашние задания группы">
    {groups.map(({slot, rows}) => <section key={slot.ref} className="jh-homework-group">
      <header><button data-hover="layer" type="button" className="jh-expand" aria-label={(open.has(slot.ref) ? 'Свернуть · ' : 'Развернуть · ') + slot.title} aria-expanded={open.has(slot.ref)} onClick={() => setOpen(prev => {const next = new Set(prev);next.has(slot.ref) ? next.delete(slot.ref) : next.add(slot.ref);return next})}><ChevronRight size={16}/></button>
        <button type="button" className="jh-assignment-title" onClick={() => onAssignment(slot.ref)}><strong>{slot.title}</strong><small>{slot.ref.includes('~') ? 'Доп. ДЗ' : 'ДЗ'}{slot.due ? ' · до ' + workDueLabel(slot.due) : ' · без срока'} · Ученики: {rows.length}</small></button>
        <span className="jh-submitted">Сдали {rows.filter(e => e.work.submitted).length}/{rows.length}</span>
        {rows.some(e => e.work.status === 'На проверке') && <button type="button" className="cj-button jh-review-button" onClick={() => onAssignment(slot.ref)}>Проверить · {rows.filter(e => e.work.status === 'На проверке').length}</button>}
      </header>
      {open.has(slot.ref) && <div><div className="jh-homework-row jh-homework-labels"><span>Ученик</span><span>Источник</span><span>Результат</span><span/></div>
        {rows.map(e => <div key={e.key} className="jh-homework-row"><button type="button" className="jh-work-student" onClick={() => onStudent(e.student.id, slot.ref)}>{e.student.name}</button><span className="jh-work-source">{e.work.source}</span><HomeworkStatus entry={e}/><button type="button" className={'cj-button ' + (e.work.status === 'На проверке' ? 'jh-review-button' : '')} onClick={() => onStudent(e.student.id, slot.ref)}>{e.work.status === 'На проверке' ? 'Проверить' : 'Открыть'}</button></div>)}
      </div>}
    </section>)}
    {!groups.length && <p className="jh-empty">Домашние задания по этим фильтрам не найдены.</p>}
  </div>
}
