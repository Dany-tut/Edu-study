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
  CHAMO, HANGUL_LESSONS, chamoAnswer, chamoOf, confusableWith, joinSyllable, syllablesOf,
  type HangulLesson,
} from './hangul'
import {
  buildLanguageCourse, buildSyl, courseSummary, minPair, one, readAloud, traceChamo, wb,
  type LangUnit, type LanguageCourseSpec, type SeedTask, type VocabItem,
} from './languageCourse'
import { transcribe } from '../lib/translit'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { KOREAN_HANGUL_FIGURES } from './koreanHangulFigures'
import { KOHG_VIDEO } from './languageVideosExtra'
import { KOHG_HOMEWORK_VIDEO } from './homeworkVideos'
import { KOREAN_HANGUL_EXTRA } from './koreanHangulExtra'
import { KOREAN_HANGUL_THEORY } from './koreanHangulTheory'

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
 * Слог, на котором букву можно УСЛЫШАТЬ.
 *
 * Отдельная согласная не звучит вовсе: ㄱ вне слога — это не «к», а беззвучное
 * смыкание, и синтезатор на такой вход выдаёт либо тишину, либо название буквы.
 * Поэтому на слух буква всегда проверяется в слоге: согласная — с ㅏ (введена
 * первым уроком, то есть доступна всегда), гласная — с немой ㅇ.
 */
const audibleSyllable = (ch: string): string | null =>
  CHAMO[ch]?.kind === 'vowel' ? joinSyllable('ㅇ', ch) : joinSyllable(ch, 'ㅏ')

/**
 * Задания одного урока алфавита.
 *
 * `known` — буквы, введённые этим и всеми предыдущими уроками: из них можно
 * собирать задания, из остальных нельзя. Множество пополняется по ходу, поэтому
 * порядок уроков и есть порядок доступного материала.
 */
