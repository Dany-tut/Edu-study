import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, ChevronRight, User, Check, X } from 'lucide-react'
import { appendAnonResult } from '../data/diagnosticData'

const ACC = '#f59e0b'
const SOFT = '#fef3c7'

// ── Types ──────────────────────────────────────────────────────────────────────

type Phase =
  | 'name'
  | 'intro-matrices' | 'matrices'
  | 'intro-memory'   | 'memory'
  | 'intro-stroop'   | 'stroop'
  | 'intro-matching' | 'matching'
  | 'results'

interface SectionScore { correct: number; total: number }
interface Scores { matrices: SectionScore; memory: SectionScore; stroop: SectionScore; matching: SectionScore }

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

function SectionProgress({ step, total = 4 }: { step: number; total?: number }) {
  const labels = ['Матрицы', 'Память', 'Струп', 'Связи']
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 32, height: 4, borderRadius: 999, background: i < step ? ACC : i === step ? `${ACC}66` : 'var(--color-bg-5)', transition: 'background 0.3s' }} />
          <div style={{ fontSize: 9, color: i <= step ? ACC : 'var(--color-text-3)', fontWeight: 600 }}>{labels[i]}</div>
        </div>
      ))}
    </div>
  )
}

// ── Section intro ──────────────────────────────────────────────────────────────

interface IntroProps { icon: string; title: string; desc: string; tip: string; step: number; onStart: () => void }
function SectionIntro({ icon, title, desc, tip, step, onStart }: IntroProps) {
  return (
    <Wrap>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <SectionProgress step={step} />
        <Card>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>{desc}</div>
          </div>
          <div style={{ background: SOFT, borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 20 }}>
            💡 {tip}
          </div>
          <Btn onClick={onStart}>Начать <ChevronRight size={15} /></Btn>
        </Card>
      </motion.div>
    </Wrap>
  )
}

// ── SVG Shape cell ─────────────────────────────────────────────────────────────

type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond'
type FillKind  = 'outline' | 'solid' | 'striped'
type SzKind    = 'large' | 'medium' | 'small'

const SZ_R = { large: 0.40, medium: 0.28, small: 0.17 }

function ShapeCell({ kind, fill, sz = 'medium', size = 52 }: { kind: ShapeKind; fill: FillKind; sz?: SzKind; size?: number }) {
  const cx = size / 2, cy = size / 2
  const r = size * SZ_R[sz]
  const sw = Math.max(2, size * 0.055)
  const pid = `p-${kind}-${fill}-${sz}-${size}`
  const fa = fill === 'solid' ? ACC : fill === 'striped' ? `url(#${pid})` : 'none'
  const pts = {
    triangle: `${cx},${cy - r} ${cx + r * 0.87},${cy + r * 0.5} ${cx - r * 0.87},${cy + r * 0.5}`,
    diamond:  `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`,
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {fill === 'striped' && (
        <defs>
          <pattern id={pid} patternUnits="userSpaceOnUse" width="5" height="5">
            <line x1="0" y1="5" x2="5" y2="0" stroke={ACC} strokeWidth="1.5" />
          </pattern>
        </defs>
      )}
      {kind === 'circle'   && <circle cx={cx} cy={cy} r={r} fill={fa} stroke={ACC} strokeWidth={sw} />}
      {kind === 'square'   && <rect x={cx-r} y={cy-r} width={r*2} height={r*2} fill={fa} stroke={ACC} strokeWidth={sw} />}
      {kind === 'triangle' && <polygon points={pts.triangle} fill={fa} stroke={ACC} strokeWidth={sw} />}
      {kind === 'diamond'  && <polygon points={pts.diamond}  fill={fa} stroke={ACC} strokeWidth={sw} />}
    </svg>
  )
}

