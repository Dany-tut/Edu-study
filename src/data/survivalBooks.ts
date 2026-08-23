// ─────────────────────────────────────────────────────────────────────────────
// Реестр разговорников
//
// ЗАЧЕМ ЛЕНИВО. Разговорник одного языка — это полторы тысячи фраз, то есть
// сотня килобайт в бандле. Тренажёр открывается на вкладке «Чтение», и человек,
// который до карточек не дошёл, не должен возить с собой корейский, японский и
// португальский разом. Поэтому здесь не книги, а функции, которые их подгружают:
// экран платит за язык ровно тогда, когда его открыли.
//
// hasSurvivalBook при этом синхронный и ничего не грузит — по нему решается,
// рисовать ли вообще раздел «Наборы фраз». Раздел, который сначала появляется
// пустым, а через секунду наполняется, хуже, чем раздел, которого нет.
//
// КЛЮЧ — код языка, как он приходит в тренажёр (см. lib/subjects.ts). Диалектные
// коды вроде pt-BR сводятся к базовому: разговорник у португальского один.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurvivalBook } from './survivalPhrases'

type Loader = () => Promise<SurvivalBook>

const LOADERS: Record<string, Loader> = {
  ko: () => import('./survivalKo').then(m => m.KOREAN_SURVIVAL),
  ja: () => import('./survivalJa').then(m => m.JAPANESE_SURVIVAL),
  pt: () => import('./survivalPt').then(m => m.PORTUGUESE_SURVIVAL),
  en: () => import('./survivalEn').then(m => m.ENGLISH_SURVIVAL),
  de: () => import('./survivalDe').then(m => m.GERMAN_SURVIVAL),
}

/** Базовый код языка: pt-BR → pt, en-US → en. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

/** Есть ли для языка разговорник. Синхронно и без загрузки — для решения «рисовать ли раздел». */
export const hasSurvivalBook = (lang: string | undefined): boolean =>
  !!lang && (lang in LOADERS || base(lang) in LOADERS)

/** Языки, для которых разговорник уже написан. */
export const survivalLangs = (): string[] => Object.keys(LOADERS)

/** Подгрузить разговорник языка. undefined — для этого языка его пока нет. */
export async function loadSurvivalBook(lang: string | undefined): Promise<SurvivalBook | undefined> {
  if (!lang) return undefined
  const load = LOADERS[lang] ?? LOADERS[base(lang)]
  if (!load) return undefined
  try {
    return await load()
  } catch (e) {
    // Чанк мог не догрузиться на плохой сети. Экран покажет пустой раздел, а не
    // белую страницу: карточки — не то, ради чего стоит ронять тренажёр.
    console.error('loadSurvivalBook:', e)
    return undefined
  }
}
