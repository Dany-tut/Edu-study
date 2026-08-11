// Стенд режима «одно задание — один экран» (dev-flow.html).
//
// ЗАЧЕМ. Языковую домашку иначе не открыть: нужен ученик, группа, курс и урок в
// Supabase. Здесь она собирается из пяти строк и открывается по адресу, поэтому
// правку flow-режима видно через секунду, а не через пять шагов кликанья.
//
// Живёт, пока дорабатывается сам режим (docs/LANGUAGE_DRILL_SPEC.md, этапы 2–3).
import { createRoot } from 'react-dom/client'
import HomeworkFlow from './components/HomeworkFlow'
import { authoredTaskToQuestion } from './data/lessonContent'
import type { AuthoredHomeworkTask, LessonHomework, HomeworkQuizQuestion } from './data/lessonContent'
import { buildKoreanHangulCourse } from './data/koreanHangul'
import './index.css'

// ?kohg — первый урок настоящего курса хангыля вместо рукодельной домашки.
const hangulLesson = buildKoreanHangulCourse('stand')
  .lessons[Math.max(0, Number(new URLSearchParams(location.search).get('kohg') || 0))]

const q = (x: Partial<HomeworkQuizQuestion> & { id: string; prompt: string }): HomeworkQuizQuestion => ({
  options: [], correctOptionId: '', explanation: '', ...x,
})

const questions: HomeworkQuizQuestion[] = [
  q({ id: 'v1', type: 'flashcard', prompt: 'Слово урока', front: '김치', reading: 'кимчхи', back: 'кимчи' }),
  q({ id: 'v2', type: 'flashcard', prompt: 'Слово урока', front: '두부', reading: 'тубу', back: 'тофу' }),
  q({
    id: 'q1', type: 'single', prompt: 'Что значит 김치?',
    options: [
      { id: 'a', text: 'кимчи' }, { id: 'b', text: 'тофу' },
      { id: 'c', text: 'рис' }, { id: 'd', text: 'вода' },
    ],
    correctOptionId: 'a',
    explanation: '김치 — квашеная капуста, самое известное корейское блюдо.',
  }),
  q({
    id: 'q2', type: 'fill', prompt: 'Впишите перевод: 두부',
    referenceAnswer: 'тофу',
    explanation: '두부 — тофу, соевый творог.',
  }),
  q({ id: 'tr', type: 'trace', prompt: 'Обведите букву ㄱ — ведите от точки, черта за чертой', chamo: 'ㄱ' }),
  q({ id: 'bs', type: 'buildSyllable', prompt: 'Соберите слог 김 из букв', syllable: '김' }),
  q({
    id: 'q3', type: 'wordBank', prompt: 'Соберите предложение: «Это кимчи»',
    sentence: '김치 예요', distractors: ['두부', '물'],
    explanation: 'После гласной связка принимает форму 예요.',
  }),
]

const homework: LessonHomework = {
  title: 'Домашка урока',
  subtitle: 'Еда и связка 이에요/예요',
  recommendationScore: 4,
  hasHardLevel: false,
  levels: [
    {
      id: 'basic', title: 'Базовый', shortLabel: 'Базовый', kind: 'quiz',
      motivation: 'Пять заданий на слова урока.',
      dueDate: '2026-08-20', estimatedMinutes: 6,
      peerCompletionRate: 0.8, peerAverageScore: 4.2,
      questions,
    },
    // Хард-уровень пустой, но существовать обязан: без него HomeworkFlow не
    // рисуется вовсе (см. ранний return в компоненте).
    {
      id: 'hard', title: 'Сложный', shortLabel: 'Сложный', kind: 'teacher-review',
      optional: true, unlockScore: 4,
      motivation: 'Развёрнутый ответ.',
      dueDate: '2026-08-20', estimatedMinutes: 10,
      peerCompletionRate: 0.3,
      teacherTask: {
        topic: 'Еда', prompt: 'Расскажите о любимом блюде.',
        teacherNote: 'Три предложения.', placeholder: 'Напишите ответ…',
        acceptedFormats: ['текст'],
      },
    },
  ],
}

// ?kohg — вместо рукодельной домашки берётся первый урок курса хангыля целиком:
// проверять лестницу «знакомство → узнавание → письмо» надо на настоящих данных,
// а не на пяти строках, написанных под ожидаемый результат.
const useHangul = location.search.includes('kohg')
const shown: LessonHomework = useHangul
  ? {
    ...homework,
    title: hangulLesson.title,
    levels: homework.levels.map(l =>
      l.id === 'basic'
        // Через тот же переводчик, каким задания курса доезжают до ученика:
        // формат редактора и формат вопроса — разные, и проверять надо тот,
        // который человек видит на самом деле.
        ? { ...l, questions: ((hangulLesson.hwTasks ?? []) as AuthoredHomeworkTask[]).map(authoredTaskToQuestion) }
        : l),
  }
  : homework

// ?step=N — открыть сразу нужное задание. Без этого до сборки слога в первом
// уроке двадцать кликов, и проверять её так никто не станет. Пишем прямо в тот
// же черновик, из которого HomeworkFlow восстанавливает шаг после перезагрузки.
const step = Number(new URLSearchParams(location.search).get('step'))
if (Number.isFinite(step) && step >= 0) {
  const key = 'student-dashboard:homework:stand-ko-1'
  let draft: Record<string, unknown> = {}
  try { draft = JSON.parse(localStorage.getItem(key) ?? '{}') } catch { /* пустой черновик */ }
  localStorage.setItem(key, JSON.stringify({ ...draft, flowStep: step }))
}

createRoot(document.getElementById('root')!).render(
  <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
    <HomeworkFlow
      lessonId="stand-ko-1"
      lessonTitle={useHangul ? hangulLesson.title : 'Еда'}
      subject="Корейский"
      homework={shown}
      onBack={() => {}}
    />
  </div>,
)
