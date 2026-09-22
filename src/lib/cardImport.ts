// ─────────────────────────────────────────────────────────────────────────────
// Карточки из фото и из ссылки — клиентская половина
//
// ЧТО ЗДЕСЬ. Подготовка запроса и разбор ответа Edge Function `cards-extract`.
// Вся работа — чтение чужой страницы и обращение к модели — идёт на сервере:
// у чужих сайтов нет CORS, а ключ модели не должен уезжать в бандл (почему
// именно так — в шапке самой функции).
//
// ПОЧЕМУ ФОТО СЖИМАЕТСЯ ЗДЕСЬ. Снимок с телефона — это 3–5 МБ, и уходит он в
// теле запроса как base64 (плюс треть объёма). Модель столько пикселей всё
// равно не читает: текст на листе распознаётся с 1600 точек по длинной стороне
// не хуже, чем с 4000. Гоним через тот же optimizePhoto, что и вложения ответов,
// — другого сжатия картинок в проекте нет и заводить второе незачем.
//
// ИМПОРТ НИЧЕГО НЕ СОХРАНЯЕТ. Он возвращает карточки в черновик редактора;
// в базу они попадают общей кнопкой «Сохранить», как и набранные руками.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { t } from './i18n'
import { appFlag } from './cardGroups'
import { optimizePhoto } from './imageOptim'
import type { SetCard } from './cardGroups'

/** Откуда приехали карточки: показывается на превью, чтобы было видно, чему верить. */
export type CardImportSource = 'photo' | 'link' | 'sheet' | 'csv' | 'quizlet'

export interface CardImportResult {
  cards: SetCard[]
  source: CardImportSource
  /** Заголовок страницы-источника, если он был. */
  title?: string
  /** Имя модели — пусто, когда разобрал парсер, а не она. */
  model?: string
  /** Сколько снимков из пачки прочитать не удалось. Пусто — прочитались все. */
  failed?: number
}

/**
 * Сколько снимков уезжает В ОДНОМ запросе. Больше четырёх картинок в одном
 * теле — это мегабайты base64 и минуты ожидания одного ответа, после которых
 * шлюз отваливается по таймауту целиком, вместе с уже разобранными страницами.
 */
export const PHOTOS_PER_CALL = 4

/**
 * Сколько снимков берём за один заход. Пачка режется на партии по
 * PHOTOS_PER_CALL и уезжает последовательно: список слов на сотню карточек —
 * это десяток страниц тетради, и заставлять человека делать десять заходов по
 * четыре значило бы, что импорт не годится ровно для той работы, ради которой
 * он и написан. Потолок всё же есть: за двумя десятками страниц начинается не
 * список слов, а учебник, и разбор его стоит денег молча.
 */
export const MAX_PHOTOS = 24

/**
 * Показывать ли кнопки импорта.
 *
 * Оба флага, как и у остальных платных задач: общий рубильник и свой
 * (см. миграцию 0098 и [[project-ai-switches]]). Выключено — человек не видит
 * кнопки вовсе, а не жмёт их и получает отказ.
 */
export async function cardImportEnabled(): Promise<boolean> {
  const [master, own] = await Promise.all([appFlag('ai_enabled'), appFlag('ai_card_import')])
  return master && own
}

async function call(body: Record<string, unknown>): Promise<CardImportResult> {
  const { data, error } = await supabase.functions.invoke('cards-extract', { body })
  if (error) {
    // На не-2xx supabase-js кладёт в data null, а сам ответ прячет в
    // error.context — читаем его сами, иначе вместо «страница ответила 403»
    // человек увидит безличное «Edge Function returned a non-2xx status code».
    //
    // context — Response НЕ всегда: когда до функции не достучались вовсе (её
    // не задеплоили, оборвалась сеть), там лежит объект без .clone, и слепой
    // вызов клонирования сам становился ошибкой, которую видел человек
    // («context.clone is not a function») вместо причины отказа.
    const context = (error as { context?: unknown }).context
    const said = context instanceof Response
      ? await context.clone().json().then(b => b?.error as string | undefined).catch(() => undefined)
      : undefined
    throw new Error(said || error.message || t('Не получилось разобрать источник'))
  }
  if (data?.error) throw new Error(data.error as string)

  const cards = ((data?.cards ?? []) as SetCard[]).map(c => ({
    term: String(c.term ?? '').trim(),
    ru: String(c.ru ?? '').trim(),
    note: c.note?.trim() || undefined,
    ep: c.ep?.trim() || undefined,
  })).filter(c => c.term)

  return { cards, source: (data?.source ?? 'link') as CardImportSource, title: data?.title, model: data?.model }
}

