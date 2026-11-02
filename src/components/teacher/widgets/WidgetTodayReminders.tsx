import { textFadeStyle } from '../../../lib/textFades'
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ClipboardCheck, Layers, BookOpen, Bell, Banknote, Clock,
  AlertCircle, ChevronRight, CheckCircle2,
} from '../../icons/appIcons'
import type { Reminder } from '../../../data/teacherMockData'
import './remindersWidget.css'
import { useHomeData, useOverlayThumb } from '../../../lib/useHomeData'
import { t, useT, useLang } from '../../../lib/i18n'

const reminderIcons: Record<Reminder['type'], React.ElementType> = {
  'check-hw': ClipboardCheck,
  'fill-widget': Layers,
  'make-trainer': BookOpen,
  'send-push': Bell,
  'payment-debt': Banknote,
  'fill-journal': Clock,
}

const reminderAccent = (item: Pick<Reminder, 'type' | 'urgency'>) => {
  if (item.type === 'payment-debt') return item.urgency === 'high' ? '#1E7FE0' : '#33A1E8'
  return item.urgency === 'high' ? '#EC6A3C' : item.urgency === 'low' ? '#E0A93F' : '#F0901A'
}

// Text shown on the high-urgency badge — spells out *why* it's flagged.
const urgencyLabel = (type: Reminder['type']) =>
  type === 'payment-debt' ? t('Просрочено')
  : type === 'fill-journal' ? t('Не заполнен')
  : type === 'check-hw' ? t('На проверке')
  : t('Срочно')

