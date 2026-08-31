// ─────────────────────────────────────────────────────────────────────────────
// Адрес экрана тренажёра
//
// ЗАЧЕМ. До этого адрес был у трёх вещей из «Чтения» — у произведения, сцены и
// ленты, — а остальные шестнадцать экранов жили целиком внутри состояния: что
// бы ни было открыто, в строке браузера стояло «#/trainer». Два следствия, и
// оба видны сразу.
//
// 1. ПРИСЛАТЬ БЫЛО НЕЧЕГО. «Посмотри ряд 물·불·뿔·풀·볼» приходилось объяснять
//    словами: тренажёр → корейский → Карточки → Созвучия → третий ряд. То же с
//    темой разговорника, формой справочника, главой «О языке», набором счёта.
//    Теперь у каждого экрана свой адрес, и он открывается у другого человека
//    ровно тем же экраном.
//
// 2. F5 ВОССТАНАВЛИВАЛ ЭКРАН, А АДРЕС ПРО НЕГО ВРАЛ. Открытое переживало
//    перезагрузку через usePersistentState, но строка браузера про это молчала:
//    скопировать адрес из неё (единственный путь на телефоне, где кнопки не
//    было) значило прислать человеку пустой тренажёр.
//
// СХЕМА. `#/trainer/<язык>/<экран>[/<id>[/<под-id>]]`, например
// `#/trainer/ko/nests/mul-bul` или `#/trainer/ko/scenes/hyun-unsu/sc-unsu-1`.
//
// ЯЗЫК СТОИТ В АДРЕСЕ ЯВНО. Он нужен СИНХРОННО — по нему выбирается предмет
// тренажёра ещё до того, как приедут курсы и чанки материалов (см.
// trainerSubject). У рассказа и учебного текста язык можно было вычислить по
// синхронному реестру, а у темы разговорника, формы грамматики и главы рассказа
// о языке — нельзя: их книги ленивые, до загрузки id ничего не говорит даже о
// языке. Один общий разбор с языком в адресе вместо трёх частных.
//
// СТАРЫЕ АДРЕСА ПРОДОЛЖАЮТ РАБОТАТЬ. `#/trainer/work/<id>[/<scene>]`,
// `#/trainer/text/<id>` и `#/trainer/feed/<lang>` уже разошлись по перепискам —
// они разбираются как раньше (язык у первых двух берётся из legacyLinkIndex), но
// записываются с этого момента в новом виде.
// ─────────────────────────────────────────────────────────────────────────────

import { SUBJECTS } from './subjects'
// Лёгкая таблица, а не сами реестры: разбор идёт до первого кадра, и WORKS с
// READING_LIBRARY уезжали ради двух полей во входной чанк (см. legacyLinkIndex).
import { TEXT_LANG, WORK_LANG } from './legacyLinkIndex'

/**
 * Экран тренажёра. Плоский список, а не пара «режим + половина»: для адреса
 * важно не то, как экраны сгруппированы в меню, а то, что человек видит. Две
 * половины «Конструктора» — это два разных экрана, и адрес у них разный.
 */
export type TrainerScreen =
  // Чтение
  | 'texts' | 'scenes' | 'feed'
  // Карточки
  | 'sets' | 'nests' | 'packs' | 'decks' | 'due' | 'words'
  // Аудирование и говорение
  | 'audio' | 'speaking'
  // Конструктор
  | 'stems' | 'roots' | 'numbers' | 'sounds'
  // Справочники
  | 'grammar' | 'story' | 'books'

const SCREENS: TrainerScreen[] = [
  'texts', 'scenes', 'feed',
  'sets', 'nests', 'packs', 'decks', 'due', 'words',
  'audio', 'speaking',
  'stems', 'roots', 'numbers', 'sounds',
  'grammar', 'story', 'books',
]

const isScreen = (x: string): x is TrainerScreen => (SCREENS as string[]).includes(x)

