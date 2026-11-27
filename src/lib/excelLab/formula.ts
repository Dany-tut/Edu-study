// Учебный вычислитель формул Excel (курс «Бухгалтерия», Искра).
//
// ЗАЧЕМ. Тренажёр функции и живой разбор формулы показывают, как Excel считает
// формулу, на маленькой таблице прямо в уроке. Имитировать Excel целиком мы не
// беремся: только учебное подмножество, которое нужно курсу, — и честно говорим
// «в учебном тренажёре этой функции нет» обо всём остальном.
//
// ЧТО УМЕЕТ. Русские имена функций и «;» между аргументами, числа с запятой,
// ссылки A1/$A$1/A:A/A1:B5 и на другие листы (Декрет!$A$2:$B$201,
// 'Лист 1'!A1), строки, ИСТИНА/ЛОЖЬ. Операторы + − * / ^ % & = <> < > <= >=.
// Функции — список FUNCTIONS ниже. Ошибки — как в Excel: #Н/Д, #ССЫЛКА!,
// #ЗНАЧ!, #ДЕЛ/0!, #ИМЯ?, #ЧИСЛО!.
//
// Модуль чистый: без React и без DOM, его же гоняет scripts/checkExcelLab.mjs.

export type XlScalar = number | string | boolean | null
/** Значение в данных курса: строка, начинающаяся с «=», — формула. */
export type XlValue = XlScalar
export type XlErrorCode = '#Н/Д' | '#ССЫЛКА!' | '#ЗНАЧ!' | '#ДЕЛ/0!' | '#ИМЯ?' | '#ЧИСЛО!' | '#ЦИКЛ!'
export interface XlError { err: XlErrorCode; why?: string; unsupported?: string }
export interface XlRange { kind: 'range'; sheet: string; c1: number; r1: number; c2: number; r2: number }
export type Val = XlScalar | XlError | XlRange

/** Лист: несмежные блоки данных, `at` — левый верхний угол блока. */
export interface XlSheet { name: string; blocks: { at: string; rows: XlValue[][] }[] }

export const isErr = (v: unknown): v is XlError => !!v && typeof v === 'object' && 'err' in (v as object)
const isRange = (v: unknown): v is XlRange => !!v && typeof v === 'object' && (v as XlRange).kind === 'range'
const err = (code: XlErrorCode, why?: string): XlError => ({ err: code, why })

const MAX_ROW = 1048576
const MAX_COL = 16384

// ─── Адреса ──────────────────────────────────────────────────────────────────

export function colToNum(s: string): number {
  let n = 0
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}
export function numToCol(n: number): string {
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}
export function addr(c: number, r: number): string { return numToCol(c) + r }

/** 'D14' → {c:4,r:14}. */
export function parseAddr(a: string): { c: number; r: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a.trim())
  return m ? { c: colToNum(m[1]), r: Number(m[2]) } : null
}

/** 'Декрет!$A$2:$B$6' / 'D2:D4' / 'A:A' / 'D14' → диапазон на листе (по умолчанию — `sheet`). */
export function parseRangeRef(ref: string, sheet: string): XlRange | null {
  let s = ref.trim(), sh = sheet
  const bang = s.lastIndexOf('!')
  if (bang > 0) { sh = s.slice(0, bang).replace(/^'(.*)'$/, '$1').replace(/''/g, "'"); s = s.slice(bang + 1) }
  s = s.replace(/\$/g, '')
  const col = /^([A-Za-z]{1,3}):([A-Za-z]{1,3})$/.exec(s)
  if (col) { const a = colToNum(col[1]), b = colToNum(col[2]); return { kind: 'range', sheet: sh, c1: Math.min(a, b), c2: Math.max(a, b), r1: 1, r2: MAX_ROW } }
  const [p, q] = s.split(':')
  const a = parseAddr(p), b = q ? parseAddr(q) : a
  if (!a || !b) return null
  return { kind: 'range', sheet: sh, c1: Math.min(a.c, b.c), c2: Math.max(a.c, b.c), r1: Math.min(a.r, b.r), r2: Math.max(a.r, b.r) }
}

// ─── Книга ───────────────────────────────────────────────────────────────────

export class Workbook {
  /** sheet → 'D14' → значение (формулы — строкой с «=»). */
  readonly cells = new Map<string, Map<string, XlValue>>()
  readonly order: string[] = []
  private memo = new Map<string, Val>()
  private busy = new Set<string>()

  constructor(sheets: XlSheet[]) {
    for (const sh of sheets) {
      const m = new Map<string, XlValue>()
      this.cells.set(sh.name, m); this.order.push(sh.name)
      for (const b of sh.blocks) {
        const o = parseAddr(b.at)
        if (!o) continue
        b.rows.forEach((row, i) => row.forEach((v, j) => { if (v !== null && v !== undefined && v !== '') m.set(addr(o.c + j, o.r + i), v) }))
      }
    }
  }

  get main(): string { return this.order[0] }

  clone(): Workbook {
    const w = new Workbook([])
    for (const n of this.order) { w.order.push(n); w.cells.set(n, new Map(this.cells.get(n))) }
    return w
  }

