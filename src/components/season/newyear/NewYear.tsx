import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useSeason, newYearImg, type SeasonVariant, type NewYearVariant } from '../../../lib/season'
import { useStickers, usePinnedSticker, stickerImg, openStickerAlbum, earnSticker } from '../../../lib/seasonStickers'
import { getStudentSession } from '../../../lib/studentSession'
import { useT } from '../../../lib/i18n'
import './newyear.css'

/*
 * Новый год 2027 на главной ученика: шапка-баннер с гирляндой, снег, сугроб,
 * Огонёк над текущим уроком и виджет сезона в полосе виджетов. Макеты — Figma
 * «Искра», стр. «19 · Искра · Новый год 2027 · концепты» (секции A/B/C).
 *
 * Всё декоративное — aria-hidden и без касаний. Цвета — своими классами в
 * newyear.css (оттенок курса пишет переменные инлайном на <html>, см. season.ts).
 */

export const isNewYearVariant = (v: SeasonVariant | null | undefined): v is NewYearVariant =>
  v === 'yolka' || v === 'polnoch' || v === 'shar'

/** Вариант нового года на экране, иначе null. */
export function useNewYear(): NewYearVariant | null {
  const s = useSeason()
  return s.active && s.season?.key === 'new-year' && isNewYearVariant(s.variant) ? s.variant : null
}

type HeroCopy = { chip: string; title: string; sub: string }
export function newYearCopy(v: NewYearVariant): HeroCopy {
  if (v === 'polnoch') return { chip: 'Новый год в Искре', title: 'Полночь в Искре', sub: 'Каждый урок приближает полночь. Сколько осталось — на часах ниже.' }
  if (v === 'shar') return { chip: 'Новый год в Искре', title: 'Снежный шар', sub: 'Пройденный урок зажигает окно в городке.' }
  // «Нажми на Огонька — будет салют» из макета не пишем: салюта в этой волне нет.
  return { chip: 'Новый год в Искре', title: 'Наряди ёлку', sub: 'Каждая сданная домашка вешает игрушку на ёлку. До 10 января.' }
}

// ── снег ────────────────────────────────────────────────────────────────

/** Детерминированный «случай»: одна и та же раскладка хлопьев на каждом рендере. */
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

