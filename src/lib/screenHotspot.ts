// ─────────────────────────────────────────────────────────────────────────────
// «Найди на экране» (screenHotspot) — данные задания и проверка нажатий
//
// Ученик нажимает на картинке туда, куда нажал бы в программе. Курсу
// «Бухгалтерия» это заменяет 1С и Excel, которых у ученика под рукой нет;
// подходит и анатомии, картам, схемам.
//
// КООРДИНАТЫ — ДОЛИ 0…1 ОТ natural. Области заданы в натуральном размере
// картинки и не съезжают ни при каком масштабе показа.
//
// МИНИМАЛЬНАЯ ЗОНА ПОПАДАНИЯ. Кнопка 1С на телефоне ужимается до 20 px — в неё
// не попасть пальцем. Поэтому при проверке область, которая на экране меньше
// 44 pt (iOS) / 48 dp (Android) / 24 px (ПК), растягивается от центра до этого
// минимума (видимая рамка не меняется). Масштаб и минимум ученик присылает с
// каждым нажатием: так сервер и учитель пересчитают ровно то, что видел
// ученик. Растянутые зоны могут перекрыть соседей — спорная точка отдаётся
// ближайшему центру; прямое попадание в саму рамку всегда сильнее.
//
// ОТВЕТ — строка JSON {"taps":[{x,y,zoom,min,target}]}: хранилище домашки
// держит на задание ровно одну строку. target — что засчитал клиент; проверка
// его не читает, а считает заново по x/y.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReconScreen, ExcelSheetOpts } from '../data/accounting/accFigures'
import type { Platform } from './platform'

/** Область на картинке: доли 0…1 от natural. */
export interface HotspotArea {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  /** Ловушка: адресная подсказка «почему не сюда». У верной области — не нужна. */
  hint?: string
}

export type HotspotImage =
  /** Реконструкция окна (1С, Google Таблицы и т. п.) — генератор reconScreen. */
  | { kind: 'recon'; recon: ReconScreen; alt: string; badge?: boolean }
  /** Лист Excel — генератор excelSheet. */
  | { kind: 'excel'; excel: { title: string; rows: string[][]; opts?: ExcelSheetOpts }; alt: string; badge?: boolean }
  /** Картинка автора: PNG/SVG по ссылке. */
  | { kind: 'upload'; src: string; alt: string; badge?: boolean }

export interface HotspotSpec {
  image: HotspotImage
  /** Размер, в котором заданы области. */
  natural: { w: number; h: number }
  /** Верные области (может быть несколько). */
  targets: HotspotArea[]
  /** Частые промахи с подсказкой. */
  traps?: HotspotArea[]
  /** Общая подсказка — при промахе мимо ловушек. */
  hint?: string
  /** Сколько нажатий даётся; после последнего — разбор. По умолчанию 2. */
  attempts?: number
}

export interface HotspotTap {
  /** Доли 0…1 от natural. */
  x: number
  y: number
  /** Масштаб показа в момент нажатия: CSS px экрана на 1 px natural. */
  zoom: number
  /** Минимальная зона попадания на экране, CSS px (44/48/24; 0 — выбор списком). */
  min?: number
  /** Что засчитал клиент (id области) — для отчёта; проверка считает заново. */
  target?: string
}

export const DEFAULT_ATTEMPTS = 2

/** Минимальная зона попадания по версии: 44 pt iOS, 48 dp Android, 24 px ПК. */
export function minHitZone(p: Platform): number {
  return p === 'android' ? 48 : p === 'pc' ? 24 : 44
}

export function hotspotAttempts(spec: Pick<HotspotSpec, 'attempts'> | undefined): number {
  const n = Math.round(spec?.attempts ?? DEFAULT_ATTEMPTS)
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 5) : DEFAULT_ATTEMPTS
}

/** Разбор ответа. Сломанная строка — пустой ответ, а не падение. */
export function parseHotspotAnswer(a: unknown): HotspotTap[] {
  let v: unknown = a
  if (typeof a === 'string') {
    if (!a.trim()) return []
    try { v = JSON.parse(a) } catch { return [] }
  }
  const taps = (v && typeof v === 'object' && Array.isArray((v as { taps?: unknown }).taps)) ? (v as { taps: unknown[] }).taps : []
  return taps.flatMap(t => {
    if (!t || typeof t !== 'object') return []
    const o = t as Record<string, unknown>
    const x = Number(o.x), y = Number(o.y), zoom = Number(o.zoom ?? 1)
    if (![x, y].every(Number.isFinite)) return []
    return [{
      x, y, zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
      ...(Number.isFinite(Number(o.min)) ? { min: Number(o.min) } : {}),
      ...(typeof o.target === 'string' ? { target: o.target } : {}),
    }]
  })
}

