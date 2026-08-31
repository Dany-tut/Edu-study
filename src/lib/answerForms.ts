/**
 * Формы одного и того же ответа — единые правила сверки со строгим эталоном.
 *
 * ЗАЧЕМ. Проверка была буквальной: `trim().toLowerCase()` плюс, местами, съеденная
 * точка в конце. Диктант «I'm a product designer with four years of experience.»
 * помечал «Неверно» ответ «i am a product designer with four years of experience»,
 * то есть ту же самую фразу в полной форме. Для ученика это не проверка, а лотерея
 * с формой записи, и бьёт она как раз по тем, кто услышал и понял правильно.
 *
 * ЧТО СЧИТАЕТСЯ ТЕМ ЖЕ ОТВЕТОМ (правила):
 *   1. Регистр: «Four» = «four».
 *   2. Пробелы: повторы и переводы строк схлопываются, края обрезаются.
 *   3. Пунктуация: точки, запятые, тире, дефисы, кавычки, скобки и японские
 *      「」。、 не значат ничего — «Well, I'm home!» = «well im home».
 *   4. Апострофы: типографский ’ = прямой '; после раскрытия сокращений апостроф
 *      вообще не важен («designer's» = «designers»).
 *   5. Сокращения английского раскрываются в обе стороны: I'm = I am, don't =
 *      do not, we'll = we will, can't = cannot = can not, let's = let us,
 *      gonna = going to. Неоднозначные ('s, 'd) дают несколько прочтений:
 *      he's = he is = he has = притяжательное; I'd = I would = I had.
 *   6. Числа: слово = цифра. «four» = «4», «twenty-one» = «21»,
 *      «one hundred and five» = «105», «first» = «1st»; «1,000» = «1000».
 *   7. Ё/Е в русском не различаются: «ёжик» = «ежик».
 *   8. Юникод: NFKC — полноширинные «４» и лигатуры приводятся к обычным.
 *   9. Языки без пробелов между словами (кана, кандзи, хангыль): пробелы
 *      игнорируются целиком — 「私は学生です」=「私は 学生です」.
 *
 * ЧТО ОСТАЁТСЯ ОШИБКОЙ (сознательно):
 *   • Диакритика: «voce» ≠ «você», «avô» ≠ «avó». В португальском это разные
 *     слова, а не украшение; прощать её — учить писать неправильно.
 *   • Артикли, предлоги и окончания: «a designer» ≠ «designer», «worked» ≠
 *     «work». В диктанте и дрилле проверяется именно форма.
 *   • Опечатки в буквах: «desiner» ≠ «designer». Расстояние Левенштейна тут не
 *     помощник — на коротких ответах оно склеивает разные слова («cat»/«cut»).
 *
 * ГДЕ ПРИМЕНЯЕТСЯ. Диктант, вписать ответ, развёрнутый ответ с эталоном, дрилл,
 * сборка предложения, ячейки таблицы, сопоставление — всё, где ответ сверяется с
 * заданной строкой. Перевод словарной карточки живёт по другим правилам (набор
 * смысловых слов, а не форма) — это `lib/answerMatch.ts`.
 *
 * КАК УСТРОЕНО. Строка разворачивается в НАБОР канонических форм (из-за
 * неоднозначных сокращений их бывает несколько), ответы равны, если наборы
 * пересекаются. Набор ограничен MAX_VARIANTS — защита от строки, набитой
 * апострофами.
 *
 * Модуль без зависимостей: его зовут и данные (data/taskTypes), и экраны ученика.
 */

const MAX_VARIANTS = 64

/** Маркеры неоднозначных сокращений — раскрываются последним шагом, ветвлением. */
const AMB_S = '\u0001' // 's → is / has / притяжательное
const AMB_D = '\u0002' // 'd → would / had
/** Десятичная точка, защищённая от чистки пунктуации: «3.5» не должно стать «3 5». */
const DECIMAL = '\u0003'

const AMBIGUOUS: Record<string, string[]> = {
  [AMB_S]: [' is', ' has', 's'],
  [AMB_D]: [' would', ' had'],
}

/**
 * Кириллица, неотличимая от латиницы. Ключ — кириллическая буква, значение —
 * латинская: складываем в одну сторону, обе стороны сверки идут через unify.
 *
 * ЗАЧЕМ. Эталон звука буквы ㅓ записан кириллической «о» («о (eo)»), а ученик
 * в поле ответа печатает ту, что под пальцем, — чаще латинскую. На экране это
 * один и тот же знак, в кодах — разные, и машина ставит «Неверно» за
 * невидимое. Отличить их ученик не может в принципе, поэтому спрашивать с него
 * нечего.
 *
 * ТОЛЬКО ПОЛНЫЕ БЛИЗНЕЦЫ. «к», «м», «т», «в», «н» на латиницу похожи, но в
 * строчном начертании отличаются: их складывать нельзя — иначе транскрипция
 * перестанет проверяться там, где как раз проверяется буква.
 */
