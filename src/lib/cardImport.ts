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
}

/**
 * Больше четырёх снимков за раз не отправляем: это уже не список слов, а книга.
 * Число названо словом в подписи панели (CardImportPanel) — ключ словаря
 * английского собирается из целой фразы, подставить в него значение нечем.
 * Меняешь здесь — правь и там.
 */
export const MAX_PHOTOS = 4

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

/** Карточки со снимков. `ep` проставляется всем сразу — снимают обычно одну серию/урок. */
export async function importCardsFromPhotos(
  files: File[],
  opts: { lang: string; ep?: string },
): Promise<CardImportResult> {
  const images: string[] = []
  for (const f of files.slice(0, MAX_PHOTOS)) {
    images.push(await optimizePhoto(f, { maxDim: 1600, quality: 0.82 }))
  }
  if (images.length === 0) throw new Error(t('Не выбрано ни одного снимка'))
  return call({ lang: opts.lang, ep: opts.ep, images })
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
