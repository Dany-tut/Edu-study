// ВРЕМЕННЫЙ стенд для скриншота витрины «Наборы фраз» с уровнями.
// Удаляется сразу после съёмки.
import { createRoot } from 'react-dom/client'
import LanguageTrainer from './components/LanguageTrainer'
import { getSubject } from './lib/subjects'
import type { TrainerSubjectState, TrainerSubjectOption } from './lib/trainerSubject'
import './index.css'

const def = getSubject('english')!
const option: TrainerSubjectOption = { def, kind: 'lang', count: 0, hasBook: true }
const subjectState: TrainerSubjectState = {
  options: [option],
  current: option,
  pick: () => {},
  due: {},
  loadDue: () => {},
}

// Тренажёр открывается там, где ученик стоял в прошлый раз (sessionStorage).
// На стенде нам нужны сразу «Карточки» → «Наборы».
try {
  sessionStorage.setItem('draft:trainer.en.mode', JSON.stringify('vocab'))
  sessionStorage.setItem('draft:trainer.en.theme', JSON.stringify(null))
} catch { /* не критично */ }

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 20 }}>
    <LanguageTrainer lang="en" subject="Английский" subjectId="english" dark subjectState={subjectState} />
  </div>,
)