  /** Подменить значения: {'D14': 5, 'Декрет!A3': null}. Кэш сбрасывается. */
  set(patch: Record<string, XlValue>): this {
    for (const [k, v] of Object.entries(patch)) {
      const { sheet, a } = splitRef(k, this.main)
      const m = this.cells.get(sheet)
      if (!m) continue
      if (v === null || v === undefined || v === '') m.delete(a); else m.set(a, v)
    }
    this.memo.clear()
    return this
  }

  raw(sheet: string, a: string): XlValue { return this.cells.get(sheet)?.get(a) ?? null }

  /** Последняя занятая строка/столбец листа — граница для A:A. */
  bounds(sheet: string): { rows: number; cols: number } {
    let rows = 0, cols = 0
    for (const k of this.cells.get(sheet)?.keys() ?? []) { const p = parseAddr(k)!; rows = Math.max(rows, p.r); cols = Math.max(cols, p.c) }
    return { rows, cols }
  }

  /** Значение ячейки с вычисленной формулой. */
  value(sheet: string, a: string): Val {
    const key = sheet + '!' + a
    if (this.memo.has(key)) return this.memo.get(key)!
    const v = this.raw(sheet, a)
    if (typeof v !== 'string' || !v.startsWith('=')) return v
    if (this.busy.has(key)) return err('#ЦИКЛ!', 'Формула ссылается сама на себя')
    this.busy.add(key)
    let out: Val
    try { out = evaluate(v, this, sheet) } finally { this.busy.delete(key) }
    if (isRange(out)) out = err('#ЗНАЧ!', 'В ячейке получился диапазон, а нужно одно значение')
    this.memo.set(key, out)
    return out
  }

  /** 'H14' или 'Декрет!B3' — значение с учётом основного листа. */
  get(ref: string): Val { const { sheet, a } = splitRef(ref, this.main); return this.value(sheet, a) }
}

export function splitRef(ref: string, main: string): { sheet: string; a: string } {
  const bang = ref.lastIndexOf('!')
  const sheet = bang > 0 ? ref.slice(0, bang).replace(/^'(.*)'$/, '$1') : main
  return { sheet, a: ref.slice(bang + 1).replace(/\$/g, '').toUpperCase() }
}

/** Все адреса ячеек диапазонов списка: 'F14:G14' → ['F14','G14'] (с листом, если указан). */
export function expandRefs(refs: string[], main: string): string[] {
  const out: string[] = []
  for (const r of refs) {
    const rg = parseRangeRef(r, main)
    if (!rg || rg.r2 === MAX_ROW) continue
    for (let row = rg.r1; row <= rg.r2; row++) for (let c = rg.c1; c <= rg.c2; c++) out.push((rg.sheet === main ? '' : rg.sheet + '!') + addr(c, row))
  }
  return out
}

// ─── Лексер ──────────────────────────────────────────────────────────────────

export type TokKind = 'num' | 'str' | 'bool' | 'ref' | 'fn' | 'op' | 'lp' | 'rp' | 'sep' | 'err'
export interface Tok { k: TokKind; s: number; e: number; text: string; v?: string | number | boolean }

const REF_RE = /^(?:(?:'(?:[^']|'')+'|[A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё.]*)!)?(?:\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3})(?![\wА-Яа-яЁё(])/
const ERR_RE = /^(#Н\/Д|#ССЫЛКА!|#ЗНАЧ!|#ДЕЛ\/0!|#ИМЯ\?|#ЧИСЛО!|#N\/A|#REF!|#VALUE!|#DIV\/0!|#NAME\?)/i

export function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = src.startsWith('=') ? 1 : 0
  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }
    const rest = src.slice(i)
    if (ch === '"') {
      let j = i + 1, v = ''
      while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { v += '"'; j += 2; continue } break } v += src[j++] }
      out.push({ k: 'str', s: i, e: j + 1, text: src.slice(i, j + 1), v }); i = j + 1; continue
    }
    const em = ERR_RE.exec(rest)
    if (em) { out.push({ k: 'err', s: i, e: i + em[0].length, text: em[0] }); i += em[0].length; continue }
    const rm = REF_RE.exec(rest)
    if (rm) { out.push({ k: 'ref', s: i, e: i + rm[0].length, text: rm[0] }); i += rm[0].length; continue }
    const nm = /^\d+(?:,\d+)?(?:[eE][+-]?\d+)?/.exec(rest)
    if (nm) { out.push({ k: 'num', s: i, e: i + nm[0].length, text: nm[0], v: Number(nm[0].replace(',', '.')) }); i += nm[0].length; continue }
    const fm = /^([A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё.]*)\s*\(/.exec(rest)
    if (fm) { out.push({ k: 'fn', s: i, e: i + fm[0].length, text: fm[0], v: fm[1].toUpperCase().replace(/Ё/g, 'Е') }); i += fm[0].length; continue }
    const bm = /^(ИСТИНА|ЛОЖЬ|TRUE|FALSE)(?![\wА-Яа-яЁё])/i.exec(rest)
    if (bm) { const t = /^(ИСТИНА|TRUE)$/i.test(bm[1]); out.push({ k: 'bool', s: i, e: i + bm[0].length, text: bm[0], v: t }); i += bm[0].length; continue }
    const om = /^(<>|<=|>=|[-+*/^&=<>%:])/.exec(rest)
    if (om) { out.push({ k: 'op', s: i, e: i + om[0].length, text: om[0] }); i += om[0].length; continue }
    if (ch === '(') { out.push({ k: 'lp', s: i, e: i + 1, text: ch }); i++; continue }
    if (ch === ')') { out.push({ k: 'rp', s: i, e: i + 1, text: ch }); i++; continue }
    if (ch === ';') { out.push({ k: 'sep', s: i, e: i + 1, text: ch }); i++; continue }
    // Неизвестное слово без скобки: имя, которого Excel не знает.
    const wm = /^[A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё.]*/.exec(rest)
    if (wm) { out.push({ k: 'err', s: i, e: i + wm[0].length, text: wm[0], v: 'name' }); i += wm[0].length; continue }
    throw new FormulaSyntaxError(`Непонятный символ «${ch}»`, i)
  }
  return out
}

