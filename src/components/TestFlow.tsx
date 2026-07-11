import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ClipboardCheck, CheckCircle2, ArrowUp, ArrowDown } from 'lucide-react'
import { type Lesson, type TestTask } from '../data/mockData'
import { normalizeTaskType } from '../data/taskTypeVisuals'
import { upsertLessonProgress } from '../lib/db'
import { ownerStudentIdFor } from '../store/studentDataStore'
import { getStudentSession } from '../lib/studentSession'
import { useStudentData } from '../store/studentDataStore'
import { useIsDesktop } from '../lib/useIsDesktop'
import QuestionTable from './QuestionTable'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

function taskType(t: TestTask) { return normalizeTaskType(t.type) }

/** Auto-gradable tasks. */
function isGradable(t: TestTask) {
  const tp = taskType(t)
  if (tp === 'single') return true
  if (tp === 'multi') return (t.correctChoices?.length ?? 0) > 0
  if ((tp === 'fill' || tp === 'extended') && (t.answer ?? '').trim()) return true
  return false
}

function gradeTask(t: TestTask, answer: string | number | number[] | undefined): boolean {
  const tp = taskType(t)
  if (tp === 'single') {
    return typeof answer === 'number' && (t.correctChoices ?? []).includes(answer)
  }
  if (tp === 'multi') {
    if (!Array.isArray(answer)) return false
    const correct = [...(t.correctChoices ?? [])].sort()
    const given = [...answer].sort()
    return correct.length === given.length && correct.every((v, i) => v === given[i])
  }
  if (tp === 'fill' || tp === 'extended') {
    return typeof answer === 'string' && norm(answer) === norm(t.answer ?? '')
  }
  return false
}

