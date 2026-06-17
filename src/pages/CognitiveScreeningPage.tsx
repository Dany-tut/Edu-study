import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronRight, User, Lightbulb, Info, X } from 'lucide-react'
import { appendAnonResult } from '../data/diagnosticData'
import {
  loadScreeningConfig, fetchScreeningConfig, activeDomains,
  type ScreeningConfig, type DomainKey, type DomainInfo,
  type MatricesConfig, type SeriesConfig, type AnalogiesConfig, type RotationConfig,
  type MemoryConfig, type StroopConfig, type SpeedConfig, type MatchingConfig,
} from '../data/screeningConfig'
import { generateMatrix, type GenMatrix, type GenCell } from '../lib/screening/matrixGen'
import {
  generateSeries, generateRotation, buildMemorySchedule, buildStroopTrials,
  type SeriesItem, type RotItem, type MemTrial, type StroopTrial,
} from '../lib/screening/generators'

const ACC = '#f59e0b'

// Theme-aware correct/incorrect feedback colors (work in both light & dark)
const OK_BG = 'var(--color-green-soft)'
const OK_LINE = 'var(--color-green-accent)'
const OK_TXT = 'var(--color-green-text)'
const NO_BG = 'var(--color-red-soft)'
const NO_LINE = 'var(--color-red-text)'
const NO_TXT = 'var(--color-red-text)'

// ── Types & helpers ──────────────────────────────────────────────────────────────

interface SectionScore { correct: number; total: number }
type Scores = Partial<Record<DomainKey, SectionScore>>
interface SectionProps<C> { cfg: C; step: number; labels: string[]; onComplete: (s: SectionScore) => void }

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const shuffleArr = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
// Fixed-mode difficulty ladder: item k of `count` maps to a level in [min,max].
const ladder = (k: number, min: number, max: number, count: number) =>
  clampN(min + Math.round((max - min) * k / Math.max(1, count - 1)), min, max)

// Student-facing intro copy per domain (the "i" popover carries the deep methodology).
const INTRO: Record<DomainKey, { desc: string; tip: string }> = {
  matrices:  { desc: 'Найди закономерность и выбери недостающий элемент. Задания идут от простых к сложным.', tip: 'Смотри на строки и столбцы — паттерн есть в обоих направлениях.' },
  series:    { desc: 'Продолжи последовательность по найденному правилу.', tip: 'Проверь разность и отношение соседних чисел.' },
  analogies: { desc: '«A → B как C → ?». Подбери слово с такой же связью.', tip: 'Определи тип связи в первой паре и перенеси на вторую.' },
  rotation:  { desc: 'Найди ту же фигуру, просто повёрнутую. Зеркальные не подходят.', tip: 'Зеркальную фигуру нельзя получить поворотом — отбрасывай её.' },
  memory:    { desc: 'Ячейки загораются по очереди — повтори порядок. В обратных раундах — в обратном порядке.', tip: 'Не торопись — дождись всей последовательности.' },
  stroop:    { desc: 'Выбери ЦВЕТ шрифта, игнорируя само слово. Отвечай быстро.', tip: 'Мозг хочет прочитать слово — смотри только на цвет букв.' },
  speed:     { desc: 'За ограниченное время дай как можно больше верных ответов.', tip: 'Темп важнее идеала, но ошибки не засчитываются.' },
  matching:  { desc: 'Соедини каждый элемент слева с соответствующим справа.', tip: 'Если не знаешь — исключай очевидно неправильные.' },
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 500 }}>{children}</div>
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'rgba(var(--glass-rgb),0.9)', border: '1px solid var(--color-border-glass)', borderRadius: 22, padding: '24px 22px', ...style }}>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }} whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick} disabled={disabled}
      style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? 'var(--color-bg-5)' : ACC, color: disabled ? 'var(--color-text-3)' : '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', ...style }}
    >
      {children}
    </motion.button>
  )
}

