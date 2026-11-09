import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CalendarDays, Plus } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import type { SchedItem } from '../../../lib/teacherSchedule'
import { CalendarTodayList, todaySubtitle } from './CalendarTodayPanel'

// ─────────────────────────────────────────────────────────────────────────────
// iPad: управление календарём — в стеклянной капсуле у правого края, на высоте
// большого пальца (docs/platforms.md §1.1). Период остаётся сверху, в шапке.
//   капсула  — «Сегодня»: список дня поповером слева от капсулы;
//   круг     — «+ Встреча», ближе всех к пальцу.
// Разделы приложения в капсулу переедут вместе с общей оболочкой iPad.
// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarIpadRail({ today, todayItems, todayOpen, onToggleToday, onOpen, onAdd }: {
  today: string
  todayItems: SchedItem[]
  todayOpen: boolean
  onToggleToday: () => void
  onOpen: (item: SchedItem) => void
  onAdd: () => void
}) {
  const t = useT()
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!todayOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onToggleToday() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [todayOpen, onToggleToday])

  return (
    <>
      <div className="tcal-rail">
        <div className="tcal-capsule">
          <button type="button" className="tcal-cell" aria-pressed={todayOpen} onClick={onToggleToday} aria-label={t('Сегодня')}>
            <CalendarDays size={22} />
            {todayOpen && <span>{t('Сегодня')}</span>}
          </button>
        </div>
        <button type="button" className="tcal-primary" onClick={onAdd} aria-label={t('Встреча')}>
          <Plus size={24} strokeWidth={2.6} />
        </button>
      </div>
      <AnimatePresence>
        {todayOpen && (
          <motion.div key="today" className="tcal-rail-popover" role="dialog" aria-label={t('Сегодня')}
            initial={{ opacity: 0, x: reduce ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduce ? 0 : 12 }}
            transition={{ duration: 0.18 }}>
            <h3 style={{ margin: '0 4px 2px', fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{t('Сегодня')}</h3>
            <p className="tcal-today-sub">{todaySubtitle(today, todayItems.length, t)}</p>
            <CalendarTodayList items={todayItems} onOpen={item => { onToggleToday(); onOpen(item) }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
