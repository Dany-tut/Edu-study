import { useEffect, useMemo, useRef, useState } from 'react'
import { haptic } from '../../../lib/feedback'
import { useT } from '../../../lib/i18n'
import { useScrollFades } from '../../../lib/useScrollFades'
import { isScheduleEnded, isScheduleLive } from '../../../lib/scheduleLive'
import type { SchedItem } from '../../../lib/teacherSchedule'
import { WEEKDAYS, dayNum, weekdayIdx, minutes, nowMinutesMsk, fmtMinutes } from './calendarTime'
import './teacherCalendar.css'

// ─────────────────────────────────────────────────────────────────────────────
// Сетка недели в виджете «Расписание» (концепт ONIX, согласован 09.11.2026;
// по просьбе Дани 10.11 — не отдельной страницей, а видом виджета: кому нужна
// основная, растягивает виджет на Главной). Колонки —
// дни, строки — часы по Москве. Занятие — блок цвета своей группы (мягкий
// фон, полоска слева, текст того же тона), пересечения делят колонку на
// дорожки. Сегодня — градиент выбранного дня, колонка чуть подкрашена;
// красная линия «сейчас».
//   клик по занятию / правая кнопка — карточка занятия с действиями
//     (открыть урок, перенести, отметить, отменить) прямо над сеткой;
//   зажать и тащить — перенос (жест Таскли): мышь — после сдвига на 5 px,
//     палец (iPad) — после удержания 220 мс; призрак встаёт по сетке
//     с шагом 15 минут, Esc отменяет, после — тост «Отменить»;
//   клик по пустому месту дня — добавить занятие.
// Простой клик перенос не начинает: без порога блок не сдвигается ни на пиксель.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FROM = 9 * 60
const DEFAULT_TO = 21 * 60
const MIN_ROW = 36
const DEFAULT_LEN = 60
const SNAP = 15
/** Поля сетки сверху и снизу: подпись часа и пилюля «сейчас» у края не режутся. */
const BODY_PAD = 10
const MOUSE_SLOP = 5
const TOUCH_SLOP = 8
const TOUCH_HOLD = 220

type Press = {
  item: SchedItem; start: number; len: number
  x: number; y: number; grabDy: number
  touch: boolean; armed: boolean; timer?: number
  cleanup: () => void
}
type Drop = { item: SchedItem; day: string; start: number; len: number }

type Placed = { item: SchedItem; start: number; end: number; lane: number; lanes: number }

