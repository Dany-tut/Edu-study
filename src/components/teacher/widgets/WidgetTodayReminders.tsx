import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, Layers, BookOpen, Bell, Banknote, Clock,
  AlertCircle, ChevronRight, CheckCircle2,
} from 'lucide-react'
import type { Reminder } from '../../../data/teacherMockData'
import { useTheme } from '../../../store/themeStore'
import { useHomeData, useOverlayThumb } from '../../../lib/useHomeData'
import { t, useT } from '../../../lib/i18n'

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
  : type === 'check-hw' ? t('Давно ждёт')
  : t('Срочно')

function ReminderRow({ item, done, onAction, style: styleOverride }: {
  item: Reminder; done?: boolean; onAction?: () => void; style?: React.CSSProperties
}) {
  const Icon = done ? CheckCircle2 : reminderIcons[item.type]
  const clickable = !done && !!onAction
  const accent = done ? 'var(--color-green-text)' : reminderAccent(item)
  return (
    <motion.div
      onClick={clickable ? onAction : undefined}
      whileTap={clickable ? { scale: 0.99 } : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 18,
        background: done ? 'var(--color-green-soft)' : 'rgba(var(--glass-rgb), 0.62)',
        backdropFilter: 'blur(10px) saturate(135%)',
        WebkitBackdropFilter: 'blur(10px) saturate(135%)',
        border: `1px solid ${done ? 'transparent' : 'var(--color-border-medium)'}`,
        boxShadow: done ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.16)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.25s',
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: done ? 'var(--color-green-text)' : 'var(--color-text)',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.text}
        </div>
        {item.detail && (
          <div style={{
            fontSize: 12, fontWeight: 500, marginTop: 2,
            color: done ? 'var(--color-green-text)' : 'var(--color-text-3)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {done ? t('Готово') : item.detail}
          </div>
        )}
      </div>
      {!done && item.urgency === 'high' && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          padding: '3px 9px 3px 7px', borderRadius: 999,
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          color: accent, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          <AlertCircle size={12} strokeWidth={2.4} />
          {urgencyLabel(item.type)}
        </span>
      )}
      {clickable && (
        <ChevronRight size={16} strokeWidth={2} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
      )}
    </motion.div>
  )
}

const stackTypeLabel: Record<Reminder['type'], string> = {
  'check-hw': t('ДЗ на проверку'),
  'fill-journal': t('Журнал'),
  'payment-debt': t('Оплата'),
  'fill-widget': t('Виджет'),
  'make-trainer': t('Тренажёр'),
  'send-push': t('Уведомление'),
}

const COLLAPSE = {
  height: { type: 'spring' as const, stiffness: 300, damping: 44 },
  opacity: { duration: 0.2, ease: 'easeOut' as const },
}

