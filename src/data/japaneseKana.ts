// ─────────────────────────────────────────────────────────────────────────────
// Курс «Японский с нуля: кана» — хирагана и катакана за одиннадцать уроков
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ КУРС. Курс до JLPT N5 (japaneseJlpt.ts) отдаёт всю хирагану
// одному уроку, а катакану — другому: там нет ни одного задания «как читается
// знак», ни одного «что вы услышали», и написать знак рукой негде. Для того,
// кто японского письма не видел, это не урок, а таблица на дом. Здесь кана
// проходится так же, как хангыль в koreanHangul.ts, — два ряда таблицы за урок,
// и каждый знак сначала показывают, потом спрашивают, потом пишут.
//
// УРОКИ НЕ ПИШУТСЯ РУКАМИ — они собираются из data/kana.ts по одной лестнице:
//
//   1. знакомство — карточка знака (словарь урока показывается до заданий)
//   2. узнавание  — «как читается» и обратное «какой знак читается так»,
//                   обманки — только похожие знаки (ぬ/め, シ/ツ)
//   3. на слух    — пара знаков, которые русское ухо путает (つ/す, か/が)
//   4. письмо     — обводка по чертам KanjiVG, в правильном порядке
//                   (ставит лестница словаря — у каждого знака-карточки)
//   5. слово      — собрать из знаков с обманками, набрать на слух, прочитать
//
// Слова урока — только из пройденных знаков (scripts/checkKana.mjs).
// ─────────────────────────────────────────────────────────────────────────────

import {
  COMBO_LATIN, COMBO_READING, DAKUTEN_ROWS, GOJUON_ROWS, KANA, KANA_LESSONS,
  kanaAnswer, lookalikes, plainOf, soundPartner, toKatakana, type KanaLesson,
} from './kana'
import {
  buildLanguageCourse, courseSummary, dictation, minPair, one, pairsOf, readAloud, sylBank,
  type CourseFigures, type LangUnit, type LanguageCourseSpec, type SeedTask, type VocabItem,
} from './languageCourse'
import { charGrid, type CharCell } from './lessonFigures'
import { transcribe } from '../lib/translit'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { JAPANESE_KANA_THEORY } from './japaneseKanaTheory'

/** Знак, у которого есть «чтение» в обычном смысле (не っ, не ー, не малые). */
const readable = (ch: string): boolean => {
  const k = KANA[ch]
  return !!k && !k.ru.includes('(') && ch !== 'ー' && k.ru !== 'удвоение'
}

/** Обманки-чтения: от похожих знаков, без совпадающих с верным (お/を обе «о»). */
function wrongReadings(ch: string, n: number): string[] {
  const right = kanaAnswer(ch).main
  const out: string[] = []
  for (const c of lookalikes(ch, 8)) {
    if (!readable(c)) continue
    const r = kanaAnswer(c).main
    if (r !== right && !out.includes(r)) out.push(r)
    if (out.length >= n) break
  }
  return out
}

/** Обманки-знаки: похожие, но читающиеся иначе — иначе у вопроса два ответа. */
function wrongGlyphs(ch: string, n: number): string[] {
  const right = kanaAnswer(ch).main
  return lookalikes(ch, 8).filter(c => readable(c) && kanaAnswer(c).main !== right).slice(0, n)
}

/** Обманки для сборки слова: знаки, похожие на буквы слова, из уже пройденных. */
function wordDistractors(word: string, known: Set<string>): string[] {
  const chars = Array.from(word)
  const out: string[] = []
  for (const c of chars) {
    const alt = lookalikes(c, 6).find(x => known.has(x) && !chars.includes(x) && !out.includes(x))
    if (alt) out.push(alt)
    if (out.length >= 3) break
  }
  return out
}

