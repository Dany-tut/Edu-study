// ВРЕМЕННАЯ страница для проверки CardDeck в изоляции. Удалить после проверки.
import { useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CardDeck, { type DeckSource } from './components/CardDeck'
import type { CoachStep } from './components/Coachmarks'
import type { ReviewCard } from './data/reviewDeck'

const WORDS: [string, string][] = [
  ['안녕하세요', 'здравствуйте'],
  ['우유', 'молоко'],
  ['나무', 'дерево'],
  ['바다', 'море'],
  ['머리', 'голова'],
  ['친구', 'друг'],
]

function Page() {
  const tabsRef = useRef<HTMLDivElement | null>(null)

  const source: DeckSource = useMemo(() => ({
    load: async () => WORDS.map(([prompt, answer], i): ReviewCard => ({
      id: `chk-${i}`, subject: 'korean', source: 'manual', prompt, answer,
      ease: 2.5, intervalDays: 0, reps: 0, lapses: 0,
      dueAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    })),
    grading: 'binary',
    judge: true,
    label: 'Здравствуйте и до свидания',
  }), [])

  const tourExtra: CoachStep = {
    ref: tabsRef,
    title: 'Сначала — «Списком»',
    text: 'Свайп проверяет память, а по новой теме её ещё нет.',
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div ref={tabsRef} style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--color-bg-2)' }}>
          <span style={{ padding: '6px 14px', borderRadius: 999, background: '#7C6BE811', color: '#8b7bf0', fontSize: 12.5, fontWeight: 700 }}>Свайп</span>
          <span style={{ padding: '6px 14px', borderRadius: 999, color: 'var(--color-text-2)', fontSize: 12.5 }}>Списком</span>
        </div>
      </div>
      <CardDeck owner={{}} accent="#8b7bf0" lang="ko" subject="korean" source={source} tourExtra={tourExtra} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Page />)
