// ─────────────────────────────────────────────────────────────────────────────
// Пример к карточке повторений
//
// ПОЧЕМУ ВООБЩЕ НУЖНО. Карточка «heads up — предупреждаю» проверяет перевод и
// ничего не говорит о том, как слово стоит в речи: «предупреждаю» по-русски
// начинает предложение, а heads up живёт отдельной строкой перед просьбой. У
// карточек разговорника пример есть всегда (он написан вместе с фразой), а у
// колоды повторений его не было ни у одной: review_cards хранит только слово и
// перевод. Разницу видно сразу — одна и та же стопка, где половина карточек
// показывает фразу в жизни, а половина нет.
//
// ГДЕ ПРИМЕР БЕРЁТСЯ. Три источника, в порядке убывания качества:
//   1. написанные руками примеры к словам курсов (data/vocabExamples/<lang>.ts);
//   2. разговорник выживания — там пример есть у каждой фразы (100% на всех
//      четырёх языках), и слово из урока часто совпадает с фразой разговорника;
//   3. добытые скриптом из самого урока (data/vocabExamples/<lang>Mined.ts) —
//      предложение из теории, из отработки конструкции или из текста библиотеки.
//
// Индекс собирается один раз на язык и кэшируется: стопка перечитывается на
// каждый вход в раздел, а контент за сессию не меняется.
// ─────────────────────────────────────────────────────────────────────────────

import { loadVocabExamples, exampleKey, type ExampleMap, type VocabExample } from '../data/vocabExamples'
import { loadSurvivalBook } from '../data/survivalBooks'
import type { ReviewCard } from '../data/reviewDeck'

const cache = new Map<string, Promise<ExampleMap>>()

async function build(lang: string): Promise<ExampleMap> {
  const [hand, mined] = await Promise.all([
    loadVocabExamples(lang),
    loadSurvivalBook(lang),
  ]).then(([maps, book]) => {
    const fromBook: ExampleMap = {}
    if (book) {
      for (const list of Object.values(book.phrases)) {
        for (const ph of list) if (ph.ex) fromBook[exampleKey(ph.term)] = ph.ex
      }
    }
    // [ручные, разговорник + добытые]: разговорник сильнее добытого, потому что
    // там пример написан к этой самой фразе, а не найден по совпадению строки.
    return [maps[0] ?? {}, { ...(maps[1] ?? {}), ...fromBook }]
  })
  return { ...mined, ...hand }
}

/** Индекс примеров языка. Кэшируется на сессию. */
export function exampleIndex(lang: string | undefined): Promise<ExampleMap> {
  if (!lang) return Promise.resolve({})
  const hit = cache.get(lang)
  if (hit) return hit
  const p = build(lang).catch(e => {
    console.error('exampleIndex:', e)
    cache.delete(lang)
    return {} as ExampleMap
  })
  cache.set(lang, p)
  return p
}

/** Пример к одному слову — по слову, а не по карточке. */
export function exampleFor(index: ExampleMap, term: string): VocabExample | undefined {
  return index[exampleKey(term)]
}

/**
 * Дописать примеры стопке.
 *
 * Уже готовый пример не трогаем: у карточек разговорника он приходит вместе с
 * фразой и написан именно к ней. Слово ищем по обеим сторонам карточки — у
 * обратной карточки («перевод → слово») на лицевой стороне стоит русский, и
 * искать пример по нему бессмысленно.
 */
export async function withExamples(cards: ReviewCard[], lang: string | undefined): Promise<ReviewCard[]> {
  if (!lang || cards.length === 0 || cards.every(c => c.ex)) return cards
  const index = await exampleIndex(lang)
  if (Object.keys(index).length === 0) return cards
  return cards.map(c => {
    if (c.ex) return c
    const ex = exampleFor(index, c.prompt) ?? exampleFor(index, c.answer)
    return ex ? { ...c, ex } : c
  })
}
