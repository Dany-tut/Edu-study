// Стенд витрины «Сцены» — /dev-scenes.html в dev-режиме.
//
// Нужен потому, что языковой предмет появляется в меню тренажёра только у
// ученика с языковым курсом, а у демо-ученика курсы химические: без стенда
// экран сцен в превью не открыть вообще. В сборку не попадает — точка входа
// одна, index.html.
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

// Тренажёр помнит, где ученик стоял. Стенду нужны сразу «Чтение» → «Сцены».
try {
  sessionStorage.setItem('draft:trainer.en.mode', JSON.stringify('reading'))
  sessionStorage.setItem('draft:trainer.en.readingView', JSON.stringify('scenes'))
  sessionStorage.setItem('draft:trainer.en.work', JSON.stringify(null))
  sessionStorage.setItem('draft:trainer.en.scene', JSON.stringify(null))
} catch { /* не критично */ }

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 20 }}>
    <LanguageTrainer lang="en" subject="Английский" subjectId="english" dark subjectState={subjectState} />
  </div>,
)
