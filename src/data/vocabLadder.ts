// ─────────────────────────────────────────────────────────────────────────────
// Лестница слова: лёгкие ступени между показом и экзаменом
// (docs/MEMORY_STANDARD.md — Р2, Р3, Р5, Р6, Р9)
//
// ЗАЧЕМ. Порция урока (Р1) даёт три-четыре слова карточками, а следом шли
// сопоставление пар и выбор из четырёх — то есть ПРИПОМИНАНИЕ, самая тяжёлая
// проверка, вторым же заданием. Между показом и припоминанием обязаны стоять
// ступени полегче: узнавание из двух, узнавание на слух, сборка написания
// (Craik & Lockhart 1972 — глубина обработки; Slamecka & Graf 1978 — эффект
// генерации; Webb 2005 — рецептивное знание появляется раньше продуктивного и
// само в него не переходит).
//
// ПОЧЕМУ КРУГАМИ, А НЕ ПО СЛОВУ ЦЕЛИКОМ. Соблазн — прогнать одно слово по всем
// ступеням подряд, потом взяться за второе. Но три задания подряд по одному
// слову проверяют не память, а эхо: ответ ещё звучит в голове, и вспоминать
// нечего (Ebbinghaus; Cepeda et al. 2006 — распределение бьёт массирование).
// Поэтому ступень идёт КРУГОМ по всем словам порции: между двумя касаниями
// одного слова стоят два-три чужих — ровно тот разрыв, который делает второе
// касание работой.
//
// ЧТО ЭТОТ МОДУЛЬ НЕ ДЕЛАЕТ. Он не строит финальные задания порции —
// сопоставление пар и выбор из четырёх остаются за `vocabRecognition`
// (data/languageCourse.ts): по Р2 и Р4 это ступени 4 и 6, и их место —
// в конце занятия, после лестницы.
//
// ЧИСТЫЙ МОДУЛЬ. Отсюда нет ни одного импорта ЗНАЧЕНИЙ из languageCourse.ts —
// только типы. Иначе получился бы цикл модулей: сборщик курса импортирует
// лестницу, лестница — хелперы сборщика.
// ─────────────────────────────────────────────────────────────────────────────

import type { SeedTask, VocabItem } from './languageCourse'
import { syllableDistractors } from './hangul'

/** Хангыль или кана: письмо, которое ученику курса «с нуля» ещё незнакомо. */
const FOREIGN_SCRIPT = /[぀-ヿ가-힯一-鿿]/
const isHangul = (s: string) => /[가-힯]/.test(s)

/**
 * Стадия письма (Р6).
 *
 * `B` — знак идёт вместе с транскрипцией: ученик уже видит хангыль, но не
 * обязан его читать, чтобы решить задание про значение. `C` — знак сам по себе.
 * Стадии A (только звук и транскрипция) у нас нет отдельным режимом: её роль
 * играет карточка знакомства, где транскрипция стоит своим полем.
 */
export type WritingStage = 'B' | 'C'

/** Подпись слова по стадии письма. */
export const stageLabel = (w: VocabItem, stage: WritingStage): string =>
  stage === 'B' && w.reading ? `${w.term} (${w.reading})` : w.term

/**
 * Скелет ответа — опора ступени 5 (Р7).
 *
 * Первый знак открыт, остальные закрыты точками: «안 · · ·». Ученик видит длину
 * и начало и достаёт остальное из памяти — это припоминание, а не узнавание
 * (ступень 4) и не свободная продукция (ступень 6).
 *
 * ПРОБЕЛЫ СОХРАНЯЮТСЯ: у фразы из двух слов их число — половина подсказки
 * («안녕히 계세요» — это не одно длинное слово, а два коротких).
 *
 * ТОЧКИ, А НЕ ПРОЧЕРКИ. Прочерк «____» синтез речи читает вслух как
 * «андерскор андерскор» (см. voiceText в lib/speech.ts).
 *
 * Пусто у слова из одного знака: там скелет и есть сам ответ.
 */
export function answerSkeleton(answer: string): string | undefined {
  const words = answer.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return undefined
  if (words.reduce((n, w) => n + Array.from(w).length, 0) < 2) return undefined
  let first = true
  return words
    .map(word => Array.from(word).map(ch => {
      if (!first) return '·'
      first = false
      return ch
    }).join(' '))
    .join('   ')
}