export default function TestFlow({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const tasks = lesson.testTasks ?? []
  const isDesktop = useIsDesktop()
  const reload = useStudentData(s => s.load)
  const [answers, setAnswers] = useState<Record<string, string | number | number[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; correct: number; gradable: number } | null>(null)

  function setAnswer(id: string, value: string | number | number[]) {
    setAnswers(a => ({ ...a, [id]: value }))
  }

  function toggleMulti(id: string, idx: number) {
    const prev = (answers[id] as number[] | undefined) ?? []
    const next = prev.includes(idx) ? prev.filter(x => x !== idx) : [...prev, idx]
    setAnswer(id, next)
  }

  function moveSeq(id: string, items: string[], pos: number, dir: -1 | 1) {
    const order = (answers[id] as number[] | undefined) ?? items.map((_, i) => i)
    const to = pos + dir
    if (to < 0 || to >= order.length) return
    const next = [...order];[next[pos], next[to]] = [next[to], next[pos]]
    setAnswer(id, next)
  }

  async function submit() {
    const session = getStudentSession()
    if (!session) return
    setSubmitting(true)

    const gradable = tasks.filter(isGradable)
    const correct = gradable.filter(t => gradeTask(t, answers[t.id])).length
    const score = gradable.length > 0 ? Math.round((correct / gradable.length) * 100) : 0

    await upsertLessonProgress(ownerStudentIdFor(lesson.subject), lesson.id, lesson.subject, {
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

  const answeredCount = tasks.filter(t => {
    const a = answers[t.id]
    if (Array.isArray(a)) return a.length > 0
    return a !== undefined && a !== ''
  }).length

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '12px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} aria-label="Назад" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: isDesktop ? '7px 12px' : 7, borderRadius: 999, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', fontFamily: 'inherit' }}>
          <ChevronLeft size={15} /> {isDesktop && 'Назад'}
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
          {tasks.map((t, i) => {
            const tp = taskType(t)
            const seqItems = t.sequenceItems ?? []
            const seqOrder = (answers[t.id] as number[] | undefined) ?? seqItems.map((_, idx) => idx)

            return (
              <div key={t.id} style={{ background: 'rgba(var(--glass-rgb), 0.7)', border: '1px solid var(--color-border-glass)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--color-purple-soft)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', paddingTop: 3 }}>{t.question || t.label}</div>
                </div>

                {/* single — radio */}
                {tp === 'single' && (
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

                {/* multi — checkboxes */}
                {tp === 'multi' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 36 }}>
                    {(t.choices ?? []).map((ch, ci) => {
                      const selected = ((answers[t.id] as number[] | undefined) ?? []).includes(ci)
                      return (
                        <button key={ci} onClick={() => toggleMulti(t.id, ci)} style={{
                          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                          padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                          border: selected ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border-soft)',
                          background: selected ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                          fontSize: 14, color: 'var(--color-text)', fontWeight: selected ? 600 : 400,
                        }}>
                          <div style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                            border: selected ? '2px solid var(--color-accent)' : '2px solid var(--color-border-medium)',
                            background: selected ? 'var(--color-accent)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                          }}>
                            {selected && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                          </div>
                          {ch}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* fill / extended — text input */}
                {(tp === 'fill' || tp === 'extended') && (
                  <div style={{ paddingLeft: 36 }}>
                    {tp === 'fill'
                      ? <input
                          value={(answers[t.id] as string) ?? ''}
                          onChange={e => setAnswer(t.id, e.target.value)}
                          placeholder="Твой ответ…"
                          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
                        />
                      : <textarea
                          value={(answers[t.id] as string) ?? ''}
                          onChange={e => setAnswer(t.id, e.target.value)}
                          placeholder="Развёрнутый ответ…"
                          rows={4}
                          style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                    }
                  </div>
                )}

                {/* matching — pairs reference + textarea */}
                {tp === 'matching' && (
                  <div style={{ paddingLeft: 36 }}>
                    {(t.pairs?.length ?? 0) > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                        {t.pairs!.map((pair, pi) => (
                          <div key={pi} style={{ display: 'flex', gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                            <span style={{ fontWeight: 600 }}>{pair.left}</span>
                            <span style={{ color: 'var(--color-muted)' }}>→</span>
                            <span>?</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={(answers[t.id] as string) ?? ''}
                      onChange={e => setAnswer(t.id, e.target.value)}
                      placeholder="Запиши соответствия…"
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                )}

                {/* sequence — reorderable list */}
                {tp === 'sequence' && seqItems.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 36 }}>
                    {seqOrder.map((itemIdx, pos) => (
                      <div key={itemIdx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{pos + 1}</span>
                        <div style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', fontSize: 14, color: 'var(--color-text)' }}>
                          {seqItems[itemIdx]}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <button onClick={() => moveSeq(t.id, seqItems, pos, -1)} disabled={pos === 0}
                            style={{ width: 24, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: pos === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pos === 0 ? 0.4 : 1 }}>
                            <ArrowUp size={12} style={{ color: 'var(--color-text-3)' }} />
                          </button>
                          <button onClick={() => moveSeq(t.id, seqItems, pos, 1)} disabled={pos === seqOrder.length - 1}
                            style={{ width: 24, height: 22, borderRadius: 6, border: 'none', background: 'var(--color-bg-3)', cursor: pos === seqOrder.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pos === seqOrder.length - 1 ? 0.4 : 1 }}>
                            <ArrowDown size={12} style={{ color: 'var(--color-text-3)' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* tableFill — cells with blanks */}
                {tp === 'tableFill' && t.table && (
                  <div style={{ paddingLeft: 36 }}>
                    {/* Unified table renderer — tests keep their per-cell answer
                        map and treat both empty and blank cells as fill-in. */}
                    <QuestionTable
                      table={t.table}
                      mobile={!isDesktop}
                      interactive
                      blankAsInput
                      cellValue={key => (answers[`${t.id}_${key}`] as string) ?? ''}
                      onCellChange={(key, v) => setAnswer(`${t.id}_${key}`, v)}
                    />
                  </div>
                )}

                {/* whiteboard — textarea fallback */}
                {tp === 'whiteboard' && (
                  <div style={{ paddingLeft: 36 }}>
                    <textarea
                      value={(answers[t.id] as string) ?? ''}
                      onChange={e => setAnswer(t.id, e.target.value)}
                      placeholder="Опиши решение (рисунок на доске приложишь учителю)…"
                      rows={3}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 12, border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                )}
              </div>
            )
          })}
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
