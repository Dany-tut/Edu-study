import { useEffect, useMemo, useRef, useState } from 'react'
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
// красная линия «сейчас». Клик по занятию — открыть; правая кнопка — меню
// переноса/отмены; клик по пустому месту дня — добавить занятие.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FROM = 9 * 60
const DEFAULT_TO = 21 * 60
const MIN_ROW = 44
const DEFAULT_LEN = 60

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

export default function WeekGrid({ days, items, today, onOpen, onMenu, onAdd }: {
  days: string[]
  items: SchedItem[] | null
  today: string
  onOpen: (item: SchedItem) => void
  onMenu: (item: SchedItem, el: HTMLElement) => void
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

  // Диапазон часов: 09–21, раздвигается под ранние и поздние занятия.
  const [from, to] = useMemo(() => {
    let a = DEFAULT_FROM, b = DEFAULT_TO
    for (const placed of byDay.values()) for (const p of placed) { a = Math.min(a, Math.floor(p.start / 60) * 60); b = Math.max(b, Math.ceil(p.end / 60) * 60) }
    return [a, b]
  }, [byDay])
  const hours = Array.from({ length: (to - from) / 60 }, (_, i) => from + i * 60)

  // Высота часа — сколько влезает (неделя без прокрутки), но не ниже MIN_ROW.
  const [rowH, setRowH] = useState(MIN_ROW)
  useEffect(() => {
    const el = body.current
    if (!el) return
    const fit = () => setRowH(Math.max(MIN_ROW, Math.floor(el.clientHeight / hours.length)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hours.length])

  const cols = `44px repeat(${days.length}, minmax(0, 1fr))`
  const y = (m: number) => ((m - from) / 60) * rowH

  return (
    <div className="tcal-grid">
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
              <span key={h} style={{ top: i * rowH, opacity: i === 0 || (days.includes(today) && Math.abs(h - now) < 20) ? 0 : 1 }}>{fmtMinutes(h)}</span>
            ))}
            {days.includes(today) && now >= from && now <= to && (
              <span className="tcal-now-tag" style={{ top: y(now) }}>{fmtMinutes(now)}</span>
            )}
          </div>
          {days.map(d => (
            <div key={d} className="tcal-col" data-today={d === today || undefined} data-add={onAdd ? true : undefined}
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
                    style={{
                      top, height,
                      left: `calc(${(lane / lanes) * 100}% + 4px)`, width: `calc(${100 / lanes}% - 8px)`,
                      ['--ev' as string]: item.color || 'var(--color-accent)',
                    }}
                    title={`${item.who} · ${meta}`}
                    onClick={() => onOpen(item)}
                    onContextMenu={e => { e.preventDefault(); onMenu(item, e.currentTarget) }}>
                    <b>{item.who}</b>
                    {height > 34 && <span>{meta}</span>}
                  </button>
                )
              })}
              {d === today && now >= from && now <= to && <div className="tcal-now" style={{ top: y(now) }} aria-hidden />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
