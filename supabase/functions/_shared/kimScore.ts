// Балл за задание с развёрнутым ответом по правилу атласа КИМ.
//
// ОДИН ФАЙЛ НА ДВЕ СТОРОНЫ. Его зовут и функция hw-grade (предложение модели),
// и экран проверки (учитель переключил элемент — балл пересчитался тут же).
// Если бы счёт жил в двух местах, учитель видел бы один балл, а в базу ложился
// другой. Поэтому здесь нет ни Deno, ни браузера — только данные.
//
// БАЛЛ СЧИТАЕТ КОД, А НЕ МОДЕЛЬ (правило П3 ХимБио). Модель отвечает про
// каждый элемент: есть / нет / частично и цитата из работы. Засчитан элемент
// только при «есть» И непустой цитате; «частично» не засчитывается, а
// подсвечивается учителю — решать ему.
//
// ПРЕДМЕТОВ ЗДЕСЬ НЕТ. Правило — это вид счёта (sum / ladder / groups) и числа
// из атласа; какой экзамен и какой предмет, знает только строка kim_atlas.

export type KimElement = { id: string; label?: string; text: string; points?: number }
export type KimStep = { points: number; min: number; require?: string[] }
export type KimRule =
  | { kind: 'sum' }
  | { kind: 'ladder'; steps: KimStep[] }
  | { kind: 'groups'; groups: { label: string; ids: string[]; steps: KimStep[] }[] }
export type KimGate = { unless: string; void: string[]; from?: string }
export type KimDeduction = { id: string; text: string; points: number }

/** Строка таблицы kim_atlas. */
export type KimItem = {
  exam: string
  year: number
  n: number
  part: number
  max_points: number
  answer_type: string | null
  scoring_text: string | null
  rule: KimRule | null
  elements: KimElement[] | null
  element_count: number | null
  gates: KimGate[]
  deductions: KimDeduction[]
  teacher_notes: string[]
  source_ref: string | null
}

export type KimVerdict = 'yes' | 'no' | 'partial'
export type ElementMark = { id: string; verdict: KimVerdict; quote: string }
export type DeductionMark = { id: string; found: boolean; quote: string }

/** Засчитан ли элемент сам по себе: «есть» и есть чем это доказать. */
export const markCounts = (m?: ElementMark | null): boolean =>
  !!m && m.verdict === 'yes' && m.quote.trim().length > 0

function stepPoints(steps: KimStep[], ids: string[], ok: Set<string>): number {
  const count = ids.filter(id => ok.has(id)).length
  for (const s of steps) {
    if (count >= s.min && (s.require ?? []).every(r => ok.has(r))) return s.points
  }
  return 0
}

export type KimScore = {
  points: number
  /** id засчитанных элементов (после «ворот»). */
  counted: string[]
  /** id элементов, снятых «воротами» (например, баланс без верного уравнения). */
  voided: string[]
  groups: { label: string; points: number }[]
  deducted: number
}

/**
 * Балл по правилу. `elementIds` — элементы этого задания по порядку: у кого
 * элементы общие — из атласа, у кого только число — из эталона задания.
 */
export function kimScore(
  item: Pick<KimItem, 'rule' | 'max_points' | 'gates' | 'deductions'>,
  elementIds: string[],
  marks: ElementMark[],
  deductionMarks: DeductionMark[] = [],
  pointsOf: (id: string) => number = () => 1,
): KimScore {
  const byId = new Map(marks.map(m => [m.id, m]))
  const ok = new Set(elementIds.filter(id => markCounts(byId.get(id))))
  const voided: string[] = []
  for (const g of item.gates ?? []) {
    if (ok.has(g.unless)) continue
    for (const v of g.void) if (ok.delete(v)) voided.push(v)
  }

  let raw = 0
  const groups: KimScore['groups'] = []
  const rule = item.rule
  if (rule?.kind === 'sum') {
    raw = elementIds.filter(id => ok.has(id)).reduce((a, id) => a + pointsOf(id), 0)
  } else if (rule?.kind === 'ladder') {
    raw = stepPoints(rule.steps, elementIds, ok)
  } else if (rule?.kind === 'groups') {
    for (const g of rule.groups) {
      const p = stepPoints(g.steps, g.ids, ok)
      groups.push({ label: g.label, points: p })
      raw += p
    }
  }

  const found = new Map(deductionMarks.map(d => [d.id, d]))
  const deducted = (item.deductions ?? [])
    .filter(d => { const m = found.get(d.id); return !!m?.found && m.quote.trim().length > 0 })
    .reduce((a, d) => a + d.points, 0)

  const points = Math.max(0, Math.min(item.max_points, raw) - deducted)
  return { points, counted: elementIds.filter(id => ok.has(id)), voided, groups, deducted }
}

/**
 * Эталон задания → элементы, когда атлас даёт только их число. Эталоны ФИПИ
 * пишутся пунктами «1) … 2) …» — режем по ним. Не нашли хотя бы двух пунктов —
 * null: модель не должна сама решать, из чего состоит эталон.
 */
export function elementsFromKey(key: string): KimElement[] | null {
  const text = key.replace(/\r/g, '').trim()
  if (!text) return null
  const re = /(?:^|\n|\s)(\d{1,2})\s*[).]\s+/g
  const hits: { n: number; at: number; body: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) hits.push({ n: Number(m[1]), at: m.index, body: m.index + m[0].length })
  // Пункты идут подряд с единицы, иначе это не нумерация, а числа в тексте.
  const seq: typeof hits = []
  for (const h of hits) if (h.n === seq.length + 1) seq.push(h)
  if (seq.length < 2) return null
  return seq.map((h, i) => ({
    id: `E${i + 1}`,
    text: text.slice(h.body, i + 1 < seq.length ? seq[i + 1].at : undefined).trim().replace(/[;,.]\s*$/, ''),
  })).filter(e => e.text)
}