function SectionProgress({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
      {labels.map((label, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 26, height: 4, borderRadius: 999, background: i < step ? ACC : i === step ? `${ACC}66` : 'var(--color-bg-5)', transition: 'background 0.3s' }} />
          <div style={{ fontSize: 9, color: i <= step ? ACC : 'var(--color-text-3)', fontWeight: 600 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Methodology "i" popover ──────────────────────────────────────────────────────

function InfoDot({ info }: { info: DomainInfo }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Что измеряет этот блок"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${ACC}`, background: `${ACC}1a`, color: ACC, cursor: 'pointer', flexShrink: 0, padding: 0 }}
      >
        <Info size={12} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto', background: 'var(--color-bg-2)', border: '1px solid var(--color-border-glass)', borderRadius: 20, padding: '22px 22px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 24 }}>{info.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{info.dimension}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ACC, letterSpacing: 0.5 }}>{info.chc} · {info.label}</div>
                </div>
                <button onClick={() => setOpen(false)} aria-label="Закрыть" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex' }}><X size={18} /></button>
              </div>
              {([
                ['Что измеряет', info.measures],
                ['Как устроено', info.how],
                ['Что определяет', info.determines],
                ['Методология', info.science],
              ] as [string, string][]).map(([h, body]) => (
                <div key={h} style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ACC, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{h}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{body}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Section intro ──────────────────────────────────────────────────────────────

interface IntroProps { icon: string; title: string; desc: string; tip: string; step: number; labels: string[]; onStart: () => void; info?: DomainInfo }
function SectionIntro({ icon, title, desc, tip, step, labels, onStart, info }: IntroProps) {
  return (
    <Wrap>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <SectionProgress step={step} labels={labels} />
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{title}</div>
              {info && <InfoDot info={info} />}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>{desc}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: `${ACC}1f`, border: `1px solid ${ACC}55`, borderRadius: 12, padding: '11px 14px', fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 20 }}>
            <Lightbulb size={15} style={{ color: ACC, flexShrink: 0, marginTop: 1 }} />
            <span>{tip}</span>
          </div>
          <Btn onClick={onStart}>Начать <ChevronRight size={15} /></Btn>
        </Card>
      </motion.div>
    </Wrap>
  )
}

// ── SVG matrix-cell renderer (shape · fill · size · rotation · count) ────────────

const SZ_R = { large: 0.40, medium: 0.28, small: 0.17 }

function GenCellView({ cell, size = 52 }: { cell: GenCell; size?: number }) {
  const cx = size / 2, cy = size / 2
  const baseR = size * SZ_R[cell.size]
  const sw = Math.max(2, size * 0.055)
  const pid = `gp-${cell.shape}-${cell.fill}-${cell.size}-${cell.rot}-${cell.count}-${size}`
  const fa = cell.fill === 'solid' ? ACC : cell.fill === 'striped' ? `url(#${pid})` : 'none'

  const n = cell.count
  const r = n === 1 ? baseR : baseR * 0.6
  const dx = r * 1.25
  const centers: [number, number][] =
    n === 1 ? [[cx, cy]] :
    n === 2 ? [[cx - dx * 0.6, cy], [cx + dx * 0.6, cy]] :
              [[cx - dx, cy], [cx, cy], [cx + dx, cy]]

  const node = (x: number, y: number, key: number) => {
    const tri = `${x},${y - r} ${x + r * 0.87},${y + r * 0.5} ${x - r * 0.87},${y + r * 0.5}`
    const dia = `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`
    if (cell.shape === 'circle')   return <circle key={key} cx={x} cy={y} r={r} fill={fa} stroke={ACC} strokeWidth={sw} />
    if (cell.shape === 'square')   return <rect key={key} x={x - r} y={y - r} width={r * 2} height={r * 2} fill={fa} stroke={ACC} strokeWidth={sw} />
    if (cell.shape === 'triangle') return <polygon key={key} points={tri} fill={fa} stroke={ACC} strokeWidth={sw} />
    return <polygon key={key} points={dia} fill={fa} stroke={ACC} strokeWidth={sw} />
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {cell.fill === 'striped' && (
        <defs>
          <pattern id={pid} patternUnits="userSpaceOnUse" width="5" height="5">
            <line x1="0" y1="5" x2="5" y2="0" stroke={ACC} strokeWidth="1.5" />
          </pattern>
        </defs>
      )}
      <g transform={`rotate(${cell.rot},${cx},${cy})`}>
        {centers.map(([x, y], i) => node(x, y, i))}
      </g>
    </svg>
  )
}

// ── Raven's Matrices (rule-based generation, adaptive difficulty) ────────────────

function levelForIndex(k: number, cfg: MatricesConfig): number {
  const span = Math.max(1, cfg.count - 1)
  return Math.max(cfg.minLevel, Math.min(cfg.maxLevel,
    cfg.minLevel + Math.round((cfg.maxLevel - cfg.minLevel) * k / span)))
}

function MatricesSection({ cfg, step, labels, onComplete }: SectionProps<MatricesConfig>) {
  const [items, setItems]     = useState<GenMatrix[]>(() => [generateMatrix(cfg.minLevel, cfg.rules)])
  const [qIdx, setQIdx]       = useState(0)
  const [chosen, setChosen]   = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [level, setLevel]     = useState(cfg.minLevel)
  const [fails, setFails]     = useState(0)

  const m = items[qIdx]

  function pick(i: number) {
    if (chosen !== null) return
    setChosen(i)
    const ok = i === m.correct
    if (ok) setCorrect(c => c + 1)
    const attempted = qIdx + 1
    const nextFails = ok ? 0 : fails + 1
    const stop = attempted >= cfg.count || (cfg.adaptive && nextFails >= cfg.adaptiveStopFails)
    const nextLevel = cfg.adaptive
      ? (ok ? Math.min(cfg.maxLevel, level + 1) : level)
      : levelForIndex(attempted, cfg)
    setTimeout(() => {
      if (stop) { onComplete({ correct: ok ? correct + 1 : correct, total: attempted }); return }
      setItems(prev => [...prev, generateMatrix(nextLevel, cfg.rules)])
      setLevel(nextLevel); setFails(nextFails); setQIdx(q => q + 1); setChosen(null)
    }, 900)
  }

  const CELL = 52, GAP = 4
  const reveal = chosen !== null

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>
          Задание {qIdx + 1}{cfg.adaptive ? '' : ` из ${cfg.count}`} · уровень {m.level}/5
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>Что стоит на месте «?»</div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        {/* 3×3 grid — [2][2] is the missing answer */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(3,${CELL}px)`, gap: GAP, margin: '0 auto', width: 'fit-content', padding: 8, background: 'var(--color-bg-3)', borderRadius: 14 }}>
          {m.grid.flat().map((cell, i) => (
            <div key={i} style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', borderRadius: 8 }}>
              {i === 8
                ? <span style={{ fontSize: 26, color: ACC, fontWeight: 900 }}>?</span>
                : <GenCellView cell={cell} size={CELL - 8} />}
            </div>
          ))}
        </div>
      </Card>

      {/* 4 options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {m.options.map((opt, i) => {
          const picked = chosen === i
          const isRight = i === m.correct
          const bg = !reveal ? 'var(--color-bg)' : isRight ? OK_BG : picked ? NO_BG : 'var(--color-bg)'
          const border = !reveal ? 'var(--color-border-soft)' : isRight ? OK_LINE : picked ? NO_LINE : 'var(--color-border-soft)'
          return (
            <motion.div
              key={i}
              onClick={() => pick(i)}
              whileHover={{ scale: chosen === null ? 1.03 : 1 }}
              whileTap={{ scale: chosen === null ? 0.97 : 1 }}
              style={{ cursor: chosen === null ? 'pointer' : 'default', padding: 10, borderRadius: 14, border: `2px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            >
              <GenCellView cell={opt} size={CELL - 6} />
            </motion.div>
          )
        })}
      </div>
    </Wrap>
  )
}

