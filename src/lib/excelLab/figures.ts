// Блоки Excel-лаборатории для конспекта курса: картинка-заглушка + данные.
//
// Конспект хранит схемы картинками (theoryImages). Эти генераторы рисуют
// простую статичную картинку (её видят старые сборки и печать) и вкладывают в
// неё данные блока (embed.ts) — новая сборка рисует по ним живой тренажёр или
// способы решения. Разбор формулы делает accFigures.formulaFig + withLab.

import { esc, sheet, toDataUri, wrapLines, INK, MUTED, GRID, TILE, ACCENT } from '../../data/svgSheet'
import { Workbook, addr, display, parseAddr } from './formula'
import { withLab } from './embed'
import type { MethodsSpec, TrainerSpec } from './spec'

const W = 640

/** Тренажёр в конспекте: песочница без оценки. */
export function trainerFig(spec: TrainerSpec): string {
  const wb = new Workbook(spec.sheets)
  const sh = wb.order[0]
  const keys = [...(wb.cells.get(sh)?.keys() ?? [])].map(k => parseAddr(k)!)
  const cols = [...new Set(keys.map(k => k.c))].sort((a, b) => a - b)
  const rows = [...new Set(keys.map(k => k.r))].sort((a, b) => a - b).slice(0, 10)
  const cw = Math.min(110, Math.floor((W - 72) / Math.max(1, cols.length)))
  const out: string[] = []
  let y = 52
  rows.forEach((r, i) => {
    out.push(`<text x="40" y="${y + 18}" text-anchor="end" font-size="11" fill="${MUTED}">${r}</text>`)
    cols.forEach((c, j) => {
      const x = 48 + j * cw
      const v = display(wb.value(sh, addr(c, r)))
      out.push(`<rect x="${x}" y="${y}" width="${cw}" height="26" fill="${i === 0 ? TILE : '#fff'}" stroke="${GRID}"/>`)
      out.push(`<text x="${x + 6}" y="${y + 17}" font-size="11.5" fill="${INK}">${esc(v.length > cw / 7 ? v.slice(0, Math.floor(cw / 7)) : v)}</text>`)
    })
    y += 26
  })
  y += 22
  out.push(`<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="12" fill="${ACCENT}">Учебный тренажёр: откройте урок в новой версии Искры, чтобы менять значения</text>`)
  return withLab(toDataUri(sheet(W, y + 18, spec.title ?? 'Тренажёр', out.join(''))), { ...spec, kind: 'trainer' })
}

/** Способы решения с пометкой «ваш вариант» по версии Excel ученика. */
export function methodsFig(spec: Omit<MethodsSpec, 'kind'>): string {
  const out: string[] = []
  let y = 56
  for (const m of spec.methods) {
    const name = m.title ?? { simple: 'Простой', formulas: 'Формулы', powerQuery: 'Power Query', vba: 'VBA', modern: 'Современный' }[m.id]
    out.push(`<text x="24" y="${y}" font-size="13" font-weight="700" fill="${INK}">${esc(name)}</text>`)
    y += 18
    for (const s of m.steps.slice(0, 4)) for (const ln of wrapLines('• ' + s, W - 60, 11.5)) { out.push(`<text x="32" y="${y}" font-size="11.5" fill="${MUTED}">${esc(ln)}</text>`); y += 15 }
    y += 10
  }
  return withLab(toDataUri(sheet(W, y + 8, spec.title ?? 'Способы решения', out.join(''))), { ...spec, kind: 'methods' })
}
