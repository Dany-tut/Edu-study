// ВРЕМЕННЫЙ стенд для скриншота карточки стопки. Удаляется сразу после съёмки.
import { createRoot } from 'react-dom/client'
import CardDeck, { type DeckSource } from './components/CardDeck'
import type { ReviewCard } from './data/reviewDeck'
import './index.css'

const now = new Date().toISOString()
const CARDS: ReviewCard[] = [
  ['저는 이해하지 못해요', 'я не понимаю'],
  ['다시 말해 주세요', 'повторите, пожалуйста'],
  ['천천히 말해 주세요', 'говорите медленнее'],
].map(([prompt, answer], i) => ({
  id: `stand-${i}`, source: 'manual' as const, prompt, answer,
  ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: now, createdAt: now,
}))

const source: DeckSource = {
  load: async () => CARDS,
  grading: 'binary',
  judge: false,
  label: 'стенд',
}

// Тур стопки съел бы карточку затемнением — на стенде он не нужен.
try { localStorage.setItem('card-deck-tour-v1', '1') } catch { /* не критично */ }

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
    <CardDeck accent="#f0906a" lang="ko" source={source} />
  </div>,
)