function ReminderRow({ item, done, onAction, showChevron = true, withCounter = false, style: styleOverride }: {
  item: Reminder; done?: boolean; onAction?: () => void; showChevron?: boolean; withCounter?: boolean; style?: React.CSSProperties
}) {
  const Icon = done ? CheckCircle2 : reminderIcons[item.type]
  const clickable = !done && !!onAction
  const accent = done ? 'var(--color-green-text)' : reminderAccent(item)
  return (
    <motion.div
      className={`teacher-reminder-row ww-reminder-row${withCounter ? ' ww-reminder-front' : ''}${clickable && showChevron ? ' teacher-reminder-with-chevron' : ''}`} data-reminder-row={item.id}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onAction : undefined}
      onKeyDown={e => { if (clickable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAction?.() } }}
      whileTap={clickable ? { scale: 0.99 } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 18,
        background: done ? 'var(--color-green-soft)' : 'rgba(var(--glass-rgb), 0.62)',
        backdropFilter: 'var(--blur-thin)',
        WebkitBackdropFilter: 'var(--blur-thin)',
        border: `1px solid ${done ? 'transparent' : 'var(--color-border-medium)'}`,
        boxShadow: done ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.16)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.22s',
        ...styleOverride,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: done ? 'rgba(74,222,128,0.18)' : `color-mix(in srgb, ${accent} 18%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} strokeWidth={2.2} style={{ color: accent }} />
      </div>
      <div className="teacher-reminder-details ww-reminder-info" style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: done ? 'var(--color-green-text)' : 'var(--color-text)',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap',
        }}>
          {item.text}
        </div>
        {item.detail && (
          <div style={{
            fontSize: 12, fontWeight: 500, marginTop: 2,
            color: done ? 'var(--color-green-text)' : 'var(--color-text-2)',
            whiteSpace: 'normal', lineHeight: 1.4,
          }}>
            {done ? t('Готово') : item.detail}
          </div>
        )}
      </div>
      {!done && (item.statusLabel || item.urgency === 'high') && (
        <span className="teacher-reminder-status" style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          padding: '4px 10px 4px 8px', borderRadius: 999,
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          color: accent, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          <AlertCircle size={12} strokeWidth={2.5} />
          {item.statusLabel || urgencyLabel(item.type)}
        </span>
      )}
      {clickable && showChevron && (
        <ChevronRight className="teacher-reminder-chevron" size={16} strokeWidth={2} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
      )}
    </motion.div>
  )
}

const stackTypeLabel: Record<Reminder['type'], string> = {
  'check-hw': 'ДЗ на проверку',
  'fill-journal': 'Журнал',
  'payment-debt': 'Оплата',
  'fill-widget': 'Виджет',
  'make-trainer': 'Тренажёр',
  'send-push': 'Уведомление',
}

const plural = new Intl.PluralRules('ru')
const reminderAmount = (count: number, forms: [string, string, string], english: string, lang: string) => {
  const form = plural.select(count)
  return `${count} ${lang === 'en' ? english : forms[form === 'one' ? 0 : form === 'few' ? 1 : 2]}`
}
const SOFT_EASE = [0.22, 1, 0.36, 1] as const

const ReminderGroupStack = memo(function ReminderGroupStack({ items, getAction, isDone }: {
  items: Reminder[]
  getAction: (r: Reminder) => (() => void) | undefined
  isDone: (r: Reminder) => boolean
}) {
  const lang = useLang(s => s.lang)
  const [expanded, setExpanded] = useState(false)
  const [hasRows, setHasRows] = useState(false)
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  const reducedMotion = useReducedMotion()
  const frontRef = useRef<HTMLDivElement>(null)
  const rowsRef = useRef(new Map<string, HTMLDivElement>())
  const [sizes, setSizes] = useState<{ front: number; rows: number[] }>({ front: 0, rows: [] })
  const front = items[0]
  const rest = items.slice(1)
  const accent = reminderAccent(front)
  const behind = Math.min(rest.length, 2)
  const count = front.type === 'check-hw'
    ? items.reduce((sum, r) => sum + (isDone(r) ? 0 : r.pendingCount ?? 1), 0)
    : items.length
  const quantity = front.type === 'check-hw'
    ? reminderAmount(count, ['работа', 'работы', 'работ'], count === 1 ? 'submission' : 'submissions', lang)
    : front.type === 'payment-debt'
      ? reminderAmount(count, ['платёж', 'платежа', 'платежей'], count === 1 ? 'payment' : 'payments', lang)
      : reminderAmount(count, ['занятие', 'занятия', 'занятий'], count === 1 ? 'lesson' : 'lessons', lang)
  const summary = front.type === 'check-hw' ? `${quantity} · ${items.length} ${t('ДЗ')}` : quantity
  const transition = { duration: reducedMotion ? 0 : 0.27, ease: SOFT_EASE }
  // The bottom card leaves first; on return the nearest card tucks under
  // the cover first. Cap the cascade so large stacks remain responsive.
  const stagger = reducedMotion ? 0 : Math.min(0.045, 0.18 / Math.max(1, rest.length - 1))
  const cascadeDelay = stagger * Math.max(0, rest.length - 1)

  useLayoutEffect(() => {
    const measure = () => {
      const next = { front: frontRef.current?.offsetHeight ?? 0, rows: rest.map(r => rowsRef.current.get(r.id)?.offsetHeight ?? 68) }
      setSizes(old => old.front === next.front && old.rows.length === next.rows.length && old.rows.every((h, i) => h === next.rows[i]) ? old : next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (frontRef.current) observer.observe(frontRef.current)
    rowsRef.current.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [items, hasRows])

  if (items.length === 1) return <ReminderRow item={front} done={isDone(front)} onAction={getAction(front)} />

  const collapsedHeight = sizes.front + (behind >= 2 ? 31 : 21)
  const expandedHeight = sizes.front + sizes.rows.reduce((sum, h) => sum + h + 6, 0) + 6
  let rowY = sizes.front + 6
  const toggle = () => {
    if (!expanded) setHasRows(true)
    setExpanded(value => !value)
  }

  return (
    <motion.div
      className="teacher-reminder-stack" data-reminder-stack={front.type}
      initial={false}
      animate={sizes.front ? { height: expanded ? expandedHeight : collapsedHeight } : undefined}
      transition={{ ...transition, delay: expanded ? 0 : cascadeDelay }}
      onAnimationComplete={() => { if (!expandedRef.current) setHasRows(false) }}
      style={{ position: 'relative', flexShrink: 0 }}
    >
      <div ref={frontRef} style={{ position: 'relative', zIndex: rest.length + 3 }}>
        <button type="button" onClick={toggle} aria-expanded={expanded} className="teacher-reminder-stack-toggle" style={{ color: accent }}>
          <span>{t(stackTypeLabel[front.type])} · {summary}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, color: 'var(--color-text-2)' }}>
            {expanded ? t('Свернуть') : t('Развернуть')}
            <motion.span animate={{ rotate: expanded ? -90 : 90 }} transition={transition} style={{ display: 'flex' }}><ChevronRight size={12} /></motion.span>
          </span>
        </button>
        <div style={{ position: 'relative' }}>
          <ReminderRow item={front} withCounter showChevron={false} done={isDone(front)} onAction={expanded ? getAction(front) : toggle} style={{ background: 'rgba(var(--glass-rgb), 0.80)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none', background: `radial-gradient(70% 46% at 50% 100%, color-mix(in srgb, ${accent} 13%, transparent), transparent 70%)` }} />
          <div aria-label={summary} style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', minWidth: 26, height: 26, padding: '0 8px', borderRadius: 13, background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, lineHeight: 1, pointerEvents: 'none', boxShadow: `0 4px 12px color-mix(in srgb, ${accent} 50%, transparent)` }}>{count}</div>
        </div>
      </div>
      {!hasRows && [0, 1].slice(0, behind).map(i => <div key={i} aria-hidden="true" style={{ position: 'absolute', top: sizes.front - 4 + i * 12, left: i ? 22 : 12, right: i ? 22 : 12, height: 18, zIndex: 2 - i, background: `color-mix(in srgb, ${accent} ${i ? 10 : 14}%, rgba(var(--glass-rgb), 0.55))`, border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`, borderTop: 0, borderRadius: '0 0 16px 16px' }} />)}
      {rest.map((r, i) => {
        const height = sizes.rows[i] ?? 68
        const y = rowY
        rowY += height + 6
        const collapsedY = sizes.front - height + (i ? 26 : 14)
        return <motion.div key={r.id}
          ref={el => { if (el) rowsRef.current.set(r.id, el); else rowsRef.current.delete(r.id) }}
          className="teacher-reminder-moving-row"
          initial={{ y: collapsedY, scale: i ? 0.93 : 0.97 }}
          animate={{ y: expanded ? y : collapsedY, scale: expanded ? 1 : i ? 0.93 : 0.97 }}
          transition={{ ...transition, delay: stagger * (expanded ? rest.length - 1 - i : i) }}
          aria-hidden={!expanded}
          inert={!expanded}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: rest.length - i, visibility: hasRows ? 'visible' : 'hidden', pointerEvents: expanded ? 'auto' : 'none' }}
        >
          <ReminderRow item={r} done={isDone(r)} onAction={getAction(r)} style={{ ...(expanded ? {} : { background: 'rgb(var(--glass-rgb))' }), backdropFilter: 'none', WebkitBackdropFilter: 'none' }} />
        </motion.div>
      })}
    </motion.div>
  )
})

