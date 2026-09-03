// Стенд режима «одно задание — один экран» (dev-flow.html).
//
// ЗАЧЕМ. Языковую домашку иначе не открыть: нужен ученик, группа, курс и урок в
// Supabase. Здесь она собирается из пяти строк и открывается по адресу, поэтому
// правку flow-режима видно через секунду, а не через пять шагов кликанья.
//
// Живёт, пока дорабатывается сам режим (docs/LANGUAGE_DRILL_SPEC.md, этапы 2–3).
import { createRoot } from 'react-dom/client'
import HomeworkFlow from './components/HomeworkFlow'
import AnswerFlightLayer from './components/AnswerFlightLayer'
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
  // Множественный выбор: вердикт у него приходит только по «Проверить», и
  // проверять это надо на живом экране — на тапе по варианту кружок с
  // крестиком уже улетал, судя по недособранному ответу.
  q({
    id: 'qm', type: 'multi', prompt: 'Какие слова — еда? Выберите все подходящие.',
    options: [
      { id: 'a', text: '김치' }, { id: 'b', text: '물' },
      { id: 'c', text: '두부' }, { id: 'd', text: '이름' },
    ],
    correctOptionIds: ['a', 'c'],
    explanation: '김치 и 두부 — блюда; 물 — вода, 이름 — имя.',
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
  // ── работа с текстом и системой ──
  // Четыре типа проверяются здесь же: их экраны собираются из данных задания
  // так же, как у остальных, и увидеть их иначе можно только через настоящий
  // курс с настоящим учеником.
  q({
    id: 'tf', type: 'trueFalse',
    prompt: 'Верны ли утверждения по тексту?',
    passage: 'Anna gets up at seven. She has coffee and toast, then walks to the station. Her train leaves at 8:15.',
    statements: [
      { text: 'Anna walks to the station.', verdict: 'T' },
      { text: 'She drives a car.', verdict: 'F' },
      { text: 'The train is usually late.', verdict: 'NG' },
    ],
  }),
  q({
    id: 'dg', type: 'dropdownGap',
    prompt: 'Выберите верную форму в каждом пропуске',
    gapText: 'She ____ to school and ____ English every day.',
    gapChoices: [
      { options: ['go', 'goes', 'going'], correct: 1 },
      { options: ['study', 'studies', 'studied'], correct: 1 },
    ],
  }),
  q({
    id: 'cs', type: 'columnSort',
    prompt: 'Разложите слова по артиклям',
    columns: ['der', 'die', 'das'],
    sortItems: [
      { text: 'Tisch', column: 0 }, { text: 'Lampe', column: 1 }, { text: 'Buch', column: 2 },
      { text: 'Stuhl', column: 0 }, { text: 'Tür', column: 1 }, { text: 'Fenster', column: 2 },
    ],
  }),
  q({
    id: 'mi', type: 'matching',
    prompt: 'Поставьте слово к своей картинке',
    pairs: [
      { left: '고양이', right: 'кот', rightImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" rx="12" fill="%23DDECFF"/><text x="80" y="84" font-size="64" text-anchor="middle">🐱</text></svg>' },
      { left: '집', right: 'дом', rightImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" rx="12" fill="%23FFE6D5"/><text x="80" y="84" font-size="64" text-anchor="middle">🏠</text></svg>' },
      { left: '물', right: 'вода', rightImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><rect width="160" height="120" rx="12" fill="%23D8F5EA"/><text x="80" y="84" font-size="64" text-anchor="middle">💧</text></svg>' },
    ],
  }),
  // Внешнее упражнение (embed) со стенда снято: выдуманный адрес Wordwall
  // отдаёт 404 и баннер про cookies на пол-экрана, а проверять на нём нечего —
  // результат с чужой площадки к нам всё равно не приходит. Сам тип задания
  // жив и лежит в палитре конструктора: вернуть его сюда — одна запись.
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
    {/* Кружок вердикта живёт в портале и целится в пилюлю сводки: без слоя и
        мишени стенд молчал ровно о том, что здесь и проверяют. */}
    <div id="widget-pill-target" style={{ position: 'fixed', top: 8, right: 8, width: 60, height: 24 }} />
    <AnswerFlightLayer />
    <HomeworkFlow
      lessonId="stand-ko-1"
      lessonTitle={useHangul ? courseLesson.title : 'Еда'}
      subject={params.has('jajl') ? 'Японский' : 'Корейский'}
      homework={shown}
      onBack={() => {}}
    />
  </div>,
)
