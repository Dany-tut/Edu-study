// ─────────────────────────────────────────────────────────────────────────────
// Реестр наборов слов
//
// Устроен так же и по той же причине, что реестр разговорников (survivalBooks):
// две сотни слов одного языка не должны ехать в бандле к тому, кто открыл
// тренажёр на вкладке «Чтение». hasWordPacks синхронный и ничего не грузит — по
// нему решается, показывать ли раздел вообще; раздел, который секунду стоит
// пустым, хуже отсутствующего.
// ─────────────────────────────────────────────────────────────────────────────

import type { WordPackBook } from './wordPacks'

type Loader = () => Promise<WordPackBook>

const LOADERS: Record<string, Loader> = {
  ko: () => import('./wordPacksKo').then(m => m.KOREAN_WORD_PACKS),
  ja: () => import('./wordPacksJa').then(m => m.JAPANESE_WORD_PACKS),
  en: () => import('./wordPacksEn').then(m => m.ENGLISH_WORD_PACKS),
}

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

/** Есть ли для языка наборы слов. Синхронно — для решения «рисовать ли раздел». */
export const hasWordPacks = (lang: string | undefined): boolean =>
  !!lang && (lang in LOADERS || base(lang) in LOADERS)

/** Подгрузить наборы языка. undefined — для этого языка их пока нет. */
export async function loadWordPacks(lang: string | undefined): Promise<WordPackBook | undefined> {
  if (!lang) return undefined
  const load = LOADERS[lang] ?? LOADERS[base(lang)]
  if (!load) return undefined
  try {
    return await load()
  } catch (e) {
    // Чанк мог не догрузиться на плохой сети: раздел останется пустым, но
    // тренажёр не упадёт.
    console.error('loadWordPacks:', e)
    return undefined
  }
}
