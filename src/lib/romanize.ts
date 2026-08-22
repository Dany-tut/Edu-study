// ─────────────────────────────────────────────────────────────────────────────
// Романизация корейского по официальной системе (Revised Romanization)
//
// ЗАЧЕМ, ЕСЛИ ЕСТЬ translit.ts. Тот считает транскрипцию РУССКИМИ буквами — она
// нужна там, где ученик читает подсказку глазами по-русски. Романизация — это
// другое: латиница, принятая в самой Корее (указатели, паспорта, учебники),
// и именно её ждут в поле `reading` карточки. Написать её русскими буквами
// нельзя, а держать в двух файлах два разных набора правил стыка — верный
// способ получить два разных произношения одного слова.
//
// ГЛАВНОЕ: РОМАНИЗИРУЕТСЯ ЗВУЧАНИЕ, А НЕ НАПИСАНИЕ. 좋다 — это jota, а не johda;
// 착하다 — chakada; 정리 — jeongni. Транскрипция, снятая с букв, учит ровно той
// ошибке, ради исправления которой её и показывают. Поэтому здесь применяются
// правила стыка: перенос финали на пустую ㅇ, придыхание с ㅎ, назализация
// смычных перед носовыми, ассимиляция ㄹ.
//
// ЧЕГО ЗДЕСЬ НЕТ. Напряжение (된소리) не обозначается — так и требует
// официальная система: 학교 романизируется hakgyo, а не hakkyo. Не разбираются
// и стыки на границе СЛОВ (пробел закрывает слово, через него ничего не
// переносится) — как раз это и нужно: слова в словаре стоят порознь.
//
// ГРАНИЦА ПРИМЕНИМОСТИ. Есть слова, где произношение не выводится из букв
// вообще (составные вроде 맛없다 [마덥따], имена собственные с устоявшейся
// латиницей). Их пишут руками; функция даёт правильный ответ для подавляющего
// большинства словарных форм, а не для всех без исключения.
// ─────────────────────────────────────────────────────────────────────────────

const KO_START = 0xac00
const KO_END = 0xd7a3

/** Начальные согласные (초성) в порядке кодировки — как имена, а не как звуки. */
const LEAD = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', 'ieung', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'] as const

/** Гласные (중성) — здесь буква и звук совпадают, стыки на них не влияют. */
const VOWEL = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']

/** Конечные согласные (종성) в порядке кодировки; '' — слог без 받침. */
const TAIL = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h']

/**
 * Как финаль звучит перед паузой или согласной.
 *
 * Это и есть нейтрализация: внизу слога может стоять почти любая буква, но
 * различимых звуков всего семь. 낮, 낫 и 낯 звучат одинаково — [нат].
 */
const TAIL_SOUND: Record<string, string> = {
  '': '', g: 'k', kk: 'k', gs: 'k', n: 'n', nj: 'n', nh: 'n', d: 't', l: 'l',
  lg: 'k', lm: 'm', lb: 'l', ls: 'l', lt: 'l', lp: 'p', lh: 'l', m: 'm',
  b: 'p', bs: 'p', s: 't', ss: 't', ng: 'ng', j: 't', ch: 't', k: 'k', t: 't', p: 'p', h: 't',
}

/** Сложная финаль: первая половина остаётся, вторая переезжает на пустую ㅇ. */
const TAIL_SPLIT: Record<string, [string, string]> = {
  gs: ['g', 's'], nj: ['n', 'j'], nh: ['n', 'h'], lg: ['l', 'g'], lm: ['l', 'm'],
  lb: ['l', 'b'], ls: ['l', 's'], lt: ['l', 't'], lp: ['l', 'p'], lh: ['l', 'h'], bs: ['b', 's'],
}

/** Звук начальной согласной. Пустышка ㅇ не звучит вовсе. */
const LEAD_SOUND: Record<string, string> = {
  g: 'g', kk: 'kk', n: 'n', d: 'd', tt: 'tt', r: 'r', m: 'm', b: 'b', pp: 'pp',
  s: 's', ss: 'ss', ieung: '', j: 'j', jj: 'jj', ch: 'ch', k: 'k', t: 't', p: 'p', h: 'h',
}

/** Что даёт согласная в паре с ㅎ. */
const ASPIRATED: Record<string, string> = { g: 'k', d: 't', b: 'p', j: 'ch' }

interface Syl { lead: string; vowel: string; tail: string }