/** Задания одного урока. `known` — знаки этого и прошлых уроков. */
function unitTasks(lesson: KanaLesson, known: Set<string>): SeedTask[] {
  const tasks: SeedTask[] = []
  // Обводки здесь нет намеренно: её ставит лестница словаря (vocabLadder,
  // ступень 3) каждому знаку-карточке — своя давала тот же знак второй раз
  // подряд. Какие звонкие писать, решает `trace` через словарь (unitVocab).

  lesson.kana.forEach((ch, i) => {
    const k = KANA[ch]
    if (!k) return

    if (readable(ch)) {
      const wrong = wrongReadings(ch, 3)
      if (wrong.length >= 2) tasks.push(one(`${ch} — как читается?`, [kanaAnswer(ch).main, ...wrong], 0))

      // Звонкий знак — это известная форма с меткой: спрашиваем чтение и
      // слух через раз, а форму не спрашиваем вовсе — она уже знакома. Иначе
      // урок звонких выходит вдвое длиннее урока с новыми формами.
      const marked = plainOf(ch) !== ch
      if (marked && i % 2 === 1) return

      // Обратное направление — через знак: «какой из них „са“» тренирует
      // различение формы, а не только память на звук.
      const glyphs = wrongGlyphs(ch, 3)
      if (!marked && i % 2 === 0 && glyphs.length >= 2) {
        tasks.push(one(`Какой знак читается «${kanaAnswer(ch).main}»?`, [ch, ...glyphs], 0))
      }

      // На слух — только с уже введённым знаком: слышать разницу со знаком
      // из будущего урока — не задание, а лотерея.
      const partner = soundPartner(ch, known)
      if (partner && partner !== ch) tasks.push(minPair('Что вы услышали?', ch, partner, 'A'))
    }

  })

  // Слоги из двух знаков: «как читается» с ловушкой «два слога вместо одного».
  // Тридцать три слога ёон по вопросу на каждый — это уже не урок, а
  // перекличка: берём через один, остальные слоги ученик увидит в словах.
  const combos = lesson.combos ?? []
  for (const combo of combos.length > 16 ? combos.filter((_, i) => i % 2 === 0) : combos) {
    const right = COMBO_READING[combo]
    if (!right) continue
    const [a, b] = Array.from(combo)
    const big = KANA[b]?.say ?? ''
    const asTwo = `${kanaAnswer(a).main}${big ? kanaAnswer(big).main : ''}`
    const others = combos
      .filter(c => c !== combo && c[0] === combo[0])
      .map(c => COMBO_READING[c])
      .filter(r => r && r !== right)
    const wrong = [...new Set([asTwo, ...others])].filter(r => r !== right).slice(0, 3)
    if (wrong.length >= 2) tasks.push(one(`${combo} — как читается?`, [right, ...wrong], 0))
  }

  // Знак ↔ чтение пачкой: проверка, что ряды не слиплись в голове.
  const forPairs = lesson.kana.filter(readable)
  const seenReading = new Set<string>()
  const pairRows: [string, string][] = []
  for (const ch of forPairs) {
    const r = kanaAnswer(ch).main
    if (seenReading.has(r)) continue
    seenReading.add(r)
    pairRows.push([ch, r])
  }
  for (let i = 0; i + 4 <= pairRows.length; i += 5) {
    tasks.push(pairsOf('Соедините знак и его чтение', pairRows.slice(i, i + 5)))
  }

  // Катакана сверяется с уже известной хираганой: тот же слог, другая форма.
  if (lesson.script === 'kata') {
    const kata = lesson.kana.filter(c => readable(c) && KANA[c]?.script === 'kata')
    const hiraOf = (c: string) => String.fromCodePoint(c.codePointAt(0)! - 0x60)
    for (let i = 0; i + 4 <= kata.length; i += 5) {
      tasks.push(pairsOf('Соедините катакану с той же хираганой', kata.slice(i, i + 5).map(c => [c, hiraOf(c)])))
    }
  }

  // Пары на слух, где разница — долгота или пауза (おばさん/おばあさん).
  for (const [a, b, note] of lesson.earPairs ?? []) {
    tasks.push(minPair(`Что вы услышали? (${note})`, a, b, 'A'))
  }

  // Слова: собрать из знаков, набрать на слух, прочитать вслух.
  lesson.words.forEach((w, wi) => {
    if (wi < 4 && Array.from(w.w).length >= 2) {
      tasks.push(sylBank(`Соберите слово «${w.ru}» из знаков — часть знаков лишняя`, w.w, wordDistractors(w.w, known)))
    }
    if (wi >= 2 && wi < 4) {
      tasks.push(dictation(`Послушайте и напечатайте слово ${lesson.script === 'kata' ? 'катаканой' : 'хираганой'} — «${w.ru}»`, w.w))
    }
    if (wi < 5) tasks.push(readAloud(`Прочитайте вслух: ${w.w} — ${w.ru}`, w.w, 15))
  })

  return tasks
}