function unitTasks(lesson: HangulLesson, known: Set<string>): SeedTask[] {
  const tasks: SeedTask[] = []

  lesson.chamo.forEach((ch, i) => {
    const letter = CHAMO[ch]
    if (!letter) return

    // Узнавание, направление «вижу → знаю звук». Обманки только из похожих:
    // выбор между ㄴ и ㅠ не тренирует ничего.
    const wrong = confusableWith(ch, 2).map(c => CHAMO[c].sound)
    tasks.push(one(
      `${ch} — какой это звук?`,
      [letter.sound, ...wrong],
      0,
    ))

    // Узнавание, обратное направление: «слышу → узнаю букву».
    //
    // ЗАЧЕМ ОБА. Это разные умения, и они расходятся: ㅓ и ㅗ различаются на
    // письме с первого взгляда и почти не различаются на слух, а ㄴ и ㄷ —
    // наоборот. Курс, где есть только «какой это звук», выпускает человека,
    // который читает вывеску и не понимает объявление.
    //
    // Пара берётся только из УЖЕ введённых букв: слышать разницу с буквой из
    // будущего урока — это не задание, а лотерея. Поэтому у самых первых букв
    // пары может не быть вовсе, и это нормально.
    const partner = confusableWith(ch, 4).find(c => known.has(c) && c !== ch)
    const mine = audibleSyllable(ch)
    const other = partner ? audibleSyllable(partner) : null
    if (mine && other && mine !== other) {
      // Сторона верного ответа выводится из номера буквы, а не из случайности:
      // сид обязан собираться одинаково каждый раз.
      const meFirst = i % 2 === 0
      tasks.push(minPair(
        'Что вы услышали?',
        meFirst ? mine : other,
        meFirst ? other : mine,
        meFirst ? 'A' : 'B',
      ))
    }

    // Письмо. Отдельным шагом и сразу после узнавания: рука запоминает форму,
    // пока звук ещё в голове.
    tasks.push(traceChamo(`Обведите букву ${ch} — ведите от точки, черта за чертой`, ch))
  })

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

/**
 * Словарь урока — он же список карточек знакомства.
 *
 * БУКВЫ ИДУТ ПЕРЕД СЛОВАМИ, И ЭТО ГЛАВНОЕ В ЭТОЙ ФУНКЦИИ. Карточки словаря
 * показываются нулевым шагом домашки (VocabIntro), то есть ДО заданий. Пока
 * букв здесь не было, алфавитный урок начинался с вопроса «ㅏ — какой это
 * звук?» о букве, которую ученику ни разу не показали: ровно тот дефект
 * Duolingo, ради которого затевался весь курс.
 *
 * Буква — такой же элемент, как слово: у неё есть запись, чтение (корейское
 * название) и значение (звук). Поэтому она едет по общей дороге — и в
 * знакомство, и в карточки повторения, — а не заводит себе отдельную.
 */
function unitVocab(lesson: HangulLesson): VocabItem[] {
  // Русская запись звука у разных букв совпадает: ㅓ и ㅗ обе «о», ㅕ и ㅛ обе
  // «ё». В таблице это терпимо, а на карточках знакомства — нет: ученик видит
  // подряд два одинаковых ответа и делает единственный доступный вывод, что
  // буквы взаимозаменяемы. Поэтому у столкнувшихся добавляется латинская
  // пометка — та самая, которой их разводят все словари (eo против o).
  const soundCount = new Map<string, number>()
  for (const ch of lesson.chamo) {
    const s = chamoAnswer(ch).main
    soundCount.set(s, (soundCount.get(s) ?? 0) + 1)
  }

  const letters: VocabItem[] = lesson.chamo.flatMap(ch => {
    const letter = CHAMO[ch]
    if (!letter) return []
    const { main, alt } = chamoAnswer(ch)
    const clash = (soundCount.get(main) ?? 0) > 1
    return [{
      term: ch,
      ru: clash ? `${main} (${letter.latin})` : main,
      reading: letter.name,
      // Голый звук принимается всегда: пометка нужна глазу на знакомстве, а не
      // пальцам в поле ответа.
      alt: clash ? [main, ...alt] : alt,
    }]
  })
  const words = lesson.words.map(w => ({ term: w.ko, ru: w.ru, reading: transcribe(w.ko, 'ko') }))
  return [...letters, ...words]
}

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
    // Написанный текст идёт первым, автосписки — под ним: списки собираются из
    // тех же данных, что и задания, и терять их незачем (см. koreanHangulTheory).
    KOREAN_HANGUL_THEORY[lesson.id] ?? '',
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
      // Чек-лист урока алфавита собирается из самих букв.
      //
      // ЗАЧЕМ ОН ЗДЕСЬ. Остальные корейские курсы получили чек-листы, а этот
      // остался без них по правилу «в юнитах чтения отмечать нечего». Для
      // алфавита правило было применено ошибочно: буква — это САМЫЙ проверяемый
      // пункт, какой вообще бывает. «Узнаю ㅓ на письме и на слух» ученик либо
      // подтверждает, либо нет, и другого способа задать этот вопрос в курсе
      // не было — юнит просто заканчивался.
      //
      // Пункт про слух стоит отдельно от пункта про письмо не для красоты: ㅓ и
      // ㅗ различаются глазом мгновенно и почти не различаются ухом, у ㄴ и ㄷ
      // всё наоборот. Один общий пункт «знаю букву» скрыл бы ровно ту половину,
      // которая не выучена.
      checklist: [
        ...lesson.chamo.flatMap(ch => {
          const c = CHAMO[ch]
          return c ? [`${ch} — ${c.sound} (${c.name}): узнаю на письме и на слух`] : []
        }),
        ...(lesson.words.length
          ? [`Читаю без транскрипции: ${lesson.words.slice(0, 4).map(w => w.ko).join(', ')}`]
          : []),
      ],
      // Видео и доборы живут отдельными картами: здесь — структура урока.
      videoUrl: KOHG_VIDEO[lesson.id],
      vocab: unitVocab(lesson),
      // Письмо и аудирование добраны по итогам аудита (см. koreanHangulExtra.ts).
      tasks: [...unitTasks(lesson, known), ...(KOREAN_HANGUL_EXTRA[lesson.id] ?? [])],
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
    'С этого курса начинают корейский: сорок букв, строение слога, патчхим и первые сорок слов. '
    + 'Буква здесь такая же карточка, как слово, — её показывают до заданий и потом повторяют. '
    + 'Грамматики почти нет: она начинается в курсе «Корейский с нуля — до TOPIK I», '
    + 'который продолжает этот и алфавит уже не повторяет.',
  modules: [
    { title: 'Гласные и первые согласные', subtitle: 'Слог из двух букв', units: [1, 2, 3, 4] },
    { title: 'Патчхим и придыхание', subtitle: 'Слог из трёх букв', units: [5, 6] },
    { title: 'Остальной алфавит', subtitle: 'Й-гласные, напряжённые, в-гласные', units: [7, 8, 9] },
  ],
  units: HANGUL_UNITS,
  // Схемы собираются из тех же данных, что и уроки (см. koreanHangulFigures.ts).
  figures: KOREAN_HANGUL_FIGURES,
  // Живая речь в домашке — мультик и подкаст (см. homeworkVideos.ts).
  homeworkVideos: KOHG_HOMEWORK_VIDEO,
}

/** Сводка курса — по ней реестр сидов сверяет подписи карточки с содержимым. */
export const COURSE_SUMMARY = courseSummary(KOREAN_HANGUL_COURSE)

export function buildKoreanHangulCourse(courseId: string): CourseEdData {
  return buildLanguageCourse(KOREAN_HANGUL_COURSE, courseId)
}
