// ─────────────────────────────────────────────────────────────────────────────
// Реестр 3D-моделей конспекта. Ссылка в маркере — `model:<вид>:<ключ>`:
//   model:atom:C        атом углерода (номер или символ)
//   model:cell:animal   животная клетка
//   model:cell:plant    растительная клетка
//   model:molecule:h2o  молекула (h2o, co2, ch4, nh3, c6h6) или dna
//   model:lattice:nacl  ионная решётка
//   model:organ:eye     орган человека (eye, neuron, heart)
//   model:stages:mitosis модель по стадиям с плеером
//   model:mesh:bp3d-heart готовый меш из открытой базы (public/models/*.glb)
// Ссылка едет через тот же маркер `![подпись](…)`, что и картинки: для
// theoryToParagraphs это просто src абзаца, и ни модель данных, ни редактор
// менять не пришлось. Сами сцены грузятся лениво — здесь только разбор ссылки
// и подпись для мест, где three.js не нужен.
// ─────────────────────────────────────────────────────────────────────────────
import { findElement } from './elements'
import type { ModelSpec } from './spec'

export const MODEL_REF = /^model:([a-z]+)(?::([A-Za-z0-9_-]+))?$/

export function isModelRef(src: string | undefined | null): src is string {
  return !!src && MODEL_REF.test(src.trim())
}

export function parseModelRef(src: string): { kind: string; key: string } | null {
  const m = src.trim().match(MODEL_REF)
  return m ? { kind: m[1], key: m[2] ?? '' } : null
}

/** Человеческая подпись без загрузки сцены — для редактора и заглушек. */
export function modelRefLabel(src: string): string {
  // Модель из реестра называем так же, как в окне выбора: учитель узнаёт её.
  const preset = MODEL_PRESETS.find(p => p.ref === src.trim())
  if (preset) return `3D-модель · ${preset.label}`
  const ref = parseModelRef(src)
  if (!ref) return '3D-модель'
  if (ref.kind === 'atom') {
    const el = findElement(ref.key)
    return el ? `3D-модель: атом — ${el.name.toLowerCase()}` : '3D-модель: атом'
  }
  if (ref.kind === 'cell') return ref.key === 'plant' ? '3D-модель: растительная клетка' : '3D-модель: животная клетка'
  if (ref.kind === 'molecule') return ref.key === 'dna' ? '3D-модель: ДНК' : `3D-модель: молекула ${ref.key.toUpperCase()}`
  if (ref.kind === 'lattice') return '3D-модель: кристаллическая решётка'
  if (ref.kind === 'organ') return `3D-модель: ${({ eye: 'глаз', neuron: 'нейрон', heart: 'сердце' } as Record<string, string>)[ref.key] ?? 'орган'}`
  if (ref.kind === 'stages') return '3D-модель по стадиям: митоз'
  if (ref.kind === 'mesh') return `3D-модель из открытой базы: ${ref.key}`
  return '3D-модель'
}

/** Собрать спецификацию сцены; null — ссылка не разобрана. */
export async function loadModelSpec(src: string): Promise<ModelSpec | null> {
  const ref = parseModelRef(src)
  if (!ref) return null
  if (ref.kind === 'atom') {
    const { atomSpec } = await import('./atom')
    return atomSpec(ref.key || 'C')
  }
  if (ref.kind === 'cell') {
    const { animalCellSpec, plantCellSpec } = await import('./cell')
    return ref.key === 'plant' ? plantCellSpec() : animalCellSpec()
  }
  if (ref.kind === 'molecule') {
    const mod = await import('./molecules')
    return ref.key === 'dna' ? mod.dnaSpec() : mod.moleculeSpec(ref.key)
  }
  if (ref.kind === 'lattice') {
    const { naclSpec } = await import('./molecules')
    return ref.key === 'nacl' || !ref.key ? naclSpec() : null
  }
  if (ref.kind === 'organ') {
    const mod = await import('./human')
    return ref.key === 'eye' ? mod.eyeSpec() : ref.key === 'neuron' ? mod.neuronSpec() : ref.key === 'heart' ? mod.heartSpec() : null
  }
  if (ref.kind === 'mesh') {
    const { gltfModelSpec } = await import('./gltfModels')
    return gltfModelSpec(ref.key)
  }
  if (ref.kind === 'stages') {
    const { mitosisSpec } = await import('./stages')
    return ref.key === 'mitosis' || !ref.key ? mitosisSpec() : null
  }
  return null
}

/** Примеры для палитры редактора. */
export const MODEL_PRESETS: Array<{ ref: string; label: string; subject: 'chem' | 'bio' }> = [
  { ref: 'model:atom:C', label: 'Атом углерода', subject: 'chem' },
  { ref: 'model:atom:Na', label: 'Атом натрия', subject: 'chem' },
  { ref: 'model:molecule:h2o', label: 'Молекула воды', subject: 'chem' },
  { ref: 'model:molecule:ch4', label: 'Метан', subject: 'chem' },
  { ref: 'model:molecule:nh3', label: 'Аммиак', subject: 'chem' },
  { ref: 'model:molecule:co2', label: 'Углекислый газ', subject: 'chem' },
  { ref: 'model:molecule:c6h6', label: 'Бензол', subject: 'chem' },
  { ref: 'model:lattice:nacl', label: 'Решётка NaCl', subject: 'chem' },
  { ref: 'model:cell:animal', label: 'Животная клетка', subject: 'bio' },
  { ref: 'model:cell:plant', label: 'Растительная клетка', subject: 'bio' },
  { ref: 'model:stages:mitosis', label: 'Митоз по стадиям', subject: 'bio' },
  { ref: 'model:molecule:dna', label: 'ДНК', subject: 'bio' },
  { ref: 'model:organ:eye', label: 'Глаз', subject: 'bio' },
  { ref: 'model:organ:neuron', label: 'Нейрон', subject: 'bio' },
  { ref: 'model:organ:heart', label: 'Сердце', subject: 'bio' },
  { ref: 'model:mesh:bp3d-heart', label: 'Сердце по МРТ (BodyParts3D)', subject: 'bio' },
  { ref: 'model:mesh:bp3d-eye', label: 'Глаз по МРТ (BodyParts3D)', subject: 'bio' },
]
