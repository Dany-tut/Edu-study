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
  localStorage.setItem('theme', 'dark')
} catch { /* не критично */ }

/**
 * `?pick=B1,B2` — стенд сам выбирает ступени в реальном фильтре рейла.
 * Нужно для съёмки в headless-браузере, где кликать некому.
 */
function autoPick() {
  const want = new URLSearchParams(location.search).get('pick')
  if (!want) return
  const levels = want.split(',')
  setTimeout(() => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder="Уровень"]')
    const trigger = input?.parentElement?.parentElement
      ?? [...document.querySelectorAll('span')].find(s => s.textContent === 'Уровень')?.parentElement
    trigger?.click()
    setTimeout(() => {
      for (const l of levels) {
        // Ступень с тем же текстом стоит и чипом на плитке — берём только строку
        // меню: плитка кликабельна, и попадание в неё открыло бы стопку.
        const row = [...document.querySelectorAll('div')]
          .filter(d => d.textContent?.trim() === l && d.children.length <= 1 && !d.closest('button'))
          .pop()
        row?.click()
      }
      // Меню закрываем: на скриншоте нужен результат, а не раскрытый список.
      document.body.click()
    }, 400)
  }, 900)
}
autoPick()

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 20 }}>
    <LanguageTrainer lang="en" subject="Английский" subjectId="english" dark subjectState={subjectState} />
  </div>,
)
