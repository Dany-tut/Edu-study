import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../lib/i18n'

/*
 * Дата и время одним полем — вместо нативного <input type="datetime-local">:
 * тот рисует системный календарь (чёрный, со своим шрифтом и синим фокусом) и
 * не даёт просто набрать цифры. Здесь цифры набираются прямо в поле, точки и
 * двоеточие встают сами; по иконке — календарь в стекле кабинета.
 *
 * Время — московское (МСК, UTC+3 без перехода на летнее): даты праздников и
 * дедлайнов заданы для учеников из России, а не в поясе того, кто открыл админку.
 * Значение наружу — ISO-строка в UTC.
 */

const MSK = 3 * 3600_000
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type Parts = { y: number; m: number; d: number; h: number; mi: number }
const p2 = (n: number) => String(n).padStart(2, '0')

function toMsk(iso: string): Parts {
  const t = new Date(Date.parse(iso) + MSK)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes() }
}
function fromMsk(p: Parts): string {
  return new Date(Date.UTC(p.y, p.m, p.d, p.h, p.mi) - MSK).toISOString()
}
const dateText = (p: Parts) => `${p2(p.d)}.${p2(p.m + 1)}.${p.y}`
const timeText = (p: Parts) => `${p2(p.h)}:${p2(p.mi)}`

/** Только цифры, разделители — сами: «0211» → «02.11», «02112026» → «02.11.2026». */
function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join('.')
}
function maskTime(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d
}
function parseDate(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
  if (!m) return null
  const d = +m[1], mo = +m[2] - 1, y = +m[3]
  const t = new Date(Date.UTC(y, mo, d))
  return t.getUTCMonth() === mo && t.getUTCDate() === d ? { y, m: mo, d } : null
}
function parseTime(s: string): { h: number; mi: number } | null {
  const m = /^(\d{2}):(\d{2})$/.exec(s)
  if (!m || +m[1] > 23 || +m[2] > 59) return null
  return { h: +m[1], mi: +m[2] }
}

const inputStyle: React.CSSProperties = {
  border: 'none', outline: 'none', background: 'transparent', padding: 0, margin: 0,
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--color-text)',
  fontVariantNumeric: 'tabular-nums', minWidth: 0,
}

export default function DateTimeField({ value, onChange, label }: {
  value: string
  onChange: (iso: string) => void
  /** Подпись для screen reader: «Начало», «Конец». */
  label?: string
}) {
  const t = useT()
  const cur = toMsk(value)
  const [date, setDate] = useState(dateText(cur))
  const [time, setTime] = useState(timeText(cur))
  const [bad, setBad] = useState(false)
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(false)
  const [view, setView] = useState({ y: cur.y, m: cur.m })
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  // Значение пришло снаружи (сохранили, перезагрузили) — показываем его, а не черновик.
  useEffect(() => {
    const p = toMsk(value)
    setDate(dateText(p)); setTime(timeText(p)); setBad(false)
  }, [value])

  function commit(nextDate: string, nextTime: string) {
    const d = parseDate(nextDate), tm = parseTime(nextTime)
    // Пока набирают — молчим; ругаемся, только когда цифр набрано полностью, а дата не существует.
    const complete = nextDate.length === 10 && nextTime.length === 5
    setBad(complete && (!d || !tm))
    if (d && tm) onChange(fromMsk({ ...d, ...tm }))
  }

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = boxRef.current?.getBoundingClientRect()
      if (!r) return
      const w = 280
      setPos({ top: r.bottom + 6, left: Math.min(r.right - w, window.innerWidth - w - 12) })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const tgt = e.target as Node
      if (boxRef.current?.contains(tgt) || popRef.current?.contains(tgt)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

  function pick(day: number) {
    const tm = parseTime(time) ?? { h: cur.h, mi: cur.mi }
    onChange(fromMsk({ y: view.y, m: view.m, d: day, ...tm }))
    setOpen(false)
  }
  function shift(dir: -1 | 1) {
    setView(v => {
      const m = v.m + dir
      return m < 0 ? { y: v.y - 1, m: 11 } : m > 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m }
    })
  }

  const first = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  const today = toMsk(new Date().toISOString())

  const ring = bad ? 'var(--color-red-text)' : focus || open ? 'rgba(var(--accent-rgb), 0.55)' : 'var(--color-border-medium)'

  return (
    <div
      ref={boxRef}
      onFocus={() => setFocus(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocus(false) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, height: 42, padding: '0 6px 0 14px',
        borderRadius: 13, background: 'var(--color-bg-input)',
        border: `1px solid ${ring}`,
        boxShadow: (focus || open) && !bad ? '0 0 0 3px rgba(var(--accent-rgb), 0.12)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <input
        aria-label={label ? `${label}: ${t('дата')}` : t('Дата')}
        inputMode="numeric" placeholder={t('ДД.ММ.ГГГГ')}
        value={date}
        onChange={e => { const v = maskDate(e.target.value); setDate(v); commit(v, time) }}
        style={{ ...inputStyle, width: 96 }}
      />
      <input
        aria-label={label ? `${label}: ${t('время')}` : t('Время')}
        inputMode="numeric" placeholder={t('ЧЧ:ММ')}
        value={time}
        onChange={e => { const v = maskTime(e.target.value); setTime(v); commit(date, v) }}
        style={{ ...inputStyle, width: 46 }}
      />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-4)', letterSpacing: '0.04em' }}>{t('МСК')}</span>
      <span style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => { setView({ y: cur.y, m: cur.m }); setOpen(o => !o) }}
        aria-label={t('Открыть календарь')}
        style={{
          width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(var(--accent-rgb), 0.14)' : 'transparent',
          color: open ? 'var(--color-accent)' : 'var(--color-text-3)',
        }}
      >
        <Calendar size={16} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={popRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.15 }}
              style={{
                position: 'fixed', top: pos.top, left: pos.left, width: 280, zIndex: 4000,
                background: 'rgba(var(--glass-rgb), 0.97)',
                backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
                border: '1px solid var(--color-border-medium)', borderRadius: 18,
                boxShadow: 'var(--shadow-4)', padding: '14px 12px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <button type="button" onClick={() => shift(-1)} aria-label={t('Предыдущий месяц')} style={navBtn}><ChevronLeft size={14} /></button>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t(MONTHS[view.m])} {view.y}</span>
                <button type="button" onClick={() => shift(1)} aria-label={t('Следующий месяц')} style={navBtn}><ChevronRight size={14} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', padding: '2px 0' }}>{t(d)}</div>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />
                  const sel = day === cur.d && view.m === cur.m && view.y === cur.y
                  const isToday = day === today.d && view.m === today.m && view.y === today.y
                  return (
                    <button
                      key={i} type="button" onClick={() => pick(day)}
                      onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--color-bg-3)' }}
                      onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                      style={{
                        aspectRatio: '1', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 13, fontWeight: sel || isToday ? 700 : 500,
                        background: sel ? 'var(--grad-purple)' : 'transparent',
                        boxShadow: !sel && isToday ? 'inset 0 0 0 1.5px var(--color-accent)' : 'none',
                        color: sel ? '#fff' : 'var(--color-text)',
                      }}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-4)', textAlign: 'center' }}>
                {t('Время меняется в поле — цифрами')}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}

const navBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 9, border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
}