/**
 * Спутываемые слова (Р5).
 *
 * Слова, поданные одним смысловым или звуковым кластером, учатся МЕДЛЕННЕЕ
 * несвязанных: формы конкурируют за одно значение (Tinkham 1993, 1997;
 * Waring 1997). 안녕히 가세요 и 안녕히 계세요, введённые в один вечер, дают не два
 * слова, а одну кашу.
 *
 * Считаем спутываемыми, если верно любое:
 *   • перевод совпадает (или короткий перевод входит в другой короткий:
 *     «нет» / «нет (не имеется)»);
 *   • общее начало или конец: ≥ 2 знака И ≥ 40% короткого слова
 *     (안녕히 가세요 / 안녕히 계세요);
 *   • минимальная пара: та же длина, различие ровно в одном знаке, слово
 *     короче тринадцати знаков (물 / 불).
 */
export function confusable(a: VocabItem, b: VocabItem): boolean {
  const at = (a.term ?? '').trim()
  const bt = (b.term ?? '').trim()
  if (!at || !bt || at === bt) return false

  const ar = (a.ru ?? '').trim().toLowerCase()
  const br = (b.ru ?? '').trim().toLowerCase()
  // Один перевод — всегда конфликт. Вхождение считается только у КОРОТКИХ
  // значений («нет» внутри «нет (не имеется)»): у курса родного языка на этом
  // месте стоит толкование в десять слов, и там общий кусок — это обычная
  // русская фраза, а не спутываемость.
  if (ar && br && ar === br) return true
  if (ar && br && ar.length <= 24 && br.length <= 24 && (ar.includes(br) || br.includes(ar))) return true

  const A = Array.from(at)
  const B = Array.from(bt)

  // Общее начало / конец. Двух знаков мало самих по себе: в русской фразе
  // «по-» общее у половины слов. Считаем спутываемым, когда общий кусок ещё и
  // ЗАНИМАЕТ большую часть короткого слова — как 안녕히 가세요 / 안녕히 계세요,
  // где совпадает больше половины.
  const short = Math.min(A.length, B.length)
  const heavy = (n: number) => n >= 2 && n / short >= 0.4
  let head = 0
  while (head < A.length && head < B.length && A[head] === B[head]) head++
  if (heavy(head)) return true
  let tail = 0
  while (tail < A.length - head && tail < B.length - head && A[A.length - 1 - tail] === B[B.length - 1 - tail]) tail++
  if (heavy(tail)) return true

  // Минимальная пара: одинаковая длина, ровно одно расхождение. Только у
  // коротких форм: две фразы по сорок знаков, различающиеся одной буквой, —
  // это опечатка в данных, а не спутываемость.
  if (A.length === B.length && A.length > 0 && A.length <= 12) {
    let diff = 0
    for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) diff++
    if (diff === 1) return true
  }
  return false
}

/**
 * Разложить словарь по порциям так, чтобы спутываемые слова не встретились в
 * одном занятии (Р5).
 *
 * КАК. Идём по словам в авторском порядке и кладём каждое в первую порцию, где
 * есть место и нет ничего спутываемого с ним. Не нашлось такой — слово уходит в
 * следующую по счёту порцию (за пределы `count`, если иначе никак): лучше лишнее
 * короткое занятие, чем два похожих слова в одном.
 *
 * ПОРЯДОК СЛОВ ВНУТРИ ПОРЦИИ АВТОРСКИЙ. Перетасовывать их нельзя: автор ставит
 * рядом слова одной сцены («здравствуйте» и «меня зовут»), и порядок — часть
 * содержания.
 *
 * ДЕТЕРМИНИРОВАНО: ни случайности, ни времени — один и тот же сид обязан
 * собираться одинаково в любой день (иначе у курса при каждой сборке новые id
 * уроков).
 */
export function spreadConfusable(vocab: VocabItem[], size: number): VocabItem[][] {
  if (vocab.length <= size) {
    // Даже одна порция может содержать пару-конфликт — тогда её честно рвём.
    const conflicted = vocab.some((w, i) => vocab.slice(0, i).some(x => confusable(w, x)))
    if (!conflicted) return [vocab]
  }
  const count = Math.max(1, Math.ceil(vocab.length / size))
  const out: VocabItem[][] = Array.from({ length: count }, () => [])

  for (const word of vocab) {
    // Ровные порции: сначала самая пустая из подходящих, чтобы не получилось
    // «четыре и хвост из одного» (Р1).
    const fits = out
      .map((part, i) => ({ part, i }))
      .filter(({ part }) => part.length < size && !part.some(x => confusable(word, x)))
      .sort((a, b) => a.part.length - b.part.length || a.i - b.i)[0]
    if (fits) { fits.part.push(word); continue }

    // Места нет нигде: заводим ещё одну порцию — но только под конфликт, а не
    // под переполнение (переполнение решает следующая свободная порция).
    const loose = out.find(part => !part.some(x => confusable(word, x)))
    if (loose) loose.push(word)
    else out.push([word])
  }
  return out.filter(part => part.length > 0)
}

