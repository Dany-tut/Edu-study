import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus } from '../../components/icons/appIcons'
import Segmented from '../../components/Segmented'
import { CalendarOverlays, type CalendarOverlayHandle } from '../../components/teacher/schedule/TeacherSchedule'
import WeekGrid from '../../components/teacher/calendar/WeekGrid'
import CalendarTodayPanel from '../../components/teacher/calendar/CalendarTodayPanel'
import CalendarIpadRail from '../../components/teacher/calendar/CalendarIpadRail'
import { viewDays, periodLabel, shiftAnchor, type CalendarView } from '../../components/teacher/calendar/calendarTime'
import '../../components/teacher/calendar/teacherCalendar.css'
import { useTeacherWeek, todayMsk, weekStart, scheduleUndo, scheduleError, type SchedItem, type SchedUndo } from '../../lib/teacherSchedule'
import { useTeacher } from '../../store/teacherStore'
import { PLATFORM } from '../../lib/platform'
import { btn } from '../../lib/pillStyles'
import { haptic } from '../../lib/feedback'
import { Z } from '../../lib/layers'
import { useT } from '../../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Календарь учителя — десктоп (ПК и iPad в ландшафте), концепт ONIX,
// согласован 09.11.2026 (docs: sd-pc-tools/calendar-concept).
//  - Период, «Сегодня» и вид «День · Неделя» — СВЕРХУ, в шапке.
//  - ПК: справа «+ Встреча» и счётчик; справа от сетки панель «Сегодня».
//  - iPad: шапка периода стеклянная; «Сегодня» и «+ Встреча» — в капсуле
//    справа (правило iPad); неделя во всю ширину.
// Перенос, отмена и добавление — те же окна, что у виджета расписания
// (CalendarOverlays); после действия тост с «Отменить».
// ─────────────────────────────────────────────────────────────────────────────

type Toast = { text: string; undo?: SchedUndo; tone?: 'danger' }

