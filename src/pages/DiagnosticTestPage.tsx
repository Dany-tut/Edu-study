import { useState, useEffect, useRef } from 'react'
import Skeleton from '../components/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle, Circle, ChevronRight, Target, User } from 'lucide-react'
import {
  loadDiagQuestions, fetchDiagQuestions, appendAnonResult,
  type DiagSubject, type DiagQuestion, type DiagResults,
  type CustomTestMeta,
} from '../data/diagnosticData'
import CognitiveScreeningPage from './CognitiveScreeningPage'
import PartyPopperLottie from '../components/PartyPopperLottie'
import { captureMistake } from '../data/reviewDeck'
import { logConfidence } from '../data/confidence'
import { getContrastColor, getCircleShadow } from '../lib/utils'
import { t, useT } from '../lib/i18n'

// ── Confetti + sound (self-contained, no external deps) ────────────────────────
function playVictorySound() {
  try {
    const ac = new AudioContext()
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = i === notes.length - 1 ? 'sine' : 'triangle'
      osc.frequency.value = freq
      const t0 = ac.currentTime + i * 0.13
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.22, t0 + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + (i === notes.length - 1 ? 0.9 : 0.28))
      osc.start(t0); osc.stop(t0 + 1.2)
    })
    const sh = ac.createOscillator(); const sG = ac.createGain()
    sh.connect(sG); sG.connect(ac.destination); sh.type = 'sine'
    sh.frequency.setValueAtTime(2093, ac.currentTime + 0.42)
    sh.frequency.linearRampToValueAtTime(2637, ac.currentTime + 0.55)
    sG.gain.setValueAtTime(0, ac.currentTime + 0.42)
    sG.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.44)
    sG.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.75)
    sh.start(ac.currentTime + 0.42); sh.stop(ac.currentTime + 0.8)
  } catch { /* no AudioContext */ }
}

function DiagConfetti({ bannerRef }: { bannerRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const W = window.innerWidth; const H = window.innerHeight
    canvas.width = W; canvas.height = H
    const rect = bannerRef.current?.getBoundingClientRect()
    const originY = rect ? rect.bottom : H * 0.45
    const originXMin = rect ? rect.left + rect.width * 0.1 : W * 0.2
    const originXMax = rect ? rect.right - rect.width * 0.1 : W * 0.8
    playVictorySound()
    const COLORS = ['#786AD7', '#B98BFF', '#3FCC8A', '#F8A000', '#F06070', '#5AD4C5', '#FFD700', '#FF6B9D']
    type Piece = { x:number; y:number; vx:number; vy:number; w:number; h:number; angle:number; spin:number; color:string; shape:'rect'|'circle' }
    const pieces: Piece[] = Array.from({ length: 160 }, () => ({
      x: originXMin + Math.random() * (originXMax - originXMin), y: originY,
      vx: (Math.random() - 0.5) * 22, vy: -(9 + Math.random() * 16),
      w: 6 + Math.random() * 9, h: 4 + Math.random() * 6,
      angle: Math.random() * Math.PI * 2, spin: (Math.random() - 0.5) * 0.28,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.38 ? 'rect' : 'circle',
    }))
    const startTime = performance.now(); const DURATION = 4000
    function tick(now: number) {
      const t = Math.min((now - startTime) / DURATION, 1)
      ctx!.clearRect(0, 0, W, H)
      for (const p of pieces) {
        p.x += p.vx; p.vx *= 0.985; p.vy += 0.45; p.y += p.vy; p.angle += p.spin
        const alpha = t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1
        ctx!.globalAlpha = alpha; ctx!.fillStyle = p.color
        ctx!.save(); ctx!.translate(p.x, p.y); ctx!.rotate(p.angle)
        if (p.shape === 'circle') { ctx!.beginPath(); ctx!.ellipse(0,0,p.w/2,p.h/2,0,0,Math.PI*2); ctx!.fill() }
        else { ctx!.fillRect(-p.w/2,-p.h/2,p.w,p.h) }
        ctx!.restore()
      }
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else ctx!.clearRect(0, 0, W, H)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [bannerRef])
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', pointerEvents:'none', zIndex:9999 }} />
}

// ── Done screen ───────────────────────────────────────────────────────────────
function DiagDoneScreen({ accentColor, onBack }: { accentColor: string; onBack: () => void }) {
  const t = useT()
  const bannerRef = useRef<HTMLDivElement>(null)
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px',
    }}>
      <DiagConfetti bannerRef={bannerRef} />
      <motion.div
        ref={bannerRef}
        initial={{ opacity: 0, scale: 0.88, y: 28 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        style={{
          width: '100%', maxWidth: 420,
          borderRadius: 32,
          background: '#ffffff',
          padding: '36px 32px 32px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 0,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <PartyPopperLottie size={80} />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--color-purple-text)', marginBottom: 10 }}>
          {t('Диагностика завершена')}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2, marginBottom: 12 }}>
          {t('Молодец! Ты справился 🎉')}
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
          {t('Результаты сохранены и отправлены преподавателю — он ознакомится с ними и свяжется с тобой :)')}
        </div>

      </motion.div>
    </div>
  )
}