function ReminderGroupStack({ items, getAction, isDone }: {
  items: Reminder[]
  getAction: (r: Reminder) => (() => void) | undefined
  isDone: (r: Reminder) => boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const dark = useTheme(s => s.dark)
  const collapseColor = dark ? 'var(--color-text-3)' : 'var(--color-text-4)'

  if (items.length === 1) {
    return <ReminderRow item={items[0]} done={isDone(items[0])} onAction={getAction(items[0])} />
  }

  const front = items[0]
  const accent = reminderAccent(front)
  const behind = Math.min(items.length - 1, 2)

  return (
    <div style={{ display: 'grid' }}>
      <AnimatePresence initial={false}>
        {!expanded ? (
          <motion.div
            key="stack"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE}
            onClick={() => setExpanded(true)}
            style={{ gridArea: '1 / 1', alignSelf: 'start', overflow: 'hidden', cursor: 'pointer' }}
          >
            <div>
              <div style={{ position: 'relative', zIndex: 3 }}>
                <ReminderRow item={front} done={isDone(front)} onAction={undefined} style={{ paddingRight: 48, background: 'rgba(var(--glass-rgb), 0.80)', backdropFilter: 'blur(10px) saturate(140%)', WebkitBackdropFilter: 'blur(10px) saturate(140%)' }} />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden',
                  pointerEvents: 'none', zIndex: 1,
                  background: `radial-gradient(70% 46% at 50% 100%, color-mix(in srgb, ${accent} 13%, transparent), transparent 70%)`,
                }} />
                <div style={{
                  position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)',
                  minWidth: 26, height: 26, padding: '0 8px', borderRadius: 13,
                  background: accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 750, lineHeight: 1, pointerEvents: 'none',
                  boxShadow: `0 4px 12px color-mix(in srgb, ${accent} 50%, transparent)`,
                }}>
                  {items.length}
                </div>
              </div>
              <div style={{
                height: 18, marginTop: -3, marginLeft: 11, marginRight: 11,
                position: 'relative', zIndex: 2,
                background: `color-mix(in srgb, ${accent} 14%, rgba(var(--glass-rgb), 0.55))`,
                backdropFilter: 'blur(9px) saturate(135%)',
                WebkitBackdropFilter: 'blur(9px) saturate(135%)',
                borderStyle: 'solid', borderWidth: '0 1px 1px 1px', borderColor: `color-mix(in srgb, ${accent} 24%, transparent)`,
                borderRadius: '0 0 16px 16px',
              }} />
              {behind >= 2 && (
                <div style={{
                  height: 18, marginTop: -6, marginLeft: 22, marginRight: 22,
                  position: 'relative', zIndex: 1,
                  background: `color-mix(in srgb, ${accent} 10%, rgba(var(--glass-rgb), 0.5))`,
                  backdropFilter: 'blur(9px) saturate(135%)',
                  WebkitBackdropFilter: 'blur(9px) saturate(135%)',
                  borderStyle: 'solid', borderWidth: '0 1px 1px 1px', borderColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
                  borderRadius: '0 0 16px 16px',
                }} />
              )}
              <div style={{ height: behind >= 2 ? 5 : 7 }} />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={COLLAPSE}
            style={{ gridArea: '1 / 1', alignSelf: 'start', overflow: 'hidden' }}
          >
            <div style={{ paddingBottom: 16 }}>
              <div
                onClick={() => setExpanded(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 10px 6px', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>
                  {stackTypeLabel[front.type]} · {items.length}
                </span>
                <span style={{ fontSize: 11, color: collapseColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                  {t('Свернуть')} <ChevronRight size={11} style={{ transform: 'rotate(-90deg)' }} />
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {items.map((r, i) => {
                  const next = items[i + 1]
                  const nAccent = !isDone(r) && next && isDone(next) ? 'var(--color-green-text)' : undefined
                  return (
                    <div key={r.id} style={{ position: 'relative' }}>
                      <ReminderRow item={r} done={isDone(r)} onAction={getAction(r)} />
                      {nAccent && (
                        <div style={{
                          position: 'absolute', bottom: 0, left: '2%', right: '2%', height: 32,
                          pointerEvents: 'none', opacity: 0.6,
                          background: `radial-gradient(80% 100% at 50% 100%, color-mix(in srgb, ${nAccent} 20%, transparent), transparent 70%)`,
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RemindersScroll({ reminders, reminderAction, reminderDone }: {
  reminders: Reminder[]
  reminderAction: (r: Reminder) => (() => void) | undefined
  reminderDone: (r: Reminder) => boolean
}) {
  const [atBottom, setAtBottom] = useState(false)
  const { update, onScroll, setHover, thumb } = useOverlayThumb()

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4)
    onScroll(el)
  }

  const topFade = 'transparent 0%, black 12px'
  const botFade = atBottom ? 'black 100%' : 'black calc(100% - 20px), transparent 100%'
  const mask = `linear-gradient(to bottom, ${topFade}, ${botFade})`

  return (
    <>
      <div
        ref={el => { if (el) update(el) }}
        onScroll={handleScroll}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="no-scrollbar"
        style={{
          position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column', gap: 10,
          maskImage: mask, WebkitMaskImage: mask,
          paddingBlock: 8, paddingLeft: 4, paddingRight: 12,
        }}
      >
        {Object.values(
          reminders.reduce((acc, r) => {
            ;(acc[r.type] ??= []).push(r)
            return acc
          }, {} as Record<string, Reminder[]>)
        )
          .map(group => [...group].sort((a, b) => Number(reminderDone(a)) - Number(reminderDone(b))))
          .sort((a, b) => Number(a.every(reminderDone)) - Number(b.every(reminderDone)))
          .map(group => (
            <ReminderGroupStack
              key={group[0].type}
              items={group}
              getAction={reminderAction}
              isDone={reminderDone}
            />
          ))}
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
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
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