export function formatHotspotAnswer(taps: HotspotTap[]): string {
  const r = (n: number) => Math.round(n * 10000) / 10000
  return JSON.stringify({
    taps: taps.map(t => ({ x: r(t.x), y: r(t.y), zoom: r(t.zoom), ...(t.min != null ? { min: t.min } : {}), ...(t.target ? { target: t.target } : {}) })),
  })
}

export type HotspotHit = { kind: 'target' | 'trap'; area: HotspotArea } | { kind: 'miss'; area?: undefined }

/** Куда попало нажатие. */
export function hotspotHit(spec: HotspotSpec, tap: HotspotTap): HotspotHit {
  const W = spec.natural.w || 1, H = spec.natural.h || 1
  const px = tap.x * W, py = tap.y * H
  const areas = [
    ...(spec.targets ?? []).map(area => ({ area, kind: 'target' as const })),
    ...(spec.traps ?? []).map(area => ({ area, kind: 'trap' as const })),
  ].map(a => ({ ...a, r: { x: a.area.x * W, y: a.area.y * H, w: a.area.w * W, h: a.area.h * H } }))
  const inside = (r: { x: number; y: number; w: number; h: number }) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h
  // Прямое попадание: из вложенных побеждает меньшая область (ячейка внутри таблицы).
  const direct = areas.filter(a => inside(a.r)).sort((a, b) => a.r.w * a.r.h - b.r.w * b.r.h)[0]
  if (direct) return { kind: direct.kind, area: direct.area }
  const minN = Math.max(0, tap.min ?? 0) / Math.max(0.05, tap.zoom || 1)
  if (minN <= 0) return { kind: 'miss' }
  const grown = areas.map(a => {
    const w = Math.max(a.r.w, minN), h = Math.max(a.r.h, minN)
    const cx = a.r.x + a.r.w / 2, cy = a.r.y + a.r.h / 2
    return { ...a, g: { x: cx - w / 2, y: cy - h / 2, w, h }, d: Math.hypot(px - cx, py - cy) }
  }).filter(a => inside(a.g)).sort((a, b) => a.d - b.d)[0]
  return grown ? { kind: grown.kind, area: grown.area } : { kind: 'miss' }
}

export interface HotspotOutcome {
  taps: HotspotTap[]
  hits: HotspotHit[]
  /** Номер верного нажатия (0…), −1 — не попал. */
  rightAt: number
  correct: boolean
  /** Задание закрыто: попал или кончились попытки. */
  done: boolean
  attemptsLeft: number
}

/** Итог по ответу: засчитываются только первые `attempts` нажатий. */
export function hotspotOutcome(spec: HotspotSpec, answer: unknown): HotspotOutcome {
  const max = hotspotAttempts(spec)
  const all = parseHotspotAnswer(answer)
  const hits: HotspotHit[] = []
  let rightAt = -1
  for (let i = 0; i < Math.min(all.length, max); i++) {
    const h = hotspotHit(spec, all[i])
    hits.push(h)
    if (h.kind === 'target') { rightAt = i; break }
  }
  const taps = all.slice(0, hits.length)
  const correct = rightAt >= 0
  return { taps, hits, rightAt, correct, done: correct || taps.length >= max, attemptsLeft: Math.max(0, max - taps.length) }
}

/** Проверяемо ли задание: есть картинка и хотя бы одна верная область. */
export function hotspotGradable(spec: HotspotSpec | undefined): spec is HotspotSpec {
  return !!spec && !!spec.image && (spec.targets ?? []).length > 0 && spec.natural?.w > 0 && spec.natural?.h > 0
}

// ─── Проверки редактора ──────────────────────────────────────────────────────

/** Что не так с заданием — для редактора. Пустой список — можно сохранять. */
export function hotspotIssues(spec: HotspotSpec | undefined): string[] {
  if (!spec) return ['Выберите картинку или реконструкцию.']
  const out: string[] = []
  if (spec.image.kind === 'upload' && !spec.image.src) out.push('Загрузите картинку.')
  if (!spec.targets?.length) out.push('Отметьте хотя бы одну верную область.')
  if (!spec.image.alt?.trim()) out.push('Заполните описание картинки (alt) — его прочтёт скринридер.')
  const W = spec.natural.w || 1, H = spec.natural.h || 1
  const all = [...(spec.targets ?? []), ...(spec.traps ?? [])]
  for (const a of all) {
    if (a.w * W < 16 || a.h * H < 16) out.push(`Область «${a.label || a.id}» меньше 16×16 px — увеличьте её.`)
  }
  for (const t of spec.targets ?? []) {
    for (const r of spec.traps ?? []) {
      const ix = Math.min(t.x + t.w, r.x + r.w) - Math.max(t.x, r.x)
      const iy = Math.min(t.y + t.h, r.y + r.h) - Math.max(t.y, r.y)
      if (ix > 0 && iy > 0) out.push(`Верная область «${t.label}» и ловушка «${r.label}» пересекаются.`)
    }
  }
  return out
}
