// Student spaced-repetition review flow. Pulls due cards for the owner, shows prompt →
// reveal answer → self-grade; each grade reschedules via SM-2. Reusable: embed it on the
// student home, inside a homework step, or a lesson "Повторение" block.

import { useEffect, useState } from 'react'
import Skeleton from './Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, RotateCcw } from 'lucide-react'
import { dueCards, gradeCard, type ReviewCard } from '../data/reviewDeck'
import { GRADE_BUTTONS, intervalLabel, review } from '../lib/srs'
import { useT } from '../lib/i18n'
import { bindShortWords, balancedWrap } from '../lib/typography'

const ACC = '#f59e0b'
const TONE: Record<string, string> = {
  bad: 'var(--color-red-text)', hard: '#f59e0b', good: 'var(--color-green-accent)', easy: 'var(--color-green-text)',
}

export default function ReviewSession({ owner, onDone }: {
  owner: { studentId?: string; anonName?: string }
  onDone?: () => void
}) {
  const t = useT()
  const [cards, setCards] = useState<ReviewCard[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)

  useEffect(() => { dueCards(owner).then(setCards) }, [owner.studentId, owner.anonName])

  if (cards === null) return <Shell><Skeleton.Text lines={3} style={{ maxWidth: 320 }} /></Shell>

  if (cards.length === 0 || idx >= cards.length) return (
    <Shell>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{t('На сегодня всё повторено')}</div>
        {done > 0 && <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{t('Повторено карточек:')} {done}</div>}
        {onDone && <button onClick={onDone} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', background: ACC, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>{t('Готово')}</button>}
      </div>
    </Shell>
  )

  const card = cards[idx]

  async function grade(g: typeof GRADE_BUTTONS[number]) {
    await gradeCard(card, g.grade)
    setDone(d => d + 1)
    setRevealed(false)
    setIdx(i => i + 1)
  }

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: ACC, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={13} /> {t('Повторение')}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 }}>{idx + 1} / {cards.length}</span>
      </div>

      {/* Ремоунт по key, без AnimatePresence: `mode="wait"` умеет навсегда
          залипнуть (сигнал «выход завершён» теряется — см. onExit в
          AnimatePresence/index.mjs), и карточка встала бы пустой посреди
          повторения — до F5. Ключи карточек не повторяются, само не вылечится.
          Внутренний AnimatePresence на ответе оставлен: там показ/скрытие
          одного элемента, оно самовосстанавливается следующим переключением. */}
        <motion.div key={card.id}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
          style={{ background: 'rgba(var(--glass-rgb),0.9)', border: '1px solid var(--color-border-glass)', borderRadius: 18, padding: 22, minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          {/* Лицо карточки центрировано: рваные по длине строки видно сразу,
              поэтому balance, а не pretty. */}
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', lineHeight: 1.5, ...balancedWrap }}>{bindShortWords(card.prompt)}</div>
          <AnimatePresence>
            {revealed && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border-soft)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: ACC, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{t('Ответ')}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-green-text)', lineHeight: 1.5, ...balancedWrap }}>{bindShortWords(card.answer)}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      <div style={{ marginTop: 16 }}>
        {!revealed ? (
          <button onClick={() => setRevealed(true)} style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: ACC, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Check size={16} /> {t('Показать ответ')}
          </button>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {GRADE_BUTTONS.map(g => {
              const next = review(card, g.grade, Date.now())
              return (
                <button key={g.grade} onClick={() => grade(g)}
                  style={{ padding: '12px 8px', borderRadius: 12, border: `1.5px solid ${TONE[g.tone]}`, background: `${TONE[g.tone]}1a`, color: TONE[g.tone], fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {g.label}
                  <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.85 }}>{intervalLabel(next.intervalDays)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>{children}</div>
}
