// Данные Excel-лаборатории курса «Бухгалтерия»: разбор формулы, тренажёр,
// способы решения. Всё задаётся содержанием курса; компоненты экрана ничего не
// знают о конкретных уроках. Формат описан в docs/courses/accounting/excel-lab.md.
//
// Модуль лёгкий (только проверка ответа), его тянет реестр типов заданий.

import { Workbook, evaluate, expandRefs, sameVal, shiftFormula, splitRef, parseAddr, FormulaSyntaxError, isErr, type XlSheet, type XlValue, type Val } from './formula'

export type { XlSheet, XlValue } from './formula'

// ─── Разбор формулы (блок конспекта) ─────────────────────────────────────────

/** Кусок формулы ровно как в ячейке; куски подряд дают всю формулу (как в accFigures.formulaFig). */
export interface FormulaPart {
  text: string
  /** Что это за часть. Пусто — служебный кусок (скобки, «;»). */
  label?: string
  /** Что подсветить в мини-таблице, когда выбрана эта часть: 'E2', 'A:A', 'Декрет!A2:B6'. */
  refs?: string[]
}
export type FormulaStep = [expr: string, result: string] | [expr: string, result: string, refs: string[]]

export interface FormulaSpec {
  kind: 'formula'
  title: string
  parts: FormulaPart[]
  steps?: FormulaStep[]
  note?: string
  /** Мини-таблица примера. */
  sample?: XlSheet | XlSheet[]
  /** Подписи столбцов: 'A' → 'Код' (если заголовков нет в данных). */
  headers?: Record<string, string>
}

// ─── Тренажёр ────────────────────────────────────────────────────────────────

export interface TrainerGoal { text: string; cell: string; equals: XlValue }
export interface TrainerFix {
  /** Где стоит формула. */
  cell: string
  /** Ошибочная формула — её видит и правит ученик. */
  broken: string
  /** Эталон — ученику не показывается. */
  answer: string
  /** Куда формулу «протянули» — так видна забытая $. */
  fill?: string[]
  /** 2–3 скрытых набора подмен ячеек. */
  datasets: Record<string, XlValue>[]
  hints?: string[]
  /** Разбор после ответа: в чём была ошибка. */
  mistake?: string
}
export interface TrainerSpec {
  kind?: 'trainer'
  title?: string
  /** Первый лист — основной; остальные показываются вкладками. */
  sheets: XlSheet[]
  /** Что ученик может менять: 'D14', 'F14:G14', 'Декрет!A2:A6'. */
  editable: string[]
  /** Результаты крупно, с «было → стало». */
  watch?: string[]
  /** Подписи столбцов: 'D' → 'Штат', 'Декрет!A' → 'Таб. №'. */
  headers?: Record<string, string>
  goals?: TrainerGoal[]
  fix?: TrainerFix
}

/** Ответ ученика (строка JSON в answers): правки ячеек и формула режима «исправь». */
export interface TrainerAnswer { cells?: Record<string, XlValue>; formula?: string; hints?: number }

export function parseTrainerAnswer(raw: string | undefined | null): TrainerAnswer {
  if (!raw) return {}
  try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v as TrainerAnswer : {} } catch { return {} }
}

export function trainerGradable(spec: TrainerSpec | undefined | null): spec is TrainerSpec {
  return !!spec && Array.isArray(spec.sheets) && spec.sheets.length > 0 && (!!spec.fix?.answer || !!spec.goals?.length)
}

export function trainerBook(spec: TrainerSpec, patch?: Record<string, XlValue>): Workbook {
  const wb = new Workbook(spec.sheets)
  if (patch) wb.set(patch)
  return wb
}

/** Можно ли ученику менять эту ячейку. */
export function editableSet(spec: TrainerSpec): Set<string> {
  const main = spec.sheets[0].name
  return new Set(expandRefs(spec.editable ?? [], main).map(r => { const { sheet, a } = splitRef(r, main); return sheet + '!' + a }))
}

/** Ячейки, куда встаёт формула ученика: сама и «протянутые». */
export function fixTargets(fix: TrainerFix): string[] { return [fix.cell, ...(fix.fill ?? [])] }

