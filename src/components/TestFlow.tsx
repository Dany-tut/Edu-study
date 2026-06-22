import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ClipboardCheck, CheckCircle2 } from 'lucide-react'
import { type Lesson, type TestTask } from '../data/mockData'
import { upsertLessonProgress } from '../lib/db'
import { getStudentSession } from '../lib/studentSession'
import { useStudentData } from '../store/studentDataStore'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Auto-gradable tasks: single-choice always, text/fill when an answer is set. */
function isGradable(t: TestTask) {
  if (t.type === 'choice') return true
  if ((t.type === 'text' || t.type === 'fill') && (t.answer ?? '').trim()) return true
  return false
}

function gradeTask(t: TestTask, answer: string | number | undefined): boolean {
  if (t.type === 'choice') {
    return typeof answer === 'number' && (t.correctChoices ?? []).includes(answer)
  }
  if (t.type === 'text' || t.type === 'fill') {
    return typeof answer === 'string' && norm(answer) === norm(t.answer ?? '')
  }
  return false
}

export default function TestFlow({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const tasks = lesson.testTasks ?? []
  const reload = useStudentData(s => s.load)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; gradable: number } | null>(null)

  function setAnswer(id: string, value: string | number) {
    setAnswers(a => ({ ...a, [id]: value }))
  }

  async function submit() {
    const session = getStudentSession()
    if (!session) return
    setSubmitting(true)

    const gradable = tasks.filter(isGradable)
    const correct = gradable.filter(t => gradeTask(t, answers[t.id])).length
    const score = gradable.length > 0 ? Math.round((correct / gradable.length) * 100) : 0

    await upsertLessonProgress(session.id, lesson.id, lesson.subject, {
      status: 'submitted',
      score,
    })
    await reload()
    setResult({ score, correct, gradable: gradable.length })
    setSubmitting(false)
  }

  // ── Result screen ──
  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <CheckCircle2 size={38} style={{ color: 'var(--color-green-text)' }} />
        </motion.div>
        <h2 style={{ fontSize: 22, fontWeight: 750, color: 'var(--color-text)', marginBottom: 6 }}>Тест отправлен!</h2>
        <p style={{ fontSize: 14, color: 'var(--color-muted)', marginBottom: 20 }}>
          {result.gradable > 0
            ? `Верно ${result.correct} из ${result.gradable} · ${result.score}%`
            : 'Ответы отправлены преподавателю на проверку'}
        </p>
        <button onClick={onBack} style={{ padding: '11px 26px', borderRadius: 14, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          К курсу
        </button>
      </div>
    )
  }

  const answeredCount = tasks.filter(t => answers[t.id] !== undefined && answers[t.id] !== '').length

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '12px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 999, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
          <ChevronLeft size={15} /> Назад
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 13px', borderRadius: 999, background: 'var(--color-green-soft)', color: 'var(--color-green-text)', fontSize: 12, fontWeight: 700 }}>
          <ClipboardCheck size={14} /> Финальный тест
        </div>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>{lesson.title || 'Тест'}</h1>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 24 }}>{tasks.length} вопрос{tasks.length === 1 ? '' : tasks.length < 5 ? 'а' : 'ов'}</p>

      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)' }}>В тесте пока нет вопросов</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tasks.map((t, i) => (
            <div key={t.id} style={{ background: 'rgba(var(--glass-rgb), 0.7)', border: '1px solid var(--color-border-glass)', borderRadius: 16, padding: '18px 20px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', paddingTop: 3 }}>{t.question || t.label}</div>
              </div>

              {t.type === 'choice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 36 }}>
                  {(t.choices ?? []).map((ch, ci) => {
                    const selected = answers[t.id] === ci
                    return (
                      <button key={ci} onClick={() => setAnswer(t.id, ci)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                        padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        border: selected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border-soft)',
                        background: selected ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                        fontSize: 14, color: 'var(--color-text)', fontWeight: selected ? 600 : 400,
                      }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: selected ? '5px solid var(--color-accent)' : '2px solid var(--color-border-medium)', transition: 'all 0.12s' }} />
                        {ch}
                      </button>
                    )
                  })}
                </div>
              )}

              {(t.type === 'text' || t.type === 'fill') && (
                <div style={{ paddingLeft: 36 }}>
                  <input
                    value={(answers[t.id] as string) ?? ''}
                    onChange={e => setAnswer(t.id, e.target.value)}
                    placeholder="Твой ответ…"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              )}

              {(t.type === 'match' || t.type === 'whiteboard') && (
                <div style={{ paddingLeft: 36 }}>
                  <textarea
                    value={(answers[t.id] as string) ?? ''}
                    onChange={e => setAnswer(t.id, e.target.value)}
                    placeholder="Твой ответ…"
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ position: 'sticky', bottom: 16, marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={submit}
            disabled={submitting}
            style={{
              padding: '13px 40px', borderRadius: 16, border: 'none',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 750,
              cursor: submitting ? 'wait' : 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 24px rgba(99,84,207,0.35)', opacity: submitting ? 0.7 : 1,
            }}>
            {submitting ? 'Отправляем…' : `Отправить тест (${answeredCount}/${tasks.length})`}
          </motion.button>
        </div>
      )}
    </div>
  )
}
