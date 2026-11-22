import OpticalText from '../../OpticalText'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../../Modal'
import MobileSheet from '../../MobileSheet'
import { Alert } from '../../Alert'
import { MoreHorizontal } from '../../icons/appIcons'
import { useAsyncTask } from '../../../lib/useAsyncTask'
import { createPastEvents } from '../../../lib/journalTransfer'
import type { Student } from '../../../data/teacherMockData'
import type { CourseJournalData, JournalColumn } from '../../../lib/courseJournal'
import './transferTools.css'

export type MenuItem = { label: string; onSelect: () => void; disabled?: boolean }

/**
 * Меню «⋯» у столбца и строки в режиме переноса. Кнопка видна всегда —
 * айпад в ландшафте видит ПК-разметку, наведения там нет. Список рисуется
 * в портале: таблица журнала обрезает всё, что выходит за её прокрутку.
 */
export function TransferMenu({ label, caption, items }: { label: string; caption?: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const box = trigger.current.getBoundingClientRect()
    const width = 248, height = list.current?.offsetHeight ?? 180
    const left = Math.max(8, Math.min(box.right - width, window.innerWidth - width - 8))
    const below = box.bottom + 6
    setPos({ left, top: below + height > window.innerHeight - 8 ? Math.max(8, box.top - height - 6) : below })
  }, [open])
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.target instanceof Node && (list.current?.contains(e.target) || trigger.current?.contains(e.target))) return
      setOpen(false)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('keydown', key, true)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      document.removeEventListener('keydown', key, true)
    }
  }, [open])
  return <>
    <button ref={trigger} type="button" className="jt-more" data-hover="layer" aria-label={label} title={label}
      aria-haspopup="menu" aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(v => !v) }}>
      <MoreHorizontal size={16} />
    </button>
    {open && createPortal(<div ref={list} role="menu" className="jt-menu" aria-label={label}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      {caption && <div className="jt-menu-caption">{caption}</div>}
      {items.map(item => <button key={item.label} type="button" role="menuitem" data-hover="row" disabled={item.disabled}
        onClick={() => { setOpen(false); item.onSelect() }}><OpticalText as="iskra-button-label">{item.label}</OpticalText></button>)}
    </div>, document.body)}
  </>
}

/** Плашка режима переноса: деньги и уведомления не трогаем. */
export function TransferBanner({ actions }: { actions: ReactNode }) {
  return <div className="jt-banner" role="status">
    <p><b>Перенос прошлых уроков.</b> Отметки без списания с баланса и без уведомлений ученикам. ДЗ можно отметить сданным без работы ученика. Уроку без даты сначала укажите дату.</p>
    <div className="jt-banner-actions">{actions}</div>
  </div>
}

function maskDate(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('.')
}
function isoDate(text: string): string | null {
  const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (!m) return null
  const iso = `${m[3]}-${m[2]}-${m[1]}`
  const d = new Date(iso + 'T12:00:00Z')
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null
}

/** «Указать дату»: прошлая строка расписания для урока, которого не было в Искре. */
export function LessonDateDialog({ data, column, students, today, onClose, onSaved, mobile = false }: {
  data: CourseJournalData; column: JournalColumn; students: Student[]; today: string
  onClose: () => void; onSaved: () => void; mobile?: boolean
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const action = useAsyncTask()
  const iso = isoDate(text)
  const future = !!iso && iso > today
  const groups = new Set(students.map(s => s.groupId || s.id)).size
  function save() {
    if (!iso || future) return
    setError('')
    void action.run(() => createPastEvents(data, column, students, iso), () => { onSaved(); onClose() },
      cause => setError('Не удалось сохранить дату. ' + (cause instanceof Error ? cause.message : '')))
  }
  const footer = <><button type="button" className="cj-button ja-action" onClick={onClose}><OpticalText as="iskra-button-label">Отмена</OpticalText></button>
      <button type="button" className="cj-button cj-primary ja-action" disabled={!iso || future || action.busy} onClick={save}><OpticalText as="iskra-button-label">{action.busy ? 'Сохранение…' : 'Сохранить дату'}</OpticalText></button></>
  const body = <div className="course-journal jt-date">
      {mobile && <p className="cj-note ja-subtitle">{column.title}</p>}
      <p className="cj-note">Урок прошёл до Искры, поэтому его нет в расписании. Укажите, когда он был, — после этого можно отметить присутствие и ДЗ. Ученикам ничего не придёт.</p>
      <label className="jt-date-field"><span>Дата</span>
        <input inputMode="numeric" autoFocus placeholder="ДД.ММ.ГГГГ" value={text} aria-invalid={(text.length === 10 && !iso) || future || undefined}
          onChange={e => setText(maskDate(e.target.value))} onKeyDown={e => { if (e.key === 'Enter') save() }} />
      </label>
      {future && <Alert tone="warning" text="Это дата в будущем. Перенос — только для прошедших уроков." />}
      {text.length === 10 && !iso && <Alert tone="danger" text="Такой даты нет. Формат: ДД.ММ.ГГГГ." />}
      <p className="cj-note">Создастся {groups === 1 ? 'одна строка' : `${groups} строки`} расписания: по группе или по ученику без группы.</p>
      {error && <Alert tone="danger" text={error} />}
    </div>
  return mobile
    ? <MobileSheet open onClose={onClose} title="Дата урока" footer={<div className="ja-sheet-footer">{footer}</div>}>{body}</MobileSheet>
    : <Modal title="Дата урока" subtitle={column.title} width={460} onClose={onClose} footer={footer}>{body}</Modal>
}