/**
 * Карточки со снимков.
 *
 * ПАРТИЯМИ И ПОСЛЕДОВАТЕЛЬНО. Партии идут одна за другой, а не параллельно: у
 * шлюза лимит по запросам в минуту, и десять одновременных обращений он
 * встречает отказом, из которого не видно, что виновата спешка, а не снимок.
 *
 * РАЗОБРАННОЕ НЕ ПРОПАДАЕТ. Упавшая партия не роняет заход целиком: карточки
 * с прочитанных страниц возвращаются, а о непрочитанных панель говорит
 * отдельной строкой. Иначе двенадцатая страница, снятая против света, стирала
 * бы работу над одиннадцатью предыдущими.
 *
 * `ep` — запасная метка: раздел, найденный в самом источнике, сильнее (её
 * подставляет функция `cards-extract`).
 */
export async function importCardsFromPhotos(
  files: File[],
  opts: { lang: string; ep?: string; onProgress?: (done: number, total: number) => void },
): Promise<CardImportResult> {
  const take = files.slice(0, MAX_PHOTOS)
  if (take.length === 0) throw new Error(t('Не выбрано ни одного снимка'))

  const images: string[] = []
  for (const f of take) images.push(await optimizePhoto(f, { maxDim: 1600, quality: 0.82 }))

  const batches: string[][] = []
  for (let i = 0; i < images.length; i += PHOTOS_PER_CALL) {
    batches.push(images.slice(i, i + PHOTOS_PER_CALL))
  }

  const cards: SetCard[] = []
  const failures: string[] = []
  let model: string | undefined
  let done = 0
  opts.onProgress?.(0, images.length)

  for (const batch of batches) {
    try {
      const res = await call({ lang: opts.lang, ep: opts.ep, images: batch })
      cards.push(...res.cards)
      model = model ?? res.model
    } catch (e) {
      failures.push(e instanceof Error ? e.message : String(e))
    }
    done += batch.length
    opts.onProgress?.(done, images.length)
  }

  // Сбой на всех партиях — это не «нашлось ноль карточек», а отказ: причину
  // надо показать словами первой из них, а не пустым списком.
  if (cards.length === 0 && failures.length > 0) throw new Error(failures[0])

  return {
    cards: dedupe(cards),
    source: 'photo',
    model,
    failed: failures.length || undefined,
  }
}

/** Карточки по ссылке: таблица и CSV разбираются парсером, остальное — моделью. */
export async function importCardsFromLink(
  url: string,
  opts: { lang: string; ep?: string },
): Promise<CardImportResult> {
  const clean = url.trim()
  if (!clean) throw new Error(t('Вставьте ссылку'))
  const withScheme = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`
  return call({ lang: opts.lang, ep: opts.ep, url: withScheme })
}

/**
 * Дубли по слову. Одно и то же слово попадается на развороте дважды, а страницы
 * пачки перекрываются краями — первое вхождение выигрывает, как и на сервере.
 */
function dedupe(cards: SetCard[]): SetCard[] {
  const seen = new Set<string>()
  return cards.filter(c => {
    const k = c.term.toLowerCase()
    return seen.has(k) ? false : (seen.add(k), true)
  })
}

/**
 * Карточки → стопки по метке раздела, в порядке первого появления.
 *
 * Карточки без метки собираются в отдельную стопку с пустым заголовком: как её
 * назвать, решает уже тот, кто раскладывает, — здесь придумывать ей имя значило
 * бы прятать решение в утилите.
 */
export function groupByEp(cards: SetCard[]): Array<{ title: string; cards: SetCard[] }> {
  const out: Array<{ title: string; cards: SetCard[] }> = []
  for (const c of cards) {
    const title = c.ep?.trim() ?? ''
    const bucket = out.find(g => g.title === title)
    if (bucket) bucket.cards.push(c)
    else out.push({ title, cards: [c] })
  }
  return out
}

/** Подпись источника для превью. */
export function sourceLabel(source: CardImportSource): string {
  switch (source) {
    case 'photo': return t('Со снимка')
    case 'sheet': return t('Из Google Таблицы')
    case 'csv': return t('Из таблицы')
    case 'quizlet': return t('Из набора Quizlet')
    default: return t('Со страницы')
  }
}
