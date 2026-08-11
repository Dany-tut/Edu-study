// ВРЕМЕННЫЙ стенд: подсказка о слове в примере на обороте карточки.
import { createRoot } from 'react-dom/client'
import CardDeck, { type DeckSource } from './components/CardDeck'
import type { ReviewCard } from './data/reviewDeck'
import './index.css'

const now = new Date().toISOString()
const CARDS: ReviewCard[] = [{
  id: 'pop-0', source: 'manual' as const,
  prompt: 'Good, thanks — you?', answer: 'хорошо, спасибо, а вы?',
  note: 'Длинная заметка, чтобы оборот карточки прокручивался: так проверяется, едет ли подсказка за словом, а не висит ли она на месте. Ещё немного текста для высоты. И ещё немного, чтобы точно не влезло.',
  ex: { term: 'Good, thanks — you? Busy week?', ru: 'Хорошо, спасибо, а вы? Неделя напряжённая?' },
  ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: now, createdAt: now,
}]

const source: DeckSource = { load: async () => CARDS, grading: 'binary', judge: false, label: 'стенд' }

try { localStorage.setItem('card-deck-tour-v1', '1') } catch { /* не критично */ }

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 980, margin: '0 auto' }}>
    <CardDeck accent="#f0906a" lang="en" source={source} />
  </div>,
)
