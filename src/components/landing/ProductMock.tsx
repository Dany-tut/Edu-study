import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import HoloSticker from '../HoloSticker'
import StickerBadge from '../StickerBadge'
import { tierOf } from '../../lib/holo/presets'
import {
  ChevronLeft, ChevronRight, RotateCw, Plus, Share, Copy, PanelLeft, ShieldCheck,
  Search, Bell, LayoutGrid, Users, ClipboardCheck, BookOpen, BarChart3,
  Pencil, Circle, MessageSquare, Check, X, Flame, Play, Lock,
  CalendarDays, Clock, Undo2, Sparkles, ArrowRight,
} from 'lucide-react'

const ACCENT = '#786AD7'
const ACCENT_2 = '#6F3FBF'
const ACCENT_L = '#A99BF0'
const OK = '#4FBF9A'
const WARN = '#E8A54F'

// ── Мок-кабинет в окне Safari ────────────────────────────────────────────────
// Всё внутри — состояние в React: вкладки браузера, история назад/вперёд,
// перезагрузка, поиск, проверка работ, редактирование журнала, квиз ученика.
// Анимации только на CSS-переходах/keyframes: rAF в превью не срабатывает
// (см. [[preview-no-raf]]), framer-motion здесь зависает.

const SECTIONS = [
  { key: 'Обзор', slug: 'обзор', sub: 'Сегодня, 3 занятия · 5 работ на проверку', icon: LayoutGrid },
  { key: 'Группы', slug: 'группы', sub: '4 группы · 24 ученика', icon: Users },
  { key: 'Расписание', slug: 'расписание', sub: 'Неделя 16–22 сентября · 7 занятий', icon: CalendarDays },
  { key: 'Домашки', slug: 'домашки', sub: '5 работ ждут проверки', icon: ClipboardCheck },
  { key: 'Журнал', slug: 'журнал', sub: 'Посещаемость и оценки', icon: BookOpen },
  { key: 'Аналитика', slug: 'аналитика', sub: 'Прогресс за месяц', icon: BarChart3 },
] as const

type BrowserTab = 'teacher' | 'student'

