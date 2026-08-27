// Лёгкая половина реестра сцен: сколько их у языка и есть ли они вообще.
//
// Вынесено из scenes/index.ts, потому что тот весит 122 КБ (в нём лежит WORKS —
// полторы тысячи строк описаний произведений), и любой импорт из него тащил всю
// эту массу в главный чанк. А спрашивают отсюда ровно два числа: подпись
// «сколько материала у языка» на витрине предметов.
//
// Список языков держится в согласии с LOADERS в index.ts: сторож там же.

export const SCENE_COUNTS: Record<string, number> = {
  en: 273,
  ja: 46,
  ko: 82,
  de: 7,
  ru: 5,
  pt: 4,
}

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

/** Есть ли для языка сцены. Синхронно — по этому решается, рисовать ли раздел. */
export const hasScenes = (lang: string | undefined): boolean =>
  !!lang && (lang in SCENE_COUNTS || base(lang) in SCENE_COUNTS)

/** Сколько сцен у языка — синхронно, ещё до загрузки чанка. */
export function sceneCount(lang: string | undefined): number {
  if (!lang) return 0
  return SCENE_COUNTS[lang] ?? SCENE_COUNTS[base(lang)] ?? 0
}