/** Словарь урока: сначала знаки (карточки знакомства), потом слова. */
function unitVocab(lesson: KanaLesson): VocabItem[] {
  // Звонкие знаки карточкой не заводим, кроме тех, что урок даёт писать: が —
  // это か с меткой, и двадцать пять карточек «знакомства» с уже знакомыми
  // формами растянули бы урок на десяток частей ради одного правила. Таблица
  // в конспекте и вопросы «как читается» покрывают их все.
  const shown = lesson.kana.filter(ch => plainOf(ch) === ch || (lesson.trace ?? []).includes(ch))
  const letters: VocabItem[] = shown.flatMap(ch => {
    const k = KANA[ch]
    if (!k) return []
    const { main, alt } = kanaAnswer(ch)
    // Чтения у пар お/を, じ/ぢ, ず/づ совпадают — на карточке их разводит
    // латиница, как во всех словарях.
    const clash = lesson.kana.some(o => o !== ch && readable(o) && kanaAnswer(o).main === main)
    return [{
      term: ch,
      ru: clash ? `${main} (${k.latin})` : k.ru,
      reading: k.latin,
      alt: clash ? [main, ...alt] : alt,
    }]
  })
  const combos: VocabItem[] = (lesson.combos ?? []).slice(0, 6).map(c => ({
    term: c, ru: COMBO_READING[c], reading: COMBO_LATIN[c], alt: [COMBO_LATIN[c]],
  }))
  const words = lesson.words.map(w => ({ term: w.w, ru: w.ru, reading: transcribe(w.w, 'ja') }))
  return [...letters, ...combos, ...words]
}

function unitTheory(lesson: KanaLesson): string {
  const rows = lesson.kana.map(ch => {
    const k = KANA[ch]
    return k ? `${ch} — ${k.ru} (${k.latin})${k.hint ? `. ${k.hint}` : ''}` : ''
  }).filter(Boolean)
  const combos = (lesson.combos ?? []).map(c => `${c} — ${COMBO_READING[c]}`).join(', ')
  const words = lesson.words.map(w => `${w.w} — ${transcribe(w.w, 'ja')} — ${w.ru}`).join('\n')
  return [
    JAPANESE_KANA_THEORY[lesson.id] ?? '',
    lesson.idea,
    rows.length ? `Знаки урока:\n${rows.join('\n')}` : '',
    combos ? `Слоги урока: ${combos}` : '',
    `Слова урока:\n${words}`,
  ].filter(Boolean).join('\n\n')
}

export const KANA_UNITS: LangUnit[] = (() => {
  const known = new Set<string>()
  return KANA_LESSONS.map((lesson, i) => {
    lesson.kana.forEach(c => known.add(c))
    const script = lesson.script === 'kata' ? 'катаканы' : 'хираганы'
    return {
      n: i + 1,
      shortId: lesson.id,
      title: lesson.title,
      goal: `Читать и писать знаки ${script}: ${lesson.kana.filter(readable).slice(0, 10).join(' ')}${lesson.kana.length > 10 ? ' …' : ''}`,
      grammar: lesson.idea,
      grammarWhy: 'Знак каны — готовый слог: выучив форму и звук, слово читается сразу, без подсказки латиницей.',
      vocabTheme: lesson.words.map(w => w.ru).join(', '),
      artifact: `${lesson.words.length} слов, прочитанных и записанных ${script}`,
      theory: unitTheory(lesson),
      vocab: unitVocab(lesson),
      tasks: unitTasks(lesson, known),
    }
  })
})()

// ─── Таблицы ─────────────────────────────────────────────────────────────────