// ── Generic option-grid feedback colors helper ───────────────────────────────────

function optColors(reveal: boolean, isRight: boolean, picked: boolean, baseBg = 'var(--color-bg)') {
  const bg = !reveal ? baseBg : isRight ? OK_BG : picked ? NO_BG : baseBg
  const border = !reveal ? 'var(--color-border-soft)' : isRight ? OK_LINE : picked ? NO_LINE : 'var(--color-border-soft)'
  return { bg, border }
}

// ── Number / letter series ───────────────────────────────────────────────────────

function SeriesSection({ cfg, step, labels, onComplete }: SectionProps<SeriesConfig>) {
  const [items, setItems]     = useState<SeriesItem[]>(() => [generateSeries(cfg.minLevel, cfg.types)])
  const [qIdx, setQIdx]       = useState(0)
  const [chosen, setChosen]   = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [level, setLevel]     = useState(cfg.minLevel)
  const [fails, setFails]     = useState(0)
  const m = items[qIdx]

  function pick(i: number) {
    if (chosen !== null) return
    setChosen(i)
    const ok = i === m.correct
    if (ok) setCorrect(c => c + 1)
    const attempted = qIdx + 1
    const nextFails = ok ? 0 : fails + 1
    const stop = attempted >= cfg.count || (cfg.adaptive && nextFails >= cfg.adaptiveStopFails)
    const nextLevel = cfg.adaptive ? (ok ? Math.min(cfg.maxLevel, level + 1) : level) : ladder(attempted, cfg.minLevel, cfg.maxLevel, cfg.count)
    setTimeout(() => {
      if (stop) { onComplete({ correct: ok ? correct + 1 : correct, total: attempted }); return }
      setItems(prev => [...prev, generateSeries(nextLevel, cfg.types)])
      setLevel(nextLevel); setFails(nextFails); setQIdx(q => q + 1); setChosen(null)
    }, 900)
  }
  const reveal = chosen !== null

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Задание {qIdx + 1}{cfg.adaptive ? '' : ` из ${cfg.count}`} · уровень {m.level}/5</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>Что следующее?</div>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {m.seq.map((v, i) => (
            <div key={i} style={{ minWidth: 44, height: 52, padding: '0 10px', borderRadius: 12, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{v}</div>
          ))}
          <div style={{ minWidth: 44, height: 52, borderRadius: 12, background: 'var(--color-bg)', border: `2px dashed ${ACC}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: ACC }}>?</div>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {m.options.map((opt, i) => {
          const { bg, border } = optColors(reveal, i === m.correct, chosen === i)
          return (
            <motion.button key={i} onClick={() => pick(i)} whileHover={{ scale: reveal ? 1 : 1.03 }} whileTap={{ scale: reveal ? 1 : 0.97 }}
              style={{ padding: '16px 0', borderRadius: 14, border: `2px solid ${border}`, background: bg, cursor: reveal ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
              {opt}
            </motion.button>
          )
        })}
      </div>
    </Wrap>
  )
}

// ── Verbal analogies ─────────────────────────────────────────────────────────────

interface PreparedAnalogy { a: string; b: string; c: string; options: string[]; correct: number; level: number }
function prepareAnalogies(cfg: AnalogiesConfig): PreparedAnalogy[] {
  return [...cfg.pool].sort((x, y) => x.level - y.level).slice(0, cfg.count).map(it => {
    const options = shuffleArr([it.answer, ...it.distractors])
    return { a: it.a, b: it.b, c: it.c, options, correct: options.indexOf(it.answer), level: it.level }
  })
}

function AnalogiesSection({ cfg, step, labels, onComplete }: SectionProps<AnalogiesConfig>) {
  const [items] = useState<PreparedAnalogy[]>(() => prepareAnalogies(cfg))
  const [qIdx, setQIdx]       = useState(0)
  const [chosen, setChosen]   = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [fails, setFails]     = useState(0)
  useEffect(() => { if (items.length === 0) onComplete({ correct: 0, total: 0 }) }, [])
  const m = items[qIdx]
  if (!m) return <Wrap><SectionProgress step={step} labels={labels} /></Wrap>

  function pick(i: number) {
    if (chosen !== null) return
    setChosen(i)
    const ok = i === m.correct
    if (ok) setCorrect(c => c + 1)
    const attempted = qIdx + 1
    const nextFails = ok ? 0 : fails + 1
    const stop = attempted >= items.length || (cfg.adaptive && nextFails >= cfg.adaptiveStopFails)
    setTimeout(() => {
      if (stop) { onComplete({ correct: ok ? correct + 1 : correct, total: attempted }); return }
      setFails(nextFails); setQIdx(q => q + 1); setChosen(null)
    }, 900)
  }
  const reveal = chosen !== null

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Задание {qIdx + 1} из {items.length}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>Подбери по аналогии</div>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
          <span>{m.a}</span><span style={{ color: ACC }}>→</span><span>{m.b}</span>
          <span style={{ color: 'var(--color-text-3)', margin: '0 6px', fontWeight: 500 }}>как</span>
          <span>{m.c}</span><span style={{ color: ACC }}>→</span><span style={{ color: ACC, fontWeight: 900 }}>?</span>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {m.options.map((opt, i) => {
          const { bg, border } = optColors(reveal, i === m.correct, chosen === i, 'var(--color-bg-3)')
          return (
            <motion.button key={i} onClick={() => pick(i)} whileHover={{ scale: reveal ? 1 : 1.03 }} whileTap={{ scale: reveal ? 1 : 0.97 }}
              style={{ padding: '14px 12px', borderRadius: 14, border: `2px solid ${border}`, background: bg, cursor: reveal ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {opt}
            </motion.button>
          )
        })}
      </div>
    </Wrap>
  )
}

// ── Mental rotation ──────────────────────────────────────────────────────────────

function RotGlyph({ points, rot, mirror, size = 76 }: { points: string; rot: number; mirror: boolean; size?: number }) {
  const t = `rotate(${rot},50,50)` + (mirror ? ' translate(100,0) scale(-1,1)' : '')
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
      <g transform={t}>
        <polygon points={points} fill={`${ACC}cc`} stroke={ACC} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </svg>
  )
}

function RotationSection({ cfg, step, labels, onComplete }: SectionProps<RotationConfig>) {
  const [items, setItems]     = useState<RotItem[]>(() => [generateRotation(cfg.minLevel)])
  const [qIdx, setQIdx]       = useState(0)
  const [chosen, setChosen]   = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const [level, setLevel]     = useState(cfg.minLevel)
  const [fails, setFails]     = useState(0)
  const m = items[qIdx]

  function pick(i: number) {
    if (chosen !== null) return
    setChosen(i)
    const ok = i === m.correct
    if (ok) setCorrect(c => c + 1)
    const attempted = qIdx + 1
    const nextFails = ok ? 0 : fails + 1
    const stop = attempted >= cfg.count || (cfg.adaptive && nextFails >= cfg.adaptiveStopFails)
    const nextLevel = cfg.adaptive ? (ok ? Math.min(cfg.maxLevel, level + 1) : level) : ladder(attempted, cfg.minLevel, cfg.maxLevel, cfg.count)
    setTimeout(() => {
      if (stop) { onComplete({ correct: ok ? correct + 1 : correct, total: attempted }); return }
      setItems(prev => [...prev, generateRotation(nextLevel)])
      setLevel(nextLevel); setFails(nextFails); setQIdx(q => q + 1); setChosen(null)
    }, 900)
  }
  const reveal = chosen !== null

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Задание {qIdx + 1}{cfg.adaptive ? '' : ` из ${cfg.count}`} · уровень {m.level}/5</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>Та же фигура, повёрнутая</div>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          <div style={{ padding: 10, borderRadius: 14, background: 'var(--color-bg-3)' }}>
            <RotGlyph points={m.glyph} rot={m.baseRot} mirror={false} size={88} />
          </div>
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {m.options.map((opt, i) => {
          const { bg, border } = optColors(reveal, i === m.correct, chosen === i)
          return (
            <motion.div key={i} onClick={() => pick(i)} whileHover={{ scale: reveal ? 1 : 1.03 }} whileTap={{ scale: reveal ? 1 : 0.97 }}
              style={{ cursor: reveal ? 'default' : 'pointer', padding: 10, borderRadius: 14, border: `2px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotGlyph points={m.glyph} rot={opt.rot} mirror={opt.mirror} size={64} />
            </motion.div>
          )
        })}
      </div>
    </Wrap>
  )
}