export class FormulaSyntaxError extends Error {
  constructor(message: string, readonly at: number) { super(message) }
}

// ─── Парсер ──────────────────────────────────────────────────────────────────

export type Node =
  | { t: 'num'; v: number; s: number; e: number }
  | { t: 'str'; v: string; s: number; e: number }
  | { t: 'bool'; v: boolean; s: number; e: number }
  | { t: 'errlit'; v: string; name?: boolean; s: number; e: number }
  | { t: 'ref'; ref: string; s: number; e: number }
  | { t: 'fn'; name: string; args: Node[]; s: number; e: number }
  | { t: 'bin'; op: string; l: Node; r: Node; s: number; e: number }
  | { t: 'neg'; x: Node; s: number; e: number }
  | { t: 'pct'; x: Node; s: number; e: number }

const PREC: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 }

export function parse(src: string): Node {
  const toks = tokenize(src)
  let p = 0
  const peek = () => toks[p]
  const fail = (m: string): never => { throw new FormulaSyntaxError(m, peek()?.s ?? src.length) }

  function primary(): Node {
    const t = toks[p]
    if (!t) return fail('Формула обрывается')
    if (t.k === 'op' && (t.text === '-' || t.text === '+')) { p++; const x = unary(); return t.text === '-' ? { t: 'neg', x, s: t.s, e: x.e } : x }
    p++
    switch (t.k) {
      case 'num': return { t: 'num', v: t.v as number, s: t.s, e: t.e }
      case 'str': return { t: 'str', v: t.v as string, s: t.s, e: t.e }
      case 'bool': return { t: 'bool', v: t.v as boolean, s: t.s, e: t.e }
      case 'err': return { t: 'errlit', v: t.text, name: t.v === 'name', s: t.s, e: t.e }
      case 'ref': return { t: 'ref', ref: t.text, s: t.s, e: t.e }
      case 'lp': { const x = expr(0); if (peek()?.k !== 'rp') fail('Не хватает закрывающей скобки'); p++; return { ...x, s: t.s, e: toks[p - 1].e } as Node }
      case 'fn': {
        const args: Node[] = []
        if (peek()?.k === 'rp') { p++; return { t: 'fn', name: t.v as string, args, s: t.s, e: toks[p - 1].e } }
        for (;;) {
          // Пустой аргумент: «ЕСЛИ(A1;;2)» — Excel считает его нулём/пустым.
          if (peek()?.k === 'sep' || peek()?.k === 'rp') args.push({ t: 'str', v: '', s: peek()!.s, e: peek()!.s })
          else args.push(expr(0))
          const n = peek()
          if (n?.k === 'sep') { p++; continue }
          if (n?.k === 'rp') { p++; break }
          if (n && n.k === 'op' && n.text === ',' ) fail('Аргументы в русском Excel разделяются «;», а не запятой')
          return fail(n ? `Ожидалась «;» или «)», а стоит «${n.text}»` : `Не хватает «)» у ${t.v}`)
        }
        return { t: 'fn', name: t.v as string, args, s: t.s, e: toks[p - 1].e }
      }
      default: return fail(`Лишний знак «${t.text}»`)
    }
  }
  function unary(): Node {
    let x = primary()
    while (peek()?.k === 'op' && peek()!.text === '%') { const t = toks[p++]; x = { t: 'pct', x, s: x.s, e: t.e } }
    return x
  }
  function expr(min: number): Node {
    let l = unary()
    for (;;) {
      const t = peek()
      if (!t || t.k !== 'op' || !(t.text in PREC)) break
      const pr = PREC[t.text]
      if (pr < min) break
      p++
      const r = expr(t.text === '^' ? pr : pr + 1)
      l = { t: 'bin', op: t.text, l, r, s: l.s, e: r.e }
    }
    return l
  }
  if (!toks.length) fail('Пустая формула')
  const n = expr(0)
  if (p < toks.length) fail(toks[p].k === 'rp' ? 'Лишняя закрывающая скобка' : `Лишнее «${toks[p].text}»`)
  return n
}