export interface TrainerLink {
  /** Язык тренажёра: 'ko', 'en', 'pt-BR'. Он же выбирает предмет. */
  lang: string
  /**
   * Экран. Без него ссылка означает «открой этот язык», а на каком экране —
   * решает сам тренажёр (последним открытым или своим стартовым).
   */
  screen?: TrainerScreen
  /** Открытое на экране: гнездо, тема, форма, глава, набор, текст, запись. */
  id?: string
  /** Второй уровень. Пока только один: сцена внутри произведения. */
  sub?: string
  /**
   * Предмет, если по языку его не угадать.
   *
   * ЗАЧЕМ. Язык в адресе выбирает предмет — и на одном языке предметов бывает
   * два: «Русский» и «Литература» оба идут с `langCode: 'ru'`. Поиск по коду
   * находил первый в реестре, то есть ЛЮБАЯ ссылка на литературу открывалась
   * русским: экран другой, тексты другие (они разведены по `subject`), и
   * присланная сцена просто не открывалась — молча, без сообщения.
   *
   * Поэтому у неоднозначного языка в адрес пишется слаг предмета
   * (`#/trainer/literature/texts/lit-irony`), а у однозначного — по-прежнему
   * код языка: ссылки на корейский и английский не меняются.
   */
  subjectId?: string
}

const RE = /^#\/trainer\/([^?#]+)/

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

/** Язык из реестра предметов по коду из адреса. undefined — такого языка нет. */
function knownLang(code: string): string | undefined {
  const s = SUBJECTS.find(x => x.isLanguage && x.langCode && base(x.langCode) === base(code))
  return s?.langCode
}

/** Предмет-язык по слагу из адреса: 'literature' → предмет «Литература». */
const subjectBySlug = (slug: string) =>
  SUBJECTS.find(x => x.isLanguage && x.langCode && x.id === slug.toLowerCase())

/** Делят ли этот код языка два предмета и больше (ru — «Русский» и «Литература»). */
const langIsShared = (lang: string) =>
  SUBJECTS.filter(x => x.isLanguage && x.langCode && base(x.langCode) === base(lang)).length > 1

/** Что писать в адрес первым сегментом: слаг предмета у общего языка, иначе код. */
function pathSubject(link: TrainerLink): string {
  return link.subjectId && langIsShared(link.lang) ? link.subjectId : link.lang
}

export function parseTrainerLink(hash: string): TrainerLink | null {
  const m = RE.exec(hash)
  if (!m) return null
  const parts = m[1].split('/').filter(Boolean).map(decodeURIComponent)
  if (parts.length === 0) return null

  // ── Старые адреса ──────────────────────────────────────────────────────────
  // Разбираются первыми: 'work' | 'text' | 'feed' не могут оказаться кодом
  // языка, так что новую схему они не затеняют.
  if (parts[0] === 'feed') {
    const lang = parts[1] ? knownLang(parts[1]) : undefined
    return lang ? { lang, screen: 'feed' } : null
  }
  if (parts[0] === 'text') {
    // 'ru|literature' — язык и предмет там, где по языку предмет не угадать.
    const [lang, subjectId] = (TEXT_LANG[parts[1]] ?? '').split('|')
    return lang ? { lang, subjectId, screen: 'texts', id: parts[1] } : null
  }
  if (parts[0] === 'work') {
    const lang = WORK_LANG[parts[1]]
    return lang ? { lang, screen: 'scenes', id: parts[1], sub: parts[2] } : null
  }

  // ── Общая схема ────────────────────────────────────────────────────────────
  // Первым сегментом бывает и слаг предмета — у языка, на котором предметов
  // несколько (см. subjectId). Проверяем его раньше кода: 'ru' и 'russian' не
  // сталкиваются, а вот 'literature' по коду не находится вовсе.
  const bySlug = subjectBySlug(parts[0])
  const lang = bySlug?.langCode ?? knownLang(parts[0])
  if (!lang) return null
  const subjectId = bySlug?.id
  if (parts.length === 1) return { lang, subjectId }
  // Экран из будущей (или уже переименованной) версии — не повод потерять язык:
  // ссылка всё равно откроет корейский тренажёр, просто на его обычном месте.
  if (!isScreen(parts[1])) return { lang, subjectId }
  return { lang, subjectId, screen: parts[1], id: parts[2], sub: parts[3] }
}

export function trainerHash(link: TrainerLink): string {
  const e = encodeURIComponent
  let out = `#/trainer/${e(pathSubject(link))}`
  if (link.screen) out += `/${link.screen}`
  if (link.screen && link.id) out += `/${e(link.id)}`
  if (link.screen && link.id && link.sub) out += `/${e(link.sub)}`
  return out
}