// ── Processing speed (symbol matching, timed) ────────────────────────────────────

function makeSymbol(): GenCell[] {
  const shapes: GenCell['shape'][] = ['circle', 'square', 'triangle', 'diamond']
  const fills: GenCell['fill'][] = ['outline', 'solid', 'striped']
  return Array.from({ length: 3 }, () => ({ shape: shapes[Math.floor(Math.random() * 4)], fill: fills[Math.floor(Math.random() * 3)], size: 'medium' as const, rot: 0, count: 1 as const }))
}
function makeSpeedTrial(): { left: GenCell[]; right: GenCell[]; same: boolean } {
  const left = makeSymbol()
  const same = Math.random() < 0.5
  const right = left.map(c => ({ ...c }))
  if (!same) {
    const i = Math.floor(Math.random() * 3)
    const shapes: GenCell['shape'][] = ['circle', 'square', 'triangle', 'diamond']
    right[i] = { ...right[i], shape: shapes.filter(s => s !== right[i].shape)[Math.floor(Math.random() * 3)] }
  }
  return { left, right, same }
}

function SpeedSection({ cfg, step, labels, onComplete }: SectionProps<SpeedConfig>) {
  const [trial, setTrial] = useState(() => makeSpeedTrial())
  const [remain, setRemain] = useState(cfg.durationSec)
  const [flash, setFlash] = useState<boolean | null>(null)
  const [, force] = useState(0)
  const correctRef = useRef(0)
  const done = useRef(false)
  const target = Math.max(1, Math.round(cfg.durationSec * 0.5))

  useEffect(() => {
    const iv = setInterval(() => {
      setRemain(r => {
        if (r <= 1) { clearInterval(iv); if (!done.current) { done.current = true; onComplete({ correct: correctRef.current, total: target }) } return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  function answer(saysSame: boolean) {
    if (remain <= 0 || flash !== null) return
    const ok = saysSame === trial.same
    if (ok) correctRef.current++
    setFlash(ok)
    setTimeout(() => { setFlash(null); setTrial(makeSpeedTrial()); force(x => x + 1) }, 160)
  }

  const Row = ({ cells }: { cells: GenCell[] }) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {cells.map((c, i) => (
        <div key={i} style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GenCellView cell={c} size={38} />
        </div>
      ))}
    </div>
  )

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Осталось {remain} с · верных: {correctRef.current}</div>
        <div style={{ fontSize: 15, color: 'var(--color-text-2)', marginTop: 4 }}>Наборы одинаковые?</div>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)', marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(remain / cfg.durationSec) * 100}%`, background: ACC, transition: 'width 1s linear' }} />
      </div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <Row cells={trial.left} />
          <span style={{ color: 'var(--color-text-3)', fontWeight: 700 }}>=?</span>
          <Row cells={trial.right} />
        </div>
        <div style={{ minHeight: 22, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {flash !== null && <span style={{ fontSize: 15, fontWeight: 700, color: flash ? OK_TXT : NO_TXT }}>{flash ? '✓' : '✗'}</span>}
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn onClick={() => answer(true)} style={{ background: OK_LINE }}>Одинаковые</Btn>
        <Btn onClick={() => answer(false)} style={{ background: NO_LINE }}>Разные</Btn>
      </div>
    </Wrap>
  )
}

// ── Working Memory (forward + backward span, adaptive) ───────────────────────────

type MemPhase = 'show' | 'recall' | 'feedback'
const MEM_GRID = 6

function MemorySection({ cfg, step, labels, onComplete }: SectionProps<MemoryConfig>) {
  const [schedule]              = useState<MemTrial[]>(() => buildMemorySchedule(cfg.minSpan, cfg.maxSpan, cfg.backward, MEM_GRID))
  const [trialIdx, setTrialIdx] = useState(0)
  const [memPhase, setMemPhase] = useState<MemPhase>('show')
  const [lit, setLit]           = useState<number | null>(null)
  const [input, setInput]       = useState<number[]>([])
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const correctRef = useRef(0)
  const failsRef   = useRef(0)
  const timers     = useRef<ReturnType<typeof setTimeout>[]>([])
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const trial = schedule[trialIdx]
  const expected = trial.backward ? [...trial.cells].reverse() : trial.cells

  useEffect(() => {
    if (memPhase !== 'show') return
    clearTimers()
    let delay = 700
    for (const cell of trial.cells) {
      timers.current.push(setTimeout(() => setLit(cell), delay))
      timers.current.push(setTimeout(() => setLit(null), delay + cfg.flashMs))
      delay += cfg.flashMs + 350
    }
    timers.current.push(setTimeout(() => { setMemPhase('recall'); setInput([]) }, delay + 150))
    return clearTimers
  }, [memPhase, trialIdx])

  function handleCellClick(idx: number) {
    if (memPhase !== 'recall') return
    const next = [...input, idx]
    setInput(next)
    if (next.length < expected.length) return
    const ok = next.every((v, i) => v === expected[i])
    setFeedback(ok); setMemPhase('feedback')
    if (ok) correctRef.current++
    failsRef.current = ok ? 0 : failsRef.current + 1
    const attempted = trialIdx + 1
    const stop = attempted >= schedule.length || (cfg.adaptive && failsRef.current >= cfg.adaptiveStopFails)
    setTimeout(() => {
      setFeedback(null)
      if (stop) { onComplete({ correct: correctRef.current, total: attempted }); return }
      setTrialIdx(t => t + 1); setMemPhase('show')
    }, 1000)
  }

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Раунд {trialIdx + 1} · {trial.cells.length} ячеек{trial.backward ? ' · обратный порядок' : ''}</div>
        <div style={{ fontSize: 17, fontWeight: 800, marginTop: 4, color: memPhase === 'feedback' ? (feedback ? OK_TXT : NO_TXT) : 'var(--color-text)' }}>
          {memPhase === 'show' ? 'Запоминай последовательность' : memPhase === 'recall' ? (trial.backward ? 'Нажимай в ОБРАТНОМ порядке' : 'Нажимай в том же порядке') : feedback ? '✓ Верно!' : '✗ Ошибка'}
        </div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {Array.from({ length: MEM_GRID }, (_, i) => {
            const isLit = lit === i
            const isInputted = memPhase === 'recall' && input.includes(i)
            const bg = isLit ? ACC : isInputted ? `${ACC}55` : 'var(--color-bg-3)'
            return (
              <motion.div
                key={i}
                animate={{ scale: isLit ? 1.08 : 1, background: bg }}
                transition={{ duration: 0.15 }}
                onClick={() => handleCellClick(i)}
                style={{ height: 70, borderRadius: 14, border: `2px solid ${isLit ? ACC : 'var(--color-border-soft)'}`, cursor: memPhase === 'recall' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {memPhase === 'recall' && <span style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 700 }}>{input.indexOf(i) >= 0 ? input.indexOf(i) + 1 : ''}</span>}
              </motion.div>
            )
          })}
        </div>
        <div style={{ minHeight: 48, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {memPhase === 'feedback' ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '10px', borderRadius: 12, background: feedback ? OK_BG : NO_BG, color: feedback ? OK_TXT : NO_TXT, fontWeight: 700, fontSize: 14 }}>
              {feedback ? 'Правильно!' : `Нужно было: ${expected.map(c => c + 1).join(' → ')}`}
            </div>
          ) : memPhase === 'show' ? (
            <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 12 }}>Ячейки загораются — запоминай порядок</div>
          ) : null}
        </div>
      </Card>
    </Wrap>
  )
}

// ── Stroop (interference, reaction-time + response deadline) ─────────────────────

function StroopSection({ cfg, step, labels, onComplete }: SectionProps<StroopConfig>) {
  const [trials]          = useState<StroopTrial[]>(() => buildStroopTrials(cfg))
  const [idx, setIdx]     = useState(0)
  const [flash, setFlash] = useState<boolean | null>(null)
  const correctRef        = useRef(0)
  const startRef          = useRef(0)
  const deadline          = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const trial             = trials[idx]
  const ink               = cfg.colors[trial.inkIdx]?.hex ?? ACC

  useEffect(() => {
    startRef.current = performance.now()
    if (cfg.deadlineMs > 0) deadline.current = setTimeout(() => resolve(-1), cfg.deadlineMs)
    return () => { if (deadline.current) clearTimeout(deadline.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  function resolve(colorIdx: number) {
    if (flash !== null) return
    if (deadline.current) clearTimeout(deadline.current)
    const ok = colorIdx === trial.correct
    if (ok) correctRef.current++
    setFlash(ok)
    setTimeout(() => {
      setFlash(null)
      if (idx < trials.length - 1) setIdx(i => i + 1)
      else onComplete({ correct: correctRef.current, total: trials.length })
    }, 380)
  }

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Вопрос {idx + 1} из {trials.length}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>Цвет ШРИФТА (не слова) — быстро!</div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.18 }}
            style={{ textAlign: 'center', padding: '28px 0' }}
          >
            <span style={{ fontSize: 42, fontWeight: 900, color: ink, letterSpacing: 2, fontFamily: 'inherit' }}>
              {cfg.colors[trial.wordIdx]?.name}
            </span>
          </motion.div>
        </AnimatePresence>

        <div style={{ minHeight: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {flash !== null && (
            <span style={{ fontSize: 16, fontWeight: 700, color: flash ? OK_TXT : NO_TXT }}>
              {flash ? '✓ Верно' : '✗ Ошибка'}
            </span>
          )}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {cfg.colors.map((c, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: flash !== null ? 1 : 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => resolve(i)}
            style={{ padding: '16px 0', borderRadius: 14, border: `2px solid ${c.hex}33`, background: `${c.hex}18`, cursor: flash !== null ? 'default' : 'pointer', fontFamily: 'inherit' }}
          >
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.hex, margin: '0 auto 6px' }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-2)' }}>{c.name}</div>
          </motion.button>
        ))}
      </div>
    </Wrap>
  )
}

// ── Matching ───────────────────────────────────────────────────────────────────

interface PreparedMatch { title: string; pairs: { left: string; right: string }[]; rightOrder: number[] }
function prepareMatch(cfg: MatchingConfig): PreparedMatch[] {
  return cfg.tasks.map(t => ({ title: t.title, pairs: t.pairs, rightOrder: shuffleArr(t.pairs.map((_, i) => i)) }))
}

interface Connection { leftIdx: number; rightPos: number; correct: boolean }

function MatchingSection({ cfg, step, labels, onComplete }: SectionProps<MatchingConfig>) {
  const [tasks]                 = useState<PreparedMatch[]>(() => prepareMatch(cfg))
  const [taskIdx, setTaskIdx]   = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [conns, setConns]       = useState<Connection[]>([])
  const [wrongFlash, setWrong]  = useState<{ l: number; r: number } | null>(null)
  const [totalCorrect, setTotal] = useState(0)
  const totalPairs = tasks.reduce((s, t) => s + t.pairs.length, 0)
  useEffect(() => { if (tasks.length === 0) onComplete({ correct: 0, total: 0 }) }, [])

  const task = tasks[taskIdx]
  const usedLeft  = new Set(conns.map(c => c.leftIdx))
  const usedRight = new Set(conns.map(c => c.rightPos))
  if (!task) return <Wrap><SectionProgress step={step} labels={labels} /></Wrap>

  function clickLeft(i: number) {
    if (usedLeft.has(i)) return
    setSelected(i === selected ? null : i)
  }

  function clickRight(j: number) {
    if (selected === null || usedRight.has(j)) return
    const correct = task.rightOrder[j] === selected
    setWrong(correct ? null : { l: selected, r: j })
    const newConn: Connection = { leftIdx: selected, rightPos: j, correct }
    const newConns = [...conns, newConn]
    setConns(newConns)
    setSelected(null)
    if (!correct) setTimeout(() => setWrong(null), 500)
    if (newConns.length === task.pairs.length) {
      const taskCorrect = newConns.filter(c => c.correct).length
      const nextTotal = totalCorrect + taskCorrect
      setTimeout(() => {
        if (taskIdx < tasks.length - 1) {
          setTaskIdx(t => t + 1)
          setConns([])
          setTotal(nextTotal)
        } else {
          onComplete({ correct: nextTotal, total: totalPairs })
        }
      }, 800)
    }
  }

  return (
    <Wrap>
      <SectionProgress step={step} labels={labels} />
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Задание {taskIdx + 1} из {tasks.length}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{task.title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>Нажми левый элемент, потом — соответствующий правый</div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {task.pairs.map(({ left }, i) => {
              const conn = conns.find(c => c.leftIdx === i)
              const isSel = selected === i
              const border = conn ? (conn.correct ? OK_LINE : NO_LINE) : isSel ? ACC : 'var(--color-border-soft)'
              const bg = conn ? (conn.correct ? OK_BG : NO_BG) : isSel ? `${ACC}22` : 'var(--color-bg-3)'
              return (
                <div key={i} onClick={() => clickLeft(i)} style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid ${border}`, background: bg, cursor: usedLeft.has(i) ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {conn && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, color: conn.correct ? OK_TXT : NO_TXT }}>{conn.correct ? '✓' : '✗'}</span>}
                  {left}
                </div>
              )
            })}
          </div>

          {/* Right column (shuffled) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {task.rightOrder.map((pairIdx, j) => {
              const conn = conns.find(c => c.rightPos === j)
              const isWrong = wrongFlash?.r === j
              const border = conn ? (conn.correct ? OK_LINE : NO_LINE) : isWrong ? NO_LINE : 'var(--color-border-soft)'
              const bg = conn ? (conn.correct ? OK_BG : NO_BG) : isWrong ? NO_BG : 'var(--color-bg-3)'
              return (
                <motion.div
                  key={j}
                  animate={isWrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  onClick={() => clickRight(j)}
                  style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid ${border}`, background: bg, cursor: usedRight.has(j) ? 'default' : selected !== null ? 'pointer' : 'default', fontSize: 12, fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.4, transition: 'border-color 0.15s, background 0.15s' }}
                >
                  {task.pairs[pairIdx].right}
                </motion.div>
              )
            })}
          </div>
        </div>
      </Card>
    </Wrap>
  )
}

// ── Results ────────────────────────────────────────────────────────────────────

function ResultsScreen({ name, cfg, scores }: { name: string; cfg: ScreeningConfig; scores: Scores }) {
  const sections = activeDomains(cfg).map(key => {
    const sc = scores[key] ?? { correct: 0, total: 0 }
    const info = cfg[key].info
    return { key, icon: info.emoji, dim: info.dimension, desc: info.measures, pct: sc.total ? Math.round(sc.correct / sc.total * 100) : 0 }
  })
  const sorted = [...sections].sort((a, b) => b.pct - a.pct)
  const top = sorted[0]

  return (
    <Wrap>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>Скрининг завершён</div>
          <div style={{ fontSize: 14, color: 'var(--color-muted)', marginTop: 4 }}>{name}</div>
        </div>

        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: ACC, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Твой профиль</div>
          {sorted.map(s => {
            const col = s.pct >= 70 ? OK_TXT : s.pct >= 40 ? ACC : NO_TXT
            const isTop = s.key === top.key
            return (
              <div key={s.key} style={{ marginBottom: 12, padding: isTop ? '10px 12px' : '6px 0', borderRadius: isTop ? 12 : 0, background: isTop ? `${ACC}1a` : 'transparent', border: isTop ? `1px solid ${ACC}40` : 'none', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{s.dim}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{s.pct}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-3)' }}>{s.desc}</div>
                  </div>
                  {isTop && <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: ACC, borderRadius: 6, padding: '2px 7px' }}>TOP</span>}
                </div>
                <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.7, delay: 0.2 }} style={{ height: '100%', borderRadius: 999, background: col }} />
                </div>
              </div>
            )
          })}
        </Card>

        <div style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.6 }}>
          Результаты сохранены и переданы преподавателю
        </div>
      </motion.div>
    </Wrap>
  )
}