export default function TeacherCalendarPage() {
  const t = useT()
  // ?ipad=1 — только в DEV: посмотреть вид iPad на компьютере.
  const ipad = PLATFORM === 'ipad' || (import.meta.env.DEV && new URLSearchParams(location.search).has('ipad'))
  const today = todayMsk()
  const [view, setView] = useState<CalendarView>('week')
  const [anchor, setAnchor] = useState(today)
  const [todayOpen, setTodayOpen] = useState(false)
  const { items, reload } = useTeacherWeek(weekStart(anchor))
  const openLessonEditor = useTeacher(s => s.openLessonEditor)
  const openGradebook = useTeacher(s => s.openGradebook)
  const overlays = useRef<CalendarOverlayHandle>(null)

  // Сегодняшний список — своя неделя, даже если листаем другую.
  const todayWeek = useTeacherWeek(weekStart(today))
  const todayItems = useMemo(() => (todayWeek.items ?? [])
    .filter(i => i.date === today)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')), [todayWeek.items, today])

  const days = viewDays(view, anchor)
  const count = (items ?? []).filter(i => days.includes(i.date) && !i.cancelled).length

  // ── действия ───────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<Toast | null>(null)
  const busy = useRef(false)
  const reloadAll = useCallback(() => { reload(); todayWeek.reload() }, [reload, todayWeek])
  const run = useCallback(async (fn: () => Promise<{ undo: SchedUndo }>, text: string) => {
    if (busy.current) return
    busy.current = true
    try {
      const r = await fn()
      haptic(12)
      setToast({ text, undo: r.undo })
    } catch (e) {
      setToast({ text: t(scheduleError(e)), tone: 'danger' })
    } finally {
      busy.current = false
      reloadAll()
    }
  }, [t, reloadAll])
  const undo = async (u: SchedUndo) => {
    setToast(null)
    try { await scheduleUndo(u) } catch (e) { setToast({ text: t(scheduleError(e)), tone: 'danger' }) }
    reloadAll()
  }
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), toast.tone === 'danger' ? 8000 : 5000)
    return () => clearTimeout(id)
  }, [toast])

  const openItem = (item: SchedItem) => openLessonEditor(item.id)
  const openMenu = (item: SchedItem, el: HTMLElement) => overlays.current?.openMenu(item, el.getBoundingClientRect(), el)
  const addOn = (day: string) => overlays.current?.openAdd(day)
  const addNow = () => addOn(days.includes(today) ? today : days[0])

  const period = (
    <div className="tcal-period">
      <button type="button" data-hover="layer" className="tcal-arrow" onClick={() => setAnchor(a => shiftAnchor(view, a, -1))} aria-label={t(view === 'day' ? 'Предыдущий день' : 'Прошлая неделя')}><ChevronLeft size={16} /></button>
      <b>{periodLabel(view, anchor)}</b>
      <button type="button" data-hover="layer" className="tcal-arrow" onClick={() => setAnchor(a => shiftAnchor(view, a, 1))} aria-label={t(view === 'day' ? 'Следующий день' : 'Следующая неделя')}><ChevronRight size={16} /></button>
    </div>
  )

  return (
    <div className="tcal-page" data-ipad={ipad || undefined}>
      <div className="tcal-head">
        <div className="tcal-head-left">
          {period}
          <button type="button" data-hover="layer" onClick={() => setAnchor(today)} disabled={days.includes(today)}
            style={btn('M', 'secondary', { opacity: days.includes(today) ? 0.5 : 1, minHeight: ipad ? 44 : undefined })}>
            {t('Сегодня')}
          </button>
          <Segmented<CalendarView> variant="filter" value={view} onChange={setView}
            items={[{ id: 'day', label: t('День') }, { id: 'week', label: t('Неделя') }]} />
        </div>
        <div className="tcal-head-right">
          <span className="tcal-count">{items === null ? '' : `${count} ${t(count === 1 ? 'занятие' : count >= 2 && count <= 4 ? 'занятия' : 'занятий')}`}</span>
          {!ipad && (
            <button type="button" data-hover="layer" onClick={addNow} style={btn('M', 'primary')}>
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              <span style={{ position: 'relative', top: '-0.04em' }}>{t('Встреча')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="tcal-main">
        <WeekGrid days={days} items={items} today={today} onOpen={openItem} onMenu={openMenu} onAdd={addOn} compactHeader={ipad} />
        {!ipad && <CalendarTodayPanel today={today} items={todayItems} onOpen={openItem} />}
      </div>

      {ipad && (
        <CalendarIpadRail today={today} todayItems={todayItems} todayOpen={todayOpen}
          onToggleToday={() => setTodayOpen(o => !o)} onOpen={openItem} onAdd={addNow} />
      )}

      <CalendarOverlays ref={overlays} mobile={false} onOpen={openItem}
        onAttendance={item => openGradebook(item.id)} onAction={run} onSelectDay={setAnchor} />

      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div key={toast.text + String(!!toast.undo)}
              role={toast.tone === 'danger' ? 'alert' : 'status'} aria-live={toast.tone === 'danger' ? 'assertive' : 'polite'}
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              style={{
                position: 'fixed', left: 16, right: 16, margin: '0 auto', maxWidth: 420, zIndex: Z.toast,
                bottom: 'calc(24px + var(--offline-lift, 0px))',
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 16px', borderRadius: 18,
                background: toast.tone === 'danger' ? 'var(--btn-red-bg)' : 'var(--color-text)',
                color: toast.tone === 'danger' ? '#fff' : 'var(--color-bg)',
                boxShadow: 'var(--shadow-4)', fontSize: 14, fontWeight: 600,
              }}>
              <span style={{ flex: 1, minWidth: 0 }}>{toast.text}</span>
              {toast.undo && (
                <button type="button" data-hover="layer" onClick={() => undo(toast.undo!)} style={{
                  border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 700, color: 'var(--color-purple-soft)', padding: '4px 2px',
                }}>{t('Отменить')}</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
