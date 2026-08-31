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
import { buildJapaneseJlptCourse } from './data/japaneseJlpt'
import './index.css'

// ?kohg / ?jajl — урок настоящего курса вместо рукодельной домашки. Номер
// задаётся значением (?kohg=4 — пятый урок): задания уроков разные — патчхим,
// напряжённые, в-гласные, — и проверять их на одном первом уроке нельзя.
// Второй курс здесь ради письменности: кану и хангыль поле ответа набирает
// разными клавиатурами (см. ScriptKeyboard), и проверять надо обе.
const params = new URLSearchParams(location.search)
const courseLesson = (() => {
  const n = (key: string) => Math.max(0, Number(params.get(key) || 0))
  if (params.has('jajl')) return buildJapaneseJlptCourse('stand').lessons[n('jajl')]
  return buildKoreanHangulCourse('stand').lessons[n('kohg')]
})()

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
  q({
    id: 'mt', type: 'matching', prompt: 'Соедините слово и перевод.',
    pairs: [
      { left: '김치', right: 'кимчи' },
      { left: '두부', right: 'тофу' },
      { left: '물', right: 'вода' },
      { left: '밥', right: 'рис' },
    ],
    explanation: 'Слова урока.',
  }),
  q({ id: 'tr', type: 'trace', prompt: 'Обведите букву ㄱ — ведите от точки, черта за чертой', chamo: 'ㄱ' }),
  q({ id: 'bs', type: 'buildSyllable', prompt: 'Соберите слог «ким» из букв', syllable: '김' }),
  q({
    id: 'q3', type: 'wordBank', prompt: 'Соберите предложение: «Это кимчи»',
    sentence: '김치 예요', distractors: ['두부', '물'],
    explanation: 'После гласной связка принимает форму 예요.',
  }),
  // Устное с эталоном: проверяет себя само, распознавалкой (см. VoiceAnswer).
  // Рядом — свободное устное без эталона: оно обязано выглядеть как раньше,
  // иначе легко не заметить, что вердикт протёк туда, где судить нечем.
  // Список слов идёт по одному за экран (readAloudEach): у каждого слова свой
  // эталон, поэтому вердикт приходит сразу, а промах стоит одного слова.
  ...['학교', '사람', '이름'].map((w, i) => q({
    id: `sp1-${i}`, type: 'speaking', lang: 'ko',
    prompt: `Прочитайте вслух без транскрипции: ${w}`,
    targetText: w,
    responseSeconds: 15,
  })),
  q({
    id: 'sp2', type: 'speaking', lang: 'ko',
    prompt: 'Расскажите о любимом блюде — три предложения.',
    responseSeconds: 90,
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
const useHangul = params.has('kohg') || params.has('jajl')
const shown: LessonHomework = useHangul
  ? {
    ...homework,
    title: courseLesson.title,
    levels: homework.levels.map(l =>
      l.id === 'basic'
        // Через тот же переводчик, каким задания курса доезжают до ученика:
        // формат редактора и формат вопроса — разные, и проверять надо тот,
        // который человек видит на самом деле.
        ? { ...l, questions: ((courseLesson.hwTasks ?? []) as AuthoredHomeworkTask[]).map(authoredTaskToQuestion) }
        : l),
  }
  : homework

// ?step=N — открыть сразу нужное задание. Без этого до сборки слога в первом
// уроке двадцать кликов, и проверять её так никто не станет. Пишем прямо в тот
// же черновик, из которого HomeworkFlow восстанавливает шаг после перезагрузки.
const step = Number(params.get('step'))
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
      lessonTitle={useHangul ? courseLesson.title : 'Еда'}
      subject={params.has('jajl') ? 'Японский' : 'Корейский'}
      homework={shown}
      onBack={() => {}}
    />
  </div>,
)
