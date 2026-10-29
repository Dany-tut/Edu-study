import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, Info, X } from 'lucide-react'
import { useT } from '../lib/i18n'

/**
 * АЛЕРТЫ — одна система на всё приложение.
 *
 * Было: каждый экран красил свою плашку — жёлтая заливка с жёлтой рамкой,
 * красная заливка с эмодзи ⚠️, свои кнопки. Две ошибки подряд складывались в
 * «плашку на плашке» разного цвета и разной высоты.
 *
 * Правила:
 *  - Карточка всегда одна и та же: стекло поверхности (--color-surface +
 *    --shadow-pill), радиус 16. Тон НЕ заливает карточку — он живёт только в
 *    значке слева (мягкая подложка тона + иконка цветом текста тона). Так
 *    красное и жёлтое рядом не спорят, а в тёмной теме не превращаются в пятно.
 *  - Четыре тона по смыслу, не по вкусу:
 *      danger  — действие не случилось (не сохранилось, не отправилось);
 *      warning — случится что-то плохое, если не вмешаться (конфликт версий);
 *      info    — нейтральная подсказка (нужна аудитория, дата);
 *      success — подтверждение, которое стоит задержать на экране.
 *    Мгновенное «Сохранено!» — не алерт, а вспышка в кнопке.
 *  - Текст: заголовок — суть одной фразой (жирный), дальше — что делать
 *    (обычный, приглушённый). Межстрочный 1.35. Без эмодзи.
 *  - Не больше одного действия: маленькая сплошная таблетка --grad-purple.
 *    Крестик — только если алерт можно безопасно убрать.
 *  - НЕСКОЛЬКО АЛЕРТОВ = ОДНА КАРТОЧКА. <AlertStack> кладёт их строками в одну
 *    карточку через тонкий разделитель, по убыванию важности; больше двух —
 *    видна первая и «Ещё N», остальные раскрываются по клику.
 */

export type AlertTone = 'danger' | 'warning' | 'info' | 'success'

export interface AlertAction {
  label: string
  onClick: () => void
}

export interface AlertItem {
  id: string
  tone: AlertTone
  /** Суть одной фразой. */
  title?: ReactNode
  /** Что делать / подробности. */
  text?: ReactNode
  action?: AlertAction
  onClose?: () => void
}

const TONE = {
  danger:  { Icon: AlertCircle,   soft: 'var(--color-red-soft)',    ink: 'var(--color-red-text)',    rank: 0 },
  warning: { Icon: AlertTriangle, soft: 'var(--color-yellow-soft)', ink: 'var(--color-yellow-text)', rank: 1 },
  info:    { Icon: Info,          soft: 'var(--color-accent-soft)', ink: 'var(--color-purple-text)', rank: 2 },
  success: { Icon: CheckCircle2,  soft: 'var(--color-green-soft)',  ink: 'var(--color-green-text)',  rank: 3 },
} as const

const CARD: React.CSSProperties = {
  background: 'var(--color-surface)',
  boxShadow: 'var(--shadow-pill)',
  borderRadius: 16,
  overflow: 'hidden',
}

function AlertRow({ item }: { item: AlertItem }) {
  const t = useT()
  const { Icon, soft, ink } = TONE[item.tone]
  return (
    <div
      role={item.tone === 'danger' || item.tone === 'warning' ? 'alert' : 'status'}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px 10px 12px' }}
    >
      <span
        aria-hidden
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 30, height: 30, borderRadius: 10, background: soft, color: ink }}
      >
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.35, color: 'var(--color-muted)' }}>
        {item.title && <b style={{ color: 'var(--color-text)', fontWeight: 650 }}>{item.title}</b>}
        {item.title && item.text ? ' ' : null}
        {item.text}
      </span>
      {item.action && (
        <button
          type="button"
          onClick={item.action.onClick}
          className="cursor-pointer flex-shrink-0"
          style={{
            height: 30, padding: '0 14px', borderRadius: 999, border: 'none',
            background: 'var(--grad-purple)', color: '#fff',
            fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          <span style={{ position: 'relative', top: '-0.12em' }}>{item.action.label}</span>
        </button>
      )}
      {item.onClose && (
        <button
          type="button"
          onClick={item.onClose}
          aria-label={t('Закрыть')}
          className="cursor-pointer flex-shrink-0 flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 9, border: 'none', background: 'transparent', color: 'var(--color-muted)' }}
        >
          <X size={15} />
        </button>
      )}
    </div>
  )
}

/** Один алерт. Для нескольких — <AlertStack>, а не два <Alert> подряд. */
export function Alert(props: Omit<AlertItem, 'id'> & { style?: React.CSSProperties }) {
  const { style, ...item } = props
  return <div style={{ ...CARD, ...style }}><AlertRow item={{ id: 'one', ...item }} /></div>
}

/**
 * Все алерты места — одной карточкой. Пустой список ничего не рисует, поэтому
 * собирать его можно условно: `[cond && {...}, ...].filter(Boolean)`.
 */
export function AlertStack({ items, style }: { items: Array<AlertItem | false | null | undefined>; style?: React.CSSProperties }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const list = items
    .filter((x): x is AlertItem => !!x)
    .sort((a, b) => TONE[a.tone].rank - TONE[b.tone].rank)
  const shown = open || list.length <= 2 ? list : list.slice(0, 1)
  const hidden = list.length - shown.length

  return (
    <AnimatePresence initial={false}>
      {list.length > 0 && (
        <motion.div
          key="alert-stack"
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          style={{ ...CARD, ...style }}
        >
          {shown.map((item, i) => (
            <div key={item.id} style={i > 0 ? { borderTop: '1px solid var(--color-border-soft)' } : undefined}>
              <AlertRow item={item} />
            </div>
          ))}
          {list.length > 2 && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="cursor-pointer w-full flex items-center justify-center"
              style={{
                gap: 4, height: 30, border: 'none', borderTop: '1px solid var(--color-border-soft)',
                background: 'transparent', color: 'var(--color-muted)',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              {open ? t('Свернуть') : `${t('Ещё')} ${hidden}`}
              <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