function ArrowCell({ deg, size = 52 }: { deg: number; size?: number }) {
  const cx = size / 2, cy = size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <g transform={`rotate(${deg},${cx},${cy})`}>
        <line x1={cx-16} y1={cy} x2={cx+13} y2={cy} stroke={ACC} strokeWidth="4" strokeLinecap="round" />
        <polyline points={`${cx+4},${cy-9} ${cx+13},${cy} ${cx+4},${cy+9}`} fill="none" stroke={ACC} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// ── Raven's Matrices ───────────────────────────────────────────────────────────

type CellDef =
  | { t: 'shape'; k: ShapeKind; f: FillKind; sz?: SzKind }
  | { t: 'arrow'; deg: number }
  | { t: 'empty' }

interface Matrix { grid: CellDef[][]; opts: CellDef[]; correct: number }

const MATRICES: Matrix[] = [
  // Matrix 1: Fill rule — row = fill, col = shape
  {
    grid: [
      [{ t:'shape', k:'circle', f:'outline' }, { t:'shape', k:'square', f:'outline' }, { t:'shape', k:'triangle', f:'outline' }],
      [{ t:'shape', k:'circle', f:'solid'   }, { t:'shape', k:'square', f:'solid'   }, { t:'shape', k:'triangle', f:'solid'   }],
      [{ t:'shape', k:'circle', f:'striped' }, { t:'shape', k:'square', f:'striped' }, { t:'empty' }],
    ],
    opts: [
      { t:'shape', k:'triangle', f:'striped' },
      { t:'shape', k:'diamond',  f:'striped' },
      { t:'shape', k:'triangle', f:'solid'   },
      { t:'shape', k:'circle',   f:'striped' },
    ],
    correct: 0,
  },
  // Matrix 2: Size rule — row = shape, col = size (large→medium→small)
  {
    grid: [
      [{ t:'shape', k:'circle',   f:'solid', sz:'large' }, { t:'shape', k:'circle',   f:'solid', sz:'medium' }, { t:'shape', k:'circle',   f:'solid', sz:'small' }],
      [{ t:'shape', k:'square',   f:'solid', sz:'large' }, { t:'shape', k:'square',   f:'solid', sz:'medium' }, { t:'shape', k:'square',   f:'solid', sz:'small' }],
      [{ t:'shape', k:'triangle', f:'solid', sz:'large' }, { t:'shape', k:'triangle', f:'solid', sz:'medium' }, { t:'empty' }],
    ],
    opts: [
      { t:'shape', k:'triangle', f:'solid', sz:'small'  },
      { t:'shape', k:'triangle', f:'solid', sz:'medium' },
      { t:'shape', k:'circle',   f:'solid', sz:'small'  },
      { t:'shape', k:'diamond',  f:'solid', sz:'small'  },
    ],
    correct: 0,
  },
  // Matrix 3: Rotation — cell[r][c] = (r+c)*90°
  {
    grid: [
      [{ t:'arrow', deg:0 },   { t:'arrow', deg:90 },  { t:'arrow', deg:180 }],
      [{ t:'arrow', deg:90 },  { t:'arrow', deg:180 }, { t:'arrow', deg:270 }],
      [{ t:'arrow', deg:180 }, { t:'arrow', deg:270 }, { t:'empty' }],
    ],
    opts: [
      { t:'arrow', deg:0   },
      { t:'arrow', deg:90  },
      { t:'arrow', deg:270 },
      { t:'arrow', deg:45  },
    ],
    correct: 0,
  },
]

function renderCell(cell: CellDef, size = 52) {
  if (cell.t === 'empty') return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 26, color: ACC, fontWeight: 900 }}>?</span></div>
  if (cell.t === 'arrow') return <ArrowCell deg={cell.deg} size={size} />
  return <ShapeCell kind={cell.k} fill={cell.f} sz={cell.sz} size={size} />
}

