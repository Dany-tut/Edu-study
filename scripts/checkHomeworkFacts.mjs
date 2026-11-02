import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HomeworkFacts } from '../src/components/HomeworkFacts'
import { getLessonDetail } from '../src/data/lessonContent'
function render(date, tasks) {
  const lesson = { id: 'facts', number: 1, title: 'Тема', homework: { hwDate: date, hwTasks: tasks } }
  const level = getLessonDetail(lesson).homework.levels[0]
  return renderToStaticMarkup(React.createElement(HomeworkFacts, { level, t: value => value }))
}
const test = { id: 't', type: 'testly', testly: { id: 'test', minutes: 235 } }
const choice = { id: 'q', type: 'single', choices: ['А', 'Б'], correctChoices: [0] }
const dated = render('02.11.2026', [test])
assert.match(dated, /Дедлайн/)
assert.match(dated, /02\.11\.2026/)
assert.match(dated, /235 мин/)
assert.match(dated, /Тестли/)
const mixed = render(' ', [choice, test])
assert.match(mixed, /Один ответ/)
assert.match(mixed, /Тестли/)
assert.doesNotMatch(mixed, /Дедлайн|Время/)
for (const card of [dated, mixed]) assert.doesNotMatch(card, /справившихся|Средний балл/)
console.log('Homework facts: rendered dated, undated and mixed assignments passed')