// ─── Приведение типов ────────────────────────────────────────────────────────

function toNum(v: Val): number | XlError {
  if (isErr(v)) return v
  if (isRange(v)) return err('#ЗНАЧ!', 'Нужно одно число, а стоит диапазон')
  if (v === null || v === '') return 0
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = parseNumText(v)
  return n === null ? err('#ЗНАЧ!', `«${v}» — текст, а не число`) : n
}
function parseNumText(s: string): number | null {
  const t = s.replace(/[\s\u00a0]/g, '').replace(',', '.')
  return t !== '' && /^[-+]?\d*\.?\d+(e[-+]?\d+)?%?$/i.test(t) ? (t.endsWith('%') ? Number(t.slice(0, -1)) / 100 : Number(t)) : null
}
function toBool(v: Val): boolean | XlError {
  if (isErr(v)) return v
  if (isRange(v)) return err('#ЗНАЧ!', 'Нужно одно значение, а стоит диапазон')
  if (typeof v === 'boolean') return v
  if (v === null || v === '') return false
  if (typeof v === 'number') return v !== 0
  if (/^(ИСТИНА|TRUE)$/i.test(v)) return true
  if (/^(ЛОЖЬ|FALSE)$/i.test(v)) return false
  return err('#ЗНАЧ!', `«${v}» — не ИСТИНА и не ЛОЖЬ`)
}
export function fmtNum(n: number): string {
  if (!isFinite(n)) return '#ЧИСЛО!'
  const r = Math.round(n * 1e10) / 1e10
  return String(r).replace('.', ',')
}
function toText(v: Val): string | XlError {
  if (isErr(v)) return v
  if (isRange(v)) return err('#ЗНАЧ!', 'Нужно одно значение, а стоит диапазон')
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'ИСТИНА' : 'ЛОЖЬ'
  if (typeof v === 'number') return fmtNum(v)
  return v
}

/** Сравнение по правилам Excel: числа < текст < логические, текст без учёта регистра. */
function cmp(a: XlScalar, b: XlScalar): number {
  const rank = (x: XlScalar) => typeof x === 'number' || x === null ? 0 : typeof x === 'string' ? 1 : 2
  if (a === null && typeof b === 'string') a = ''
  if (b === null && typeof a === 'string') b = ''
  if (a === null) a = typeof b === 'boolean' ? false : 0
  if (b === null) b = typeof a === 'boolean' ? false : 0
  const ra = rank(a), rb = rank(b)
  if (ra !== rb) return ra - rb
  if (typeof a === 'string') { const x = a.toLowerCase(), y = (b as string).toLowerCase(); return x < y ? -1 : x > y ? 1 : 0 }
  return (a as number) < (b as number) ? -1 : (a as number) > (b as number) ? 1 : 0
}

// ─── Диапазоны ───────────────────────────────────────────────────────────────

/** Ячейки диапазона построчно; для A:A — только до последней занятой строки. */
function cellsOf(wb: Workbook, r: XlRange): { vals: Val[]; rows: number; cols: number } | XlError {
  if (!wb.cells.has(r.sheet)) return err('#ССЫЛКА!', `Листа «${r.sheet}» нет`)
  const b = wb.bounds(r.sheet)
  const r2 = r.r2 === MAX_ROW ? Math.max(r.r1, b.rows) : r.r2
  const c2 = r.c2 === MAX_COL ? Math.max(r.c1, b.cols) : r.c2
  const vals: Val[] = []
  for (let row = r.r1; row <= r2; row++) for (let c = r.c1; c <= c2; c++) vals.push(wb.value(r.sheet, addr(c, row)))
  return { vals, rows: r2 - r.r1 + 1, cols: c2 - r.c1 + 1 }
}

/** Текст-маска Excel: * — любые символы, ? — один, ~* и ~? — сами знаки. */
function wildRe(pat: string): RegExp {
  const esc = pat.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/~\*/g, '\u0001').replace(/~\?/g, '\u0002')
    .replace(/\*/g, '.*').replace(/\?/g, '.')
    .replace(/\u0001/g, '\\*').replace(/\u0002/g, '\\?')
  return new RegExp('^' + esc + '$', 'i')
}

