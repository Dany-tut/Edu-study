import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import MobileScreen from '../../MobileScreen'
import MobileSheet from '../../MobileSheet'
import SoftEdge from '../../SoftEdge'
import { GlassPill } from '../../mobileChrome'
import { ChevronLeft, ChevronRight, CalendarDays } from '../../icons/appIcons'
import { Alert } from '../../Alert'
import { PAIR } from '../../../lib/mobileTokens'
import { IS_IOS } from '../../../lib/platform'
import { tactile } from '../../../lib/feedback'
import { useT, useTc, useLang } from '../../../lib/i18n'
import { addDays, todayMsk, weekStart, useTeacherWeek, type SchedItem } from '../../../lib/teacherSchedule'
import { useOverlayScroll, fadeMask } from '../OverlayScroll'
import { textFadeStyle, textFadeLines } from '../../../lib/textFades'

// ─────────────────────────────────────────────────────────────────────────────
// MobileTeacherCalendar — ТЕЛЕФОННЫЙ календарь учителя (концепт согласован
// 09.11.2026, ONIX/Таскли). Переключатель периода/«Сегодня» СВЕРХУ, сегмент
// День/Неделя/Месяц, недельная сетка день×время, занятия блоками по цвету
// предмета, линия «сейчас», отменённое перечёркнуто. Только телефон; ПК/iPad —
// отдельно. Данные реальные (useTeacherWeek → schedule_lessons). Файл не трогает
// MobileTeacherDay и кнопку «Расписание и переносы».
// ─────────────────────────────────────────────────────────────────────────────

type View = 'day' | 'week' | 'month'
const NOW = '#E5484D'
const ROW_H = 56 // px на час
const AXIS_W = 38
const isHex = (c?: string) => !!c && /^#[0-9a-fA-F]{6}$/.test(c)
const toMin = (t?: string) => { const [h, m] = (t || '').split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const p2 = (n: number) => String(n).padStart(2, '0')

/** Текущее время по Москве (школьные часы) в минутах от полуночи. */
function nowMskMin(): number {
  try {
    const p: Record<string, string> = {}
    for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date())) p[x.type] = x.value
    return (+p.hour % 24) * 60 + (+p.minute)
  } catch { const d = new Date(); return d.getHours() * 60 + d.getMinutes() }
}

function subjColors(item: SchedItem): { accent: string; bg: string } {
  const c = isHex(item.color) ? item.color : '#786AD7'
  return { accent: c, bg: `${c}22` } // 8-значный hex-альфа ~13% (без color-mix — iOS 15)
}