/** Абсолютный адрес — то, что кладётся в буфер по кнопке «Поделиться». */
export function trainerShareUrl(link: TrainerLink): string {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}${trainerHash(link)}`
}

/**
 * Переписать адрес под открытый экран. replaceState, а не hash =: переход между
 * экранами тренажёра — это не шаг навигации, и «Назад» должен уводить из
 * тренажёра, а не листать двадцать открытых по очереди тем.
 */
export function writeTrainerHash(link: TrainerLink | null) {
  const next = link ? trainerHash(link) : '#/trainer'
  if (window.location.hash !== next) window.history.replaceState(null, '', next)
}

/** Слаг предмета, в котором открывается ссылка: 'korean', 'english', … */
export function linkSubjectId(link: TrainerLink): string | undefined {
  // Явный предмет из адреса важнее поиска по языку: у общего кода поиск всегда
  // отдаёт первый предмет реестра, то есть «Русский» вместо «Литературы».
  if (link.subjectId) return link.subjectId
  return SUBJECTS.find(s => s.isLanguage && s.langCode && base(s.langCode) === base(link.lang))?.id
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

/**
 * Ссылка, поставленная в очередь ИЗ САМОГО КАБИНЕТА.
 *
 * Адрес читается один раз при загрузке модуля, и этого хватало, пока по
 * ссылкам приходили снаружи. Но виджет главной («Лента · 3 новых») — это
 * переход ВНУТРИ вкладки: hash сменился бы, а BOOT остался бы прежним, и
 * тренажёр открылся бы на том, что было в нём в прошлый раз. Тем же каналом
 * возвращается ссылка, которую гость открыл до входа (см. stashTrainerLink).
 */
let PENDING: TrainerLink | null = null

/** Открыть экран из кабинета. Забирает тренажёр при следующем монтировании. */
export function queueTrainerLink(link: TrainerLink): void {
  PENDING = link
}

/**
 * Ссылка загрузки — для того, кто решает, какой предмет открыть.
 *
 * ЗАБРАННАЯ ССЫЛКА БОЛЬШЕ НЕ ОТВЕЧАЕТ. Пока `bootTaken` знал о себе только
 * `takeBootTrainerLink`, адрес загрузки жил до конца вкладки: ученик приходил
 * по присланной английской ссылке, выбирал в меню корейский, уходил на главную
 * — и КАЖДОЕ следующее открытие тренажёра снова читало ту же ссылку (она
 * сильнее и памяти, и курса главной) и возвращало английский. Ссылка — событие
 * прихода, а не постоянное свойство вкладки: применили один раз и забыли.
 */
export const bootTrainerLink = (): TrainerLink | null => PENDING ?? (bootTaken ? null : BOOT)

/**
 * Она же, но одноразово: применивший её экран забирает ссылку себе, чтобы
 * повторное монтирование не утаскивало ученика обратно в присланный материал.
 */
export function takeBootTrainerLink(): TrainerLink | null {
  if (PENDING) { const p = PENDING; PENDING = null; return p }
  if (bootTaken) return null
  bootTaken = true
  return BOOT
}

// ─────────────────────────────────────────────────────────────────────────────
// Ссылка, открытая ДО входа
//
// Присланный адрес обычно открывает человек, у которого в этой вкладке нет
// сессии: кабинет показывает ему лендинг, а адрес при первом же переходе на
// «Войти» стирается — и после входа он оказывается на своей главной, без
// всякого следа того, ради чего пришёл. Поэтому ссылка откладывается ДО
// показа лендинга и забирается после входа (см. App.tsx).
//
// sessionStorage, а не localStorage: отложенное живёт ровно в той вкладке, где
// по ссылке пришли, и умирает вместе с ней. В localStorage такая запись
// пережила бы и вход, и неделю работы, и однажды утащила бы человека в чужой
// рассказ посреди обычного дня.
// ─────────────────────────────────────────────────────────────────────────────

const STASH = 'trainer_link_pending'

export function stashTrainerLink(link: TrainerLink): void {
  try { sessionStorage.setItem(STASH, trainerHash(link)) } catch { /* приватный режим */ }
}

export function takeStashedTrainerLink(): TrainerLink | null {
  try {
    const raw = sessionStorage.getItem(STASH)
    if (!raw) return null
    sessionStorage.removeItem(STASH)
    return parseTrainerLink(raw)
  } catch {
    return null
  }
}

/** Тот же язык с точностью до региона: pt и pt-BR — один. */
export const sameLang = (a: string | undefined, b: string | undefined): boolean =>
  !!a && !!b && base(a) === base(b)
