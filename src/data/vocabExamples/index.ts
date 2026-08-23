// ─────────────────────────────────────────────────────────────────────────────
// Реестр примеров к словам
//
// ДВА ФАЙЛА НА ЯЗЫК, и это важно.
//   <lang>.ts       — написанные руками. Правятся, ревьюятся, у каждого перевод.
//   <lang>Mined.ts  — собранные скриптом из самих уроков (npm run build:examples).
//                     Руками НЕ правятся: следующий прогон затрёт правку.
// Ручной пример всегда сильнее добытого: скрипт берёт первое подходящее
// предложение, человек — то, из которого слово понятно.
//
// ЛЕНИВО — по той же причине, что и разговорник (см. survivalBooks.ts): это
// сотни килобайт контента, и ученик, открывший «Чтение», не должен возить их с
// собой. Индекс собирается при первом заходе в карточки и живёт до перезагрузки.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExampleMap } from './model'

type Loader = () => Promise<ExampleMap[]>

const LOADERS: Record<string, Loader> = {
  en: () => Promise.all([
    import('./en').then(m => m.EN_VOCAB_EXAMPLES),
    import('./enMined').then(m => m.EN_MINED_EXAMPLES),
  ]),
  ko: () => Promise.all([
    import('./ko').then(m => m.KO_VOCAB_EXAMPLES),
    import('./koMined').then(m => m.KO_MINED_EXAMPLES),
  ]),
  ja: () => Promise.all([
    import('./ja').then(m => m.JA_VOCAB_EXAMPLES),
    import('./jaMined').then(m => m.JA_MINED_EXAMPLES),
  ]),
  pt: () => Promise.all([
    import('./pt').then(m => m.PT_VOCAB_EXAMPLES),
    import('./ptMined').then(m => m.PT_MINED_EXAMPLES),
  ]),
  de: () => Promise.all([
    import('./de').then(m => m.DE_VOCAB_EXAMPLES),
    import('./deMined').then(m => m.DE_MINED_EXAMPLES),
  ]),
}

/** Базовый код языка: pt-BR → pt. Примеры общие на язык, а не на диалект. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

/**
 * Примеры языка: [ручные, добытые]. Порядок = приоритет при склейке.
 * Пустой массив — для этого языка примеров пока нет, и это не ошибка.
 */
export async function loadVocabExamples(lang: string | undefined): Promise<ExampleMap[]> {
  if (!lang) return []
  const load = LOADERS[lang] ?? LOADERS[base(lang)]
  if (!load) return []
  try {
    return await load()
  } catch (e) {
    // Чанк мог не догрузиться. Карточка без примера — потеря, но не поломка.
    console.error('loadVocabExamples:', e)
    return []
  }
}

export type { ExampleMap, VocabExample } from './model'
export { exampleKey, x } from './model'