// ── Subject theme ──────────────────────────────────────────────────────────────
const THEME: Record<Exclude<DiagSubject, 'logic'>, { accent: string; soft: string; label: string; sublabel: string }> = {
  biology:      { accent: '#22c55e', soft: '#dcfce7',                 label: t('Биология'),       sublabel: t('Диагностика знаний') },
  chemistry:    { accent: '#8B5CF6', soft: 'rgba(139,92,246,0.12)',   label: t('Химия'),           sublabel: t('Диагностика знаний') },
  'ap-chem-ru': { accent: '#3b82f6', soft: 'rgba(59,130,246,0.12)',   label: t('AP Химия'),        sublabel: t('Диагностика · RU')   },
  'ap-chem-en': { accent: '#14b8a6', soft: 'rgba(20,184,166,0.12)',   label: 'AP Chemistry',    sublabel: 'Diagnostic · EN'    },
}

const KNOWN_SUBJECTS = new Set<DiagSubject>(['biology', 'chemistry', 'logic', 'ap-chem-ru', 'ap-chem-en'])

function metaFromRow(row: CustomTestMeta): { label: string; accent: string; soft: string } {
  return { label: row.label, accent: row.accent, soft: row.accent + '22' }
}
function inferMeta(id: string): { label: string; accent: string; soft: string } {
  const label = id.replace(/^custom-/, '').replace(/--\d+$/, '').replace(/-+/g, ' ').trim()
  return { label: label || t('Тест'), accent: '#786AD7', soft: '#786AD722' }
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DiagnosticTestPage() {
  const t = useT()
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const rawSubject = params.get('subject') ?? 'biology'

  const isKnown = KNOWN_SUBJECTS.has(rawSubject as DiagSubject)
  const subject: DiagSubject = isKnown ? (rawSubject as DiagSubject) : ('biology' as DiagSubject)

  // Logic subject uses the full interactive cognitive battery
  if (subject === 'logic') return <CognitiveScreeningPage />

  const askConfidence = params.get('confidence') === '1'  // teacher enables via share link

  // Assignment context: set when opened from student dashboard assigned test
  const assignmentId = params.get('assignment') ?? undefined
  const assignedStudentId = params.get('sid') ?? undefined
  const assignedStudentName = params.get('sname') ? decodeURIComponent(params.get('sname')!) : undefined

  // Use rawSubject for data ops so custom test IDs are fetched correctly
  const fetchSubject = rawSubject as DiagSubject

  const [questions, setQuestions] = useState<DiagQuestion[]>(() => isKnown ? loadDiagQuestions(subject) : [])
  // For custom tests load metadata + questions from Supabase
  const [customMeta, setCustomMeta] = useState<{ label: string; accent: string; soft: string } | null>(
    !isKnown ? inferMeta(rawSubject) : null  // show inferred name immediately while loading
  )
  const [questionsLoading, setQuestionsLoading] = useState(!isKnown)
  useEffect(() => {
    if (!isKnown) {
      import('../data/diagnosticData').then(({ fetchCustomTestsMeta }) =>
        fetchCustomTestsMeta().then(list => {
          const row = list.find(t => t.id === rawSubject)
          if (row) setCustomMeta(metaFromRow(row))
          // else keep the inferred fallback already set
        })
      )
      fetchDiagQuestions(fetchSubject).then(qs => { setQuestions(qs ?? []); setQuestionsLoading(false) })
    }
  }, [fetchSubject])

  const theme = customMeta
    ? { accent: customMeta.accent, soft: customMeta.soft, label: customMeta.label, sublabel: t('Тест') }
    : (THEME[subject as Exclude<DiagSubject, 'logic'>] ?? { accent: '#786AD7', soft: '#786AD722', label: t('Тест'), sublabel: t('Тест') })

  // If opened via assignment, skip name entry and use student's name
  const [step, setStep] = useState<'name' | 'test' | 'done'>(assignedStudentName ? 'test' : 'name')
  const [studentName, setStudentName] = useState(assignedStudentName ?? '')
  const [current, setCurrent] = useState(0)
  const [chosen, setChosen] = useState<Record<string, number>>({})  // questionId → option index
  const [results, setResults] = useState<DiagResults>({})
  const [confident, setConfident] = useState<boolean | null>(null)  // confidence for current question

  const isLinkMode = !assignmentId  // shared link: no feedback shown

  const q: DiagQuestion | undefined = questions[current]
  const total = questions.length
  const progress = Object.keys(chosen).length / total
  const done = step === 'done'

  function pick(idx: number) {
    if (!q || chosen[q.id] !== undefined) return
    if (askConfidence && confident === null) return  // must rate confidence first
    setChosen(prev => ({ ...prev, [q!.id]: idx }))
    if (askConfidence && confident !== null) {
      logConfidence({ anonName: studentName.trim() || 'Аноним', subject, source: 'diagnostic', confident, correct: idx === q!.correct })
    }
    setTimeout(() => {
      setConfident(null)
      if (current < total - 1) {
        setCurrent(c => c + 1)
      } else {
        finishTest({ ...chosen, [q!.id]: idx })
      }
    }, 600)
  }

  async function finishTest(answers: Record<string, number>) {
    const res: DiagResults = {}
    const name = studentName.trim() || 'Аноним'
    for (const dq of questions) {
      if (!res[dq.section]) res[dq.section] = { correct: 0, total: 0 }
      res[dq.section].total++
      if (answers[dq.id] === dq.correct) res[dq.section].correct++
      else captureMistake({ anonName: name, subject: fetchSubject, source: 'diagnostic', prompt: dq.text, answer: dq.options[dq.correct], options: dq.options })
    }
    const totalQ = Object.values(res).reduce((a, s) => a + s.total, 0)
    const correctQ = Object.values(res).reduce((a, s) => a + s.correct, 0)
    const scorePct = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0
    await appendAnonResult(
      { name, subject: fetchSubject, results: res, answers },
      { studentId: assignedStudentId, assignmentId, scorePct },
    )
    setResults(res)
    setStep('done')
  }

  function goBack() {
    window.location.hash = '#/'
  }

  // ── Loading / not found ──
  if (questionsLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Skeleton.Text lines={4} style={{ maxWidth: 360 }} />
      </div>
    )
  }
  if (!questionsLoading && questions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{t('Тест не найден')}</div>
        <div style={{ fontSize: 14, color: 'var(--color-muted)', textAlign: 'center', maxWidth: 320 }}>
          {t('Вопросы этого теста не удалось загрузить. Возможно, тест был создан на другом устройстве и не сохранился на сервер.')}
        </div>
        <button onClick={goBack} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#786AD7', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {t('На главную')}
        </button>
      </div>
    )
  }

  // ── Name entry view ──
  if (step === 'name') {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 20px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{ width: '100%', maxWidth: 440 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: `${theme.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={26} style={{ color: theme.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>{t('Диагностика')}</div>
              <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{theme.label} · {total} {t('вопросов')}</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(var(--glass-rgb), 0.9)', border: '1px solid var(--color-border-glass)',
            borderRadius: 22, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>{t('Введи своё ФИО')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12 }}>
                {t('Результаты сохранятся у твоего преподавателя.')}<br />{t('Логин и пароль не нужны.')}
              </div>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                <input
                  autoFocus
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && studentName.trim().length >= 2) setStep('test') }}
                  placeholder={t('Например: Иванов Иван Иванович')}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 14px 12px 36px', borderRadius: 13,
                    border: `1.5px solid ${studentName.trim().length >= 2 ? theme.accent : 'var(--color-border-medium)'}`,
                    background: 'var(--color-bg-input)', color: 'var(--color-text)',
                    fontSize: 14, fontFamily: 'inherit', outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: studentName.trim().length >= 2 ? 1.02 : 1 }}
              whileTap={{ scale: studentName.trim().length >= 2 ? 0.98 : 1 }}
              onClick={() => { if (studentName.trim().length >= 2) setStep('test') }}
              disabled={studentName.trim().length < 2}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: studentName.trim().length >= 2 ? 'pointer' : 'not-allowed',
                background: studentName.trim().length >= 2 ? theme.accent : 'var(--color-bg-5)',
                color: studentName.trim().length >= 2 ? '#fff' : 'var(--color-text-3)',
                fontSize: 15, fontWeight: 700, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {t('Начать тест')} <ChevronRight size={16} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Results view ──
  if (done) {
    return <DiagDoneScreen accentColor={theme.accent} onBack={goBack} />
  }

  // ── Test view ──
  if (step !== 'test' || !q) return null

  const picked = chosen[q.id]

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '32px 20px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button
            onClick={goBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px 8px 10px', borderRadius: 999,
              border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.9)',
              color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> {t('Выйти')}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: `${theme.accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Target size={14} style={{ color: theme.accent }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {t('Диагностика')} · {theme.label}
            </span>
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)' }}>
            {current + 1} / {total}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)', marginBottom: 28, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 999, background: theme.accent }}
          />
        </div>

        {/* Question */}
        {/* Ремоунт по key, без AnimatePresence: `mode="wait"` умеет навсегда
            залипнуть (сигнал «выход завершён» теряется — см. onExit в
            AnimatePresence/index.mjs), и вопрос встал бы пустым посреди теста —
            до F5, с потерей ответов. Вопросы идут вперёд и не повторяются,
            само не вылечится. Вложенные AnimatePresence оставлены: там
            показ/скрытие, оно самовосстанавливается. */}
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
          >
            {/* Section badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center',
              padding: '3px 10px', borderRadius: 999,
              background: `${theme.accent}18`,
              fontSize: 11, fontWeight: 600, color: theme.accent,
              marginBottom: 12,
            }}>
              {q.section}
            </div>

            {/* Question text */}
            <div style={{
              fontSize: 16, fontWeight: 700, lineHeight: 1.5,
              color: 'var(--color-text)', marginBottom: 20,
            }}>
              {q.text}
            </div>

            {/* Confidence gate — shown when teacher enabled it; must pick before answering */}
            {askConfidence && picked === undefined && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 8 }}>{t('Насколько уверен в ответе?')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([[true, t('Уверен'), '#22c55e'], [false, t('Не уверен'), '#f59e0b']] as [boolean, string, string][]).map(([val, label, col]) => (
                    <button key={label} onClick={() => setConfident(val)}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                        border: `1.5px solid ${confident === val ? col : 'var(--color-border-medium)'}`,
                        background: confident === val ? `${col}1a` : 'var(--color-bg-2)',
                        color: confident === val ? col : 'var(--color-text-2)', transition: 'all 0.14s' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, opacity: askConfidence && picked === undefined && confident === null ? 0.45 : 1, pointerEvents: askConfidence && picked === undefined && confident === null ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
              {q.options.map((opt, idx) => {
                const isChosen = picked === idx
                const isCorrect = q.correct === idx
                const showResult = picked !== undefined && !isLinkMode

                const PICK_COLOR = '#786AD7'
                let borderColor = 'var(--color-border-medium)'
                if (showResult) {
                  if (isCorrect) borderColor = '#22c55e'
                  else if (isChosen) borderColor = '#ef4444'
                } else if (isChosen) {
                  borderColor = PICK_COLOR
                }

                return (
                  <motion.button
                    key={idx}
                    onClick={() => pick(idx)}
                    disabled={picked !== undefined}
                    whileHover={picked === undefined ? { scale: 1.01 } : {}}
                    whileTap={picked === undefined ? { scale: 0.99 } : {}}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px', borderRadius: 14,
                      border: `1.5px solid ${borderColor}`,
                      background: 'var(--color-bg-2)',
                      cursor: picked !== undefined ? 'default' : 'pointer',
                      textAlign: 'left', width: '100%',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${showResult
                        ? isCorrect ? '#22c55e' : isChosen ? '#ef4444' : 'var(--color-border-medium)'
                        : isChosen ? PICK_COLOR : 'var(--color-border-medium)'
                      }`,
                      background: showResult
                        ? isCorrect ? '#22c55e' : isChosen ? '#ef4444' : 'transparent'
                        : isChosen ? PICK_COLOR : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      color: showResult
                        ? (isCorrect || isChosen ? '#fff' : 'var(--color-muted)')
                        : isChosen ? '#fff' : 'var(--color-muted)',
                      boxShadow: !showResult && isChosen ? getCircleShadow(PICK_COLOR) : 'none',
                      transition: 'all 0.2s',
                    }}>
                      {'АБВГ'[idx]}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)', lineHeight: 1.4 }}>
                      {opt}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* Result feedback card — shown below options, not inside them */}
            <AnimatePresence>
              {picked !== undefined && !isLinkMode && (() => {
                const isRight = picked === q.correct
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.22 }}
                    style={{
                      marginTop: 14,
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: `1.5px solid ${isRight ? '#22c55e55' : '#ef444455'}`,
                      background: isRight ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}
                  >
                    {isRight
                      ? <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
                      : <Circle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
                    }
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isRight ? '#22c55e' : '#ef4444' }}>
                        {isRight ? t('Верно!') : t('Неверно')}
                      </div>
                      {!isRight && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
                          {t('Правильный ответ:')} <span style={{ fontWeight: 600, color: '#22c55e' }}>{q.options[q.correct]}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })()}
            </AnimatePresence>

            {/* Next button */}
            <AnimatePresence>
              {picked !== undefined && !isLinkMode && current < total - 1 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCurrent(c => c + 1)}
                  style={{
                    marginTop: 12, width: '100%', padding: '13px',
                    borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: theme.accent, color: getContrastColor(theme.accent),
                    fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {t('Следующий вопрос')} <ChevronRight size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
      </div>
    </div>
  )
}