export default function MobileTeacherCalendar() {
  const t = useT()
  const { tn, tc } = useTc()
  const { lang } = useLang()
  const locale = lang === 'en' ? 'en-GB' : 'ru-RU'
  const today = todayMsk()
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState<string>(todayMsk) // день внутри выбранного периода
  const start = weekStart(anchor)
  const { items, error: scheduleError, reload } = useTeacherWeek(start)
  const [now, setNow] = useState(nowMskMin)
  useEffect(() => { const id = setInterval(() => setNow(nowMskMin()), 60_000); return () => clearInterval(id) }, [])
  const [selected, setSelected] = useState<SchedItem | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start])
  const list = items ?? []

  // Видимое окно времени по событиям периода (неделя/день), с запасом.
  const periodItems = view === 'day' ? list.filter(i => i.date === anchor) : list
  const { lo, hi } = useMemo(() => {
    let lo = 9 * 60, hi = 19 * 60
    for (const i of periodItems) {
      if (i.cancelled) continue
      const s = toMin(i.time); const e = i.endTime ? toMin(i.endTime) : s + 60
      if (s < lo) lo = s; if (e > hi) hi = e
    }
    lo = Math.max(6 * 60, Math.floor(lo / 60) * 60)
    hi = Math.min(23 * 60, Math.ceil(hi / 60) * 60)
    if (hi - lo < 9 * 60) hi = Math.min(23 * 60, lo + 9 * 60)
    return { lo, hi }
  }, [periodItems])
  const hours = Array.from({ length: Math.ceil((hi - lo) / 60) }, (_, i) => Math.floor(lo / 60) + i)
  const gridH = (hi - lo) / 60 * ROW_H

  // Автопрокрутка к «сейчас» (или к первому занятию) при открытии/смене периода.
  useEffect(() => {
    const el = scrollRef.current; if (!el) return
    const inView = weekDays.some(d => d === today) || (view === 'day' && anchor === today)
    const target = inView ? now : (periodItems.length ? toMin(periodItems.slice().sort((a, b) => toMin(a.time) - toMin(b.time))[0].time) : lo + 60)
    el.scrollTop = Math.max(0, (target - lo) / 60 * ROW_H - 120)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, start, anchor, items])

  const shift = (dir: 1 | -1) => { tactile(); setAnchor(a => addDays(a, dir * (view === 'day' ? 1 : view === 'week' ? 7 : 30))) }
  const goToday = () => { tactile(); setAnchor(today) }

  const monthName = (d: string) => { const s = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(`${d}T12:00:00`)); return s.charAt(0).toUpperCase() + s.slice(1) }
  const shortDate = (d: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00`)).replace('.', '')
  const dayFull = (d: string) => { const s = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${d}T12:00:00`)); return s.charAt(0).toUpperCase() + s.slice(1) }
  const periodLabel = view === 'day' ? dayFull(anchor) : view === 'week' ? `${shortDate(start)} – ${shortDate(addDays(start, 6))}` : monthName(anchor)

  // ── Шапка: переключатель периода/«Сегодня» СВЕРХУ + сегмент ──
  const SEG: { id: View; label: string }[] = [{ id: 'day', label: 'День' }, { id: 'week', label: 'Неделя' }, { id: 'month', label: 'Месяц' }]
  const topZone = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 40 }}>
        <GlassPill><CalendarDays size={16} /> {t('Календарь')}</GlassPill>
        <button type="button" onClick={goToday} style={{ ...softPill, opacity: anchor === today && view !== 'month' ? .5 : 1 }}>{t('Сегодня')}</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" aria-label={t('Назад')} onClick={() => shift(-1)} style={navBtn}><ChevronLeft size={20} /></button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 700, ...textFadeStyle, ...textFadeLines(1) }}>{periodLabel}</div>
        <button type="button" aria-label={t('Вперёд')} onClick={() => shift(1)} style={navBtn}><ChevronRight size={20} /></button>
      </div>
      <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)', borderRadius: 13, padding: 4 }}>
        {SEG.map(s => {
          const on = view === s.id
          return <button key={s.id} type="button" onClick={() => { tactile(); setView(s.id) }} aria-pressed={on}
            style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
              background: on ? 'var(--color-purple)' : 'transparent', color: on ? '#fff' : 'var(--color-muted)',
              boxShadow: on ? '0 2px 8px rgba(120,106,215,.3)' : 'none' }}>{t(s.label)}</button>
        })}
      </div>
    </div>
  )

  return <>
    <MobileScreen topZone={topZone} glassHeader={{ leading: t('Календарь'), leadingSymbol: 'calendar' }} topPad={view === 'month' ? 150 : 198} scrollKey={`cal-${view}-${view === 'day' ? anchor : start}`}>
      {scheduleError && <Alert tone="danger" text={t('Не удалось загрузить расписание')} action={{ label: t('Повторить'), onClick: reload }} />}
      {items === null && <p style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', padding: '24px 0' }} role="status">{t('Загружаем занятия…')}</p>}

      {items !== null && view === 'month' && (
        <MonthGrid anchor={anchor} today={today} locale={locale} onPick={d => { setAnchor(d); setView('day') }} />
      )}

      {items !== null && view !== 'month' && (
        <GridView
          days={view === 'day' ? [anchor] : weekDays}
          items={list} today={today} lo={lo} hours={hours} gridH={gridH}
          now={now} nowShown={(view === 'day' ? [anchor] : weekDays).includes(today)}
          scrollRef={scrollRef} locale={locale} tn={tn} tc={tc} t={t}
          onPick={setSelected}
        />
      )}
    </MobileScreen>

    <MobileSheet open={!!selected} title={selected ? tn(selected.who) || t('Занятие') : ''} onClose={() => setSelected(null)}>
      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: subjColors(selected).accent, flexShrink: 0 }} />
            <strong style={{ fontSize: 16 }}>{selected.time}{selected.endTime ? ` – ${selected.endTime}` : ''}</strong>
            {selected.cancelled && <span style={{ fontSize: 12, fontWeight: 700, color: PAIR.error.text, background: PAIR.error.bg, borderRadius: 999, padding: '2px 8px' }}>{t('Отменено')}</span>}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)' }}>{dayFull(selected.date)}</p>
          <p style={{ margin: 0, fontSize: 15 }}>{tc(selected.title) || t('Тема не указана')}</p>
          {selected.subject && <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>{tc(selected.subject)}{selected.level ? ` · ${selected.level}` : ''}</p>}
        </div>
      )}
    </MobileSheet>
  </>
}

