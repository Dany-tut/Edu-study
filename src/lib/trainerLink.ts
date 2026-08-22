// ─────────────────────────────────────────────────────────────────────────────
// Адрес открытого материала тренажёра
//
// ЗАЧЕМ. До этого «Чтение» жило целиком внутри состояния: адрес всегда был
// «#/trainer», что бы ни было открыто. Два следствия, и оба видны сразу.
//
// 1. ПРИСЛАТЬ РАССКАЗ БЫЛО НЕЧЕМ. «Прочитай „Счастливый день“» приходилось
//    объяснять словами: тренажёр → корейский → Чтение → Сцены → полка «Корея».
//    Теперь у каждого произведения и каждой сцены свой адрес, и он открывается
//    у другого человека ровно на том же экране.
//
// 2. МАТЕРИАЛ ПЕРЕЖИВАЛ СМЕНУ ЯЗЫКА. Что открыто — помнилось по ключу с языком
//    (`trainer.ko.work`), но usePersistentState читает хранилище только на
//    первом рендере: при смене предмета ключ менялся, а значение оставалось
//    прежним и тут же записывалось в новый ключ. Корейский рассказ оказывался
//    «открыт» в английском — с пустым списком сцен, потому что сцены-то
//    приезжали английские. Отсюда правило: открытый материал ВСЕГДА сверяется с
//    языком (см. linkLang и проверку openWorkId в LanguageTrainer).
//
// ЯЗЫК ВЫЧИСЛЯЕТСЯ ИЗ ССЫЛКИ СИНХРОННО. Поэтому сцена адресуется вместе со
// своим произведением (`#/trainer/work/hyun-unsu/sc-unsu-1`): реестр WORKS
// синхронный, а сами сцены приезжают отдельным чанком — по одному id сцены до
// загрузки нельзя понять даже, какой язык открывать.
// ─────────────────────────────────────────────────────────────────────────────

import { SUBJECTS } from './subjects'
import { workById } from '../data/scenes'
import { READING_LIBRARY } from '../data/readingLibrary'

export type TrainerLink =
  /** Произведение и, если открыта, его сцена. */
  | { kind: 'work'; workId: string; sceneId?: string }
  /** Учебный текст из readingLibrary. */
  | { kind: 'text'; textId: string }

const RE = /^#\/trainer\/(work|text)\/([^?#]+)/

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

export function parseTrainerLink(hash: string): TrainerLink | null {
  const m = RE.exec(hash)
  if (!m) return null
  const parts = m[2].split('/').filter(Boolean).map(decodeURIComponent)
  if (parts.length === 0) return null
  if (m[1] === 'text') return { kind: 'text', textId: parts[0] }
  return { kind: 'work', workId: parts[0], sceneId: parts[1] }
}

export function trainerHash(link: TrainerLink): string {
  if (link.kind === 'text') return `#/trainer/text/${encodeURIComponent(link.textId)}`
  const tail = link.sceneId ? `/${encodeURIComponent(link.sceneId)}` : ''
  return `#/trainer/work/${encodeURIComponent(link.workId)}${tail}`
}

/** Абсолютный адрес — то, что кладётся в буфер по кнопке «Поделиться». */
export function trainerShareUrl(link: TrainerLink): string {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}${trainerHash(link)}`
}

/**
 * Переписать адрес под открытый материал. replaceState, а не hash =: смена
 * материала — это не шаг навигации, и «Назад» должен уводить из тренажёра, а не
 * листать двадцать открытых по очереди сцен.
 */
export function writeTrainerHash(link: TrainerLink | null) {
  const next = link ? trainerHash(link) : '#/trainer'
  if (window.location.hash !== next) window.history.replaceState(null, '', next)
}

/** Язык материала по ссылке. undefined — материала уже нет в библиотеке. */
export function linkLang(link: TrainerLink): string | undefined {
  if (link.kind === 'text') return READING_LIBRARY.find(x => x.id === link.textId)?.lang
  return workById(link.workId)?.lang
}

/** Слаг предмета, в котором открывается материал: 'korean', 'english', … */
export function linkSubjectId(link: TrainerLink): string | undefined {
  const lang = linkLang(link)
  if (!lang) return undefined
  return SUBJECTS.find(s => s.isLanguage && s.langCode && base(s.langCode) === base(lang))?.id
}

/**
 * Ссылка, с которой открыли вкладку.
 *
 * Читается один раз при загрузке модуля: дальше адрес переписывают и сам
 * тренажёр, и роутер кабинета, и к моменту, когда до неё дойдут руки, в
 * window.location.hash будет уже «#/trainer».
 */
const BOOT = parseTrainerLink(window.location.hash)
let bootTaken = false

/** Ссылка загрузки — для того, кто решает, какой предмет открыть. */
export const bootTrainerLink = (): TrainerLink | null => BOOT

/**
 * Она же, но одноразово: применивший её экран забирает ссылку себе, чтобы
 * повторное монтирование не утаскивало ученика обратно в присланный рассказ.
 */
export function takeBootTrainerLink(): TrainerLink | null {
  if (bootTaken) return null
  bootTaken = true
  return BOOT
}

/** Тот же язык с точностью до региона: pt и pt-BR — один. */
export const sameLang = (a: string | undefined, b: string | undefined): boolean =>
  !!a && !!b && base(a) === base(b)
