// Печатает SQL-сид встроенных наборов диагностик (scripts/diag/defaultQuestions.ts)
// в diag_question_defaults. Вывод вставляется в миграцию — см. 0111.
//
//   npm run build:diag-defaults > /tmp/defaults.sql

import { DEFAULT_QUESTIONS } from './diag/defaultQuestions.ts'

// Долларовая кавычка с меткой, которой нет в тексте вопросов.
const tag = '$diag$'
const rows = Object.entries(DEFAULT_QUESTIONS).map(([subject, qs]) => {
  const json = JSON.stringify(qs)
  if (json.includes(tag)) throw new Error(`${subject}: ${tag} внутри данных`)
  return `  ('${subject}', ${tag}${json}${tag}::jsonb)`
})
console.log(`insert into public.diag_question_defaults (subject, questions) values\n${rows.join(',\n')}\non conflict (subject) do update set questions = excluded.questions;`)