function RemindersScroll({ reminders, reminderAction, reminderDone }: {
  reminders: Reminder[]
  reminderAction: (r: Reminder) => (() => void) | undefined
  reminderDone: (r: Reminder) => boolean
}) {
  const groups = useMemo(() => Object.values(reminders.reduce((acc, r) => {
    ;(acc[r.type] ??= []).push(r)
    return acc
  }, {} as Record<string, Reminder[]>))
    .map(group => [...group].sort((a, b) => Number(reminderDone(a)) - Number(reminderDone(b))))
    .sort((a, b) => Number(a.every(reminderDone)) - Number(b.every(reminderDone))), [reminders, reminderDone])
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const { update, onScroll, setHover, thumb } = useOverlayThumb()

  const syncRef = useRef<(el: HTMLElement) => void>(() => {})
  syncRef.current = el => update(el)
  useLayoutEffect(() => {
    const sync = () => { if (scrollRef.current) syncRef.current(scrollRef.current) }
    sync()
    const observer = new ResizeObserver(sync)
    if (contentRef.current) observer.observe(contentRef.current)
    if (scrollRef.current) observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [])

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    onScroll(el)
  }

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="no-scrollbar"
        style={{
          position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column', gap: 10,
          paddingBlock: 8, paddingLeft: 4, paddingRight: 12,
        }}
      >
        <div ref={contentRef} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(group => <ReminderGroupStack key={group[0].type} items={group} getAction={reminderAction} isDone={reminderDone} />)}
        </div>
      </div>
      {thumb}
    </>
  )
}

export default function WidgetTodayReminders() {
  const t = useT()
  const { reminders, reminderAction, reminderDone } = useHomeData()

  return (
    <div style={{
      containerType: 'inline-size', containerName: 'teacher-reminders',
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
      padding: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.2, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <AlertCircle size={14} strokeWidth={2} />
        {t('Напоминания')}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <RemindersScroll
          reminders={reminders}
          reminderAction={reminderAction}
          reminderDone={reminderDone}
        />
      </div>
    </div>
  )
}