export default function ProductMock() {
  const [tab, setTab] = useState<BrowserTab>('teacher')
  // история навигации по разделам — под кнопки «назад/вперёд» как в браузере
  const [history, setHistory] = useState<number[]>([0])
  const [hIdx, setHIdx] = useState(0)
  const [nonce, setNonce] = useState(0)      // бампается на reload → панель переигрывает вход
  const [spinning, setSpinning] = useState(false)
  const [query, setQuery] = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  // «принятые» работы — общий счётчик очереди для Обзора и Домашек
  const [accepted, setAccepted] = useState<string[]>([])

  const section = history[hIdx]
  const sec = SECTIONS[section]
  // окно мока — фиксированной высоты (см. .lp-page): что бы внутри ни нажали,
  // секция «Как это работает» под ним не должна прыгать. Всё, что не влезло,
  // скроллится внутри страницы — ровно как в настоящем браузере.
  const pageRef = useRef<HTMLDivElement>(null)
  useEffect(() => { pageRef.current?.scrollTo({ top: 0 }) }, [section, tab, nonce])

  const go = (i: number) => {
    if (i === section) return
    const next = [...history.slice(0, hIdx + 1), i]
    setHistory(next)
    setHIdx(next.length - 1)
    setBellOpen(false)
  }
  // переход по названию раздела — чтобы плитки «Обзора» вели куда надо
  // и порядок SECTIONS можно было менять, не правя индексы
  const goKey = (key: string) => {
    const i = SECTIONS.findIndex(s => s.key === key)
    if (i >= 0) go(i)
  }
  const back = () => hIdx > 0 && setHIdx(hIdx - 1)
  const forward = () => hIdx < history.length - 1 && setHIdx(hIdx + 1)
  const reload = () => {
    setSpinning(true)
    setNonce(n => n + 1)
    setTimeout(() => setSpinning(false), 620)
  }
  const accept = (name: string) => setAccepted(a => (a.includes(name) ? a : [...a, name]))

  const url = tab === 'teacher' ? `iskra.app/кабинет/${sec.slug}` : 'iskra.app/ученик/курс'

  return (
    <div>
      <div className="lp-win" style={{
        borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: '0 40px 90px -30px rgba(20, 12, 50, 0.45), 0 8px 30px -12px rgba(20,12,50,0.25)',
      }}>
        {/* ── тулбар Safari ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-bg) 55%, var(--color-surface)), color-mix(in srgb, var(--color-bg) 30%, var(--color-surface)))',
        }}>
          <div className="lp-lights" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <span style={light('#ED6A5E')} /><span style={light('#F4BF4F')} /><span style={light('#61C554')} />
          </div>
          <ToolBtn title="Боковая панель"><PanelLeft size={15} /></ToolBtn>
          <div className="lp-nav-btns" style={{ display: 'flex', gap: 2 }}>
            <ToolBtn title="Назад" onClick={back} disabled={hIdx === 0}><ChevronLeft size={17} /></ToolBtn>
            <ToolBtn title="Вперёд" onClick={forward} disabled={hIdx >= history.length - 1}><ChevronRight size={17} /></ToolBtn>
          </div>

          {/* адресная строка */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
            <div className="lp-omnibox" style={{
              display: 'flex', alignItems: 'center', gap: 6, width: 'min(360px, 100%)', height: 26,
              padding: '0 9px', borderRadius: 8, fontSize: 11.5, color: 'var(--color-text-2)',
              background: 'color-mix(in srgb, var(--color-bg) 70%, var(--color-surface))',
              border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
            }}>
              <ShieldCheck size={12} style={{ color: OK, flexShrink: 0 }} />
              <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{url}</span>
              <button onClick={reload} title="Обновить" style={{ ...iconBtnBase, width: 18, height: 18 }}>
                <RotateCw size={12} className={spinning ? 'lp-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="lp-tool-right" style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <ToolBtn title="Поделиться"><Share size={14} /></ToolBtn>
            <ToolBtn title="Новая вкладка"><Plus size={15} /></ToolBtn>
            <ToolBtn title="Все вкладки"><Copy size={14} /></ToolBtn>
          </div>
        </div>

        {/* ── строка вкладок ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 4, padding: '0 10px 6px',
          background: 'color-mix(in srgb, var(--color-bg) 30%, var(--color-surface))',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <BrowserTabBtn on={tab === 'teacher'} onClick={() => setTab('teacher')} title="Искра — кабинет учителя" />
          <BrowserTabBtn on={tab === 'student'} onClick={() => setTab('student')} title="Искра — кабинет ученика" />
          <button title="Новая вкладка" style={{ ...iconBtnBase, width: 24, height: 24, marginLeft: 2, marginBottom: 2, color: 'var(--color-text-3)' }}>
            <Plus size={14} />
          </button>
        </div>

        {/* ── страница ── */}
        {tab === 'teacher' ? (
          <div className="lp-page" style={{ display: 'flex' }}>
            {/* сайдбар */}
            <div className="lp-mock-side" style={{ width: 178, flexShrink: 0, borderRight: '1px solid var(--color-border)', padding: '16px 12px', background: 'color-mix(in srgb, var(--color-bg) 25%, var(--color-surface))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 15, marginBottom: 18, padding: '0 4px' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` }} /> Искра
              </div>
              {SECTIONS.map((s, i) => {
                const on = section === i
                return (
                  <button key={s.key} onClick={() => go(i)} className="lp-mock-nav" style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 9, marginBottom: 3, width: '100%',
                    fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', border: 'none', textAlign: 'left',
                    color: on ? ACCENT : 'var(--color-text-2)',
                    background: on ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : 'transparent',
                    transition: 'background .15s, color .15s',
                  }}>
                    <s.icon size={15} /> {s.key}
                  </button>
                )
              })}
            </div>

            {/* контент */}
            <div ref={pageRef} className="lp-scroll" style={{ flex: 1, padding: 18, minWidth: 0, position: 'relative' }}>
              {/* мобильные вкладки разделов */}
              <div className="lp-mock-tabs" style={{ display: 'none', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
                {SECTIONS.map((s, i) => (
                  <button key={s.key} onClick={() => go(i)} style={{
                    flexShrink: 0, padding: '6px 11px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: section === i ? 700 : 500,
                    border: `1px solid ${section === i ? ACCENT : 'var(--color-border)'}`,
                    color: section === i ? '#fff' : 'var(--color-text-2)',
                    background: section === i ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'transparent',
                  }}>{s.key}</button>
                ))}
              </div>

              {/* шапка раздела: заголовок, поиск, колокольчик */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{sec.key}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sec.sub}</div>
                </div>
                <div className="lp-mock-search" style={{
                  marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px',
                  borderRadius: 9, background: 'var(--color-bg)', border: '1px solid var(--color-border)', width: 150,
                }}>
                  <Search size={13} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Поиск ученика"
                    style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: 12, width: '100%', minWidth: 0 }} />
                  {query && <button onClick={() => setQuery('')} style={{ ...iconBtnBase, width: 16, height: 16 }}><X size={11} /></button>}
                </div>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button onClick={() => setBellOpen(o => !o)} title="Уведомления" style={{
                    ...iconBtnBase, width: 30, height: 30, borderRadius: 9,
                    background: bellOpen ? `color-mix(in srgb, ${ACCENT} 14%, transparent)` : 'var(--color-bg)',
                    border: '1px solid var(--color-border)', color: bellOpen ? ACCENT : 'var(--color-text-2)',
                  }}>
                    <Bell size={15} />
                    <span style={{ position: 'absolute', top: 5, right: 6, width: 6, height: 6, borderRadius: 999, background: '#ED6A5E' }} />
                  </button>
                  {bellOpen && <BellPopup onClose={() => setBellOpen(false)} />}
                </div>
              </div>

              {/* все разделы лежат в одной ячейке грида → высота контейнера равна
                  самому высокому разделу, и клики по меню не дёргают макет.
                  Неактивные скрыты visibility: место держат, клики не ловят. */}
              <div style={{ display: 'grid' }}>
                {[
                  <MockOverview query={query} accepted={accepted} onAccept={accept} onGo={goKey} />,
                  <MockGroups query={query} />,
                  <MockSchedule query={query} />,
                  <MockHomework query={query} accepted={accepted} onAccept={accept} />,
                  <MockJournal query={query} />,
                  <MockAnalytics />,
                ].map((panel, i) => {
                  const on = section === i
                  return (
                    <div key={SECTIONS[i].key} aria-hidden={!on} style={{
                      gridArea: '1 / 1', minWidth: 0,
                      visibility: on ? 'visible' : 'hidden',
                      pointerEvents: on ? undefined : 'none',
                    }}>
                      <div key={on ? `on-${section}-${nonce}` : 'off'} className={on ? 'lp-mock-panel' : undefined}>
                        {panel}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div key={`student-${nonce}`} ref={pageRef} className="lp-mock-panel lp-page lp-scroll" style={{ padding: 18 }}>
            <MockStudent />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12.5, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: OK, boxShadow: `0 0 0 3px color-mix(in srgb, ${OK} 25%, transparent)` }} />
        живое демо — переключайте вкладки, проверяйте работы, правьте журнал
      </div>

      <style>{`
        /* высота окна мока прибита гвоздями: любые клики внутри скроллят
           страницу мока, а не двигают секции лендинга под ним */
        .lp-page { height: 538px; }
        /* overscroll не запираем: на телефоне свайп по моку должен доводить
           страницу лендинга дальше, а не залипать внутри окна */
        .lp-scroll { overflow-y: auto; overflow-x: hidden; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--color-text-3) 35%, transparent) transparent; }
        .lp-scroll::-webkit-scrollbar { width: 8px; }
        .lp-scroll::-webkit-scrollbar-track { background: transparent; }
        .lp-scroll::-webkit-scrollbar-thumb { border-radius: 999px; background: color-mix(in srgb, var(--color-text-3) 32%, transparent); }
        .lp-mock-nav:hover { background: color-mix(in srgb, ${ACCENT} 8%, transparent); }
        .lp-mock-panel { animation: lpPanelIn .28s cubic-bezier(.22,1,.36,1); }
        @keyframes lpPanelIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .lp-spin { animation: lpSpin .62s linear; }
        @keyframes lpSpin { to { transform: rotate(360deg); } }
        .lp-pop { animation: lpPop .18s cubic-bezier(.22,1,.36,1); transform-origin: top right; }
        @keyframes lpPop { from { opacity: 0; transform: scale(.94) translateY(-4px); } to { opacity: 1; transform: none; } }
        .lp-tool:hover:not(:disabled) { background: color-mix(in srgb, var(--color-text) 8%, transparent); }
        .lp-row { transition: border-color .15s, transform .15s, background .15s; }
        .lp-row:hover { border-color: color-mix(in srgb, ${ACCENT} 40%, var(--color-border)); }
        .lp-clickrow { cursor: pointer; }
        .lp-clickrow:hover { transform: translateX(2px); }
        .lp-cell { cursor: pointer; transition: transform .12s, box-shadow .12s; }
        .lp-cell:hover { transform: scale(1.08); box-shadow: 0 0 0 2px color-mix(in srgb, ${ACCENT} 35%, transparent); }
        .lp-bar { transition: filter .15s, transform .15s; cursor: pointer; }
        .lp-bar:hover { filter: brightness(1.15); }
        .lp-chip { cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
        @media (max-width: 900px){ .lp-page{ height: 600px; } }
        @media (max-width: 640px){
          .lp-page{ height: 640px; }
          .lp-mock-side{ display:none !important; }
          .lp-mock-tabs{ display:flex !important; }
          .lp-nav-btns, .lp-tool-right{ display:none !important; }
          .lp-mock-search{ width: 110px !important; }
        }
        @media (max-width: 460px){ .lp-tab-title{ display:none !important; } }
      `}</style>
    </div>
  )
}

// ── хром ─────────────────────────────────────────────────────────────────────
const light = (c: string): CSSProperties => ({ width: 11, height: 11, borderRadius: 999, background: c, display: 'block' })

const iconBtnBase: CSSProperties = {
  display: 'grid', placeItems: 'center', border: 'none', background: 'transparent',
  color: 'inherit', cursor: 'pointer', borderRadius: 6, padding: 0, position: 'relative',
}

function ToolBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button className="lp-tool" onClick={onClick} disabled={disabled} title={title} style={{
      ...iconBtnBase, width: 26, height: 26, flexShrink: 0,
      color: 'var(--color-text-2)', opacity: disabled ? 0.32 : 1,
      cursor: disabled ? 'default' : 'pointer',
    }}>{children}</button>
  )
}

function BrowserTabBtn({ on, onClick, title }: { on: boolean; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, maxWidth: 230, minWidth: 44, height: 28, padding: '0 10px',
      borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: on ? 700 : 500,
      color: on ? 'var(--color-text)' : 'var(--color-text-3)',
      background: on ? 'var(--color-surface)' : 'transparent',
      border: `1px solid ${on ? 'var(--color-border)' : 'transparent'}`,
      boxShadow: on ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
      transition: 'background .15s, color .15s',
    }}>
      <span style={{ width: 12, height: 12, borderRadius: 4, flexShrink: 0, background: on ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'var(--color-border)' }} />
      <span className="lp-tab-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      {on && <X size={11} style={{ flexShrink: 0, opacity: 0.5 }} />}
    </button>
  )
}

function BellPopup({ onClose }: { onClose: () => void }) {
  const items = [
    { t: 'Анна К. сдала ДЗ', s: 'Часть 2 · вариант 7 · 2 мин назад', c: ACCENT },
    { t: 'Игорь П. открыл урок 12', s: 'Курс «ЕГЭ Математика» · 18 мин назад', c: ACCENT_L },
    { t: 'Журнал не заполнен', s: 'Занятие 16.09 · группа ОГЭ Русский', c: WARN },
  ]
  return (
    <div className="lp-pop" style={{
      position: 'absolute', top: 36, right: 0, width: 260, zIndex: 5, padding: 8,
      borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      boxShadow: '0 18px 40px -14px rgba(20,12,50,.45)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 6px 8px' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Уведомления</span>
        <button onClick={onClose} style={{ ...iconBtnBase, marginLeft: 'auto', width: 18, height: 18, color: 'var(--color-text-3)' }}><X size={12} /></button>
      </div>
      {items.map(n => (
        <div key={n.t} className="lp-row lp-clickrow" onClick={onClose} style={{ display: 'flex', gap: 8, padding: '8px 8px', borderRadius: 9, border: '1px solid transparent' }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: n.c, marginTop: 5, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{n.t}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{n.s}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Обзор ────────────────────────────────────────────────────────────────────
const WEEK = { '7 дней': [42, 58, 35, 72, 50, 88, 64], '30 дней': [55, 40, 78, 62, 90, 48, 70] } as const
const WEEK_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

function MockOverview({ query, accepted, onAccept, onGo }: {
  query: string; accepted: string[]; onAccept: (n: string) => void; onGo: (key: string) => void
}) {
  const [period, setPeriod] = useState<keyof typeof WEEK>('7 дней')
  const [hover, setHover] = useState<number | null>(null)
  const bars = WEEK[period]
  const queue = [
    { n: 'Анна К.', t: 'ДЗ · Часть 2 — вариант 7' },
    { n: 'Игорь П.', t: 'ДЗ · Часть 2 — вариант 5' },
    { n: 'Марк В.', t: 'Курс · Урок 12' },
  ].filter(r => r.n.toLowerCase().includes(query.trim().toLowerCase()))
  const pending = Math.max(0, 5 - accepted.length)

  return (
    <>
      {/* плитки — точки входа в разделы, как в живом кабинете */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        {[
          { k: 'Учеников', v: '24', c: ACCENT, to: 'Группы' },
          { k: 'На проверку', v: String(pending), c: pending ? ACCENT_L : OK, to: 'Домашки' },
          { k: 'Средний балл', v: (4.3 + accepted.length * 0.1).toFixed(1), c: WARN, to: 'Аналитика' },
        ].map(s => (
          <div key={s.k} className="lp-row lp-clickrow" onClick={() => onGo(s.to)} title={`Открыть «${s.to}»`}
            style={{ ...mockCard, border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6 }}>
              {s.k} <ArrowRight size={11} style={{ opacity: 0.55 }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, transition: 'color .2s' }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...mockCard, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Сдачи домашек</span>
          <Segmented value={period} options={Object.keys(WEEK) as (keyof typeof WEEK)[]} onChange={setPeriod} />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, height: 66 }}>
          {bars.map((h, i) => (
            <div key={i} className="lp-bar" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{
                flex: 1, height: `${h}%`, borderRadius: 5,
                background: hover === i || (hover === null && h === Math.max(...bars))
                  ? `linear-gradient(180deg, ${ACCENT_L}, ${ACCENT})`
                  : `color-mix(in srgb, ${ACCENT} 40%, transparent)`,
                transition: 'height .3s cubic-bezier(.22,1,.36,1), background .15s',
              }} />
          ))}
          {hover !== null && (
            <div style={{
              position: 'absolute', left: `${(hover + 0.5) * (100 / bars.length)}%`, transform: 'translate(-50%, -100%)', top: -4,
              padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 8px 20px -8px rgba(20,12,50,.4)',
            }}>{WEEK_LABELS[hover]} · {Math.round(bars[hover] / 4)} сдач</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {queue.map(r => {
          const ok = accepted.includes(r.n)
          return (
            <div key={r.n} className="lp-row" style={mockRow}>
              <Avatar name={r.n} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.t}</div>
              </div>
              {ok
                ? <span style={pill(true)}><Check size={11} /> Принято</span>
                : <button onClick={() => onAccept(r.n)} style={{ ...pill(false), cursor: 'pointer', border: `1px solid color-mix(in srgb, ${ACCENT} 35%, transparent)` }}>Проверить</button>}
            </div>
          )
        })}
        {!queue.length && <Empty />}
      </div>
    </>
  )
}

// ── Группы ───────────────────────────────────────────────────────────────────
const GROUPS = [
  { n: 'ЕГЭ Математика', s: 'Профиль · пн/чт 18:00', cnt: 12, avg: '4.5', st: ['Анна К.', 'Игорь П.', 'Марк В.', 'Лена С.'] },
  { n: 'ОГЭ Русский', s: 'вт/сб 16:00', cnt: 8, avg: '4.1', st: ['Пётр Д.', 'Соня М.', 'Кира Ж.'] },
  { n: 'Индивидуальные', s: '1:1 · гибкий график', cnt: 4, avg: '4.7', st: ['Юля Т.', 'Тимур А.'] },
]

function MockGroups({ query }: { query: string }) {
  const [open, setOpen] = useState<string | null>(null)
  const q = query.trim().toLowerCase()
  const list = GROUPS.filter(g => !q || g.n.toLowerCase().includes(q) || g.st.some(s => s.toLowerCase().includes(q)))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {list.map(g => {
        const on = open === g.n
        return (
          <div key={g.n} className="lp-row" style={{ ...mockCard, padding: 0, overflow: 'hidden' }}>
            <div className="lp-clickrow" onClick={() => setOpen(on ? null : g.n)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 15, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` }}>{g.n[0]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{g.n}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>{g.s}</div>
              </div>
              <div className="lp-stack" style={{ display: 'flex' }}>
                {Array.from({ length: Math.min(g.cnt, 4) }).map((_, i) => (
                  <span key={i} style={{ width: 22, height: 22, borderRadius: 999, marginLeft: i ? -7 : 0, border: '2px solid var(--color-surface)', background: `linear-gradient(135deg, ${ACCENT_L}, ${ACCENT})` }} />
                ))}
                {g.cnt > 4 && <span style={{ width: 22, height: 22, borderRadius: 999, marginLeft: -7, border: '2px solid var(--color-surface)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, color: 'var(--color-text-2)', background: 'var(--color-bg)' }}>+{g.cnt - 4}</span>}
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 9px', borderRadius: 999, color: WARN, background: `color-mix(in srgb, ${WARN} 15%, transparent)` }}>★ {g.avg}</span>
              <ChevronRight size={15} style={{ color: 'var(--color-text-3)', flexShrink: 0, transform: on ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }} />
            </div>
            {on && (
              <div className="lp-mock-panel" style={{ padding: '0 15px 13px', display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {g.st.map(s => (
                  <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 5px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <Avatar name={s} size={18} /> {s}
                  </span>
                ))}
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: ACCENT, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, cursor: 'pointer' }}>
                  <Plus size={12} /> Добавить
                </span>
              </div>
            )}
          </div>
        )
      })}
      {!list.length && <Empty />}
    </div>
  )
}

// ── Расписание: неделя, перенос занятий, «провести» ──────────────────────────
const DAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const WEEK_DATES = ['16.09', '17.09', '18.09', '19.09', '20.09', '21.09', '22.09']
type Slot = { id: string; day: number; time: string; who: string; topic: string; solo: boolean }
const SCHEDULE: Slot[] = [
  { id: 's1', day: 0, time: '18:00', who: 'ЕГЭ Математика', topic: 'Иррациональные уравнения', solo: false },
  { id: 's2', day: 1, time: '16:00', who: 'ОГЭ Русский', topic: 'Сочинение 9.3', solo: false },
  { id: 's3', day: 1, time: '19:30', who: 'Юля Т.', topic: 'Разбор варианта 7', solo: true },
  { id: 's4', day: 3, time: '18:00', who: 'ЕГЭ Математика', topic: 'Параметры · часть 2', solo: false },
  { id: 's5', day: 4, time: '17:00', who: 'Тимур А.', topic: 'Тригонометрия с нуля', solo: true },
  { id: 's6', day: 5, time: '16:00', who: 'ОГЭ Русский', topic: 'Изложение', solo: false },
  { id: 's7', day: 5, time: '18:30', who: 'ЕГЭ Математика', topic: 'Пробник', solo: false },
]

function MockSchedule({ query }: { query: string }) {
  const [slots, setSlots] = useState(SCHEDULE)
  const [day, setDay] = useState(1)
  const [held, setHeld] = useState<string[]>([])   // «проведено» → в журнал
  const [added, setAdded] = useState(0)
  const q = query.trim().toLowerCase()
  const match = (s: Slot) => !q || s.who.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q)

  const visible = slots.filter(match)
  const ofDay = visible.filter(s => s.day === day).sort((a, b) => a.time.localeCompare(b.time))
  // перенос: занятие уезжает на следующий день недели, вс → пн
  const move = (id: string) => setSlots(list => list.map(s => (s.id === id ? { ...s, day: (s.day + 1) % 7 } : s)))
  const hold = (id: string) => setHeld(h => (h.includes(id) ? h.filter(x => x !== id) : [...h, id]))
  const add = () => {
    const n = added + 1
    setAdded(n)
    setSlots(list => [...list, { id: `new${n}`, day, time: '20:00', who: 'Новая группа', topic: 'Тема не задана', solo: false }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* полоса недели — кликом выбираем день */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {DAY_LABELS.map((d, i) => {
          const cnt = visible.filter(s => s.day === i).length
          const on = day === i
          return (
            <button key={d} onClick={() => setDay(i)} className="lp-chip" style={{
              padding: '8px 4px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              border: `1px solid ${on ? `color-mix(in srgb, ${ACCENT} 55%, var(--color-border))` : 'var(--color-border)'}`,
              background: on ? `color-mix(in srgb, ${ACCENT} 12%, var(--color-bg))` : 'var(--color-bg)',
              color: on ? ACCENT : 'var(--color-text-2)',
            }}>
              <div style={{ fontSize: 10.5, opacity: 0.75 }}>{d}</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{WEEK_DATES[i].slice(0, 2)}</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 4, height: 5 }}>
                {Array.from({ length: cnt }).map((_, k) => (
                  <span key={k} style={{ width: 5, height: 5, borderRadius: 999, background: on ? ACCENT : `color-mix(in srgb, ${ACCENT} 45%, transparent)` }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* занятия выбранного дня */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ofDay.map(s => {
          const on = held.includes(s.id)
          return (
            <div key={s.id} className="lp-row" style={{ ...mockRow, alignItems: 'stretch', gap: 12, padding: '11px 13px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 46, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: on ? OK : ACCENT }}>{s.time}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{s.solo ? '1:1' : 'группа'}</span>
              </div>
              <div style={{ width: 3, borderRadius: 999, background: on ? OK : `linear-gradient(180deg, ${ACCENT}, ${ACCENT_2})`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.who}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.topic}</div>
              </div>
              <div className="lp-slot-btns" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button onClick={() => move(s.id)} title="Перенести на следующий день" style={{
                  ...iconBtnBase, width: 28, height: 28, borderRadius: 9, color: 'var(--color-text-2)',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                }}><ChevronRight size={14} /></button>
                <button onClick={() => hold(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 700, border: '1px solid transparent', color: '#fff',
                  background: on ? OK : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, transition: 'background .2s',
                }}>
                  {on ? <><Check size={12} /> Проведено</> : <><Play size={11} /> Провести</>}
                </button>
              </div>
            </div>
          )
        })}
        {!ofDay.length && (
          <div style={{ ...mockCard, textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--color-text-3)' }}>
            {q ? 'Ничего не нашлось — очистите поиск' : `${DAY_LABELS[day]}, ${WEEK_DATES[day]} — занятий нет`}
          </div>
        )}
        <button onClick={add} className="lp-clickrow" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 11,
          fontSize: 12, fontWeight: 700, cursor: 'pointer', color: ACCENT,
          background: `color-mix(in srgb, ${ACCENT} 8%, transparent)`,
          border: `1px dashed color-mix(in srgb, ${ACCENT} 40%, transparent)`,
        }}><Plus size={13} /> Добавить занятие</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, color: 'var(--color-text-3)' }}>
        <Clock size={12} /> Проведённые занятия сразу попадают в журнал — отмечать дважды не нужно.
      </div>
      <style>{`@media (max-width: 560px){ .lp-slot-btns{ flex-direction: column; align-items: stretch !important; } }`}</style>
    </div>
  )
}

// ── Домашки: проверка части 2 с аннотацией ───────────────────────────────────
const HW_QUEUE = [
  { n: 'Анна К.', t: 'Часть 2 · вар. 7', task: 'задание 13' },
  { n: 'Игорь П.', t: 'Часть 2 · вар. 5', task: 'задание 15' },
  { n: 'Марк В.', t: 'Урок 12', task: 'задание 9' },
  { n: 'Лена С.', t: 'Тренажёр · линия 8', task: 'задание 8' },
]
// частые замечания — вставляются в комментарий одним кликом
const NOTE_PRESETS = [
  { k: 'ОДЗ', text: 'здесь потеряли ОДЗ — минус 1 балл.' },
  { k: 'Арифметика', text: 'в третьей строке −6 вместо −4, дальше всё верно.' },
  { k: 'Оформление', text: 'нет пояснения к переходу — на экзамене снимут балл.' },
]

function MockHomework({ query, accepted, onAccept }: { query: string; accepted: string[]; onAccept: (n: string) => void }) {
  const q = query.trim().toLowerCase()
  const list = HW_QUEUE.filter(r => !q || r.n.toLowerCase().includes(q))
  const [pick, setPick] = useState(0)
  const [tools, setTools] = useState<string[]>(['pen', 'note'])
  const [grade, setGrade] = useState<number | null>(null)
  const [note, setNote] = useState(0)                 // выбранный шаблон комментария
  const [rework, setRework] = useState<string[]>([])  // отправленные на доработку
  // выданный стикер: балл + счётчик, чтобы перезапускать анимацию «приклеивания»
  const [award, setAward] = useState<{ score: number; n: number; who: string } | null>(null)
  const cur = list[Math.min(pick, list.length - 1)] ?? HW_QUEUE[0]
  const toggle = (t: string) => setTools(s => (s.includes(t) ? s.filter(x => x !== t) : [...s, t]))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 12 }} className="lp-mock-hw">
      <div style={{ ...mockCard, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur.n} · {cur.task}</span>
          {[{ id: 'pen', icon: Pencil, t: 'Перо' }, { id: 'shape', icon: Circle, t: 'Фигура' }, { id: 'note', icon: MessageSquare, t: 'Комментарий' }].map(t => {
            const on = tools.includes(t.id)
            return (
              <button key={t.id} title={t.t} onClick={() => toggle(t.id)} style={{
                ...iconBtnBase, width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                color: on ? '#fff' : 'var(--color-text-2)',
                background: on ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'var(--color-surface)',
                border: '1px solid var(--color-border)', transition: 'background .15s, color .15s',
              }}><t.icon size={12} /></button>
            )
          })}
        </div>
        <div style={{ position: 'relative', padding: 14 }} key={cur.n}>
          {[92, 80, 88, 64].map((w, i) => (
            <div key={i} style={{ height: 8, width: `${w}%`, borderRadius: 4, marginBottom: 9, background: 'color-mix(in srgb, var(--color-text-3) 28%, transparent)' }} />
          ))}
          <svg viewBox="0 0 200 90" style={{ position: 'absolute', inset: 14, width: 'calc(100% - 28px)', height: 'calc(100% - 28px)', pointerEvents: 'none' }}>
            {tools.includes('pen') && <path d="M8,20 C40,10 70,34 120,18" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" className="lp-draw" />}
            {tools.includes('shape') && <>
              <circle cx="150" cy="52" r="14" fill="none" stroke={WARN} strokeWidth="2.4" />
              <path d="M150,66 L150,82" stroke={WARN} strokeWidth="2.4" strokeLinecap="round" />
            </>}
          </svg>
          {tools.includes('note') && (
            <>
              <div key={note} className="lp-mock-panel" style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, fontSize: 11.5, lineHeight: 1.4, color: 'var(--color-text-2)', background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${ACCENT} 30%, transparent)` }}>
                <b style={{ color: ACCENT }}>Комментарий:</b> {NOTE_PRESETS[note].text}
              </div>
              {/* заготовки комментариев — учитель не печатает одно и то же руками */}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {NOTE_PRESETS.map((p, i) => (
                  <button key={p.k} className="lp-chip" onClick={() => setNote(i)} style={{
                    padding: '4px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: note === i ? 700 : 500, cursor: 'pointer',
                    color: note === i ? '#fff' : 'var(--color-text-2)',
                    background: note === i ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}>{p.k}</button>
                ))}
              </div>
            </>
          )}
        </div>
        {/* вердикт */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>Балл</span>
          {[2, 3, 4, 5].map(g => (
            <button key={g} className="lp-chip" onClick={() => setGrade(g)} style={{
              width: 24, height: 24, borderRadius: 8, fontSize: 12, fontWeight: 700,
              color: grade === g ? '#fff' : 'var(--color-text-2)',
              background: grade === g ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}>{g}</button>
          ))}
          {/* вернуть на доработку: работа остаётся у ученика, стикер не выдаётся */}
          <button onClick={() => setRework(r => (r.includes(cur.n) ? r.filter(x => x !== cur.n) : [...r, cur.n]))} style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9,
            fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            color: rework.includes(cur.n) ? '#fff' : WARN,
            background: rework.includes(cur.n) ? WARN : `color-mix(in srgb, ${WARN} 13%, transparent)`,
            border: `1px solid color-mix(in srgb, ${WARN} 40%, transparent)`, transition: 'background .2s, color .2s',
          }}>
            <Undo2 size={12} /> {rework.includes(cur.n) ? 'Отправлено' : 'На доработку'}
          </button>
          <button onClick={() => {
            const g = grade ?? 4
            onAccept(cur.n); setGrade(g)
            setRework(r => r.filter(x => x !== cur.n))
            setAward(a => ({ score: g, n: (a?.n ?? 0) + 1, who: cur.n }))
          }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 9,
            fontSize: 11.5, fontWeight: 700, cursor: 'pointer', color: '#fff', border: 'none',
            background: accepted.includes(cur.n) ? OK : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
          }}>
            <Check size={12} /> {accepted.includes(cur.n) ? 'Принято' : 'Принять'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {award && <AwardCard score={award.score} who={award.who} nonce={award.n} />}
        {list.map((r, i) => {
          const on = cur.n === r.n
          const ok = accepted.includes(r.n)
          return (
            <div key={r.n} className="lp-row lp-clickrow" onClick={() => setPick(i)} style={{
              ...mockRow,
              borderColor: on ? `color-mix(in srgb, ${ACCENT} 55%, var(--color-border))` : 'var(--color-border)',
              background: on ? `color-mix(in srgb, ${ACCENT} 8%, var(--color-bg))` : 'var(--color-bg)',
            }}>
              <Avatar name={r.n} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.n}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{r.t}</div>
              </div>
              {rework.includes(r.n) && !ok
                ? <span style={{ ...pill(false), color: WARN, background: `color-mix(in srgb, ${WARN} 15%, transparent)` }}>Доработка</span>
                : <span style={pill(ok)}>{ok ? 'Принято' : 'Проверить'}</span>}
            </div>
          )
        })}
        {!list.length && <Empty />}
      </div>
      <style>{`
        @media (max-width: 560px){ .lp-mock-hw{ grid-template-columns: 1fr !important; } }
        .lp-draw { stroke-dasharray: 160; stroke-dashoffset: 0; animation: lpDraw .45s ease; }
        @keyframes lpDraw { from { stroke-dashoffset: 160; } to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  )
}

// Стикер, который ученик получает за принятое задание: балл = редкость фольги.
function AwardCard({ score, who, nonce }: { score: number; who: string; nonce: number }) {
  const tier = tierOf(score)
  return (
    <div className="lp-mock-panel" style={{
      ...mockCard, position: 'relative', zIndex: 1,
      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
      background: `linear-gradient(135deg, color-mix(in srgb, ${tier.ink} 16%, var(--color-bg)), var(--color-bg))`,
      borderColor: `color-mix(in srgb, ${tier.ink} 45%, var(--color-border))`,
    }}>
      {/* Стикер крупный и лежит внахлёст: сама печать занимает ~2/3 квадрата
          (остальное — воздух под отогнутый уголок), поэтому поля отрицательные
          с запасом — иначе кажется, что стикер аккуратно вписан в карточку. */}
      <HoloSticker
        key={nonce} score={score} sublabel="задание 13" size={156} reveal
        style={{ margin: '-77px 0 -21px -45px', flex: '0 0 auto' }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800 }}>{who} получает стикер</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>«{tier.name}» · {score} из 5 — в коллекцию</div>
      </div>
    </div>
  )
}

// ── Журнал: клик по клетке меняет отметку ────────────────────────────────────
const JOURNAL_ROWS = [
  { n: 'Анна К.', cells: ['5', '4', '✓', '5', '5'] },
  { n: 'Игорь П.', cells: ['4', '✓', '3', '4', '✓'] },
  { n: 'Марк В.', cells: ['✓', '5', '5', '·', '4'] },
  { n: 'Лена С.', cells: ['3', '4', '✓', '5', '5'] },
]
const DATES = ['02.09', '05.09', '09.09', '12.09', '16.09']
const CYCLE = ['·', '✓', '5', '4', '3']

function MockJournal({ query }: { query: string }) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  const q = query.trim().toLowerCase()
  const rows = JOURNAL_ROWS.filter(r => !q || r.n.toLowerCase().includes(q))
  const bump = (k: string, cur: string) => setEdits(e => ({ ...e, [k]: CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length] }))
  const val = (name: string, i: number, base: string) => edits[`${name}-${i}`] ?? base

  // клик по дате — отметить всю колонку присутствующими; повторный клик снимает
  const markColumn = (i: number) => {
    const all = rows.every(r => val(r.n, i, r.cells[i]) === '✓')
    setEdits(e => {
      const next = { ...e }
      rows.forEach(r => { if (all) delete next[`${r.n}-${i}`]; else next[`${r.n}-${i}`] = '✓' })
      return next
    })
  }

  return (
    <div style={{ ...mockCard, overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `96px repeat(${DATES.length}, 1fr) 44px`, gap: 6, minWidth: 380 }}>
        <div />
        {DATES.map((d, i) => (
          <button key={d} className="lp-chip" onClick={() => markColumn(i)} title="Отметить всех присутствующими"
            style={{ fontSize: 10.5, color: 'var(--color-text-3)', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'transparent', padding: '2px 0', borderRadius: 6 }}>
            {d}
          </button>
        ))}
        <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', textAlign: 'center', fontWeight: 600 }}>ср.</div>
        {rows.map(r => (
          <JournalRow key={r.n} name={r.n} cells={r.cells} edits={edits} onCell={bump} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--color-text-3)' }}>
        <span>Клик по клетке меняет отметку: · → ✓ → 5 → 4 → 3. Клик по дате — отметить всю колонку.</span>
      </div>
      {!rows.length && <Empty />}
    </div>
  )
}

function JournalRow({ name, cells, edits, onCell }: {
  name: string; cells: string[]; edits: Record<string, string>; onCell: (k: string, cur: string) => void
}) {
  const values = cells.map((base, i) => edits[`${name}-${i}`] ?? base)
  const marks = values.filter(v => /^[2-5]$/.test(v)).map(Number)
  const avg = marks.length ? (marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(1) : '—'
  return (
    <>
      <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
        <Avatar name={name} size={20} /> {name}
      </div>
      {values.map((v, i) => {
        const { c, bg } = cellColor(v)
        return (
          <div key={`${name}-${i}`} className="lp-cell" onClick={() => onCell(`${name}-${i}`, v)}
            style={{ height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 700, color: c, background: bg }}>
            {v}
          </div>
        )
      })}
      <div style={{ height: 30, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: marks.length ? ACCENT : 'var(--color-text-3)' }}>{avg}</div>
    </>
  )
}

function cellColor(v: string) {
  if (v === '✓') return { c: OK, bg: `color-mix(in srgb, ${OK} 16%, transparent)` }
  if (v === '·') return { c: 'var(--color-text-3)', bg: 'color-mix(in srgb, var(--color-text-3) 8%, transparent)' }
  if (v === '5') return { c: ACCENT, bg: `color-mix(in srgb, ${ACCENT} 15%, transparent)` }
  if (v === '3') return { c: '#E8934F', bg: 'color-mix(in srgb, #E8934F 15%, transparent)' }
  return { c: WARN, bg: `color-mix(in srgb, ${WARN} 14%, transparent)` }
}

// ── Аналитика: диапазон + наведение на график ────────────────────────────────
const RANGES = {
  'Неделя': [40, 52, 46, 60, 55, 68, 62],
  'Месяц': [30, 44, 40, 58, 52, 70, 66, 82],
  'Квартал': [22, 35, 30, 48, 44, 62, 58, 74, 70, 88],
} as const

// срез по группе: сдвиг кривой и своё распределение оценок
const SLICES = {
  'Все': { shift: 0, bars: [12, 34, 78, 92], hw: '92%', act: '21 / 24' },
  'ЕГЭ Матем.': { shift: 8, bars: [6, 22, 70, 96], hw: '96%', act: '12 / 12' },
  'ОГЭ Русский': { shift: -10, bars: [20, 52, 74, 60], hw: '81%', act: '6 / 8' },
} as const

function MockAnalytics() {
  const [range, setRange] = useState<keyof typeof RANGES>('Месяц')
  const [slice, setSlice] = useState<keyof typeof SLICES>('Все')
  const [hover, setHover] = useState<number | null>(null)
  const line = RANGES[range].map(v => Math.max(6, Math.min(94, v + SLICES[slice].shift)))
  const pts = line.map((v, i) => `${(i / (line.length - 1)) * 100},${100 - v}`).join(' ')
  // 0..100 графика → правдоподобный балл 3.0–4.9 (та же шкала в тултипе и в дельте)
  const score = (v: number) => 3 + v / 50
  const grow = (score(line[line.length - 1]) - score(line[0])).toFixed(1)
  const CHART_H = 84

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>Срез</span>
        <Segmented value={slice} options={Object.keys(SLICES) as (keyof typeof SLICES)[]} onChange={s => { setSlice(s); setHover(null) }} />
      </div>
      <div style={mockCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Средний балл потока</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: OK }}>▲ +{grow}</span>
          <Segmented value={range} options={Object.keys(RANGES) as (keyof typeof RANGES)[]} onChange={r => { setRange(r); setHover(null) }} />
        </div>
        <div style={{ position: 'relative' }}
          onMouseLeave={() => setHover(null)}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect()
            setHover(Math.max(0, Math.min(line.length - 1, Math.round(((e.clientX - r.left) / r.width) * (line.length - 1)))))
          }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: CHART_H, display: 'block' }}>
            <defs>
              <linearGradient id="lpArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
                <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,100 ${pts} 100,100`} fill="url(#lpArea)" />
            <polyline points={pts} fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {hover !== null && <>
              <line x1={(hover / (line.length - 1)) * 100} y1="0" x2={(hover / (line.length - 1)) * 100} y2="100"
                stroke={ACCENT} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke" />
              <circle cx={(hover / (line.length - 1)) * 100} cy={100 - line[hover]} r="3" fill={ACCENT} stroke="var(--color-surface)" strokeWidth="1.4"
                vectorEffect="non-scaling-stroke" style={{ transformBox: 'fill-box' }} />
            </>}
          </svg>
          {hover !== null && (
            // держим подсказку внутри графика, иначе она наезжает на переключатель диапазона
            <div style={{
              position: 'absolute', left: `${(hover / (line.length - 1)) * 100}%`,
              top: Math.max(0, ((100 - line[hover]) / 100) * CHART_H - 26),
              transform: `translateX(${hover === 0 ? '0' : hover === line.length - 1 ? '-100%' : '-50%'})`,
              padding: '3px 7px', borderRadius: 8, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 8px 20px -8px rgba(20,12,50,.4)',
            }}>{score(line[hover]).toFixed(1)} балла</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="lp-mock-an">
        <div style={mockCard}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Распределение оценок</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 56 }}>
            {SLICES[slice].bars.map((h, i) => (
              <div key={i} className="lp-bar" title={`Оценка ${i + 2}`} style={{
                flex: 1, height: `${h}%`, borderRadius: 5, background: `linear-gradient(180deg, ${ACCENT_L}, ${ACCENT})`,
                transition: 'height .3s cubic-bezier(.22,1,.36,1)',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            {['2', '3', '4', '5'].map(g => <div key={g} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: 'var(--color-text-3)' }}>{g}</div>)}
          </div>
        </div>
        <div style={{ ...mockCard, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          {[{ k: 'Сдаваемость ДЗ', v: SLICES[slice].hw }, { k: 'Активных за неделю', v: SLICES[slice].act }].map(s => (
            <div key={s.k}>
              <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{s.k}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: ACCENT }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 520px){ .lp-mock-an{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

// ── Вкладка «Кабинет ученика» ────────────────────────────────────────────────
const LESSONS = ['Урок 9', 'Урок 10', 'Урок 11', 'Урок 12', 'Урок 13', 'Урок 14']
const QUIZ = {
  q: 'Найдите ОДЗ: √(x − 3)',
  opts: ['x ≥ 3', 'x > 3', 'x ≤ 3', 'x ∈ ℝ'],
  right: 0,
}
// задание «последовательность»: порядок шагов решения проверяется автоматически
const STEPS = ['Записать ОДЗ', 'Возвести обе части в квадрат', 'Решить квадратное уравнение', 'Отсеять корни по ОДЗ']
const STEPS_SHUFFLED = [2, 0, 3, 1]   // как шаги лежат в банке до сборки
// коллекция стикеров: балл за задание = редкость фольги
const COLLECTION = [
  { score: 5, label: 'Урок 11', sub: 'Уравнения', got: true },
  { score: 4, label: 'Урок 10', sub: 'Степени', got: true },
  { score: 5, label: 'Вариант 6', sub: 'Часть 2', got: true },
  { score: 3, label: 'Линия 8', sub: 'Тренажёр', got: true },
  { score: 5, label: 'Урок 12', sub: 'ещё не открыт', got: false },
  { score: 4, label: 'Пробник', sub: 'ещё не открыт', got: false },
]

function MockStudent() {
  const [done, setDone] = useState(3)          // сколько уроков пройдено
  const [pick, setPick] = useState(3)          // выбранный узел трека
  const [sent, setSent] = useState(false)
  const [answer, setAnswer] = useState<number | null>(null)
  const [mode, setMode] = useState<'Тест' | 'Порядок'>('Тест')
  const pct = Math.round((done / LESSONS.length) * 100)

  const submit = () => {
    setSent(true)
    if (pick >= done) setDone(d => Math.min(LESSONS.length, d + 1))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14 }} className="lp-mock-st">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* шапка ученика */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name="Анна К." size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Привет, Анна</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>ЕГЭ Математика · профиль</div>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, padding: '5px 10px', borderRadius: 999, color: WARN, background: `color-mix(in srgb, ${WARN} 14%, transparent)` }}>
            <Flame size={12} /> 12 дней
          </span>
        </div>

        {/* трек курса */}
        <div style={mockCard}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Курс · прогресс {pct}%</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{done} из {LESSONS.length}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'color-mix(in srgb, var(--color-text-3) 16%, transparent)', marginBottom: 14, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_L})`, transition: 'width .4s cubic-bezier(.22,1,.36,1)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {LESSONS.map((l, i) => {
              const state = i < done ? 'done' : i === done ? 'now' : 'lock'
              const on = pick === i
              return (
                <div key={l} style={{ display: 'flex', alignItems: 'center', flex: i === LESSONS.length - 1 ? '0 0 auto' : 1 }}>
                  <button title={l} onClick={() => { setPick(i); setSent(false) }} style={{
                    width: 30, height: 30, borderRadius: 999, flexShrink: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
                    fontSize: 11, fontWeight: 700, transition: 'transform .15s, box-shadow .15s',
                    color: state === 'lock' ? 'var(--color-text-3)' : '#fff',
                    background: state === 'done' ? OK : state === 'now' ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'var(--color-surface)',
                    border: `1px solid ${state === 'lock' ? 'var(--color-border)' : 'transparent'}`,
                    boxShadow: on ? `0 0 0 3px color-mix(in srgb, ${ACCENT} 30%, transparent)` : 'none',
                  }}>
                    {state === 'done' ? <Check size={14} /> : state === 'now' ? <Play size={12} /> : <Lock size={11} />}
                  </button>
                  {i < LESSONS.length - 1 && (
                    <div style={{ flex: 1, height: 3, borderRadius: 999, background: i < done ? OK : 'color-mix(in srgb, var(--color-text-3) 16%, transparent)', transition: 'background .3s' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* карточка выбранного урока */}
        <div key={pick} className="lp-mock-panel" style={mockCard}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>{LESSONS[pick]} · Иррациональные уравнения</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginBottom: 12 }}>Конспект · 6 заданий · дедлайн 18.09</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={submit} disabled={sent} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none',
              fontSize: 12.5, fontWeight: 700, color: '#fff', cursor: sent ? 'default' : 'pointer',
              background: sent ? OK : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
              transition: 'background .2s',
            }}>
              {sent ? <><Check size={14} /> Отправлено</> : 'Сдать домашку'}
            </button>
            <button style={{ padding: '9px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-2)', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              Открыть конспект
            </button>
          </div>
          {sent && (
            <div className="lp-mock-panel" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 10, fontSize: 11.5, color: OK, background: `color-mix(in srgb, ${OK} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${OK} 30%, transparent)` }}>
              Работа ушла преподавателю — он увидит её в очереди проверки.
            </div>
          )}
        </div>

        {/* полка стикеров живёт в левой колонке: так обе колонки примерно равны
            по высоте, и переключение вкладок браузера не меняет высоту окна */}
        <StickerShelf />
      </div>

      {/* тренажёр: два типа заданий — тест и сборка последовательности */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={mockCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Тренажёр · линия 8</span>
            <Segmented value={mode} options={['Тест', 'Порядок']} onChange={setMode} />
          </div>
          {mode === 'Порядок' ? <StepsTask /> : <>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{QUIZ.q}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {QUIZ.opts.map((o, i) => {
              const chosen = answer === i
              const right = i === QUIZ.right
              const show = answer !== null && (chosen || right)
              return (
                <button key={o} onClick={() => setAnswer(i)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, textAlign: 'left',
                  color: show ? (right ? OK : '#ED6A5E') : 'var(--color-text)',
                  background: show ? `color-mix(in srgb, ${right ? OK : '#ED6A5E'} 12%, transparent)` : 'var(--color-surface)',
                  border: `1px solid ${show ? `color-mix(in srgb, ${right ? OK : '#ED6A5E'} 40%, transparent)` : 'var(--color-border)'}`,
                  transition: 'background .15s, border-color .15s, color .15s',
                }}>
                  <span style={{ width: 18, height: 18, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    {show ? (right ? <Check size={11} /> : <X size={11} />) : String.fromCharCode(65 + i)}
                  </span>
                  {o}
                </button>
              )
            })}
          </div>
          {answer !== null && (
            <div className="lp-mock-panel" style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
              {answer === QUIZ.right ? 'Верно: подкоренное выражение неотрицательно.' : 'Не то: корень определён и при x = 3 — знак нестрогий.'}
            </div>
          )}
          </>}
        </div>
        <div style={{ ...mockCard, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', color: ACCENT, background: `color-mix(in srgb, ${ACCENT} 13%, transparent)` }}>
            <Bell size={15} />
          </span>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-2)', lineHeight: 1.4 }}>
            Преподаватель проверил вариант 6 — <b style={{ color: ACCENT }}>оценка 5</b>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 700px){ .lp-mock-st{ grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

// Задание «расставь по порядку»: клик по шагу отправляет его в решение,
// клик по шагу в решении возвращает обратно. Проверка — когда собраны все.
function StepsTask() {
  const [order, setOrder] = useState<number[]>([])
  const bank = STEPS_SHUFFLED.filter(i => !order.includes(i))
  const full = order.length === STEPS.length
  const ok = full && order.every((v, i) => v === i)

  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 10 }}>Расставьте шаги решения √(x − 3) = x − 5</div>
      {/* собранное решение */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6, minHeight: 42, padding: 8, borderRadius: 10, marginBottom: 8,
        background: 'var(--color-surface)', border: `1px dashed ${full ? (ok ? `color-mix(in srgb, ${OK} 45%, transparent)` : 'color-mix(in srgb, #ED6A5E 45%, transparent)') : 'var(--color-border)'}`,
        transition: 'border-color .2s',
      }}>
        {order.map((s, pos) => {
          const right = full && s === pos
          return (
            <button key={s} onClick={() => setOrder(o => o.filter(x => x !== s))} className="lp-chip" style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, cursor: 'pointer',
              fontSize: 12, fontWeight: 600, textAlign: 'left', border: '1px solid var(--color-border)',
              color: full ? (right ? OK : '#ED6A5E') : 'var(--color-text)',
              background: full ? `color-mix(in srgb, ${right ? OK : '#ED6A5E'} 12%, transparent)` : 'var(--color-bg)',
              transition: 'background .15s, color .15s',
            }}>
              <span style={{ width: 17, height: 17, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#fff', background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` }}>{pos + 1}</span>
              {STEPS[s]}
            </button>
          )
        })}
        {!order.length && <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', padding: '5px 2px' }}>Кликайте по шагам ниже — они встанут по порядку</div>}
      </div>
      {/* банк шагов */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {bank.map(s => (
          <button key={s} onClick={() => setOrder(o => [...o, s])} className="lp-chip" style={{
            padding: '7px 11px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: 'var(--color-text)', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          }}>{STEPS[s]}</button>
        ))}
      </div>
      {full && (
        <div className="lp-mock-panel" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11.5, lineHeight: 1.45, color: ok ? OK : 'var(--color-text-2)' }}>
          {ok ? 'Верно — порядок шагов правильный, задание засчитано.' : 'Порядок не тот: ОДЗ пишут до возведения в квадрат.'}
          {!ok && <button onClick={() => setOrder([])} style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', color: ACCENT, background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`, border: 'none' }}>Заново</button>}
        </div>
      )}
    </div>
  )
}

// Полка стикеров: клик по бейджу поднимает его в голо-превью.
// Живой WebGL-рендер держим один — остальные бейджи статичные.
function StickerShelf() {
  const [sel, setSel] = useState(0)
  const cur = COLLECTION[sel]
  const tier = tierOf(cur.score)
  const got = COLLECTION.filter(c => c.got).length

  return (
    <div style={mockCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Sparkles size={13} style={{ color: ACCENT }} />
        <span style={{ fontSize: 12, fontWeight: 700 }}>Коллекция стикеров</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-3)' }}>{got} из {COLLECTION.length}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <HoloSticker key={sel} score={cur.score} sublabel={cur.label} size={76} reveal />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: tier.ink }}>{tier.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{cur.got ? tier.hint : 'Сдайте задание на 5 — и стикер откроется'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {COLLECTION.map((c, i) => (
          <StickerBadge key={c.label} score={c.score} label={c.label} size={46} locked={!c.got} onClick={() => setSel(i)}
            style={{ cursor: 'pointer', outline: sel === i ? `2px solid ${ACCENT}` : 'none', outlineOffset: 2, borderRadius: 10 }} />
        ))}
      </div>
    </div>
  )
}

// ── мелочи ───────────────────────────────────────────────────────────────────
function Segmented<T extends string>({ value, options, onChange }: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, padding: 3, borderRadius: 9, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {options.map(o => (
        <button key={o} className="lp-chip" onClick={() => onChange(o)} style={{
          padding: '3px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: value === o ? 700 : 500, border: 'none',
          color: value === o ? '#fff' : 'var(--color-text-2)',
          background: value === o ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})` : 'transparent',
        }}>{o}</button>
      ))}
    </div>
  )
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff',
      background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_L})`,
    }}>{name[0]}</span>
  )
}

function Empty() {
  return <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 12, color: 'var(--color-text-3)' }}>Ничего не нашлось — очистите поиск</div>
}

const mockCard: CSSProperties = { padding: '14px 16px', borderRadius: 12, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }
const mockRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }
const pill = (ok: boolean): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap',
  color: ok ? OK : ACCENT,
  background: ok ? `color-mix(in srgb, ${OK} 16%, transparent)` : `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
})