// ── Недельная / дневная сетка день×время ──
function GridView({ days, items, today, lo, hours, gridH, now, nowShown, scrollRef, locale, tn, tc, t, onPick }: {
  days: string[]; items: SchedItem[]; today: string; lo: number; hours: number[]; gridH: number
  now: number; nowShown: boolean; scrollRef: React.RefObject<HTMLDivElement | null>; locale: string
  tn: (s: string) => string; tc: (s: string) => string; t: (s: string) => string; onPick: (i: SchedItem) => void
}) {
  const single = days.length === 1
  const dow = (d: string) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${d}T12:00:00`))
  const cols = `${AXIS_W}px repeat(${days.length}, minmax(0, 1fr))`
  // Край вложенного скролла (SCROLL-01): за верхом/низом есть ещё часы сетки,
  // поэтому нужен край. iOS — мягкий край (SoftEdge), Android/ПК — растворение
  // маской (fadeMask). Нарастает с прокруткой через useOverlayScroll.
  const { ref: osRef, fade, onScroll } = useOverlayScroll<HTMLDivElement>()
  const setScroll = useCallback((el: HTMLDivElement | null) => {
    osRef.current = el
    scrollRef.current = el
  }, [osRef, scrollRef])
  return (
    <div>
      {/* липкая шапка дней */}
      <div style={{ position: 'sticky', top: 0, zIndex: 3, display: 'grid', gridTemplateColumns: cols, background: 'var(--color-bg)', paddingBottom: 4 }}>
        <div />
        {days.map(d => {
          const isToday = d === today
          return <div key={d} style={{ textAlign: 'center', padding: '2px 0 6px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: .4, color: isToday ? 'var(--color-purple-text)' : 'var(--color-muted)' }}>{dow(d)}</div>
            <div style={{ margin: '2px auto 0', width: single ? 'auto' : 26, height: 26, lineHeight: '26px', borderRadius: single ? 13 : '50%', padding: single ? '0 12px' : 0,
              fontSize: 15, fontWeight: 700, background: isToday ? 'var(--color-purple)' : 'transparent', color: isToday ? '#fff' : 'var(--color-text)' }}>{Number(d.slice(-2))}{single ? ` ${new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(`${d}T12:00:00`)).replace('.', '')}` : ''}</div>
          </div>
        })}
      </div>

      <div style={{ position: 'relative' }}>
        {IS_IOS && <>
          <SoftEdge edge="top" size="30px" strength={fade.top} zIndex={5} />
          <SoftEdge edge="bottom" size="30px" strength={fade.bottom} zIndex={5} />
        </>}
        <div ref={setScroll} onScroll={onScroll} className={IS_IOS ? undefined : 'no-scrollbar'}
          style={{ position: 'relative', overflowY: 'auto', maxHeight: 'calc(100dvh - 320px)', ...(IS_IOS ? {} : fadeMask(fade)) }}>
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: cols, height: gridH }}>
          {/* ось времени */}
          <div style={{ position: 'relative' }}>
            {hours.map(h => <div key={h} style={{ position: 'absolute', top: (h * 60 - lo) / 60 * ROW_H - 6, right: 6, fontSize: 10, color: 'var(--color-muted)' }}>{p2(h)}:00</div>)}
          </div>
          {/* колонки дней */}
          {days.map(d => {
            const isToday = d === today
            const dayEvents = items.filter(i => i.date === d)
            return (
              <div key={d} style={{ position: 'relative', borderLeft: '1px solid var(--color-border-soft)', background: isToday ? 'rgba(120,106,215,.06)' : 'transparent' }}>
                {hours.map(h => <div key={h} style={{ position: 'absolute', left: 0, right: 0, top: (h * 60 - lo) / 60 * ROW_H, borderTop: '1px solid var(--color-grid, var(--color-border-soft))', opacity: .5 }} />)}
                {dayEvents.map(ev => {
                  const s = toMin(ev.time); const e = ev.endTime ? toMin(ev.endTime) : s + 60
                  const top = (s - lo) / 60 * ROW_H; const h = Math.max(22, (e - s) / 60 * ROW_H - 3)
                  const { accent, bg } = subjColors(ev)
                  return (
                    <button key={ev.id} type="button" onClick={() => { tactile(); onPick(ev) }}
                      style={{ position: 'absolute', top: top + 1, left: 2, right: 2, height: h, textAlign: 'left', cursor: 'pointer',
                        border: 'none', borderLeft: `3px solid ${accent}`, borderRadius: 8, padding: single ? '6px 8px' : '4px 5px', overflow: 'hidden',
                        background: bg, color: accent, opacity: ev.cancelled ? .5 : 1, textDecoration: ev.cancelled ? 'line-through' : 'none' }}>
                      <div style={{ fontSize: single ? 12 : 9.5, fontWeight: 700, lineHeight: 1.15, ...textFadeStyle, ...textFadeLines(single ? 1 : 2) }}>{tn(ev.who) || tc(ev.title) || t('Занятие')}</div>
                      <div style={{ fontSize: single ? 11 : 9, fontWeight: 500, opacity: .85, ...textFadeStyle, ...textFadeLines(1) }}>{ev.time}{single && ev.endTime ? `–${ev.endTime}` : ''}{single ? ` · ${tc(ev.title) || ''}` : ''}</div>
                    </button>
                  )
                })}
                {/* линия «сейчас» */}
                {isToday && nowShown && now >= lo && now <= lo + hours.length * 60 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, top: (now - lo) / 60 * ROW_H, height: 2, background: NOW, zIndex: 4 }}>
                    <span style={{ position: 'absolute', left: -3, top: -3, width: 8, height: 8, borderRadius: '50%', background: NOW }} />
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Месяц: сетка-навигатор (точки по дням — следующим заходом) ──
function MonthGrid({ anchor, today, locale, onPick }: { anchor: string; today: string; locale: string; onPick: (d: string) => void }) {
  const t = useT()
  const first = `${anchor.slice(0, 7)}-01`
  const firstDow = (new Date(`${first}T12:00:00`).getDay() + 6) % 7 // Пн=0
  const gridStart = addDays(first, -firstDow)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const month = anchor.slice(0, 7)
  const dows = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(`${addDays(gridStart, i)}T12:00:00`)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {dows.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, textTransform: 'uppercase', color: 'var(--color-muted)', fontWeight: 600 }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {cells.map(d => {
          const inMonth = d.slice(0, 7) === month
          const isToday = d === today
          return (
            <button key={d} type="button" onClick={() => { tactile(); onPick(d) }}
              style={{ aspectRatio: '1 / 1', border: 'none', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                background: isToday ? 'var(--color-purple)' : 'var(--color-surface)', opacity: inMonth ? 1 : .4,
                color: isToday ? '#fff' : 'var(--color-text)', fontSize: 15, fontWeight: isToday ? 700 : 500,
                boxShadow: isToday ? 'none' : 'inset 0 0 0 1px var(--color-border-soft)' }}>
              {Number(d.slice(-2))}
            </button>
          )
        })}
      </div>
      <p style={{ margin: '6px 4px 0', fontSize: 12, color: 'var(--color-muted)' }}>{t('Выберите день, чтобы открыть расписание.')}</p>
    </div>
  )
}

const navBtn: CSSProperties = { width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', border: 'none', cursor: 'pointer', background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }
const softPill: CSSProperties = { border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 999, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }
