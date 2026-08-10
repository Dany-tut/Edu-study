// ─────────────────────────────────────────────────────────────────────────────
// Курс «Корейский с нуля: хангыль» — девять уроков алфавита
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ КУРС. Корейские курсы в проекте начинаются с TOPIK I, то есть
// с человека, который уже читает. Того, кто видит 김치 и не может произнести ни
// звука, им предложить нечего — а это и есть первая неделя любого ученика.
//
// ПОЧЕМУ УРОКИ НЕ ПИШУТСЯ РУКАМИ. Урок алфавита — это одна и та же лестница на
// разном материале: познакомились с буквой → узнали её на слух и на глаз →
// написали → собрали из неё слог → прочитали слово, где она стоит. Написанные
// руками, девять таких уроков были бы девятью копиями одного текста, которые
// разойдутся на первой же правке. Здесь они собираются из data/hangul.ts:
// добавили букве пример — он появился в задании сам.
//
// ЛЕСТНИЦА ОДНОГО УРОКА (по одному экрану на шаг, см. HomeworkFlow flow-режим):
//
//   1. знакомство  — карточка буквы: звук, название, черты
//   2. узнавание   — «какой это звук» и «что вы услышали» на похожих буквах
//   3. письмо      — обводка по чертам, в правильном порядке
//   4. сборка      — слог из букв урока
//   5. слово       — слог складывается в настоящее слово, и у него есть смысл
//   6. продукция   — сказать слово вслух
//
// ПОЧЕМУ ПОСЛЕДНИЙ ШАГ — СЛОВО, А НЕ БУКВА. Урок, который кончается буквой,
// ученик закрывает с ощущением «выучил значок». Урок, который кончается словом
// 바다 «море», — с ощущением, что он читает по-корейски. Это одна и та же работа
// и два разных ученика назавтра.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CHAMO, HANGUL_LESSONS, chamoOf, confusableWith, syllablesOf,
  type HangulLesson,
} from './hangul'
import {
  buildLanguageCourse, buildSyl, courseSummary, one, readAloud, traceChamo, wb,
  type LangUnit, type LanguageCourseSpec, type SeedTask, type VocabItem,
} from './languageCourse'
import { transcribe } from '../lib/translit'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

/** Слог урока, на котором показывают сборку: первый со всеми буквами из урока. */
function pickSyllable(lesson: HangulLesson, known: Set<string>): string | null {
  const fresh = new Set(lesson.chamo)
  let fallback: string | null = null
  for (const word of lesson.words) {
    for (const syl of syllablesOf(word.ko)) {
      const parts = chamoOf(syl)
      if (!parts.every(c => known.has(c))) continue
      if (parts.some(c => fresh.has(c))) return syl
      fallback ??= syl
    }
  }
  return fallback
}

/**
 * Задания одного урока алфавита.
 *
 * `known` — буквы, введённые этим и всеми предыдущими уроками: из них можно
 * собирать задания, из остальных нельзя. Множество пополняется по ходу, поэтому
 * порядок уроков и есть порядок доступного материала.
 */
function unitTasks(lesson: HangulLesson, known: Set<string>): SeedTask[] {
  const tasks: SeedTask[] = []

  for (const ch of lesson.chamo) {
    const letter = CHAMO[ch]
    if (!letter) continue

    // Узнавание: буква на экране — какой это звук. Обманки только из похожих:
    // выбор между ㄴ и ㅠ не тренирует ничего.
    const wrong = confusableWith(ch, 2).map(c => CHAMO[c].sound)
    tasks.push(one(
      `${ch} — какой это звук?`,
      [letter.sound, ...wrong],
      0,
    ))

    // Письмо. Отдельным шагом и сразу после звука: рука запоминает форму, пока
    // звук ещё в голове.
    tasks.push(traceChamo(`Обведите букву ${ch} — ведите от точки, черта за чертой`, ch))
  }

  // Сборка слога — по одному на урок: смысл не в количестве, а в том, чтобы
  // слог хотя бы раз собрался из букв на глазах у ученика.
  const syl = pickSyllable(lesson, known)
  if (syl) {
    tasks.push(buildSyl(`Соберите слог ${syl} из букв`, syl))
  }

  // Слова урока: собрать из слогов и прочитать вслух. Первое — про письмо,
  // второе — про речь; на одном и том же слове это две разные линии.
  for (const w of lesson.words.slice(0, 3)) {
    const sylls = syllablesOf(w.ko)
    if (sylls.length >= 2) {
      tasks.push(wb(
        sylls.join(' '),
        `Соберите слово «${w.ru}» из слогов`,
        // Обманка — слог из тех же букв, но переставленных: так проверяется
        // порядок, а не узнавание набора.
        [...sylls].reverse().slice(0, 1).filter(s => !sylls.includes(s)),
      ))
    }
    tasks.push(readAloud(`Прочитайте вслух: ${w.ko} — ${w.ru}`, w.ko, 20))
  }

  return tasks
}

/** Словарь урока: слова с чтением — из них строятся карточки знакомства. */
const unitVocab = (lesson: HangulLesson): VocabItem[] =>
  lesson.words.map(w => ({ term: w.ko, ru: w.ru, reading: transcribe(w.ko, 'ko') }))

/** Конспект урока: буквы таблицей плюс мысль урока. */
function unitTheory(lesson: HangulLesson): string {
  const rows = lesson.chamo
    .map(ch => {
      const c = CHAMO[ch]
      return c ? `${c.ch} — ${c.sound} (${c.name})${c.hint ? `. ${c.hint}` : ''}` : ''
    })
    .filter(Boolean)

  const words = lesson.words
    .map(w => `${w.ko} — ${transcribe(w.ko, 'ko')} — ${w.ru}`)
    .join('\n')

  return [
    lesson.idea ?? '',
    rows.length ? `Буквы урока:\n${rows.join('\n')}` : '',
    `Слова урока:\n${words}`,
  ].filter(Boolean).join('\n\n')
}

/** Юниты курса — по одному на урок алфавита. */
export const HANGUL_UNITS: LangUnit[] = (() => {
  const known = new Set<string>()
  return HANGUL_LESSONS.map((lesson, i) => {
    lesson.chamo.forEach(c => known.add(c))
    return {
      n: i + 1,
      shortId: lesson.id,
      title: lesson.title,
      goal: lesson.chamo.length
        ? `Читать и писать буквы ${lesson.chamo.join(' ')} и слова с ними`
        : 'Читать слоги с патчхимом',
      grammar: lesson.idea ?? 'Строение слога хангыля',
      grammarWhy: 'Без разбора слога на буквы новое слово приходится запоминать картинкой.',
      vocabTheme: lesson.words.map(w => w.ru).join(', '),
      artifact: `${lesson.words.length} слов, записанных от руки`,
      theory: unitTheory(lesson),
      vocab: unitVocab(lesson),
      tasks: unitTasks(lesson, known),
    }
  })
})()

export const KOREAN_HANGUL_COURSE: LanguageCourseSpec = {
  key: 'ko-hangul',
  title: 'Корейский с нуля: хангыль',
  subject: 'Корейский',
  level: 'с нуля → TOPIK I (1급)',
  lang: 'ko',
  guidedHours: '18–24 часа',
  lessonMinutes: 60,
  scopeNote:
    'Курс закрывает письмо и чтение: сорок букв, строение слога, патчхим и первые сто слов. '
    + 'Грамматики в нём почти нет — она начинается в курсе TOPIK I, который продолжает этот.',
  modules: [
    { title: 'Гласные и первые согласные', subtitle: 'Слог из двух букв', units: [1, 2, 3, 4] },
    { title: 'Патчхим и придыхание', subtitle: 'Слог из трёх букв', units: [5, 6] },
    { title: 'Остальной алфавит', subtitle: 'Й-гласные, напряжённые, в-гласные', units: [7, 8, 9] },
  ],
  units: HANGUL_UNITS,
}

/** Сводка курса — по ней реестр сидов сверяет подписи карточки с содержимым. */
export const COURSE_SUMMARY = courseSummary(KOREAN_HANGUL_COURSE)

export function buildKoreanHangulCourse(courseId: string): CourseEdData {
  return buildLanguageCourse(KOREAN_HANGUL_COURSE, courseId)
}