/** Условие СУММЕСЛИ/СЧЁТЕСЛИ: ">5", "<>0", "Альфа", "А*", 5. */
function criterion(c: Val): ((v: Val) => boolean) | XlError {
  if (isErr(c)) return c
  if (isRange(c)) return err('#ЗНАЧ!', 'Условие должно быть одним значением')
  if (typeof c === 'number' || typeof c === 'boolean') return v => !isErr(v) && !isRange(v) && v !== null && cmp(v, c) === 0 && typeof v === typeof c
  const s = c ?? ''
  const m = /^(<>|<=|>=|=|<|>)?([\s\S]*)$/.exec(s)!
  const op = m[1] ?? '=', rhsText = m[2]
  const rhsNum = parseNumText(rhsText)
  const wild = wildRe
  return (v: Val) => {
    if (isErr(v) || isRange(v)) return false
    if (rhsText === '' ) return op === '=' ? (v === null || v === '') : op === '<>' ? !(v === null || v === '') : false
    if (rhsNum !== null && typeof v === 'number') {
      const d = v - rhsNum
      return op === '=' ? d === 0 : op === '<>' ? d !== 0 : op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0
    }
    if (op === '=' || op === '<>') {
      const hit = typeof v === 'string' ? wild(rhsText).test(v) : (typeof v === 'boolean' ? (v ? 'ИСТИНА' : 'ЛОЖЬ').toLowerCase() === rhsText.toLowerCase() : false)
      return op === '=' ? hit : !hit
    }
    if (typeof v !== 'string' || rhsNum !== null) return false
    const d = cmp(v, rhsText)
    return op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0
  }
}

// ─── Вычисление ──────────────────────────────────────────────────────────────

type Ctx = { wb: Workbook; sheet: string; onFn?: (n: Extract<Node, { t: 'fn' }>, v: Val) => void }

function refVal(n: Extract<Node, { t: 'ref' }>, ctx: Ctx): Val {
  const r = parseRangeRef(n.ref, ctx.sheet)
  if (!r) return err('#ССЫЛКА!', `Непонятная ссылка ${n.ref}`)
  if (!ctx.wb.cells.has(r.sheet)) return err('#ССЫЛКА!', `Листа «${r.sheet}» в этом примере нет`)
  if (r.c1 === r.c2 && r.r1 === r.r2) return ctx.wb.value(r.sheet, addr(r.c1, r.r1))
  return r
}

/** Значение-скаляр (диапазон из одной ячейки → её значение). */
function scalar(v: Val, ctx: Ctx): Val {
  if (!isRange(v)) return v
  if (v.c1 === v.c2 && v.r1 === v.r2) return ctx.wb.value(v.sheet, addr(v.c1, v.r1))
  return err('#ЗНАЧ!', 'Здесь нужно одно значение, а стоит диапазон')
}

export const FUNCTIONS = ['СУММ', 'СУММЕСЛИ', 'СУММЕСЛИМН', 'СЧЁТЕСЛИ', 'СЧЁТЕСЛИМН', 'ЕСЛИ', 'И', 'ИЛИ', 'ЕСЛИОШИБКА', 'ВПР', 'ИНДЕКС', 'ПОИСКПОЗ', 'МАКС', 'МИН', 'ОКРУГЛ', 'ЕЧИСЛО'] as const
const norm = (n: string) => n.replace(/Ё/g, 'Е')

function nums(args: Val[], ctx: Ctx): number[] | XlError {
  const out: number[] = []
  for (const a of args) {
    if (isErr(a)) return a
    if (isRange(a)) {
      const c = cellsOf(ctx.wb, a); if (isErr(c)) return c
      for (const v of c.vals) { if (isErr(v)) return v; if (typeof v === 'number') out.push(v) }
    } else { const n = toNum(a); if (isErr(n)) return n; out.push(n) }
  }
  return out
}

function ifsCore(pairs: Val[], ctx: Ctx, base?: XlRange): { hits: boolean[]; rows: number; cols: number } | XlError {
  let size: { rows: number; cols: number } | null = null
  let hits: boolean[] | null = null
  for (let i = 0; i < pairs.length; i += 2) {
    const rg = pairs[i]
    if (!isRange(rg)) return err('#ЗНАЧ!', 'Диапазон условия должен быть ссылкой на ячейки')
    const c = cellsOf(ctx.wb, rg); if (isErr(c)) return c
    if (size && (c.rows !== size.rows || c.cols !== size.cols)) return err('#ЗНАЧ!', 'Диапазоны условий разного размера')
    size = { rows: c.rows, cols: c.cols }
    const f = criterion(scalar(pairs[i + 1], ctx)); if (isErr(f)) return f
    const h = c.vals.map(f)
    hits = hits ? hits.map((x, k) => x && h[k]) : h
  }
  if (base && size) {
    const c = cellsOf(ctx.wb, base); if (isErr(c)) return c
    if (c.rows !== size.rows || c.cols !== size.cols) return err('#ЗНАЧ!', 'Диапазон суммирования и диапазоны условий разного размера')
  }
  return { hits: hits ?? [], rows: size?.rows ?? 0, cols: size?.cols ?? 0 }
}

function lookupPos(key: XlScalar, list: Val[], mode: number): number | XlError {
  if (mode === 0) {
    const re = typeof key === 'string' ? wildRe(key) : null
    for (let i = 0; i < list.length; i++) {
      const v = list[i]
      if (isErr(v) || isRange(v) || v === null) continue
      if (re ? (typeof v === 'string' && re.test(v)) : (cmp(v, key) === 0 && typeof v === typeof key)) return i
    }
    return err('#Н/Д', 'Искомое значение не найдено')
  }
  // Приблизительный поиск, как в Excel: двоичный, предполагает сортировку по
  // возрастанию. На несортированных данных отвечает «странно» — так и задумано:
  // это и есть ошибка «ИСТИНА вместо ЛОЖЬ».
  let lo = 0, hi = list.length - 1, ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = list[mid]
    const c = isErr(v) || isRange(v) || v === null ? 1 : cmp(v, key)
    if (mode > 0 ? c <= 0 : c >= 0) { ans = mid; lo = mid + 1 } else hi = mid - 1
  }
  return ans < 0 ? err('#Н/Д', 'Нет значения меньше или равного искомому') : ans
}

