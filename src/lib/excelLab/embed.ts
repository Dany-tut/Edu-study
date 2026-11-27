// Данные живого блока, спрятанные внутри картинки конспекта.
//
// ЗАЧЕМ. Схемы конспекта курса лежат в уроке строкой data-URI картинки
// (theoryImages, маркер ![подпись](img:N)) — так их сохраняет редактор, хранит
// база и показывают старые сборки приложения. Живой разбор формулы и тренажёр
// кладут свои данные в <metadata> той же SVG: старая сборка и печать видят
// обычную картинку, новая — узнаёт метку и рисует интерактивный блок по тем же
// данным. Ни новой колонки, ни миграции, ни второго формата урока.

import type { LabSpec } from './spec'

const MARK = 'iskra-excel-lab'
const SVG_PREFIX = 'data:image/svg+xml;charset=utf-8,'

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const xmlUnesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** Вложить данные блока в SVG-картинку (data-URI из toDataUri). */
export function withLab(dataUri: string, spec: LabSpec): string {
  if (!dataUri.startsWith(SVG_PREFIX)) return dataUri
  const svg = decodeURIComponent(dataUri.slice(SVG_PREFIX.length))
  const meta = `<metadata id="${MARK}">${xmlEsc(JSON.stringify(spec))}</metadata>`
  const at = svg.indexOf('>', svg.indexOf('<svg'))
  if (at < 0) return dataUri
  return SVG_PREFIX + encodeURIComponent(svg.slice(0, at + 1) + meta + svg.slice(at + 1))
}

/** Быстрая проверка без разбора: есть ли в картинке данные блока. */
export function isLabRef(src: string | undefined | null): src is string {
  return !!src && src.startsWith(SVG_PREFIX) && src.includes(encodeURIComponent(`<metadata id="${MARK}">`))
}

/** Достать данные блока из картинки; null — обычная картинка. */
export function readLab(src: string | undefined | null): LabSpec | null {
  if (!isLabRef(src)) return null
  try {
    const svg = decodeURIComponent(src.slice(SVG_PREFIX.length))
    const m = new RegExp(`<metadata id="${MARK}">([\\s\\S]*?)</metadata>`).exec(svg)
    if (!m) return null
    const spec = JSON.parse(xmlUnesc(m[1])) as LabSpec
    return spec && typeof spec === 'object' && 'kind' in spec ? spec : null
  } catch { return null }
}
