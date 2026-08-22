// ─────────────────────────────────────────────────────────────────────────────
// Реестр справочной части языка: рассказ о языке и правила
//
// Ленивый по той же причине, что разговорник и наборы слов: справочник одного
// языка — это десятки килобайт текста плюс векторные схемы, и человек, который
// пришёл почитать текст, не должен возить их с собой. Проверки has* синхронные
// и ничего не грузят: по ним решается, рисовать ли раздел вообще.
//
// Учебники сюда не попали намеренно — их полка весит единицы килобайт и живёт
// прямо в textbooks.ts. Ленивая загрузка ради восьми описаний книг добавила бы
// мигание пустой полки на ровном месте.
// ─────────────────────────────────────────────────────────────────────────────

import type { LanguageStory } from './languageStory'
import type { GrammarBook } from './grammarNotes'

const STORIES: Record<string, () => Promise<LanguageStory>> = {
  ko: () => import('./languageStoryKo').then(m => m.KOREAN_STORY),
}

const GRAMMARS: Record<string, () => Promise<GrammarBook>> = {
  ko: () => import('./grammarNotesKo').then(m => m.KOREAN_GRAMMAR),
}

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

export const hasStory = (lang: string | undefined): boolean =>
  !!lang && (lang in STORIES || base(lang) in STORIES)

export const hasGrammar = (lang: string | undefined): boolean =>
  !!lang && (lang in GRAMMARS || base(lang) in GRAMMARS)

/** Загрузить рассказ о языке. undefined — для этого языка его пока нет. */
export async function loadStory(lang: string | undefined): Promise<LanguageStory | undefined> {
  if (!lang) return undefined
  const load = STORIES[lang] ?? STORIES[base(lang)]
  if (!load) return undefined
  try {
    return await load()
  } catch (e) {
    // Чанк не догрузился — раздел останется пустым, но тренажёр не упадёт.
    console.error('loadStory:', e)
    return undefined
  }
}

/** Загрузить правила языка. */
export async function loadGrammar(lang: string | undefined): Promise<GrammarBook | undefined> {
  if (!lang) return undefined
  const load = GRAMMARS[lang] ?? GRAMMARS[base(lang)]
  if (!load) return undefined
  try {
    return await load()
  } catch (e) {
    console.error('loadGrammar:', e)
    return undefined
  }
}