function callFn(n: Extract<Node, { t: 'fn' }>, ctx: Ctx): Val {
  const name = norm(n.name)
  const A = (i: number) => ev(n.args[i], ctx)
  const argc = n.args.length
  const need = (lo: number, hi = lo) => argc < lo || argc > hi ? err('#ЗНАЧ!', `У ${n.name} ${lo === hi ? lo : `от ${lo} до ${hi}`} аргумент(а), а стоит ${argc}`) : null
  switch (name) {
    case 'СУММ': { const x = nums(n.args.map((_, i) => A(i)), ctx); return isErr(x) ? x : x.reduce((s, v) => s + v, 0) }
    case 'МАКС': { const x = nums(n.args.map((_, i) => A(i)), ctx); return isErr(x) ? x : x.length ? Math.max(...x) : 0 }
    case 'МИН': { const x = nums(n.args.map((_, i) => A(i)), ctx); return isErr(x) ? x : x.length ? Math.min(...x) : 0 }
    case 'ОКРУГЛ': {
      const bad = need(2); if (bad) return bad
      const x = toNum(scalar(A(0), ctx)), d = toNum(scalar(A(1), ctx))
      if (isErr(x)) return x; if (isErr(d)) return d
      const k = Math.pow(10, Math.trunc(d)); return Math.sign(x) * Math.round(Math.abs(x) * k + 1e-9) / k
    }
    case 'ЕЧИСЛО': { const bad = need(1); if (bad) return bad; return typeof scalar(A(0), ctx) === 'number' }
    case 'ЕСЛИ': {
      const bad = need(1, 3); if (bad) return bad
      const c = toBool(scalar(A(0), ctx)); if (isErr(c)) return c
      if (c) return argc > 1 ? scalar(A(1), ctx) : true
      return argc > 2 ? scalar(A(2), ctx) : false
    }
    case 'И': case 'ИЛИ': {
      const vals: boolean[] = []
      for (let i = 0; i < argc; i++) {
        const v = A(i)
        if (isRange(v)) { const c = cellsOf(ctx.wb, v); if (isErr(c)) return c; for (const x of c.vals) { if (isErr(x)) return x; if (typeof x === 'boolean') vals.push(x); else if (typeof x === 'number') vals.push(x !== 0) } }
        else { const b = toBool(v); if (isErr(b)) return b; vals.push(b) }
      }
      if (!vals.length) return err('#ЗНАЧ!', 'Нет ни одного логического значения')
      return name === 'И' ? vals.every(Boolean) : vals.some(Boolean)
    }
    case 'ЕСЛИОШИБКА': { const bad = need(2); if (bad) return bad; const v = scalar(A(0), ctx); return isErr(v) ? scalar(A(1), ctx) : v }
    case 'СУММЕСЛИ': {
      const bad = need(2, 3); if (bad) return bad
      const rg = A(0); if (!isRange(rg)) return isErr(rg) ? rg : err('#ЗНАЧ!', 'Первый аргумент СУММЕСЛИ — диапазон')
      const f = criterion(scalar(A(1), ctx)); if (isErr(f)) return f
      const c = cellsOf(ctx.wb, rg); if (isErr(c)) return c
      let sumR = rg
      if (argc > 2) { const s = A(2); if (!isRange(s)) return isErr(s) ? s : err('#ЗНАЧ!', 'Третий аргумент — диапазон'); sumR = { ...s, r2: s.r1 + c.rows - 1, c2: s.c1 + c.cols - 1 } }
      const sv = cellsOf(ctx.wb, sumR); if (isErr(sv)) return sv
      let total = 0
      for (let i = 0; i < c.vals.length; i++) if (f(c.vals[i])) { const v = sv.vals[i]; if (isErr(v)) return v; if (typeof v === 'number') total += v }
      return total
    }
    case 'СУММЕСЛИМН': {
      if (argc < 3 || argc % 2 === 0) return err('#ЗНАЧ!', 'СУММЕСЛИМН: диапазон суммирования и пары «диапазон; условие»')
      const base = A(0); if (!isRange(base)) return isErr(base) ? base : err('#ЗНАЧ!', 'Первый аргумент — диапазон суммирования')
      const r = ifsCore(n.args.slice(1).map((_, i) => A(i + 1)), ctx, base); if (isErr(r)) return r
      const sv = cellsOf(ctx.wb, base); if (isErr(sv)) return sv
      let total = 0
      r.hits.forEach((h, i) => { if (h && typeof sv.vals[i] === 'number') total += sv.vals[i] as number })
      for (let i = 0; i < r.hits.length; i++) if (r.hits[i] && isErr(sv.vals[i])) return sv.vals[i]
      return total
    }
    case 'СЧЕТЕСЛИ': {
      const bad = need(2); if (bad) return bad
      const r = ifsCore([A(0), A(1)], ctx); return isErr(r) ? r : r.hits.filter(Boolean).length
    }
    case 'СЧЕТЕСЛИМН': {
      if (argc < 2 || argc % 2) return err('#ЗНАЧ!', 'СЧЁТЕСЛИМН: пары «диапазон; условие»')
      const r = ifsCore(n.args.map((_, i) => A(i)), ctx); return isErr(r) ? r : r.hits.filter(Boolean).length
    }
    case 'ВПР': {
      const bad = need(3, 4); if (bad) return bad
      const key = scalar(A(0), ctx); if (isErr(key)) return key
      const tb = A(1); if (!isRange(tb)) return isErr(tb) ? tb : err('#ЗНАЧ!', 'Второй аргумент ВПР — таблица')
      const col = toNum(scalar(A(2), ctx)); if (isErr(col)) return col
      let mode = 1
      if (argc > 3) { const m = toBool(scalar(A(3), ctx)); if (isErr(m)) return m; mode = m ? 1 : 0 }
      const width = tb.c2 === MAX_COL ? MAX_COL : tb.c2 - tb.c1 + 1
      if (col < 1) return err('#ЗНАЧ!', 'Номер столбца меньше 1')
      if (col > width) return err('#ССЫЛКА!', `В таблице ${width} столб${width === 1 ? 'ец' : 'ца'}, а нужен ${Math.trunc(col)}-й`)
      const first = cellsOf(ctx.wb, { ...tb, c2: tb.c1 }); if (isErr(first)) return first
      const pos = lookupPos(key as XlScalar, first.vals, mode); if (isErr(pos)) return pos
      return ctx.wb.value(tb.sheet, addr(tb.c1 + Math.trunc(col) - 1, tb.r1 + pos))
    }
    case 'ПОИСКПОЗ': {
      const bad = need(2, 3); if (bad) return bad
      const key = scalar(A(0), ctx); if (isErr(key)) return key
      const rg = A(1); if (!isRange(rg)) return isErr(rg) ? rg : err('#Н/Д', 'Второй аргумент ПОИСКПОЗ — строка или столбец')
      if (rg.r1 !== rg.r2 && rg.c1 !== rg.c2) return err('#Н/Д', 'ПОИСКПОЗ ищет в одной строке или одном столбце')
      let mode = 1
      if (argc > 2) { const m = toNum(scalar(A(2), ctx)); if (isErr(m)) return m; mode = Math.sign(m) }
      const c = cellsOf(ctx.wb, rg); if (isErr(c)) return c
      const pos = lookupPos(key as XlScalar, c.vals, mode); return isErr(pos) ? pos : pos + 1
    }
    case 'ИНДЕКС': {
      const bad = need(2, 3); if (bad) return bad
      const rg = A(0); if (!isRange(rg)) return isErr(rg) ? rg : err('#ЗНАЧ!', 'Первый аргумент ИНДЕКС — диапазон')
      const a = toNum(scalar(A(1), ctx)); if (isErr(a)) return a
      const b = argc > 2 ? toNum(scalar(A(2), ctx)) : 0; if (isErr(b)) return b
      const oneRow = rg.r1 === rg.r2
      let row = Math.trunc(a), col = Math.trunc(b)
      if (argc === 2 && oneRow) { col = row; row = 1 }
      if (row < 0 || col < 0) return err('#ЗНАЧ!', 'Номер строки или столбца отрицательный')
      const h = rg.r2 - rg.r1 + 1, w = rg.c2 - rg.c1 + 1
      if (row > h || col > w) return err('#ССЫЛКА!', 'Номер строки или столбца за пределами диапазона')
      if (row === 0 || (col === 0 && w > 1)) return err('#ЗНАЧ!', 'Учебный тренажёр не возвращает целую строку или столбец')
      return ctx.wb.value(rg.sheet, addr(rg.c1 + Math.max(col, 1) - 1, rg.r1 + row - 1))
    }
  }
  return { err: '#ИМЯ?', why: `В учебном тренажёре этой функции нет: ${n.name}`, unsupported: n.name }
}