const LOOKALIKES: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x',
}

/** Приведение письма: юникод, регистр, апострофы, кавычки, тире, ё, близнецы. */
function unify(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‛ʼ´`]/g, "'")
    .replace(/[“”«»„]/g, ' ')
    .replace(/[‐-―−]/g, '-')
    .replace(/ё/g, 'е')
    .replace(/[аеорсух]/g, ch => LOOKALIKES[ch])
    .replace(/(\d),(\d)/g, '$1$2')
    .replace(/(\d)\.(\d)/g, `$1${DECIMAL}$2`)
}

/**
 * Однозначные сокращения. Порядок важен: частные случаи (can't, let's) идут до
 * общих правил, иначе «can't» превратится в «ca not».
 */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\bain't\b/g, 'am not'],
  [/\blet's\b/g, 'let us'],
  [/\bi'm\b/g, 'i am'],
  [/\bo'clock\b/g, 'oclock'],
  [/\bgonna\b/g, 'going to'],
  [/\bwanna\b/g, 'want to'],
  [/\bgotta\b/g, 'got to'],
  [/\bgimme\b/g, 'give me'],
  [/\blemme\b/g, 'let me'],
  [/\bdunno\b/g, 'do not know'],
  [/'cause\b/g, 'because'],
  [/n't\b/g, ' not'],
  [/'ll\b/g, ' will'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'m\b/g, ' am'],
]

function markContractions(s: string): string {
  let out = s
  for (const [re, to] of CONTRACTIONS) out = out.replace(re, to)
  return out.replace(/'s\b/g, AMB_S).replace(/'d\b/g, AMB_D)
}

/** Раскрытие маркеров: одна строка → все допустимые прочтения. */
function branch(s: string): string[] {
  let out = [s]
  for (const marker of [AMB_S, AMB_D]) {
    if (!out.some(v => v.includes(marker))) continue
    const next: string[] = []
    for (const v of out) {
      if (!v.includes(marker)) { next.push(v); continue }
      for (const repl of AMBIGUOUS[marker]) next.push(v.split(marker).join(repl))
      if (next.length >= MAX_VARIANTS) return next.slice(0, MAX_VARIANTS)
    }
    out = next
  }
  return out
}

// ─── Числительные ────────────────────────────────────────────────────────────

const UNITS = new Map<string, number>([
  ['zero', 0], ['one', 1], ['two', 2], ['three', 3], ['four', 4],
  ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9],
])
const TEENS = new Map<string, number>([
  ['ten', 10], ['eleven', 11], ['twelve', 12], ['thirteen', 13], ['fourteen', 14],
  ['fifteen', 15], ['sixteen', 16], ['seventeen', 17], ['eighteen', 18], ['nineteen', 19],
])
const TENS = new Map<string, number>([
  ['twenty', 20], ['thirty', 30], ['forty', 40], ['fifty', 50],
  ['sixty', 60], ['seventy', 70], ['eighty', 80], ['ninety', 90],
])
const SCALES = new Map<string, number>([['thousand', 1000], ['million', 1000000]])
const ORDINALS = new Map<string, number>([
  ['first', 1], ['second', 2], ['third', 3], ['fourth', 4], ['fifth', 5],
  ['sixth', 6], ['seventh', 7], ['eighth', 8], ['ninth', 9], ['tenth', 10],
  ['eleventh', 11], ['twelfth', 12], ['thirteenth', 13], ['fourteenth', 14],
  ['fifteenth', 15], ['sixteenth', 16], ['seventeenth', 17], ['eighteenth', 18],
  ['nineteenth', 19], ['twentieth', 20], ['thirtieth', 30], ['fortieth', 40],
  ['fiftieth', 50], ['sixtieth', 60], ['seventieth', 70], ['eightieth', 80],
  ['ninetieth', 90], ['hundredth', 100], ['thousandth', 1000],
])

/**
 * Группа меньше тысячи: «two hundred and five», «twenty one», «nineteen».
 * Читается строго по грамматике — иначе «four and five» слиплось бы в «9», а
 * «four five» (диктовка цифр по одной) в «45».
 */
function readGroup(tokens: string[], start: number): { value: number, next: number } | null {
  let i = start
  let value = 0
  let moved = false
  const head = tokens[i]
  const headVal = head === undefined ? undefined : (UNITS.get(head) ?? TEENS.get(head))
  if (headVal !== undefined && tokens[i + 1] === 'hundred') {
    value += headVal * 100
    i += 2
    moved = true
    if (tokens[i] === 'and') i += 1
  }
  const t = tokens[i]
  const tens = t === undefined ? undefined : TENS.get(t)
  if (tens !== undefined) {
    value += tens
    i += 1
    moved = true
    const unit = tokens[i] === undefined ? undefined : UNITS.get(tokens[i])
    if (unit !== undefined && unit > 0) { value += unit; i += 1 }
  } else if (t !== undefined && TEENS.has(t)) {
    value += TEENS.get(t)!
    i += 1
    moved = true
  } else if (t !== undefined && UNITS.has(t)) {
    value += UNITS.get(t)!
    i += 1
    moved = true
  }
  return moved ? { value, next: i } : null
}

/** Полное число с масштабами: «two thousand nineteen». */
function readNumber(tokens: string[], start: number): { value: number, next: number } | null {
  let i = start
  let total = 0
  let seen = false
  for (;;) {
    const group = readGroup(tokens, i)
    if (!group) break
    const scale = SCALES.get(tokens[group.next] ?? '')
    if (scale !== undefined) {
      total += group.value * scale
      i = group.next + 1
      seen = true
      if (tokens[i] === 'and') i += 1
      continue
    }
    total += group.value
    i = group.next
    seen = true
    break
  }
  return seen ? { value: total, next: i } : null
}

/** Числительные словами → цифрами. Порядковые получают суффикс `o`: first → «1o». */
function foldNumbers(tokens: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < tokens.length;) {
    const tk = tokens[i]
    const ord = ORDINALS.get(tk)
    if (ord !== undefined) { out.push(`${ord}o`); i += 1; continue }
    const digitOrd = /^(\d+)(st|nd|rd|th)$/.exec(tk)
    if (digitOrd) { out.push(`${Number(digitOrd[1])}o`); i += 1; continue }
    const num = readNumber(tokens, i)
    if (num) { out.push(String(num.value)); i = num.next; continue }
    out.push(tk)
    i += 1
  }
  return out
}

// ─── Канонизация ─────────────────────────────────────────────────────────────

/** Письмо без пробелов между словами — кана, кандзи, хангыль. */
const SCRIPTLESS_SPACES = /[぀-ヿ㐀-䶿一-鿿가-힯]/

/** Один вариант написания → каноническая строка. */
function canonical(variant: string): string {
  const cleaned = variant
    .replace(new RegExp(`[^\\p{L}\\p{N}\\s${DECIMAL}]`, 'gu'), ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return ''
  return foldNumbers(cleaned.split(' ')).join(' ').split(DECIMAL).join('.')
}

/**
 * Все канонические формы строки. Пересечение наборов = один и тот же ответ.
 * Для письма без пробелов добавляется форма без пробелов вообще.
 */
export function answerForms(raw: string): string[] {
  if (!raw?.trim()) return []
  const base = markContractions(unify(raw))
  const forms = new Set<string>()
  for (const v of branch(base)) {
    const c = canonical(v)
    if (!c) continue
    forms.add(c)
    if (SCRIPTLESS_SPACES.test(c)) forms.add(c.replace(/\s+/g, ''))
    if (forms.size >= MAX_VARIANTS) break
  }
  return [...forms]
}

/**
 * Каноническая форма ответа — для показа, ключей и дедупликации.
 * Для сравнения зовите `sameAnswer`: у неоднозначных сокращений форм несколько,
 * и равенство одних только первых форм даст ложное «Неверно».
 */
export function normAnswer(s: string): string {
  return answerForms(s)[0] ?? ''
}

/** Один и тот же ответ? Пустая строка не равна ничему, включая пустую. */
export function sameAnswer(given: string | undefined | null, reference: string | undefined | null): boolean {
  if (!given?.trim() || !reference?.trim()) return false
  const got = answerForms(given)
  if (got.length === 0) return false
  const want = new Set(answerForms(reference))
  return got.some(v => want.has(v))
}

/** Совпал ли ответ с эталоном или с любым из альтернативных вариантов. */
export function matchesAnyAnswer(
  given: string | undefined | null,
  references: (string | undefined | null)[],
): boolean {
  if (!given?.trim()) return false
  const got = answerForms(given)
  if (got.length === 0) return false
  return references.some(ref => {
    if (!ref?.trim()) return false
    const want = new Set(answerForms(ref))
    return got.some(v => want.has(v))
  })
}
