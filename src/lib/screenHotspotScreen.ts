// Картинка задания «Найди на экране» и список её элементов.
//
// ОТДЕЛЬНО ОТ screenHotspot.ts: здесь генераторы реконструкций (svgSheet,
// таблицы, схемы). Реестр типов заданий грузится на каждом экране и тянуть их
// за собой не должен — проверке нажатий картинка не нужна.
import { reconScreenBoxes, excelSheetBoxes, type ReconBox } from '../data/accounting/accFigures'
import type { HotspotArea, HotspotImage, HotspotSpec } from './screenHotspot'

// ─── Картинка ────────────────────────────────────────────────────────────────

export interface HotspotScreen {
  src: string
  /** Элементы картинки для режима «Списком» и «Выбрать элемент» — в долях. */
  elements: HotspotArea[]
  natural: { w: number; h: number }
}

const KIND_RU: Record<ReconBox['kind'], string> = { button: 'кнопка', field: 'поле', tab: 'вкладка', cell: 'ячейка' }

function framesToAreas(boxes: ReconBox[], w: number, h: number): HotspotArea[] {
  return boxes.map(b => ({ id: b.id, label: `${b.label}, ${KIND_RU[b.kind]}`, x: b.x / w, y: b.y / h, w: b.w / w, h: b.h / h }))
}

const screenCache = new Map<string, HotspotScreen>()

/**
 * Картинка задания и список её элементов. Реконструкция рисуется генератором
 * (элементы — его рамки), у загруженной картинки элементы — области автора.
 */
export function hotspotScreen(spec: HotspotSpec): HotspotScreen {
  const img = spec.image
  if (img.kind === 'upload') {
    return { src: img.src, natural: spec.natural, elements: [...spec.targets, ...(spec.traps ?? [])] }
  }
  const key = JSON.stringify(img)
  const hit = screenCache.get(key)
  if (hit) return hit
  const f = img.kind === 'recon'
    ? reconScreenBoxes(img.recon, { bare: true })
    : excelSheetBoxes(img.excel.title, img.excel.rows, { ...img.excel.opts, bare: true })
  const out = { src: f.src, natural: { w: f.w, h: f.h }, elements: framesToAreas(f.boxes, f.w, f.h) }
  screenCache.set(key, out)
  return out
}

/**
 * Собрать задание по реконструкции: верные области и ловушки — id элементов
 * генератора (btn-3, field-1, cell-0-2). Рамки и natural считаются сами, чтобы
 * автор курса не переписывал координаты руками.
 */
export function reconHotspot(
  image: Extract<HotspotImage, { kind: 'recon' | 'excel' }>,
  targets: string[],
  traps: Array<[string, string]> = [],
  extra: { hint?: string; attempts?: number } = {},
): HotspotSpec {
  const base: HotspotSpec = { image, natural: { w: 640, h: 400 }, targets: [], ...extra }
  const scr = hotspotScreen(base)
  const pick = (id: string, hint?: string): HotspotArea => {
    const el = scr.elements.find(e => e.id === id)
    if (!el) throw new Error(`reconHotspot: нет элемента ${id}`)
    // Подпись без «, кнопка» — она для скринридера.
    return { ...el, label: el.label.replace(/, (кнопка|поле|вкладка|ячейка)$/, ''), ...(hint ? { hint } : {}) }
  }
  return {
    ...base,
    natural: scr.natural,
    targets: targets.map(id => pick(id)),
    traps: traps.map(([id, hint]) => pick(id, hint)),
  }
}