function MatricesSection({ onComplete }: { onComplete: (s: SectionScore) => void }) {
  const [qIdx, setQIdx]       = useState(0)
  const [chosen, setChosen]   = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)

  const m = MATRICES[qIdx]

  function pick(i: number) {
    if (chosen !== null) return
    setChosen(i)
    const isCorrect = i === m.correct
    if (isCorrect) setCorrect(c => c + 1)
    setTimeout(() => {
      if (qIdx < MATRICES.length - 1) { setQIdx(q => q + 1); setChosen(null) }
      else onComplete({ correct: isCorrect ? correct + 1 : correct, total: MATRICES.length })
    }, 900)
  }

  const CELL = 52, GAP = 4

  return (
    <Wrap>
      <SectionProgress step={0} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Задание {qIdx + 1} из {MATRICES.length}</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>Что стоит на месте «?»</div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        {/* 3×3 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(3,${CELL}px)`, gap: GAP, margin: '0 auto', width: 'fit-content', padding: 8, background: 'var(--color-bg-3)', borderRadius: 14 }}>
          {m.grid.flat().map((cell, i) => (
            <div key={i} style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', borderRadius: 8 }}>
              {renderCell(cell, CELL - 8)}
            </div>
          ))}
        </div>
      </Card>

      {/* 4 options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {m.opts.map((opt, i) => {
          const picked = chosen === i
          const isRight = i === m.correct
          const bg = chosen === null ? 'var(--color-bg)' : picked && isRight ? '#dcfce7' : picked && !isRight ? '#fee2e2' : isRight && chosen !== null ? '#dcfce7' : 'var(--color-bg)'
          const border = chosen === null ? 'var(--color-border-soft)' : picked && isRight ? '#22c55e' : picked && !isRight ? '#ef4444' : isRight && chosen !== null ? '#22c55e' : 'var(--color-border-soft)'
          return (
            <motion.div
              key={i}
              onClick={() => pick(i)}
              whileHover={{ scale: chosen === null ? 1.03 : 1 }}
              whileTap={{ scale: chosen === null ? 0.97 : 1 }}
              style={{ cursor: chosen === null ? 'pointer' : 'default', padding: 10, borderRadius: 14, border: `2px solid ${border}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
            >
              {renderCell(opt, CELL - 6)}
            </motion.div>
          )
        })}
      </div>
    </Wrap>
  )
}

// ── Working Memory ─────────────────────────────────────────────────────────────

const MEM_SEQS = [
  [2, 0, 4],
  [5, 1, 3, 0],
  [4, 2, 0, 3, 1],
]

type MemPhase = 'show' | 'recall' | 'feedback'

function MemorySection({ onComplete }: { onComplete: (s: SectionScore) => void }) {
  const [trialIdx, setTrialIdx] = useState(0)
  const [memPhase, setMemPhase] = useState<MemPhase>('show')
  const [lit, setLit]           = useState<number | null>(null)
  const [input, setInput]       = useState<number[]>([])
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const [scores, setScores]     = useState<boolean[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => {
    if (memPhase !== 'show') return
    clearTimers()
    const seq = MEM_SEQS[trialIdx]
    let delay = 900
    for (const cell of seq) {
      const t1 = setTimeout(() => setLit(cell), delay)
      const t2 = setTimeout(() => setLit(null),  delay + 650)
      timers.current.push(t1, t2)
      delay += 1000
    }
    const tEnd = setTimeout(() => { setMemPhase('recall'); setInput([]) }, delay + 200)
    timers.current.push(tEnd)
    return clearTimers
  }, [memPhase, trialIdx])

  function handleCellClick(idx: number) {
    if (memPhase !== 'recall') return
    const next = [...input, idx]
    setInput(next)
    const seq = MEM_SEQS[trialIdx]
    if (next.length < seq.length) return
    const isCorrect = next.every((v, i) => v === seq[i])
    setFeedback(isCorrect)
    setMemPhase('feedback')
    const newScores = [...scores, isCorrect]
    setScores(newScores)
    setTimeout(() => {
      setFeedback(null)
      if (trialIdx < MEM_SEQS.length - 1) {
        setTrialIdx(t => t + 1)
        setMemPhase('show')
      } else {
        onComplete({ correct: newScores.filter(Boolean).length, total: MEM_SEQS.length })
      }
    }, 1000)
  }

  const seq = MEM_SEQS[trialIdx]

  return (
    <Wrap>
      <SectionProgress step={1} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Раунд {trialIdx + 1} из {MEM_SEQS.length} · запомни {seq.length} ячеек</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>
          {memPhase === 'show' ? 'Запоминай последовательность' : memPhase === 'recall' ? 'Нажимай в том же порядке' : feedback ? '✓ Верно!' : '✗ Ошибка'}
        </div>
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {Array.from({ length: 6 }, (_, i) => {
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
        {memPhase === 'feedback' && (
          <div style={{ textAlign: 'center', padding: '10px', borderRadius: 12, background: feedback ? '#dcfce7' : '#fee2e2', color: feedback ? '#166534' : '#991b1b', fontWeight: 700, fontSize: 14 }}>
            {feedback ? `Правильно! Последовательность: ${seq.join(' → ')}` : `Нет. Правильно было: ${seq.join(' → ')}`}
          </div>
        )}
        {memPhase === 'show' && (
          <div style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: 12 }}>Ячейки загораются — запоминай порядок</div>
        )}
      </Card>
    </Wrap>
  )
}

// ── Stroop Test ────────────────────────────────────────────────────────────────

const STROOP_COLORS = [
  { name: 'КРАСНЫЙ', hex: '#ef4444' },
  { name: 'СИНИЙ',   hex: '#3b82f6' },
  { name: 'ЗЕЛЁНЫЙ', hex: '#22c55e' },
  { name: 'ЖЁЛТЫЙ',  hex: '#eab308' },
] as const

const STROOP_TRIALS = [
  { word:'КРАСНЫЙ', inkIdx:1, correct:1 }, // ink=СИНИЙ
  { word:'ЗЕЛЁНЫЙ', inkIdx:2, correct:2 }, // congruent
  { word:'СИНИЙ',   inkIdx:3, correct:3 },
  { word:'ЖЁЛТЫЙ',  inkIdx:0, correct:0 },
  { word:'КРАСНЫЙ', inkIdx:0, correct:0 }, // congruent
  { word:'ЗЕЛЁНЫЙ', inkIdx:1, correct:1 },
  { word:'ЖЁЛТЫЙ',  inkIdx:2, correct:2 },
  { word:'СИНИЙ',   inkIdx:0, correct:0 },
  { word:'КРАСНЫЙ', inkIdx:3, correct:3 },
  { word:'ЖЁЛТЫЙ',  inkIdx:1, correct:1 },
]

function StroopSection({ onComplete }: { onComplete: (s: SectionScore) => void }) {
  const [idx, setIdx]         = useState(0)
  const [flash, setFlash]     = useState<boolean | null>(null)
  const [correct, setCorrect] = useState(0)

  const trial = STROOP_TRIALS[idx]
  const inkColor = STROOP_COLORS[trial.inkIdx].hex

  function pick(colorIdx: number) {
    if (flash !== null) return
    const ok = colorIdx === trial.correct
    if (ok) setCorrect(c => c + 1)
    setFlash(ok)
    setTimeout(() => {
      setFlash(null)
      if (idx < STROOP_TRIALS.length - 1) setIdx(i => i + 1)
      else onComplete({ correct: ok ? correct + 1 : correct, total: STROOP_TRIALS.length })
    }, 450)
  }

  return (
    <Wrap>
      <SectionProgress step={2} />
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Вопрос {idx + 1} из {STROOP_TRIALS.length}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>Нажми кнопку цвета ШРИФТА (не слова)</div>
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
            <span style={{ fontSize: 42, fontWeight: 900, color: inkColor, letterSpacing: 2, fontFamily: 'inherit' }}>
              {trial.word}
            </span>
          </motion.div>
        </AnimatePresence>

        {flash !== null && (
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: flash ? '#22c55e' : '#ef4444', marginBottom: 8 }}>
            {flash ? '✓ Верно' : '✗ Ошибка'}
          </div>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {STROOP_COLORS.map((c, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: flash !== null ? 1 : 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => pick(i)}
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

interface MatchTask {
  title: string
  pairs: { left: string; right: string }[]
  rightOrder: number[]  // pairs[rightOrder[i]] shown at right position i
}

const MATCH_TASKS: MatchTask[] = [
  {
    title: 'Причина → Следствие',
    pairs: [
      { left: 'Рост CO₂ в атмосфере',      right: 'Парниковый эффект' },
      { left: 'Исчезновение хищников',      right: 'Рост численности травоядных' },
      { left: 'Мутация в половой клетке',   right: 'Изменение признаков у потомства' },
      { left: 'Нехватка железа в крови',    right: 'Снижение переноса кислорода' },
    ],
    rightOrder: [1, 3, 0, 2],
  },
  {
    title: 'Понятие → Определение',
    pairs: [
      { left: 'Фотосинтез', right: 'Синтез глюкозы из CO₂ с помощью света' },
      { left: 'Мейоз',      right: 'Деление с уменьшением числа хромосом вдвое' },
      { left: 'Фермент',    right: 'Белок-катализатор биохимических реакций' },
      { left: 'Симбиоз',    right: 'Взаимовыгодное сосуществование разных видов' },
    ],
    rightOrder: [2, 0, 3, 1],
  },
]

interface Connection { leftIdx: number; rightPos: number; correct: boolean }

function MatchingSection({ onComplete }: { onComplete: (s: SectionScore) => void }) {
  const [taskIdx, setTaskIdx]   = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [conns, setConns]       = useState<Connection[]>([])
  const [wrongFlash, setWrong]  = useState<{ l: number; r: number } | null>(null)
  const [totalCorrect, setTotal] = useState(0)

  const task = MATCH_TASKS[taskIdx]
  const usedLeft  = new Set(conns.map(c => c.leftIdx))
  const usedRight = new Set(conns.map(c => c.rightPos))

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
        if (taskIdx < MATCH_TASKS.length - 1) {
          setTaskIdx(t => t + 1)
          setConns([])
          setTotal(nextTotal)
        } else {
          onComplete({ correct: nextTotal, total: MATCH_TASKS.length * task.pairs.length })
        }
      }, 800)
    }
  }

  return (
    <Wrap>
      <SectionProgress step={3} />
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600 }}>Задание {taskIdx + 1} из {MATCH_TASKS.length}</div>
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
              const border = conn ? (conn.correct ? '#22c55e' : '#ef4444') : isSel ? ACC : 'var(--color-border-soft)'
              const bg = conn ? (conn.correct ? '#dcfce755' : '#fee2e255') : isSel ? SOFT : 'var(--color-bg-3)'
              return (
                <div key={i} onClick={() => clickLeft(i)} style={{ padding: '10px 12px', borderRadius: 12, border: `2px solid ${border}`, background: bg, cursor: usedLeft.has(i) ? 'default' : 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.4, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {conn && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, color: conn.correct ? '#22c55e' : '#ef4444' }}>{conn.correct ? '✓' : '✗'}</span>}
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
              const border = conn ? (conn.correct ? '#22c55e' : '#ef4444') : isWrong ? '#ef4444' : 'var(--color-border-soft)'
              const bg = conn ? (conn.correct ? '#dcfce755' : '#fee2e255') : isWrong ? '#fee2e255' : 'var(--color-bg-3)'
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

const SECTION_META = [
  { key: 'matrices' as const, icon: '🔢', label: 'Матрицы Равена',   dim: 'Флюидный интеллект',    desc: 'Способность находить закономерности в новых задачах' },
  { key: 'memory'   as const, icon: '🧠', label: 'Рабочая память',   dim: 'Оперативная память',     desc: 'Удержание и воспроизведение информации в уме' },
  { key: 'stroop'   as const, icon: '⚡', label: 'Тест Струпа',      dim: 'Когнитивный контроль',   desc: 'Торможение автоматических реакций, концентрация' },
  { key: 'matching' as const, icon: '🔗', label: 'Ассоциации',       dim: 'Семантическая память',   desc: 'Связывание понятий и причинно-следственных цепочек' },
]

function ResultsScreen({ name, scores, onBack }: { name: string; scores: Scores; onBack: () => void }) {
  const sections = SECTION_META.map(m => ({ ...m, ...scores[m.key], pct: scores[m.key].total ? Math.round(scores[m.key].correct / scores[m.key].total * 100) : 0 }))
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
            const col = s.pct >= 70 ? '#22c55e' : s.pct >= 40 ? ACC : '#ef4444'
            const isTop = s.key === top.key
            return (
              <div key={s.key} style={{ marginBottom: 12, padding: isTop ? '10px 12px' : '6px 0', borderRadius: isTop ? 12 : 0, background: isTop ? SOFT : 'transparent', transition: 'background 0.2s' }}>
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CognitiveScreeningPage() {
  const [phase, setPhase] = useState<Phase>('name')
  const [name, setName]   = useState('')
  const [scores, setScores] = useState<Scores>({
    matrices: { correct: 0, total: 3 },
    memory:   { correct: 0, total: 3 },
    stroop:   { correct: 0, total: 10 },
    matching: { correct: 0, total: 8 },
  })

  function done(key: keyof Scores, s: SectionScore, next: Phase) {
    setScores(prev => ({ ...prev, [key]: s }))
    setPhase(next)
  }

  // Save results when reaching results screen
  useEffect(() => {
    if (phase !== 'results') return
    appendAnonResult({
      name: name || 'Аноним',
      subject: 'logic',
      results: {
        'Матрицы Равена':  scores.matrices,
        'Рабочая память':  scores.memory,
        'Тест Струпа':     scores.stroop,
        'Ассоциации':      scores.matching,
      },
      answers: {},
    })
  }, [phase])

  if (phase === 'name') return (
    <Wrap>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain size={26} style={{ color: ACC }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>Скрининг мышления</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>4 раздела · ~12 минут</div>
          </div>
        </div>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Введи своё ФИО</div>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 14 }}>Результаты передаются преподавателю. Логин не нужен.</div>
          <div style={{ position: 'relative', marginBottom: 18 }}>
            <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
            <input
              autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim().length >= 2) setPhase('intro-matrices') }}
              placeholder="Например: Иванов Иван Иванович"
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px 12px 36px', borderRadius: 13, border: `1.5px solid ${name.trim().length >= 2 ? ACC : 'var(--color-border-medium)'}`, background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
            />
          </div>
          <Btn onClick={() => setPhase('intro-matrices')} disabled={name.trim().length < 2}>
            Начать <ChevronRight size={15} />
          </Btn>
        </Card>
      </motion.div>
    </Wrap>
  )

  if (phase === 'intro-matrices') return (
    <SectionIntro step={0} icon="🔢" title="Матрицы Равена" desc="Найди закономерность и выбери недостающий элемент. 3 задания без ограничения времени." tip="Смотри на строки и столбцы — паттерн есть в обоих направлениях." onStart={() => setPhase('matrices')} />
  )
  if (phase === 'matrices') return (
    <MatricesSection onComplete={s => done('matrices', s, 'intro-memory')} />
  )

  if (phase === 'intro-memory') return (
    <SectionIntro step={1} icon="🧠" title="Рабочая память" desc="Ячейки будут загораться по очереди — запомни порядок и воспроизведи его нажатиями. 3 раунда." tip="Не торопись с нажатиями — убедись, что видишь всю последовательность." onStart={() => setPhase('memory')} />
  )
  if (phase === 'memory') return (
    <MemorySection onComplete={s => done('memory', s, 'intro-stroop')} />
  )

  if (phase === 'intro-stroop') return (
    <SectionIntro step={2} icon="⚡" title="Тест Струпа" desc="Слово написано определённым цветом. Нажимай кнопку с цветом ШРИФТА — не читай слово, смотри на цвет. 10 заданий." tip="Мозг хочет прочитать слово — противостой этому. Сосредоточься на цвете букв." onStart={() => setPhase('stroop')} />
  )
  if (phase === 'stroop') return (
    <StroopSection onComplete={s => done('stroop', s, 'intro-matching')} />
  )

  if (phase === 'intro-matching') return (
    <SectionIntro step={3} icon="🔗" title="Соответствие понятий" desc="Соедини каждый элемент слева с соответствующим элементом справа. 2 задания по 4 пары." tip="Если не знаешь — исключай очевидно неправильные варианты." onStart={() => setPhase('matching')} />
  )
  if (phase === 'matching') return (
    <MatchingSection onComplete={s => done('matching', s, 'results')} />
  )

  return <ResultsScreen name={name} scores={scores} onBack={() => { window.location.hash = '#/' }} />
}