// ── Section registry ─────────────────────────────────────────────────────────────

const SECTIONS = {
  matrices: MatricesSection, series: SeriesSection, analogies: AnalogiesSection,
  rotation: RotationSection, memory: MemorySection, stroop: StroopSection,
  speed: SpeedSection, matching: MatchingSection,
} as Record<DomainKey, React.FC<SectionProps<never>>>

// ── Main page ──────────────────────────────────────────────────────────────────

type Mode = 'name' | 'intro' | 'run' | 'results'

export default function CognitiveScreeningPage() {
  const [cfg, setCfg]   = useState<ScreeningConfig>(() => loadScreeningConfig())
  useEffect(() => { fetchScreeningConfig().then(setCfg) }, [])
  const [mode, setMode] = useState<Mode>('name')
  const [name, setName] = useState('')
  const [stepIdx, setStepIdx] = useState(0)
  const [scores, setScores]   = useState<Scores>({})

  const seq = activeDomains(cfg)
  const labels = seq.map(k => cfg[k].info.short)

  // Save results when reaching the results screen.
  useEffect(() => {
    if (mode !== 'results') return
    appendAnonResult({
      name: name || 'Аноним',
      subject: 'logic',
      results: Object.fromEntries(seq.map(k => [cfg[k].info.dimension, scores[k] ?? { correct: 0, total: 0 }])),
      answers: {},
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  if (mode === 'name') return (
    <Wrap>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `${ACC}22`, border: `1px solid ${ACC}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={26} style={{ color: ACC }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{cfg.title}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{seq.length} разделов · ~{Math.max(6, seq.length * 2)} минут</div>
          </div>
        </div>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Введи своё ФИО</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>Результаты передаются преподавателю. Логин не нужен.</div>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim().length >= 2) { setStepIdx(0); setMode('intro') } }}
              placeholder="Например: Иванов Иван Иванович"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 36px', borderRadius: 13, border: `1.5px solid ${name.trim().length >= 2 ? ACC : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            />
          </div>
          <Btn onClick={() => { setStepIdx(0); setMode('intro') }} disabled={name.trim().length < 2}>
            Начать <ChevronRight size={15} />
          </Btn>
        </Card>
      </motion.div>
    </Wrap>
  )

  if (mode === 'results' || seq.length === 0) return <ResultsScreen name={name} cfg={cfg} scores={scores} />

  const key = seq[stepIdx]
  if (!key) return <ResultsScreen name={name} cfg={cfg} scores={scores} />
  const info = cfg[key].info

  if (mode === 'intro') return (
    <SectionIntro
      step={stepIdx} labels={labels} icon={info.emoji} title={info.dimension}
      desc={INTRO[key].desc} tip={INTRO[key].tip} info={info}
      onStart={() => setMode('run')}
    />
  )

  const Section = SECTIONS[key]
  return (
    <Section
      cfg={cfg[key] as never}
      step={stepIdx}
      labels={labels}
      onComplete={s => {
        setScores(prev => ({ ...prev, [key]: s }))
        if (stepIdx < seq.length - 1) { setStepIdx(stepIdx + 1); setMode('intro') }
        else setMode('results')
      }}
    />
  )
}
