import { useRef } from 'react'
import { useT } from '../../../lib/i18n'
import { useScrollFades } from '../../../lib/useScrollFades'
import { isScheduleEnded, isScheduleLive } from '../../../lib/scheduleLive'
import type { SchedItem } from '../../../lib/teacherSchedule'
import { MONTHS_GEN, dayNum, monthIdx, weekdayIdx } from './calendarTime'

const FULL_WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

/** Список занятий дня: на ПК — колонка справа, на iPad — поповер у капсулы. */
export function CalendarTodayList({ items, onOpen }: { items: SchedItem[]; onOpen: (item: SchedItem) => void }) {
  const t = useT()
  const list = useRef<HTMLDivElement>(null)
  useScrollFades(list, true, ':scope')
  if (!items.length) return <div className="tcal-today-empty">{t('Сегодня занятий нет')}</div>
  return (
    <div ref={list} className="tcal-today-list">
      {items.map(item => {
        const live = isScheduleLive(item)
        const past = !live && isScheduleEnded(item)
        return (
          <button key={item.id} type="button" data-hover="layer" className="tcal-today-item"
            data-live={live || undefined} data-past={past || undefined}
            style={{ ['--ev' as string]: item.color || 'var(--color-accent)' }}
            onClick={() => onOpen(item)}>
            <span className="tcal-today-dot" aria-hidden />
            <span className="tcal-today-time">{item.time}{item.endTime && <small>{item.endTime}</small>}</span>
            <span className="tcal-today-name">
              <span>{item.who}</span>
              {item.title && <small>{item.title}</small>}
              {live && <span className="tcal-live-chip">{t('ИДЁТ СЕЙЧАС')}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function todaySubtitle(today: string, count: number, t: (s: string) => string) {
  return `${t(FULL_WEEKDAYS[weekdayIdx(today)])}, ${dayNum(today)} ${t(MONTHS_GEN[monthIdx(today)])} · ${count} ${t(count === 1 ? 'занятие' : count >= 2 && count <= 4 ? 'занятия' : 'занятий')}`
}

export default function CalendarTodayPanel({ today, items, onOpen }: { today: string; items: SchedItem[]; onOpen: (item: SchedItem) => void }) {
  const t = useT()
  return (
    <aside className="tcal-today" aria-label={t('Сегодня')}>
      <h3>{t('Сегодня')}</h3>
      <p className="tcal-today-sub">{todaySubtitle(today, items.length, t)}</p>
      <CalendarTodayList items={items} onOpen={onOpen} />
    </aside>
  )
}