/** Слоги-обманки для сборки: похожие на слоги самого слова, а не случайные. */
function bankDistractors(term: string, others: VocabItem[]): string[] {
  if (isHangul(term)) return syllableDistractors(term, 3)
  // Не хангыль: берём знаки соседних слов порции — они хотя бы из той же
  // системы письма, в отличие от случайных символов.
  const own = new Set(Array.from(term))
  const out: string[] = []
  for (const w of others) {
    for (const ch of Array.from(w.term ?? '')) {
      if (own.has(ch) || out.includes(ch)) continue
      out.push(ch)
      if (out.length === 3) return out
    }
  }
  return out
}

export interface LadderOptions {
  /** Курс родного языка: карточка перевёрнута, спрашиваем точность слова. */
  native?: boolean
  /** Стадия письма урока (Р6). */
  stage?: WritingStage
}

/**
 * Ступени 1–3 по каждому слову порции, кругами.
 *
 * Круг 1 — узнавание значения из ДВУХ вариантов (Р9: первое узнавание всегда
 * из двух, обманка — слово этой же порции, уже показанное карточкой).
 * Круг 2 — узнавание на слух: прозвучало одно из двух слов, какое?
 * Круг 3 — сборка написания из плиток (только для незнакомого письма: латиницу
 * собирать по буквам незачем, она читается сразу).
 *
 * Возвращает СИДЫ без id — их проставляет сборщик курса (editorTask).
 */
export function ladderTasks(words: VocabItem[], opts: LadderOptions = {}): SeedTask[] {
  const { native = false, stage = 'C' } = opts
  const pool = words.filter(w => w.term?.trim() && w.ru?.trim())
  // Одно слово — обманку не из чего взять, лестница вырождается в подсказку.
  if (pool.length < 2) return []

  const label = (w: VocabItem) => stageLabel(w, stage)
  /** Сосед по кругу — источник единственной обманки. */
  const partner = (i: number) => pool[(i + 1) % pool.length]

  const round1: SeedTask[] = pool.map((w, i) => {
    const other = partner(i)
    // Верный ответ то слева, то справа: иначе к третьему заданию порции
    // ученик отвечает по позиции, а не по значению.
    const right = i % 2 === 0
    const choices = right ? [w.ru, other.ru] : [other.ru, w.ru]
    return {
      type: 'single',
      question: native
        ? `Что точно значит «${label(w)}»?`
        : `Что значит ${label(w)}?`,
      choices,
      correctChoices: [right ? 0 : 1],
    }
  })

  // Звук нужен только там, где слово звучит не так, как пишется по-русски:
  // у курса родного языка эта ступень не несёт ничего.
  const round2: SeedTask[] = native ? [] : pool.map((w, i) => {
    const other = partner(i)
    const first = i % 2 === 0
    return {
      type: 'minimalPair',
      question: 'Что прозвучало?',
      pairA: first ? label(w) : label(other),
      pairB: first ? label(other) : label(w),
      correctPair: first ? 'A' : 'B',
      ttsText: w.term,
      allowSlow: true,
    }
  })

  // Сборка написания — ступень между «узнал» и «напиши сам» (Р7: клавиатура
  // только после плиток). Латинице она не нужна.
  const round3: SeedTask[] = native ? [] : pool.flatMap(w => {
    const term = w.term.trim()
    if (!FOREIGN_SCRIPT.test(term)) return []
    const units = Array.from(term.replace(/\s+/g, ''))
    const question = stage === 'B' && w.reading
      ? `Соберите слово «${w.ru}» (${w.reading})`
      : `Соберите слово «${w.ru}»`
    // Один знак собирать не из чего: у хангыля это работа для сборки слога из
    // букв, у остальных письменностей — вообще не задание.
    if (units.length < 2) {
      return isHangul(term) ? [{ type: 'buildSyllable', question, syllable: term } as SeedTask] : []
    }
    return [{
      type: 'charBank',
      question,
      answer: term,
      distractors: bankDistractors(term, pool.filter(x => x.term !== w.term)),
      ttsText: term,
    } as SeedTask]
  })

  return [...round1, ...round2, ...round3]
}