function decompose(code: number): Syl {
  const i = code - KO_START
  return { lead: LEAD[Math.floor(i / 588)], vowel: VOWEL[Math.floor((i % 588) / 28)], tail: TAIL[i % 28] }
}

/**
 * Романизация одного слова — слоги уже разобраны, стыки применяются по порядку.
 *
 * Порядок правил не произвольный: перенос на пустую ㅇ должен случиться раньше
 * нейтрализации (иначе 있어 дало бы iteo вместо isseo), а придыхание с ㅎ —
 * раньше назализации (иначе 좋다 прошло бы через [тон]).
 */
function romanizeWord(codes: number[]): string {
  const s = codes.map(decompose)

  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]
    const b = s[i + 1]
    if (!a.tail) continue

    // 1. Финаль переезжает на пустую ㅇ и звучит своим полным звуком.
    if (b.lead === 'ieung') {
      if (a.tail === 'lh') {
        // ㅎ в сложной финали перед гласной просто пропадает, а ㄹ становится r:
        // 싫어하다 — sireohada, а не silheohada.
        a.tail = ''
        b.lead = 'r_moved'
      } else if (TAIL_SPLIT[a.tail]) {
        const [keep, move] = TAIL_SPLIT[a.tail]
        a.tail = keep
        b.lead = move === 'h' ? 'ieung' : move
      } else if (a.tail === 'ng') {
        // Носовая никуда не переезжает: 강아지 — gangaji.
      } else if (a.tail === 'h') {
        a.tail = ''
      } else {
        b.lead = a.tail === 'l' ? 'r_moved' : a.tail
        a.tail = ''
      }
      continue
    }

    // 2. ㅎ внизу слога отдаёт придыхание следующей согласной: 좋다 — jota.
    if (a.tail === 'h' || a.tail === 'nh' || a.tail === 'lh') {
      const asp = ASPIRATED[b.lead]
      a.tail = a.tail === 'nh' ? 'n' : a.tail === 'lh' ? 'l' : ''
      if (asp) { b.lead = asp; continue }
      if (b.lead === 's') { b.lead = 'ss'; continue }
      if (b.lead === 'n' && a.tail === '') a.tail = 'n'
      continue
    }

    const base = TAIL_SOUND[a.tail] ?? a.tail

    // 3. ㅎ в начале слога забирает придыхание у соседней финали: 착하다 — chakada.
    if (b.lead === 'h') {
      if (base === 'k') { a.tail = ''; b.lead = 'k'; continue }
      if (base === 't') { a.tail = ''; b.lead = 't'; continue }
      if (base === 'p') { a.tail = ''; b.lead = 'p'; continue }
      if (a.tail === 'j') { a.tail = ''; b.lead = 'ch'; continue }
      continue
    }

    // 4. Смычная перед носовой сама становится носовой: 끝나다 — kkeunnada.
    if (b.lead === 'n' || b.lead === 'm') {
      if (base === 'k') { a.tail = 'ng'; continue }
      if (base === 't') { a.tail = 'n'; continue }
      if (base === 'p') { a.tail = 'm'; continue }
    }

    // 5. ㄹ рядом с другой согласной: 정리 — jeongni, 신라 — silla.
    if (b.lead === 'r') {
      if (base === 'n') { a.tail = 'l'; b.lead = 'l_moved'; continue }
      if (base === 'l') { b.lead = 'l_moved'; continue }
      if (base === 'm' || base === 'ng') { b.lead = 'n'; continue }
      if (base === 'k') { a.tail = 'ng'; b.lead = 'n'; continue }
      if (base === 'p') { a.tail = 'm'; b.lead = 'n'; continue }
    }
  }

  return s.map(x => {
    const lead = x.lead === 'r_moved' ? 'r' : x.lead === 'l_moved' ? 'l' : (LEAD_SOUND[x.lead] ?? x.lead)
    const tail = TAIL_SOUND[x.tail] ?? x.tail
    return lead + x.vowel + tail
  }).join('')
}

/**
 * Романизация корейского текста. Не хангыль (пробелы, знаки, латиница)
 * переносится как есть — он же и закрывает слово.
 */
export function romanize(text: string): string {
  let out = ''
  let word: number[] = []
  const flush = () => { if (word.length) { out += romanizeWord(word); word = [] } }
  for (const ch of text) {
    const c = ch.charCodeAt(0)
    if (c >= KO_START && c <= KO_END) { word.push(c); continue }
    flush()
    out += ch
  }
  flush()
  return out
}