function ev(n: Node, ctx: Ctx): Val {
  switch (n.t) {
    case 'num': return n.v
    case 'str': return n.v
    case 'bool': return n.v
    case 'errlit': return n.name ? { err: '#ИМЯ?', why: `Excel не знает имени «${n.v}» — может быть, это текст без кавычек?` } : err(normErr(n.v))
    case 'ref': return refVal(n, ctx)
    case 'neg': { const x = toNum(scalar(ev(n.x, ctx), ctx)); return isErr(x) ? x : -x }
    case 'pct': { const x = toNum(scalar(ev(n.x, ctx), ctx)); return isErr(x) ? x : x / 100 }
    case 'fn': { const v = callFn(n, ctx); ctx.onFn?.(n, v); return v }
    case 'bin': {
      if (n.op === ':') return err('#ЗНАЧ!')
      const l = scalar(ev(n.l, ctx), ctx), r = scalar(ev(n.r, ctx), ctx)
      if (isErr(l)) return l
      if (isErr(r)) return r
      if (n.op === '&') { const a = toText(l), b = toText(r); if (isErr(a)) return a; if (isErr(b)) return b; return a + b }
      if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) {
        const c = cmp(l as XlScalar, r as XlScalar)
        return n.op === '=' ? c === 0 : n.op === '<>' ? c !== 0 : n.op === '<' ? c < 0 : n.op === '>' ? c > 0 : n.op === '<=' ? c <= 0 : c >= 0
      }
      const a = toNum(l), b = toNum(r)
      if (isErr(a)) return a
      if (isErr(b)) return b
      switch (n.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/': return b === 0 ? err('#ДЕЛ/0!', 'Деление на ноль') : a / b
        case '^': return Math.pow(a, b)
      }
      return err('#ЗНАЧ!')
    }
  }
}
function normErr(s: string): XlErrorCode {
  const u = s.toUpperCase()
  return u === '#N/A' ? '#Н/Д' : u === '#REF!' ? '#ССЫЛКА!' : u === '#VALUE!' ? '#ЗНАЧ!' : u === '#DIV/0!' ? '#ДЕЛ/0!' : u === '#NAME?' ? '#ИМЯ?' : (u as XlErrorCode)
}