/** Поставить формулу в ячейку и протянуть её в fill со сдвигом ссылок. */
export function placeFormula(wb: Workbook, fix: TrainerFix, formula: string): void {
  const main = wb.main
  const base = splitRef(fix.cell, main)
  const o = parseAddr(base.a)!
  const patch: Record<string, XlValue> = {}
  for (const t of fixTargets(fix)) {
    const { sheet, a } = splitRef(t, main)
    const p = parseAddr(a)!
    patch[(sheet === main ? '' : sheet + '!') + a] = shiftFormula(formula, p.r - o.r, p.c - o.c)
  }
  wb.set(patch)
}

export interface FixRun { dataset: number; cell: string; got: Val; want: Val; ok: boolean }
export interface FixResult { correct: boolean; syntax?: string; runs: FixRun[] }

/** Проверка «исправь формулу»: результат на видимых данных и на каждом скрытом наборе. */
export function checkFix(spec: TrainerSpec, formula: string): FixResult {
  const fix = spec.fix
  if (!fix) return { correct: false, runs: [] }
  const f = formula.trim().startsWith('=') ? formula.trim() : '=' + formula.trim()
  try { evaluate(f, trainerBook(spec)) } catch (e) {
    return { correct: false, syntax: e instanceof FormulaSyntaxError ? e.message : 'Формула не разбирается', runs: [] }
  }
  const runs: FixRun[] = []
  const sets: Record<string, XlValue>[] = [{}, ...(fix.datasets ?? [])]
  sets.forEach((patch, i) => {
    const mine = trainerBook(spec, patch), ref = trainerBook(spec, patch)
    placeFormula(mine, fix, f); placeFormula(ref, fix, fix.answer)
    for (const c of fixTargets(fix)) {
      const got = mine.get(c), want = ref.get(c)
      runs.push({ dataset: i, cell: c, got, want, ok: sameVal(got, want) && !(isErr(got) && got.unsupported) })
    }
  })
  return { correct: runs.length > 0 && runs.every(r => r.ok), runs }
}

/** Мини-задания «меняйте значения»: какие выполнены при правках ученика. */
export function goalsMet(spec: TrainerSpec, cells: Record<string, XlValue> | undefined): boolean[] {
  const wb = trainerBook(spec, cells)
  return (spec.goals ?? []).map(g => sameVal(wb.get(g.cell), g.equals))
}

/** Итог задания: «исправь» — по проверке формулы; иначе — все мини-задания. */
export function trainerCorrect(spec: TrainerSpec, raw: string | undefined | null): boolean {
  const a = parseTrainerAnswer(raw)
  if (spec.fix?.answer) return !!a.formula && checkFix(spec, a.formula).correct
  const met = goalsMet(spec, a.cells)
  return met.length > 0 && met.every(Boolean)
}

/** Есть ли в ответе хоть что-то, кроме нетронутой задачи. */
export function trainerAnswered(spec: TrainerSpec, raw: string | undefined | null): boolean {
  const a = parseTrainerAnswer(raw)
  if (spec.fix?.answer) return !!a.formula?.trim()
  return !!a.cells && Object.keys(a.cells).length > 0
}

// ─── Способы решения (версия Excel) ──────────────────────────────────────────

export type MethodId = 'simple' | 'formulas' | 'powerQuery' | 'vba' | 'modern'
export interface MethodSpec {
  id: MethodId
  title?: string
  /** id из EXCEL_FEATURES (src/data/accounting/excelCompat.ts): 'power-query', 'xlookup', 'filter', 'vba'. */
  requires?: string[]
  steps: string[]
  formula?: string
}
export interface MethodsSpec {
  kind: 'methods'
  title?: string
  /** automation — регулярная задача (Power Query по умолчанию), oneoff — разовый расчёт (формулы). */
  task: 'automation' | 'oneoff'
  methods: MethodSpec[]
}

export type LabSpec = FormulaSpec | (TrainerSpec & { kind: 'trainer' }) | MethodsSpec