/** Полная таблица годзюон; знаки вне `lit` гаснут. */
function gojuonGrid(title: string, kata: boolean, lit: Set<string>, note: string): string {
  const conv = (c: string) => (kata ? toKatakana(c) : c)
  const rows: Array<Array<CharCell | null>> = GOJUON_ROWS.map(r => r.chars.map(c => {
    if (!c) return null
    const ch = conv(c)
    return { sym: ch, read: KANA[ch]?.ru ?? '', dim: !lit.has(ch) }
  }))
  return charGrid(title, rows, {
    colHeads: ['а', 'и', 'у', 'э', 'о'],
    rowHeads: GOJUON_ROWS.map(r => r.row),
    note,
  })
}

const lessonSet = (id: string) => new Set(KANA_LESSONS.find(l => l.id === id)?.kana ?? [])

const KANA_FIGURES: CourseFigures = {
  'ja-kana-1': [{
    after: 2,
    caption: 'Вся хирагана — 46 знаков. Яркие — этот урок, остальное добирается за четыре урока',
    src: gojuonGrid('Хирагана целиком (годзюон)', false, lessonSet('ja-kana-1'),
      'Строка — согласная, столбец — гласная. Порядок あいうえお один на всю таблицу'),
  }],
  'ja-kana-6': [{
    after: 1,
    caption: 'Звонкие ряды: те же формы с ゛ или ゜',
    src: charGrid('Звонкие и полузвонкие', DAKUTEN_ROWS.map(r => r.chars.map(c => (c ? { sym: c, read: KANA[c]?.ru ?? '' } : null))), {
      colHeads: ['а', 'и', 'у', 'э', 'о'],
      rowHeads: DAKUTEN_ROWS.map(r => r.row),
      note: 'じ = ぢ и ず = づ звучат одинаково; пишут почти всегда じ и ず',
    }),
  }],
  'ja-kana-7': [{
    after: 1,
    caption: 'Слоги с малыми ゃ ゅ ょ: один такт, а не два',
    src: charGrid('Ёон: знак + малая や/ゆ/よ',
      ['き', 'し', 'ち', 'に', 'ひ', 'み', 'り'].map(c => ['ゃ', 'ゅ', 'ょ'].map(s => ({ sym: c + s, read: COMBO_READING[c + s] }))),
      { colHeads: ['ゃ', 'ゅ', 'ょ'], rowHeads: ['ки', 'си', 'ти', 'ни', 'хи', 'ми', 'ри'], note: 'Так же со звонкими: ぎゃ «гя», じゃ «дзя», びゃ «бя», ぴゃ «пя»' }),
  }],
  'ja-kana-8': [{
    after: 1,
    caption: 'Вся катакана — те же 46 слогов. Яркие — этот урок',
    src: gojuonGrid('Катакана целиком', true, lessonSet('ja-kana-8'),
      'Порядок и звуки те же, что у хираганы, — меняется только форма'),
  }],
}

export const JAPANESE_KANA_COURSE: LanguageCourseSpec = {
  key: 'ja-kana',
  title: 'Японский с нуля: кана',
  subject: 'Японский',
  level: 'с нуля → JLPT N5',
  scratch: true,
  lang: 'ja',
  guidedHours: '20–26 часов',
  lessonMinutes: 60,
  scopeNote:
    'С этого курса начинают японский: вся хирагана и катакана — 92 основных знака, звонкие и малые, '
    + 'долгота и удвоение, около ста слов. Каждый знак пишется пальцем по порядку черт. '
    + 'Грамматики почти нет: она начинается в курсе «Японский с нуля — до JLPT N5», который продолжает этот.',
  modules: [
    { title: 'Хирагана', subtitle: '46 знаков, по два ряда за урок', units: [1, 2, 3, 4, 5] },
    { title: 'Хирагана: метки и малые', subtitle: 'Звонкие, ёон, っ, долгота', units: [6, 7] },
    { title: 'Катакана', subtitle: 'Заимствования, ー, новые слоги', units: [8, 9, 10, 11] },
  ],
  units: KANA_UNITS,
  figures: KANA_FIGURES,
}

export const COURSE_SUMMARY = courseSummary(JAPANESE_KANA_COURSE)

export function buildJapaneseKanaCourse(courseId: string): CourseEdData {
  return buildLanguageCourse(JAPANESE_KANA_COURSE, courseId)
}
