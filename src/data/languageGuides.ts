// ─────────────────────────────────────────────────────────────────────────────
// Реестр справочной части языка: рассказ о языке и правила
//
// Ленивый по той же причине, что разговорник и наборы слов: рассказ об одном
// языке — это десятки килобайт текста плюс векторные схемы, и человек, который
// пришёл почитать текст, не должен возить их с собой. Проверка hasStory при
// этом синхронная: по ней решается, рисовать ли раздел вообще.
//
// Учебники сюда не попали намеренно — их полка весит единицы килобайт и живёт
// прямо в textbooks.ts. Ленивая загрузка ради восьми описаний книг добавила бы
// мигание пустой полки на ровном месте.
// ─────────────────────────────────────────────────────────────────────────────

import type { LanguageStory } from './languageStory'

const STORIES: Record<string, () => Promise<LanguageStory>> = {
  ko: () => import('./languageStoryKo').then(m => m.KOREAN_STORY),
}

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

export const hasStory = (lang: string | undefined): boolean =>
  !!lang && (lang in STORIES || base(lang) in STORIES)

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
