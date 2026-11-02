import type { Lesson, Subject } from '../../data/mockData'
import type { LessonAssessment } from '../../lib/lessonAssessments'
import type { TrackAssignment } from '../../lib/studentTrackDebts'
export const SCENARIOS = [
  ['debts', 'Модуль 3 · долги в модуле 1'], ['completed', 'Всё выполнено'],
  ['modules', 'Курс с модулями'], ['fifty', '50 занятий'],
  ['empty', 'Ничего не выполнено'], ['states', 'Все типы и состояния'],
] as const
export type Scenario = typeof SCENARIOS[number][0]
export const TODAY = '2026-11-01'
const titles = ['Строение атома', 'Электронные оболочки', 'Химическая связь', 'Валентность', 'Степени окисления', 'Решение задач', 'Практика', 'Итоговый тест']
const tasks = [{ id: 'track-example-charge', label: 'Заряд ядра', isHard: false, type: 'single' as const, prompt: 'Какой заряд имеет ядро атома?', options: ['Положительный', 'Отрицательный', 'Нулевой'], correct: 0 }]
export function makeTrackExample(scenario: Scenario, courseIndex = 0) {
  const names = ['Химия', 'Биология', 'Алгебра', 'Геометрия', 'Физика', 'Информатика', 'Русский язык', 'История']
  const name = names[courseIndex]
  const courseTitles = [titles, ['Клетка', 'Ткани', 'Генетика', 'Эволюция'], ['Уравнения', 'Функции', 'Неравенства', 'Производная'], ['Треугольники', 'Окружности', 'Векторы', 'Стереометрия'], ['Механика', 'Электричество', 'Оптика', 'Термодинамика'], ['Алгоритмы', 'Массивы', 'Логика', 'Программирование'], ['Орфография', 'Пунктуация', 'Синтаксис', 'Сочинение'], ['Древний мир', 'Средневековье', 'Новое время', 'Источники']][courseIndex]
  const assignments: TrackAssignment[] = []
  const assessments: Record<string, LessonAssessment> = {}
  const count = scenario === 'fifty' ? [50, 30, 45, 20, 50, 35, 24, 40][courseIndex] : scenario === 'states' ? 10 : 8
  const moduleCount = scenario === 'fifty' ? [8, 6, 10, 5, 8, 7, 6, 9][courseIndex] : ['empty', 'states'].includes(scenario) ? 1 : 4
  const activeModule = scenario === 'fifty' ? [3, 2, 5, 3, 4, 2, 3, 6][courseIndex] : ['debts', 'modules'].includes(scenario) ? 3 : 1
  const focusIndex = Math.min(23, count - 1)
  let focusId = ''
  const modules = Array.from({ length: moduleCount }, (_, m) => ({
    id: m + 1, label: courseIndex === 0 ? ['Основы химии', 'Химические реакции', 'Растворы', 'Практикум', 'Органическая химия', 'Химия элементов', 'Расчётные задачи', 'Подготовка к экзамену'][m] : `${courseTitles[m % courseTitles.length]}${m >= courseTitles.length ? ' · углублённый курс' : ''}`,
    lessons: Array.from({ length: count }, (_, i): Lesson => {
      const id = `track-stand-${scenario}-${courseIndex}-${m}-${i}`
      const before = m + 1 < activeModule
      let status: Lesson['status'] = scenario === 'completed' || before || i < 2 ? 'completed' : i === 3 ? 'submitted' : i === 2 ? 'current' : 'locked'
      if (m + 1 > activeModule && scenario !== 'completed') status = 'locked'
      if (scenario === 'empty') status = i === 0 ? 'current' : 'locked'
      if (scenario === 'fifty') status = before ? 'completed' : m + 1 > activeModule ? 'locked' : i < focusIndex ? 'completed' : i === focusIndex ? 'current' : i === focusIndex + 1 ? 'submitted' : i === focusIndex + 2 ? 'current' : 'locked'
      if (scenario === 'debts' && m === 0) status = i === 1 ? 'current' : i === 3 ? 'returned' : i === 4 ? 'submitted' : 'completed'
      if (scenario === 'states') status = ['completed','unviewed','current','returned','submitted','submitted','completed','current','locked','completed','completed'][i] as Lesson['status']
      const isTest = scenario === 'states' ? [6,7,9].includes(i) : i === count - 1
      const lesson: Lesson = { id, title: scenario === 'fifty' ? `${courseTitles[i % courseTitles.length]} · ${i+1}` : courseTitles[i % courseTitles.length], number: i, subject: name, status, shape: 'circle', kind: isTest ? 'test' : 'lesson', nodeType: i % 3 === 1 && !isTest ? 'rec' : 'lesson', hasHard: i % 3 === 0, homework: { hwTasks: tasks }, testTasks: isTest ? tasks : undefined }
      if (status === 'completed') lesson.result = { grading: 'auto', percent: 92, passingScore: 80, passed: true }
      if (status === 'submitted') lesson.result = { grading: 'teacher', percent: null, passingScore: 80, pending: true }
      if (scenario === 'states' && i === 5) lesson.result = { grading: 'unknown', percent: null, passingScore: 80 }
      if (scenario === 'states' && i === 6) lesson.result = { grading: 'auto', percent: 55, passingScore: 80, passed: false }
      if (scenario === 'states' && i === 2) lesson.result = { grading: 'auto', percent: null, passingScore: 80, draft: true, attemptId: id }
      if (m+1 === activeModule && i === (scenario === 'empty' ? 0 : scenario === 'fifty' ? focusIndex : 2)) focusId = id
      if (lesson.hasHard) assessments[id] = { emojiIndex: -1, score: status === 'completed' ? 92 : 80, hardAvailable: true, hardStatus: status === 'completed' ? 'completed' : status === 'returned' ? 'returned' : undefined }
      let due: string | undefined
      if (scenario === 'debts' && m === 0 && [1,3,4].includes(i)) due = i===1 ? '2026-10-29' : '2026-10-31'
      else if (status === 'current' && scenario !== 'empty') due = '2026-11-03'
      const hasAssignment = lesson.nodeType !== 'rec' || (scenario === 'debts' && m===0 && [1,4].includes(i))
      if (hasAssignment && status !== 'locked') assignments.push({ id: id+'-hw', lessonId: id, moduleId:m+1, title:lesson.title, dueDate: due, required:true,
        state: status === 'completed' ? lesson.result?.passed ? 'completed' : 'failed' : status === 'submitted' ? lesson.result?.grading === 'unknown' ? 'unknown' : 'submitted' : status === 'returned' ? 'returned' : lesson.result?.draft ? 'draft' : 'open' })
      return lesson
    }),
  }))
  const subject: Subject = { id:`track-stand-course-${courseIndex}`, name, subject:name, progress:0, accessMode:'full', activeModuleId:activeModule, modules }
  return { subject, assignments, assessments, focusId, activeModule }
}

export function makeTrackCourses(scenario: Scenario) {
  return Array.from({ length: 8 }, (_, i) => makeTrackExample(scenario, i))
}
