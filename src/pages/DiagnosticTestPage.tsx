import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, CheckCircle, Circle, ChevronRight, Target, User } from 'lucide-react'
import {
  loadDiagQuestions, appendAnonResult,
  type DiagSubject, type DiagQuestion, type DiagResults,
} from '../data/diagnosticData'

// ── Subject theme ──────────────────────────────────────────────────────────────
const THEME: Record<DiagSubject, { accent: string; soft: string; label: string; sublabel: string }> = {
  biology:   { accent: '#22c55e', soft: '#dcfce7', label: 'Биология', sublabel: 'Диагностика знаний' },
  chemistry: { accent: '#7c3aed', soft: '#ede9fe', label: 'Химия', sublabel: 'Диагностика знаний' },
  logic:     { accent: '#f59e0b', soft: '#fef3c7', label: 'Скрининг мышления', sublabel: 'Когнитивный профиль' },
}

// Cognitive sections for logic test — maps section name → display info
const COGNITIVE_SECTIONS: Record<string, { emoji: string; short: string; desc: string }> = {
  'Числовые паттерны':          { emoji: '🔢', short: 'Числовое',      desc: 'Видишь закономерности в числах и прогрессиях' },
  'Вербальные аналогии':        { emoji: '💬', short: 'Вербальное',    desc: 'Мыслишь понятиями, улавливаешь смысловые связи' },
  'Логические исключения':      { emoji: '🔍', short: 'Аналитическое', desc: 'Умеешь выделять главное и отсекать лишнее' },
  'Математические вычисления':  { emoji: '🧮', short: 'Математическое',desc: 'Считаешь быстро и точно, решаешь задачи' },
  'Пространственное мышление':  { emoji: '🧩', short: 'Пространственное', desc: 'Хорошо ориентируешься в 2D/3D, мыслишь образами' },
  'Причинно-следственные связи':{ emoji: '🔗', short: 'Системное',     desc: 'Понимаешь, как одно явление влияет на другое' },
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DiagnosticTestPage() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
  const rawSubject = params.get('subject')
  const subject: DiagSubject =
    rawSubject === 'chemistry' ? 'chemistry'
    : rawSubject === 'logic' ? 'logic'
    : 'biology'
  const theme = THEME[subject]

  const questions = useMemo(() => loadDiagQuestions(subject), [subject])

  const [step, setStep] = useState<'name' | 'test' | 'done'>('name')
  const [studentName, setStudentName] = useState('')
  const [current, setCurrent] = useState(0)
  const [chosen, setChosen] = useState<Record<string, number>>({})  // questionId → option index
  const [results, setResults] = useState<DiagResults>({})

  const q: DiagQuestion | undefined = questions[current]
  const total = questions.length
  const progress = Object.keys(chosen).length / total
  const done = step === 'done'

  function pick(idx: number) {
    if (!q || chosen[q.id] !== undefined) return
    setChosen(prev => ({ ...prev, [q!.id]: idx }))
    setTimeout(() => {
      if (current < total - 1) {
        setCurrent(c => c + 1)
      } else {
        finishTest({ ...chosen, [q!.id]: idx })
      }
    }, 600)
  }

  async function finishTest(answers: Record<string, number>) {
    const res: DiagResults = {}
    for (const dq of questions) {
      if (!res[dq.section]) res[dq.section] = { correct: 0, total: 0 }
      res[dq.section].total++
      if (answers[dq.id] === dq.correct) res[dq.section].correct++
    }
    await appendAnonResult({ name: studentName.trim() || 'Аноним', subject, results: res, answers })
    setResults(res)
    setStep('done')
  }

  function goBack() {
    window.location.hash = '#/'
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
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>Диагностика</div>
              <div style={{ fontSize: 14, color: 'var(--color-muted)' }}>{theme.label} · {total} вопросов</div>
            </div>
          </div>

          <div style={{
            background: 'rgba(var(--glass-rgb), 0.9)', border: '1px solid var(--color-border-glass)',
            borderRadius: 22, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Введи своё ФИО</div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 12 }}>
                Результаты сохранятся у твоего преподавателя. Логин и пароль не нужны.
              </div>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                <input
                  autoFocus
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && studentName.trim().length >= 2) setStep('test') }}
                  placeholder="Например: Иванов Иван Иванович"
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
              Начать тест <ChevronRight size={16} />
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Results view ──
  if (done) {
    const sections = Object.entries(results)
    const totalCorrect = sections.reduce((s, [, v]) => s + v.correct, 0)
    const totalQ = sections.reduce((s, [, v]) => s + v.total, 0)
    const pct = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0

    // Cognitive profile for logic test
    const cognitiveProfile = subject === 'logic'
      ? sections
          .map(([sec, { correct: c, total: t }]) => ({ sec, pct: t ? Math.round((c / t) * 100) : 0, info: COGNITIVE_SECTIONS[sec] }))
          .sort((a, b) => b.pct - a.pct)
      : null
    const topSkill = cognitiveProfile?.[0]

    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 20px',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{ width: '100%', maxWidth: 520 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${theme.accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={22} style={{ color: theme.accent }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
                {subject === 'logic' ? 'Скрининг завершён' : 'Диагностика завершена'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{theme.label}</div>
            </div>
          </div>

          {/* Total score */}
          <div style={{
            padding: '24px', borderRadius: 20,
            background: pct >= 70 ? 'var(--color-green-soft)' : pct >= 40 ? '#FEF9C3' : 'var(--color-red-soft)',
            border: `1.5px solid ${pct >= 70 ? '#86efac' : pct >= 40 ? '#fde047' : '#fca5a5'}`,
            marginBottom: 20, textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: pct >= 70 ? '#16a34a' : pct >= 40 ? '#92400e' : '#b91c1c', lineHeight: 1 }}>
              {pct}%
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', marginTop: 6 }}>
              {totalCorrect} из {totalQ} верных ответов
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
              {pct >= 70 ? 'Отличный результат!' : pct >= 40 ? 'Есть что улучшить' : 'Нужно поработать над базой'}
            </div>
          </div>

          {/* Cognitive profile (logic only) */}
          {cognitiveProfile && topSkill && (
            <div style={{ background: `${theme.accent}12`, border: `1.5px solid ${theme.accent}44`, borderRadius: 18, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 14 }}>
                🧠 Твой когнитивный профиль
              </div>
              {/* Top skill highlight */}
              <div style={{ padding: '12px 14px', borderRadius: 12, background: `${theme.accent}18`, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{topSkill.info?.emoji ?? '⭐'}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    Сильнее всего: {topSkill.info?.short ?? topSkill.sec}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                    {topSkill.info?.desc}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, color: theme.accent }}>{topSkill.pct}%</div>
              </div>
              {/* All sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cognitiveProfile.map(({ sec, pct: p, info }) => {
                  const col = p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
                  return (
                    <div key={sec}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-2)', fontWeight: 600 }}>
                          {info?.emoji} {info?.short ?? sec}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{p}%</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 999, background: 'var(--color-bg-5)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.6, delay: 0.15 }}
                          style={{ height: '100%', borderRadius: 999, background: col }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section breakdown (standard subjects) */}
          {!cognitiveProfile && (
            <div style={{
              background: 'rgba(var(--glass-rgb), 0.9)', border: '1px solid var(--color-border-glass)',
              borderRadius: 18, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                Результаты по разделам
              </div>
              {sections.map(([sec, { correct, total: tot }]) => {
                const p = tot ? Math.round((correct / tot) * 100) : 0
                const color = p >= 70 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444'
                return (
                  <div key={sec}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>{sec}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{correct}/{tot}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-5)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 0.6, delay: 0.2 }}
                        style={{ height: '100%', borderRadius: 999, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', marginBottom: 20 }}>
            Результаты сохранены — преподаватель увидит их в своём кабинете
          </div>

          <button
            onClick={goBack}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: theme.accent, color: '#fff', fontSize: 15, fontWeight: 700,
              boxShadow: `0 6px 20px ${theme.accent}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ArrowLeft size={16} /> На главную
          </button>
        </motion.div>
      </div>
    )
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
            <ArrowLeft size={14} /> Выйти
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
              Диагностика · {theme.label}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
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

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.map((opt, idx) => {
                const isChosen = picked === idx
                const isCorrect = q.correct === idx
                const showResult = picked !== undefined

                let borderColor = 'var(--color-border-medium)'
                let bg = 'var(--color-bg-2)'
                let textColor = 'var(--color-text)'

                if (showResult) {
                  if (isCorrect) { borderColor = '#22c55e'; bg = '#dcfce7'; textColor = '#15803d' }
                  else if (isChosen && !isCorrect) { borderColor = '#ef4444'; bg = '#fee2e2'; textColor = '#b91c1c' }
                } else if (isChosen) {
                  borderColor = theme.accent; bg = `${theme.accent}15`
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
                      background: bg, cursor: picked !== undefined ? 'default' : 'pointer',
                      textAlign: 'left', width: '100%',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    {showResult ? (
                      isCorrect
                        ? <CheckCircle size={18} style={{ color: '#22c55e', flexShrink: 0 }} />
                        : isChosen
                          ? <Circle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                          : <Circle size={18} style={{ color: 'var(--color-border-medium)', flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isChosen ? theme.accent : 'var(--color-border-medium)'}`,
                        background: isChosen ? theme.accent : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: isChosen ? '#fff' : 'var(--color-muted)',
                      }}>
                        {'АБВГ'[idx]}
                      </div>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 500, color: textColor, lineHeight: 1.4 }}>
                      {opt}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {/* Next button (visible once answered) */}
            <AnimatePresence>
              {picked !== undefined && current < total - 1 && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCurrent(c => c + 1)}
                  style={{
                    marginTop: 20, width: '100%', padding: '13px',
                    borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: theme.accent, color: '#fff',
                    fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  Следующий вопрос <ChevronRight size={16} />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