/** Посчитать формулу так, будто она стоит на листе `sheet`. Синтаксическая ошибка — исключение FormulaSyntaxError. */
export function evaluate(formula: string, wb: Workbook, sheet = wb.main): Val {
  return ev(parse(formula), { wb, sheet })
}

/** Шаги «Вычислить формулу»: каждая функция по порядку вычисления (самая вложенная — первой). */
export function traceSteps(formula: string, wb: Workbook, sheet = wb.main): { expr: string; value: Val; s: number; e: number }[] {
  const steps: { expr: string; value: Val; s: number; e: number }[] = []
  const src = formula.startsWith('=') ? formula : '=' + formula
  ev(parse(src), { wb, sheet, onFn: (n, v) => steps.push({ expr: src.slice(n.s, n.e), value: v, s: n.s, e: n.e }) })
  return steps
}

/** Показ значения как в ячейке: 45 000, ИСТИНА, #Н/Д, пусто. */
export function display(v: Val): string {
  if (v === null || v === undefined) return ''
  if (isErr(v)) return v.err
  if (isRange(v)) return '#ЗНАЧ!'
  if (typeof v === 'boolean') return v ? 'ИСТИНА' : 'ЛОЖЬ'
  if (typeof v === 'number') {
    if (!isFinite(v)) return '#ЧИСЛО!'
    const r = Math.round(v * 1e10) / 1e10
    const [i, f] = String(Math.abs(r)).split('.')
    const g = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') : i
    return (r < 0 ? '−' : '') + g + (f ? ',' + f : '')
  }
  return v
}

/** Совпадают ли два результата (для проверки «исправь формулу»). */
export function sameVal(a: Val, b: Val): boolean {
  if (isErr(a) || isErr(b)) return isErr(a) && isErr(b) && a.err === b.err
  if (isRange(a) || isRange(b)) return false
  if ((a === null || a === '') && (b === null || b === '')) return true
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9
  if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase()
  return a === b
}

/** Формула, «протянутая» на dr строк и dc столбцов: относительные ссылки сдвигаются, $ — нет. */
export function shiftFormula(formula: string, dr: number, dc: number): string {
  let toks: Tok[]
  try { toks = tokenize(formula) } catch { return formula }
  let out = '', last = 0
  for (const t of toks) {
    if (t.k !== 'ref') continue
    out += formula.slice(last, t.s)
    const bang = t.text.lastIndexOf('!')
    const pre = bang >= 0 ? t.text.slice(0, bang + 1) : ''
    const body = t.text.slice(bang + 1)
    out += pre + body.split(':').map(part => {
      const m = /^(\$?)([A-Za-z]{1,3})(?:(\$?)(\d+))?$/.exec(part)
      if (!m) return part
      const c = m[1] ? m[2] : numToCol(Math.max(1, colToNum(m[2]) + dc))
      if (m[4] === undefined) return m[1] + c
      const r = m[3] ? m[4] : String(Math.max(1, Number(m[4]) + dr))
      return m[1] + c + m[3] + r
    }).join(':')
    last = t.e
  }
  return out + formula.slice(last)
}

/** Ссылки формулы (для подсветки ячеек): ['$D$2:$D$4', 'D2', …]. */
export function refsIn(formula: string): string[] {
  try { return tokenize(formula).filter(t => t.k === 'ref').map(t => t.text) } catch { return [] }
}

/** Функции формулы, которых нет в учебном вычислителе. */
export function unsupportedIn(formula: string): string[] {
  try {
    const known = new Set(FUNCTIONS.map(norm))
    return [...new Set(tokenize(formula).filter(t => t.k === 'fn').map(t => String(t.v)).filter(n => !known.has(norm(n))))]
  } catch { return [] }
}
