// ВРЕМЕННЫЙ стенд: карточка стопки с примером — проверяем разбор слов примера.
import { createRoot } from 'react-dom/client'
import CardDeck, { type DeckSource } from './components/CardDeck'
import type { ReviewCard } from './data/reviewDeck'
import './index.css'

const now = new Date().toISOString()
const CARDS: ReviewCard[] = [{
  id: 'gloss-0', source: 'manual', prompt: '안녕', answer: 'привет / пока',
  reading: 'annyeong', note: 'Только с близкими и детьми. Незнакомому — грубо.',
  ex: { term: '안녕! 내일 봐.', reading: 'annyeong! naeil bwa.', ru: 'Привет! Увидимся завтра.' },
  ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: now, createdAt: now,
}]

const source: DeckSource = { load: async () => CARDS, grading: 'binary', judge: false, label: 'стенд' }
try { localStorage.setItem('card-deck-tour-v1', '1') } catch { /* не критично */ }

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
    <CardDeck accent="#8b7bf7" lang="ko" source={source} />
  </div>,
)