export function Snow({ count, className, scale = 1 }: { count: number; className: string; scale?: number }) {
  const flakes = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: rnd(i, 1) * 100,
    y: rnd(i, 2) * 100,
    size: Math.round((2 + rnd(i, 3) * 3) * scale),
    dur: 9 + rnd(i, 4) * 9,
    delay: -rnd(i, 5) * 18,
    drift: (rnd(i, 6) - 0.5) * 60,
    o: 0.45 + rnd(i, 7) * 0.5,
  })), [count, scale])
  return (
    <span aria-hidden className={`ny-snow ${className}`}>
      {flakes.map((f, i) => (
        <i key={i} style={{
          left: `${f.left}%`, width: f.size, height: f.size, opacity: f.o,
          animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`,
          '--ny-y': `${f.y}%`, '--ny-drift': `${f.drift}px`,
        } as CSSProperties} />
      ))}
    </span>
  )
}

// ── гирлянда ────────────────────────────────────────────────────────────

const BULB_COLORS = ['#FFD25A', '#FF5FA2', '#7CF08A', '#6FC3FF', '#FF9A3D', '#C9A8FF']
const BULBS = 26
const wave = (x: number) => 12 + 8 * Math.sin(x * Math.PI * 2 * 6.5)

export function Garland() {
  const path = useMemo(() => {
    let d = ''
    for (let i = 0; i <= 200; i++) { const x = i / 200; d += `${i ? 'L' : 'M'}${(x * 1000).toFixed(1)} ${wave(x).toFixed(2)} ` }
    return d
  }, [])
  return (
    <span aria-hidden className="ny-garland">
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="ny-garland__wire"><path d={path} /></svg>
      {Array.from({ length: BULBS }, (_, i) => {
        const x = (i + 0.5) / BULBS
        return (
          <i key={i} className="ny-garland__bulb" style={{
            left: `${x * 100}%`, top: wave(x) + 2,
            '--ny-bulb': BULB_COLORS[i % BULB_COLORS.length],
            animationDelay: `${(i % 6) * 0.35}s`,
          } as CSSProperties} />
        )
      })}
    </span>
  )
}

// ── фон: баннер, снег, сугроб, ёлочки и снеговик ────────────────────────

const ITEM: Record<NewYearVariant, string> = { yolka: 'gifts', polnoch: 'cocoa', shar: 'sled' }

export function NewYearBackdrop({ variant }: { variant: NewYearVariant }) {
  const s = useSeason()
  const decor = s.on('decor')
  return (
    <div aria-hidden className={`ny-backdrop ny-backdrop--${variant}`}>
      <div className="ny-banner">
        <img src={newYearImg(`banner-${variant}`)} alt="" className="ny-banner__img" />
        <Snow count={22} scale={1.6} className="ny-snow--banner" />
        <Garland />
      </div>
      <Snow count={34} scale={2.2} className="ny-snow--page" />
      <svg className="ny-drift" viewBox="0 0 1440 90" preserveAspectRatio="none">
        <path className="ny-drift__far" d="M0 38 C120 14 240 16 360 30 C480 44 560 20 700 18 C840 16 920 40 1060 36 C1200 32 1300 10 1440 24 V90 H0 Z" />
        <path className="ny-drift__near" d="M0 62 C140 40 260 46 380 58 C520 72 620 44 760 46 C900 48 1000 70 1140 64 C1260 58 1360 42 1440 50 V90 H0 Z" />
      </svg>
      {/* Декор после сугроба: стоит в снегу, а не под ним. */}
      {decor && (
        <div className="ny-ground">
          <img src={newYearImg('firs')} alt="" className="ny-ground__firs" />
          <img src={newYearImg(ITEM[variant])} alt="" className={`ny-ground__item ny-ground__item--${variant}`} />
          <img src={newYearImg(variant === 'yolka' ? 'snowman-lab' : 'snowman')} alt="" className="ny-ground__snowman" />
        </div>
      )}
    </div>
  )
}

/** Подпись, заголовок и подзаголовок темы поверх баннера (десктоп и айпад в ландшафте). */
export function NewYearHero({ variant }: { variant: NewYearVariant }) {
  const t = useT()
  const c = newYearCopy(variant)
  return (
    <div className={`ny-hero ny-hero--${variant}`}>
      <span className="ny-hero__chip">{t(c.chip)}</span>
      <h2 className="ny-hero__title">{t(c.title)}</h2>
      <p className="ny-hero__sub">{t(c.sub)}</p>
    </div>
  )
}

// ── текущий урок: Огонёк и закреплённый стикер ──────────────────────────

const OGONEK: Record<NewYearVariant, string> = { yolka: 'og-santa', polnoch: 'og-astro', shar: 'og-scarf' }

export function NewYearCurrentNode({ variant }: { variant: NewYearVariant }) {
  const pinned = usePinnedSticker()
  return (
    <span aria-hidden className={`ny-node ny-node--${variant}`}>
      <img src={newYearImg(OGONEK[variant])} alt="" className="ny-node__og" />
      {pinned && <img src={stickerImg(pinned)} alt="" className="ny-node__pin" />}
    </span>
  )
}

// ── виджет сезона ───────────────────────────────────────────────────────

const TOYS = 12
const WINDOWS = 8
const TOY_COLORS = ['#FFC93D', '#FF4F9A', '#B6F23B', '#FF8A2A', '#A99BFF', '#FFC93D', '#FF4F9A']

const MSK = 3 * 3600_000
/** Полночь 1 января по Москве; null — праздник уже наступил (1–10 января). */
function newYearTarget(now: number): number | null {
  const msk = new Date(now + MSK)
  if (msk.getUTCMonth() === 0 && msk.getUTCDate() <= 10) return null
  return Date.UTC(msk.getUTCFullYear() + 1, 0, 1) - MSK
}

function Countdown() {
  const t = useT()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id) }, [])
  const target = newYearTarget(now)
  if (target === null) return <strong className="ny-widget__title">{t('С Новым годом!')}</strong>
  const left = Math.max(0, Math.floor((target - now) / 1000))
  const parts: [number, string][] = [[Math.floor(left / 86400), 'дн'], [Math.floor(left / 3600) % 24, 'ч'], [Math.floor(left / 60) % 60, 'мин'], [left % 60, 'с']]
  return (
    <span className="ny-count" role="timer" aria-label={`${t('До Нового года')}: ${parts.map(([n, u]) => `${n} ${t(u)}`).join(' ')}`}>
      {parts.map(([n, u]) => (
        <span key={u} className="ny-count__cell" aria-hidden>
          <b>{String(n).padStart(2, '0')}</b>
          <small>{t(u)}</small>
        </span>
      ))}
    </span>
  )
}

/** Виджет темы в полосе виджетов: ёлка с игрушками, отсчёт до полуночи или окна городка.
 *  Нажатие открывает альбом новогодних стикеров. */
export function NewYearWidget({ variant }: { variant: NewYearVariant }) {
  const t = useT()
  const studentId = getStudentSession()?.id ?? null
  const { owned } = useStickers(studentId)
  const got = owned.length
  const toys = Math.min(TOYS, got)
  const lit = Math.min(WINDOWS, got)
  const label = variant === 'yolka' ? `${t('Ёлка')} · ${toys} ${t('из')} ${TOYS} ${t('игрушек')}`
    : variant === 'shar' ? `${t('Огни городка')} · ${lit} ${t('из')} ${WINDOWS} ${t('окон')}`
    : t('До Нового года')
  return (
    <button data-hover="layer" type="button" className={`ny-widget ny-widget--${variant}`} aria-label={`${label}. ${t('Открыть альбом стикеров')}`} onClick={() => openStickerAlbum()}>
      {variant === 'yolka' && <img aria-hidden src={newYearImg('og-tree')} alt="" className="ny-widget__art" />}
      <span className="ny-widget__body">
        <span className="ny-widget__eyebrow">{t(variant === 'yolka' ? 'Ёлка' : variant === 'shar' ? 'Огни городка' : 'До Нового года')}</span>
        {variant === 'yolka' && <>
          <strong className="ny-widget__title">{toys} {t('из')} {TOYS} {t('игрушек')}</strong>
          <span aria-hidden className="ny-toys">
            {Array.from({ length: TOYS }, (_, i) => <i key={i} data-on={i < toys || undefined} style={i < toys ? { background: TOY_COLORS[i % TOY_COLORS.length] } : undefined} />)}
          </span>
          <span className="ny-widget__hint">{t(toys >= TOYS ? 'Ёлка наряжена' : 'Сдай ДЗ — повесишь ещё одну')}</span>
        </>}
        {variant === 'polnoch' && <>
          <Countdown />
          <span className="ny-widget__hint">{t('Каждый урок приближает полночь')}</span>
        </>}
        {variant === 'shar' && <>
          <strong className="ny-widget__title">{lit} {t('из')} {WINDOWS} {t('окон')}</strong>
          <span aria-hidden className="ny-windows">
            {Array.from({ length: WINDOWS }, (_, i) => <i key={i} data-on={i < lit || undefined} />)}
          </span>
          <span className="ny-widget__hint">{t(lit >= WINDOWS ? 'Городок светится' : 'Пройденный урок зажигает окно')}</span>
        </>}
      </span>
    </button>
  )
}

// ── серия дней → редкие Огоньки ─────────────────────────────────────────

/** «Дней подряд» ≥ 7 — Огонёк-Дед Мороз, ≥ 14 — Огонёк-космонавт. Выдача идемпотентна
 *  (source + ref) и вне новогоднего сезона ничего не делает; тема при этом может быть выключена. */
export function useStreakStickers(streak: number) {
  const studentId = getStudentSession()?.id ?? null
  useEffect(() => {
    if (!studentId) return
    if (streak >= 7) void earnSticker(studentId, 'streak', '7', 'og_santa')
    if (streak >= 14) void earnSticker(studentId, 'streak', '14', 'og_astro')
  }, [studentId, streak])
}
