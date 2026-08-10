// ВРЕМЕННАЯ страница для проверки CardDeck в изоляции. Удалить после проверки.
import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CardDeck, { type DeckSource } from './components/CardDeck'
import type { ReviewCard } from './data/reviewDeck'

const WORDS: [string, string][] = [
  ['안녕하세요', 'здравствуйте'], ['우유', 'молоко'], ['나무', 'дерево'],
  ['바다', 'море'], ['머리', 'голова'], ['친구', 'друг'],
]

function Page() {
  const source: DeckSource = useMemo(() => ({
    load: async () => WORDS.map(([prompt, answer], i): ReviewCard => ({
      id: `chk-${i}`, subject: 'korean', source: 'manual', prompt, answer,
      ease: 2.5, intervalDays: 0, reps: 0, lapses: 0,
      dueAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    })),
    grading: 'binary', judge: true, label: 'Здравствуйте и до свидания',
  }), [])
  return (
    <div style={{ padding: 24, minHeight: '100vh', background: 'var(--color-bg)' }}>
      <CardDeck owner={{}} accent="#8b7bf0" lang="ko" subject="korean" source={source} />
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<Page />)