/** Пересекающиеся занятия дня — рядом, а не друг на друге. */
function placeDay(items: SchedItem[]): Placed[] {
  const sorted = items
    .map(item => {
      const start = minutes(item.time) ?? DEFAULT_FROM
      const end = Math.max(start + 30, minutes(item.endTime) ?? start + DEFAULT_LEN)
      return { item, start, end, lane: 0, lanes: 1 }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Placed[] = []
  let group: Placed[] = []
  let groupEnd = -1
  const flush = () => {
    const laneEnds: number[] = []
    for (const p of group) {
      let lane = laneEnds.findIndex(e => e <= p.start)
      if (lane < 0) { lane = laneEnds.length; laneEnds.push(p.end) } else laneEnds[lane] = p.end
      p.lane = lane
    }
    for (const p of group) p.lanes = laneEnds.length
    out.push(...group)
    group = []
  }
  for (const p of sorted) {
    if (group.length && p.start >= groupEnd) flush()
    group.push(p)
    groupEnd = Math.max(groupEnd, p.end)
  }
  if (group.length) flush()
  return out
}

export default function WeekGrid({ days, items, today, onOpen, onMove, onAdd }: {
  days: string[]
  items: SchedItem[] | null
  today: string
  /** Клик и правая кнопка: карточка занятия у блока. */
  onOpen: (item: SchedItem, el: HTMLElement) => void
  /** Нет — переносить нельзя (стенд). Время — «ЧЧ:ММ», длительность сервер сохраняет. */
  onMove?: (item: SchedItem, day: string, time: string) => void
  /** Нет — только просмотр (стенд): пустое место дня не кликается. */
  onAdd?: (day: string) => void
}) {
  const t = useT()
  const body = useRef<HTMLDivElement>(null)
  useScrollFades(body, true, ':scope')
  const [now, setNow] = useState(() => nowMinutesMsk())
  // Линия «сейчас» сдвигается раз в минуту — экран в покое кадров не рисует.
  useEffect(() => {
    const id = setInterval(() => setNow(nowMinutesMsk()), 60_000)
    return () => clearInterval(id)
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<string, Placed[]>()
    for (const d of days) map.set(d, placeDay((items ?? []).filter(i => i.date === d)))
    return map
  }, [days, items])

  // Диапазон часов: 09–21, раздвигается под ранние и поздние занятия и под
  // «сейчас» с запасом в час, чтобы линия времени не липла к краю сетки.
  const showNow = days.includes(today)
  const nowHour = Math.floor(now / 60)
  const [from, to] = useMemo(() => {
    let a = DEFAULT_FROM, b = DEFAULT_TO
    for (const placed of byDay.values()) for (const p of placed) { a = Math.min(a, Math.floor(p.start / 60) * 60); b = Math.max(b, Math.ceil(p.end / 60) * 60) }
    if (showNow) { a = Math.min(a, Math.max(0, (nowHour - 1) * 60)); b = Math.max(b, Math.min(24 * 60, (nowHour + 2) * 60)) }
    return [a, b]
  }, [byDay, showNow, nowHour])
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from + i * 60)

  // Высота часа — сколько влезает (неделя без прокрутки), но не ниже MIN_ROW.
  const [rowH, setRowH] = useState(MIN_ROW)
  useEffect(() => {
    const el = body.current
    if (!el) return
    const fit = () => setRowH(Math.max(MIN_ROW, Math.floor((el.clientHeight - BODY_PAD * 2) / hours.length)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hours.length])

  // Неделя с сегодняшним днём открывается так, чтобы «сейчас» было на виду, а не под фейдом.
  const scrolledFor = useRef<string | null>(null)
  useEffect(() => {
    const el = body.current
    if (!el || !showNow || scrolledFor.current === days[0]) return
    scrolledFor.current = days[0]
    const lineY = BODY_PAD + ((now - from) / 60) * rowH
    if (lineY > el.clientHeight - 48 || lineY < 48) el.scrollTop = Math.max(0, lineY - el.clientHeight * 0.6)
  }, [days, showNow, now, from, rowH])

  const cols = `50px repeat(${days.length}, minmax(0, 1fr))`
  const y = (m: number) => ((m - from) / 60) * rowH

  // ── перенос зажатием ───────────────────────────────────────────────────────
  const colRefs = useRef(new Map<string, HTMLDivElement>())
  const press = useRef<Press | null>(null)
  const [drop, setDrop] = useState<Drop | null>(null)
  const dropRef = useRef<Drop | null>(null)
  const setDropBoth = (d: Drop | null) => { dropRef.current = d; setDrop(d) }
  // Клик, пришедший после перетаскивания, — не клик.
  const swallowClick = useRef(false)
  const geo = useRef({ from, to, rowH, days })
  geo.current = { from, to, rowH, days }
  const moveRef = useRef(onMove)
  moveRef.current = onMove

  const endPress = () => {
    const p = press.current
    if (!p) return
    if (p.timer) clearTimeout(p.timer)
    p.cleanup()
    press.current = null
  }
  useEffect(() => endPress, [])

  const target = (p: Press, cx: number, cy: number): Drop => {
    const g = geo.current
    let day = dropRef.current?.day ?? p.item.date
    let top = 0
    for (const d of g.days) {
      const r = colRefs.current.get(d)?.getBoundingClientRect()
      if (!r) continue
      top = r.top
      if (cx >= r.left && cx < r.right) day = d
    }
    const raw = g.from + ((cy - p.grabDy - top) / g.rowH) * 60
    const start = Math.min(g.to - SNAP, Math.max(g.from, Math.round(raw / SNAP) * SNAP))
    return { item: p.item, day, start, len: p.len }
  }

  const beginDrag = (p: Press, cx: number, cy: number) => {
    p.armed = true
    swallowClick.current = true
    haptic(10)
    setDropBoth(target(p, cx, cy))
  }

  const onPressStart = (e: React.PointerEvent<HTMLButtonElement>, item: SchedItem, start: number, end: number) => {
    if (!onMove || item.cancelled || e.button !== 0) return
    endPress()
    swallowClick.current = false
    const touch = e.pointerType === 'touch'
    const r = e.currentTarget.getBoundingClientRect()
    const p: Press = { item, start, len: end - start, x: e.clientX, y: e.clientY, grabDy: e.clientY - r.top, touch, armed: false, cleanup: () => {} }

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - p.x, dy = ev.clientY - p.y
      const dist = Math.hypot(dx, dy)
      if (!p.armed) {
        // Палец двинулся раньше удержания — это прокрутка, не перенос.
        if (p.touch) { if (dist > TOUCH_SLOP) endPress(); return }
        if (dist <= MOUSE_SLOP) return
        beginDrag(p, ev.clientX, ev.clientY)
        return
      }
      // Край прокрутки: ведём занятие за пределы видимых часов.
      const b = body.current?.getBoundingClientRect()
      if (b && body.current) {
        if (ev.clientY < b.top + 24) body.current.scrollTop -= 10
        else if (ev.clientY > b.bottom - 24) body.current.scrollTop += 10
      }
      const next = target(p, ev.clientX, ev.clientY)
      const cur = dropRef.current
      if (!cur || cur.day !== next.day || cur.start !== next.start) {
        if (cur && cur.day !== next.day) haptic(6)
        setDropBoth(next)
      }
    }
    const up = () => {
      const d = dropRef.current
      const armed = p.armed
      endPress()
      setDropBoth(null)
      if (!armed || !d) return
      if (d.day !== p.item.date || d.start !== p.start) moveRef.current?.(p.item, d.day, fmtMinutes(d.start))
    }
    const cancel = () => { endPress(); setDropBoth(null) }
    const key = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && p.armed) { ev.preventDefault(); cancel() } }
    // Пока палец держит занятие, страница под ним не едет.
    const touchMove = (ev: TouchEvent) => { if (p.armed) ev.preventDefault() }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', key)
    window.addEventListener('touchmove', touchMove, { passive: false })
    p.cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', key)
      window.removeEventListener('touchmove', touchMove)
    }
    if (touch) p.timer = window.setTimeout(() => { if (press.current === p) beginDrag(p, p.x, p.y) }, TOUCH_HOLD)
    press.current = p
  }

  return (
    <div className="tcal-grid" data-dragging={drop ? true : undefined}>
      <div className="tcal-days" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map(d => (
          <div key={d} className="tcal-day" data-today={d === today || undefined} aria-current={d === today ? 'date' : undefined}>
            <small>{t(WEEKDAYS[weekdayIdx(d)])}</small>
            <b>{dayNum(d)}</b>
          </div>
        ))}
      </div>
      <div ref={body} className="tcal-body">
        <div className="tcal-rows" style={{ gridTemplateColumns: cols, height: hours.length * rowH }}>
          <div className="tcal-hours" aria-hidden>
            {hours.map((h, i) => (
              <span key={h} style={{ top: i * rowH, opacity: i === 0 || (days.includes(today) && Math.abs(h - now) < 30) ? 0 : 1 }}>{fmtMinutes(h)}</span>
            ))}
            {days.includes(today) && now >= from && now <= to && (
              <span className="tcal-now-tag" style={{ top: y(now) }}>{fmtMinutes(now)}</span>
            )}
          </div>
          {days.map(d => (
            <div key={d} ref={el => { if (el) colRefs.current.set(d, el); else colRefs.current.delete(d) }}
              className="tcal-col" data-today={d === today || undefined} data-add={onAdd ? true : undefined}
              data-drop={drop && drop.day === d ? true : undefined}
              onClick={e => { if (onAdd && e.target === e.currentTarget) onAdd(d) }}
              title={onAdd ? t('Добавить занятие') : undefined}>
              {hours.map((h, i) => <div key={h} className="tcal-hline" style={{ top: i * rowH }} />)}
              {(byDay.get(d) ?? []).map(({ item, start, end, lane, lanes }) => {
                const live = isScheduleLive(item)
                const past = !live && isScheduleEnded(item)
                const top = y(start) + 2
                const height = Math.max(22, y(end) - y(start) - 4)
                const meta = [item.time && `${item.time}${item.endTime ? `–${item.endTime}` : ''}`, item.title].filter(Boolean).join(' · ')
                return (
                  <button key={item.id} type="button" data-hover="card" className="tcal-event"
                    data-live={live || undefined} data-past={past || undefined} data-cancelled={item.cancelled || undefined}
                    data-lifted={drop?.item.id === item.id || undefined}
                    style={{
                      top, height,
                      left: `calc(${(lane / lanes) * 100}% + 4px)`, width: `calc(${100 / lanes}% - 8px)`,
                      ['--ev' as string]: item.color || 'var(--color-accent)',
                    }}
                    title={`${item.who} · ${meta}`}
                    onPointerDown={e => onPressStart(e, item, start, end)}
                    onClick={e => {
                      if (swallowClick.current) { swallowClick.current = false; return }
                      onOpen(item, e.currentTarget)
                    }}
                    onContextMenu={e => {
                      e.preventDefault()
                      // Долгое касание на пальце — это перенос, не меню.
                      if (press.current?.touch) return
                      onOpen(item, e.currentTarget)
                    }}>
                    <b>{item.who}</b>
                    {height > 34 && <span>{meta}</span>}
                  </button>
                )
              })}
              {drop && drop.day === d && (
                <div className="tcal-event" data-ghost aria-hidden
                  style={{ top: y(drop.start) + 2, height: Math.max(22, (drop.len / 60) * rowH - 4), left: 4, width: 'calc(100% - 8px)', ['--ev' as string]: drop.item.color || 'var(--color-accent)' }}>
                  <b>{drop.item.who}</b>
                  <span>{fmtMinutes(drop.start)}–{fmtMinutes(drop.start + drop.len)}</span>
                </div>
              )}
              {d === today && now >= from && now <= to && <div className="tcal-now" style={{ top: y(now) }} aria-hidden />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
