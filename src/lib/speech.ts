// ─────────────────────────────────────────────────────────────────────────────
// Браузерный синтез речи — одна точка на всё приложение.
//
// ЗАЧЕМ ОБЩИЙ МОДУЛЬ. Раньше `new SpeechSynthesisUtterance(...)` жил в пяти
// местах (плеер, стопка карточек, список фраз, подсказка о слове, гнёзда
// созвучий), и каждое чинило свои болячки отдельно: где-то был счётчик запусков
// против запоздалого onend, где-то нет; где-то речь глохла при уходе с экрана,
// где-то продолжала говорить на следующем. Здесь всё это один раз.
//
// ТРИ ВЕЩИ, КОТОРЫЕ ДЕЛАЕТ ЭТОТ МОДУЛЬ И НЕ ДЕЛАЕТ БРАУЗЕР
//
// 1. ВЫБИРАЕТ ГОЛОС. Если голос не задан явно, движок берёт голос системного
//    языка: английский текст читается русским роботом по буквам. Поэтому голос
//    выбираем сами — по локали и по качеству (сетевые Google-голоса и Siri
//    живее «компактных» системных).
//
// 2. РЕЖЕТ ТЕКСТ НА РЕПЛИКИ. Chrome молча замолкает примерно на пятнадцатой
//    секунде одного utterance — сцена на полторы тысячи знаков не дочитывается
//    до конца никогда. Плюс нарезка снимает таймкоды («20:41 Come now» читалось
//    как «двадцать сорок один»), даёт паузу между репликами и позволяет
//    подсветить читаемую строку.
//
// 3. ЗНАЕТ, ЧТО ГОВОРИТ СЕЙЧАС. Голос в приложении один: начатая речь гасит
//    предыдущую. Тот, кого перебили, получает свой onEnd — иначе у него навсегда
//    останется гореть индикатор «звучит».
// ─────────────────────────────────────────────────────────────────────────────

import { preferPlaybackSession } from './audioSession'

const BLANKS = [
  // Подчёркивание в прозе не встречается вовсе — снимаем даже одиночное.
  /_+/g,
  // Отточие оглавления («Глава 1 ....... 7»). Три точки — многоточие, оставляем.
  /\.{4,}/g,
  // Линейка из дефисов или тире. Одиночное тире — знак препинания.
  /[-–—]{3,}/g,
]

/**
 * Строка для голоса: без «пустых мест» — прочерков, отточий, линеек.
 *
 * Договор, заявление, бланк теста кончаются местом для подписи:
 * «Pupil ______________ Parent or guardian ______________». Синтезатор читает
 * подчёркивание как слово: вместо подписи ученик слышит «андерскор андерскор
 * андерскор» сорок раз подряд. То же с отточием оглавления («Глава 1 ....... 7»)
 * и с линейкой из дефисов вместо разделителя.
 *
 * ЧИСТИМ ТОЛЬКО ДЛЯ ГОЛОСА. На экране прочерк обязан остаться: по нему видно,
 * что и куда вписывают, — поэтому чистка живёт здесь, а не в speechLines(),
 * которым «партитура» рисует строки.
 */
export function voiceText(raw: string): string {
  let out = raw ?? ''
  // Прочерк меняем на пробелы ТОЙ ЖЕ ДЛИНЫ, а не выбрасываем: событие boundary
  // отдаёт позицию символа внутри произносимой строки, и по ней «партитура»
  // ведёт караоке-подсветку по строке ИСХОДНОЙ. Сдвинь длину — и подсветка
  // после первого же бланка поедет на пол-слова.
  for (const re of BLANKS) out = out.replace(re, m => ' '.repeat(m.length))
  return out
}

/** Текст для синтеза: без хвостовой подсказки-чтения в скобках.
 *
 *  Лицо словарной карточки у старых заданий хранится одной строкой вида
 *  «아이 (ai)»: слово и его романизация вместе. Синтезатор читает такую строку
 *  целиком — сначала слово, потом латиницу, — и на слух это неотличимо от
 *  «слово произнеслось дважды». */
export function speechText(raw: string): string {
  const clean = voiceText((raw ?? '').replace(/\s*[([][^)\]]*[)\]]\s*$/, '')).trim()
  return clean || voiceText(raw ?? '').trim()
}

/** Письменность изучаемого языка: по ней в смешанной строке видно, что читать. */
const OWN_SCRIPT: Record<string, RegExp> = {
  ko: /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/,
  ja: /[\u3040-\u30FF\u4E00-\u9FFF]/,
  zh: /[\u4E00-\u9FFF]/,
}

const CYRILLIC = /[\u0410-\u044F\u0401\u0451]/

/**
 * Из смешанной строки — только материал на изучаемом языке.
 *
 * Задание формулируется по-русски вокруг слова: «Как звучит 있어요?». На экране
 * так и надо — вопрос должен быть понятен. Но кнопка озвучки на карточке
 * означает «как это произносится», и корейский голос честно читает всю строку:
 * ученик слышит «Как звучит» с корейским акцентом и только потом само слово.
 *
 * Поэтому для голоса оставляем слова СВОЕЙ письменности (хангыль, кана, иероглиф),
 * а для языков на латинице — всё, кроме кириллицы: она здесь язык интерфейса, а
 * не материала. Если своего не нашлось вовсе (лицо карточки — русский перевод),
 * читаем строку целиком: молчащая кнопка хуже лишнего слова.
 */
export function speechTarget(raw: string, lang?: string): string {
  const text = speechText(raw)
  const base = (lang ?? '').split('-')[0]
  // Русский курс: кириллица в нём и есть материал, чистить нечего.
  if (!base || base === 'ru') return text
  const own = OWN_SCRIPT[base]
  const words = text.split(/\s+/).filter(Boolean)
  const keep = words.filter(w => (own ? own.test(w) : !CYRILLIC.test(w)))
  if (keep.length === 0 || keep.length === words.length) return text
  return keep.join(' ')
}

/** Полная локаль для голоса: с голым «ko» браузер нередко берёт голос
 *  системного языка и произносит слово по буквам. */
export function speechLocale(lang?: string): string | undefined {
  if (!lang) return undefined
  if (lang.includes('-')) return lang
  const map: Record<string, string> = {
    en: 'en-US', ru: 'ru-RU', ko: 'ko-KR', ja: 'ja-JP', zh: 'zh-CN',
    // Португальский в проекте бразильский (курс под CELPE-Bras), а не европейский.
    es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-BR', tr: 'tr-TR',
  }
  return map[lang] ?? lang
}

/** Оценка длительности озвучки в мс — для индикатора прогресса. Точной
 *  длительности Web Speech не даёт, индикатор всё равно снимается по onend.
 *
 *  Считаем по знакам без пробелов и с оглядкой на письменность: один хангыль
 *  или кана — целый слог, латиница с кириллицей проговариваются втрое быстрее
 *  посимвольно. Прежние общие 220 мс на знак давали для коротких слов вдвое
 *  больше реального звучания, и бегунок не добегал до конца слова. */
export function speechMs(text: string): number {
  const t = voiceText(text).trim()
  if (!t) return 700
  const syllabic = /[぀-ヿ㐀-鿿가-힯]/.test(t)
  const chars = t.replace(/\s+/g, '').length
  return Math.min(7000, Math.max(700, 300 + chars * (syllabic ? 185 : 78)))
}

// ─── Голоса ──────────────────────────────────────────────────────────────────

// Список голосов в Chrome при первом обращении пуст и наполняется асинхронно,
// событием voiceschanged. Ждать его в обработчике клика нельзя: на iOS речь
// стартует только внутри жеста пользователя, любой await — и звука не будет.
// Поэтому список греется при загрузке модуля, а клик читает уже готовый кэш.
let voices: SpeechSynthesisVoice[] = []

function refreshVoices() {
  try { voices = speechSynthesis.getVoices() ?? [] } catch { voices = [] }
  indexCharacterVoices()
}

/**
 * Штатные дикторы систем — по одному-двум на язык.
 *
 * ПОЧЕМУ СПИСКОМ, А НЕ ЭВРИСТИКОЙ. В списке из сорока голосов на en-US ровно
 * один нормальный диктор (Samantha), а остальные — либо «характерные» голоса
 * вроде Grandpa, либо звуковые шутки («Пузырьки», «Плохие новости»). Отличить
 * их по свойствам объекта нельзя: у всех localService=true, default=false, а
 * voiceURI в Chrome просто повторяет имя.
 *
 * ИМЕНА ПЕРЕВЕДЕНЫ НА ЯЗЫК ИНТЕРФЕЙСА. На русской системе Samantha называется
 * «Саманта», а Yuna — «Юна», поэтому в списке обе записи.
 */
const KNOWN_VOICES: Record<string, RegExp> = {
  en: /^(samantha|саманта|daniel|дэниэл|karen|карен|moira|мойра|tessa|тесса|google (us|uk) english)/i,
  ru: /^(milena|милена|yuri|юрий|google русский)/i,
  ko: /^(yuna|юна|google 한국의)/i,
  ja: /^(kyoko|кёко|o-ren|о-рэн|google 日本語)/i,
  pt: /^(luciana|лусиана|joana|жоана|google português)/i,
  es: /^(monica|моника|paulina|полина|google español)/i,
  fr: /^(thomas|тома|amelie|амели|google français)/i,
  de: /^(anna|анна|google deutsch)/i,
  it: /^(alice|алиса|google italiano)/i,
  zh: /^(ting-ting|тин-тин|google 普通话)/i,
}

/** Признаки хорошего голоса там, где списка нет: сетевые голоса Google и
 *  премиальные наборы Apple и Microsoft. */
const GOOD_VOICE = /google|neural|natural|siri|premium|enhanced|online/i

/** «Характерные» мультиязычные голоса Apple (Eddy, Flo, Grandma, Rocko…) и
 *  прочая экзотика. Узнаём не по именам, а по повадке: одно и то же имя висит
 *  сразу на многих языках — настоящий диктор так не делает. */
const MULTI_LANG_LIMIT = 3

function baseName(name: string): string {
  return name.split('(')[0].trim().toLowerCase()
}

/** Имена, встречающиеся более чем на MULTI_LANG_LIMIT языках. */
let characterVoices = new Set<string>()

function indexCharacterVoices() {
  const langs = new Map<string, Set<string>>()
  for (const v of voices) {
    const key = baseName(v.name)
    const set = langs.get(key) ?? new Set<string>()
    set.add((v.lang || '').split('-')[0].toLowerCase())
    langs.set(key, set)
  }
  characterVoices = new Set([...langs].filter(([, s]) => s.size >= MULTI_LANG_LIMIT).map(([k]) => k))
}

if (typeof speechSynthesis !== 'undefined') {
  refreshVoices()
  speechSynthesis.addEventListener?.('voiceschanged', refreshVoices)
}

function langOf(locale: string): string {
  return locale.split('-')[0].toLowerCase()
}

/** Голоса, подходящие под локаль: точное совпадение впереди диалектов. */
function voicesFor(locale: string): SpeechSynthesisVoice[] {
  const want = locale.toLowerCase()
  const lang = langOf(want)
  const hit = voices.filter(v => langOf((v.lang || '').replace('_', '-')) === lang)
  return hit.sort((a, b) => Number(b.lang.toLowerCase() === want) - Number(a.lang.toLowerCase() === want))
}

// ─── Короткий список: между чем вообще выбирать ──────────────────────────────

/** Кто говорит. Ученику важен не движок, а голос: женский, мужской, детский —
 *  на слух это три разные задачи аудирования. */
export type VoiceRole = 'f' | 'm' | 'kid'

export interface VoiceOption {
  voice: SpeechSynthesisVoice
  /** Короткое имя: «Ava», а не «Microsoft Ava Online (Natural) - English (United States)». */
  label: string
  role?: VoiceRole
}

interface VoicePick { name: RegExp; label: string; role: VoiceRole }

/**
 * Отобранные дикторы — по три-шесть на язык, и это весь выбор ученика.
 *
 * ПОЧЕМУ РУЧНОЙ СПИСОК, А НЕ «ВСЁ ХОРОШЕЕ». В Edge на один английский приходит
 * под сорок голосов, и все называются одинаково: «Microsoft Ava Multilingual
 * Online (Natural) - English (United States)» — сорок строк, различающихся
 * одним словом в середине. Рядом системные шутки Apple («Пузырьки», «Плохие
 * новости»). Выбрать из такого списка нельзя: имя не говорит ни о поле, ни о
 * возрасте, ни об акценте, а прослушивать сорок штук никто не станет.
 *
 * ЧТО ОТБИРАЛИ. Нейросетевые голоса Microsoft — они заметно живее системных, —
 * по паре женских и мужских на разных акцентах и детский там, где он есть: та
 * же фраза детским голосом слышится иначе, и это отдельная тренировка уха.
 *
 * ЧЕГО МОЖЕТ НЕ ОКАЗАТЬСЯ. Голоса Microsoft приходят только в Edge, в Chrome и
 * Safari их нет. Имя, которого в системе нет, просто не появится в списке; если
 * не найдётся ни одного — список собирается по-старому, из штатных дикторов.
 */
const VOICE_PICKS: Record<string, VoicePick[]> = {
  en: [
    { name: /^microsoft ava\b/i, label: 'Ava', role: 'f' },
    { name: /^microsoft andrew\b/i, label: 'Andrew', role: 'm' },
    { name: /^microsoft ana\b/i, label: 'Ana', role: 'kid' },
    { name: /^microsoft sonia\b/i, label: 'Sonia', role: 'f' },
    { name: /^microsoft ryan\b/i, label: 'Ryan', role: 'm' },
    { name: /^microsoft maisie\b/i, label: 'Maisie', role: 'kid' },
  ],
  ru: [
    { name: /^microsoft svetlana\b/i, label: 'Svetlana', role: 'f' },
    { name: /^microsoft dmitry\b/i, label: 'Dmitry', role: 'm' },
    { name: /^microsoft dariya\b/i, label: 'Dariya', role: 'f' },
  ],
  ko: [
    { name: /^microsoft sunhi\b/i, label: 'SunHi', role: 'f' },
    { name: /^microsoft injoon\b/i, label: 'InJoon', role: 'm' },
    { name: /^microsoft hyunsu\b/i, label: 'Hyunsu', role: 'm' },
  ],
  ja: [
    { name: /^microsoft nanami\b/i, label: 'Nanami', role: 'f' },
    { name: /^microsoft keita\b/i, label: 'Keita', role: 'm' },
    { name: /^microsoft masaru\b/i, label: 'Masaru', role: 'm' },
  ],
  zh: [
    { name: /^microsoft xiaoxiao\b/i, label: 'Xiaoxiao', role: 'f' },
    { name: /^microsoft yunxi\b/i, label: 'Yunxi', role: 'm' },
    { name: /^microsoft xiaoyi\b/i, label: 'Xiaoyi', role: 'f' },
    { name: /^microsoft yunjian\b/i, label: 'Yunjian', role: 'm' },
  ],
  es: [
    { name: /^microsoft elvira\b/i, label: 'Elvira', role: 'f' },
    { name: /^microsoft alvaro\b/i, label: 'Álvaro', role: 'm' },
    { name: /^microsoft ximena\b/i, label: 'Ximena', role: 'f' },
    { name: /^microsoft jorge\b/i, label: 'Jorge', role: 'm' },
  ],
  fr: [
    { name: /^microsoft denise\b/i, label: 'Denise', role: 'f' },
    { name: /^microsoft henri\b/i, label: 'Henri', role: 'm' },
    { name: /^microsoft eloise\b/i, label: 'Éloïse', role: 'kid' },
    { name: /^microsoft vivienne\b/i, label: 'Vivienne', role: 'f' },
  ],
  de: [
    { name: /^microsoft katja\b/i, label: 'Katja', role: 'f' },
    { name: /^microsoft conrad\b/i, label: 'Conrad', role: 'm' },
    { name: /^microsoft amala\b/i, label: 'Amala', role: 'f' },
    { name: /^microsoft killian\b/i, label: 'Killian', role: 'm' },
  ],
  it: [
    { name: /^microsoft elsa\b/i, label: 'Elsa', role: 'f' },
    { name: /^microsoft diego\b/i, label: 'Diego', role: 'm' },
    { name: /^microsoft isabella\b/i, label: 'Isabella', role: 'f' },
    { name: /^microsoft giuseppe\b/i, label: 'Giuseppe', role: 'm' },
  ],
  pt: [
    { name: /^microsoft francisca\b/i, label: 'Francisca', role: 'f' },
    { name: /^microsoft antonio\b/i, label: 'Antônio', role: 'm' },
    { name: /^microsoft thalita\b/i, label: 'Thalita', role: 'f' },
  ],
}

/**
 * Имена дикторов на их родном письме → латиница.
 *
 * Edge подписывает голос на языке САМОГО ГОЛОСА: корейский InJoon называется
 * «Microsoft 인준 Online (Natural) - Korean (Korea)», японская Nanami —
 * «Microsoft 七海 …». Отбор выше ищет их по латинским именам и на такой системе
 * не находил ни одного: ученику доставался полный список из сорока служебных
 * строк — ровно то, от чего отбор и заводили.
 *
 * Заодно это чинит и подпись: «인준» в списке для начинающего не имя, а
 * картинка — прочесть её и потом узнать в списке нельзя.
 */
const NATIVE_NAMES: [string, string][] = [
  ['선히', 'SunHi'], ['인준', 'InJoon'], ['현수', 'Hyunsu'], ['지민', 'JiMin'],
  ['서현', 'SeoHyeon'], ['봉진', 'BongJin'], ['국민', 'GookMin'], ['유진', 'YuJin'],
  ['七海', 'Nanami'], ['圭太', 'Keita'], ['勝', 'Masaru'], ['大智', 'Daichi'],
  ['真夕', 'Mayu'], ['直紀', 'Naoki'], ['詩織', 'Shiori'], ['葵', 'Aoi'],
  ['晓晓', 'Xiaoxiao'], ['云希', 'Yunxi'], ['晓伊', 'Xiaoyi'], ['云健', 'Yunjian'],
  ['云扬', 'Yunyang'], ['晓辰', 'Xiaochen'], ['晓涵', 'Xiaohan'], ['云夏', 'Yunxia'],
]

/** Имя голоса, приведённое к латинице: см. NATIVE_NAMES. */
function latinName(name: string): string {
  let s = name
  for (const [native, latin] of NATIVE_NAMES) {
    if (s.includes(native)) { s = s.replace(native, latin); break }
  }
  return s
}

/** Отобранные голоса, которые в этой системе действительно есть. */
function shortlist(locale: string): VoiceOption[] {
  const picks = VOICE_PICKS[langOf(locale)] ?? []
  const list = voicesFor(locale)
  const out: VoiceOption[] = []
  for (const p of picks) {
    const named = (v: SpeechSynthesisVoice) => p.name.test(latinName(v.name.trim()))
    // Мультиязычный близнец («Ava Multilingual») читает этим же голосом, но
    // существует ради чужих языков — берём обычного, если он в системе есть.
    const hit = list.find(v => named(v) && !/multilingual/i.test(v.name)) ?? list.find(named)
    if (hit && !out.some(o => o.voice.name === hit.name)) out.push({ voice: hit, label: p.label, role: p.role })
  }
  return out
}

/** Имя для списка: «Microsoft Ava Online (Natural) - English (United States)»
 *  → «Ava». Локаль и так стоит подписью рядом. */
function shortName(name: string): string {
  const s = latinName(name.trim())
  const ms = /^microsoft\s+(.+?)\s+online\b/i.exec(s)?.[1]
  if (ms) return ms
  // Голоса Apple и Google приходят коротким именем сразу, но с хвостом
  // качества: «Milena (Enhanced)», «Саманта (улучшенный)».
  return s.replace(/\s*\([^)]*\)\s*$/, '').trim() || s
}

/**
 * Лучший голос для локали — или undefined, если уверенности нет.
 *
 * UNDEFINED ЛУЧШЕ СЛУЧАЙНОГО ВЫБОРА. Без явного голоса система берёт своего
 * диктора по умолчанию для `utterance.lang`, и это обычно как раз нормальный
 * голос. Навязать вместо него первый попавшийся из списка — верный способ
 * читать урок голосом «Прыг-скок». Поэтому выбираем сами только там, где голос
 * заведомо лучше системного, а во всех остальных случаях не мешаем браузеру.
 */
export function pickVoice(locale?: string): SpeechSynthesisVoice | undefined {
  if (!locale || typeof speechSynthesis === 'undefined') return undefined
  if (!voices.length) { refreshVoices(); indexCharacterVoices() }
  // Отобранный диктор — первый в очереди и на автовыборе: список ученику мы
  // предлагаем тот же, и слышать по умолчанию он должен голос из этого списка.
  const short = shortlist(locale)
  if (short.length) return short[0].voice
  const known = KNOWN_VOICES[langOf(locale)]
  const list = voicesFor(locale)
  return list.find(v => known?.test(v.name.trim()))
    ?? list.find(v => GOOD_VOICE.test(v.name) && !characterVoices.has(baseName(v.name)))
    // Язык, для которого в системе всего один голос: выбора всё равно нет, а
    // явное указание страхует от подстановки голоса системного языка.
    ?? (list.length === 1 ? list[0] : undefined)
}

/** Есть ли в системе голос под этот язык. Пока список не пришёл, отвечаем «да»:
 *  обещание звука лучше, чем ложная надпись «озвучки нет» на первом же экране. */
export function hasVoiceFor(lang?: string): boolean {
  if (typeof speechSynthesis === 'undefined') return false
  if (!voices.length) return true
  const locale = speechLocale(lang)
  return !!locale && voicesFor(locale).length > 0
}

/**
 * Голоса языка для выбора учеником: отобранные (см. VOICE_PICKS), а если их в
 * системе нет — штатные дикторы, потом премиальные.
 *
 * ЗАЧЕМ ДАВАТЬ ВЫБОР. Разница между дикторами на слух больше, чем всё остальное
 * в озвучке вместе взятое, а одна и та же фраза женским, мужским и детским
 * голосом — это три разных упражнения на слух. Поэтому последнее слово за ухом
 * ученика, а наше дело — чтобы в списке было между чем выбирать и чтобы выбор
 * читался с одного взгляда.
 *
 * ЧЕГО В СПИСКЕ НЕТ. Мультиязычного семейства («Eddy», «Grandma» и прочие
 * характерные голоса Apple): они есть на каждом языке, забивают список и звучат
 * как мультфильм. Полный системный список остаётся под кнопкой «Показать все».
 */
export function voiceOptions(lang?: string, all = false): VoiceOption[] {
  const locale = speechLocale(lang)
  if (!locale || typeof speechSynthesis === 'undefined') return []
  if (!voices.length) refreshVoices()
  // Один найденный голос — это не выбор: честнее показать системных дикторов.
  if (!all) {
    const short = shortlist(locale)
    if (short.length >= 2) return short
  }
  const known = KNOWN_VOICES[langOf(locale)]
  const rank = (v: SpeechSynthesisVoice) =>
    known?.test(v.name.trim()) ? 0 : GOOD_VOICE.test(v.name) ? 1 : 2
  const list = voicesFor(locale)
    .filter(v => !characterVoices.has(baseName(v.name)))
    .sort((a, b) => rank(a) - rank(b))
  // По умолчанию — только дикторы. Полный список на macOS это 26 строк, из
  // которых 20 — звуковые шутки системы («Пузырьки», «Плохие новости»): выбирать
  // из такого списка нечего, а найти в нём Саманту трудно.
  const good = list.filter(v => rank(v) < 2)
  return (all || !good.length ? list : good).map(v => ({ voice: v, label: shortName(v.name) }))
}

// ─── Выбор ученика ───────────────────────────────────────────────────────────

// Свой голос на каждый язык: корейский и английский слушает один и тот же
// человек, а дикторы у них разные. Живёт в localStorage, а не в базе: голос
// зависит от того, ЧТО УСТАНОВЛЕНО В ЭТОЙ СИСТЕМЕ, и на другом устройстве имя
// из настроек всё равно ничего не значит.
const PREF_KEY = 'tts-voice'

function prefKey(lang?: string): string {
  return `${PREF_KEY}:${langOf(speechLocale(lang) ?? 'x')}`
}

/** Выбранный учеником голос для языка. Пустая строка — «системный». */
export function preferredVoice(lang?: string): string {
  try { return localStorage.getItem(prefKey(lang)) ?? '' } catch { return '' }
}

export function setPreferredVoice(lang: string | undefined, name: string) {
  try {
    if (name) localStorage.setItem(prefKey(lang), name)
    else localStorage.removeItem(prefKey(lang))
  } catch { /* приватный режим — просто останемся на автовыборе */ }
}

// ─── Разные дикторы у разных занятий ─────────────────────────────────────────

/**
 * Кто читает ЭТОТ урок (или эту домашку).
 *
 * ЗАЧЕМ. Один и тот же диктор на весь курс учит понимать одного человека.
 * В жизни с учеником говорят разные люди: выше и ниже, быстрее и медленнее,
 * с другим акцентом. Поэтому на автовыборе диктор закреплён не за языком, а за
 * занятием: в каждом уроке и в каждой домашке он свой, а внутри одного урока
 * — один и тот же от первого слова до последнего.
 *
 * ПОЧЕМУ ОТ СЕМЕНИ, А НЕ СЛУЧАЙНО. Голос урока обязан быть тем же самым при
 * возврате на экран и после перезагрузки: «послушать ещё раз» — это повтор
 * той же речи, а не новая. Номер урока даёт постоянный, но разный на соседних
 * уроках выбор, и никакого состояния хранить не нужно.
 *
 * ПОЧЕМУ ГЛОБАЛЬНО, А НЕ ПРОПОМ. Читают в уроке все подряд: конспект, карточки,
 * слово в подсказке, плеер, задания. Тащить «чей это урок» в каждый из них —
 * два десятка мест, где легко забыть; экран объявляет сцену на входе, и всё,
 * что в нём звучит, попадает в неё само.
 *
 * ВЫБОР УЧЕНИКА ВЫШЕ. Закрепил голос в пикере — читает он, во всех уроках:
 * человек попросил конкретного диктора, и «разнообразие» ему не навязываем.
 */
let sceneSeed = ''

/** Объявить сцену: с этого момента озвучка идёт голосом этого занятия.
 *  Пустое значение (или уход с экрана) возвращает обычный автовыбор. */
export function setVoiceScene(seed?: string | number | null) {
  sceneSeed = seed == null ? '' : String(seed)
}

/** Уйти со сцены. Гасим только СВОЮ: домашка открывается поверх урока и на
 *  закрытии не должна стирать сцену, объявленную не ею. */
export function clearVoiceScene(seed?: string | number | null) {
  const mine = seed == null ? '' : String(seed)
  if (!mine || sceneSeed === mine) sceneSeed = ''
}

/** Текущая сцена — на случай, если кому-то нужно передать её дальше вручную. */
export function voiceScene(): string {
  return sceneSeed
}

/** FNV-1a: короткая строка → число. Нужен только разброс, не криптография. */
function seedHash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Диктор этого занятия — или undefined, если вращать нечего.
 *
 * Список тот же, что видит ученик в пикере (см. voiceOptions): в нём уже нет
 * ни мультиязычных шуток Apple, ни системных «Пузырьков». Меньше двух голосов
 * — выбора нет, отдаём undefined и не мешаем обычному автовыбору.
 */
export function sceneVoice(lang?: string, seed = sceneSeed): SpeechSynthesisVoice | undefined {
  if (!seed) return undefined
  const list = voiceOptions(lang)
  if (list.length < 2) return undefined
  return list[seedHash(seed) % list.length].voice
}

// ─── Нарезка ─────────────────────────────────────────────────────────────────

/** Таймкод в начале строки: «20:41  Come now if you can.» Это разметка сцены,
 *  а не текст реплики, — вслух его читать не надо. */
const TIMECODE = /^\s*\d{1,2}:\d{2}(?::\d{2})?\s*[–—-]?\s*/

/** Предел длины куска. Chrome обрывает длинный utterance примерно на 15-й
 *  секунде — держим куски заведомо короче. */
const MAX_CHUNK = 180

/** Разбить длинную строку по предложениям, добирая куски до предела. */
function splitLong(line: string): string[] {
  if (line.length <= MAX_CHUNK) return [line]
  const sentences = line.match(/[^.!?…。！？]+[.!?…。！？]*\s*/g) ?? [line]
  const out: string[] = []
  let buf = ''
  for (const s of sentences) {
    if (buf && (buf + s).length > MAX_CHUNK) { out.push(buf.trim()); buf = '' }
    // Предложение и само длиннее предела (речь без точек) — рубим по пробелам.
    if (s.length > MAX_CHUNK) {
      let rest = s
      while (rest.length > MAX_CHUNK) {
        const cut = rest.lastIndexOf(' ', MAX_CHUNK)
        const at = cut > MAX_CHUNK / 2 ? cut : MAX_CHUNK
        out.push(rest.slice(0, at).trim())
        rest = rest.slice(at)
      }
      buf = rest
    } else buf += s
  }
  if (buf.trim()) out.push(buf.trim())
  return out.filter(Boolean)
}

/** Текст → куски для последовательной озвучки: строка = реплика, таймкоды
 *  сняты, слишком длинные строки разрезаны по предложениям. */
export function speechLines(raw: string): string[] {
  const out: string[] = []
  for (const line of (raw ?? '').split(/\r?\n+/)) {
    const clean = line.replace(TIMECODE, '').trim()
    // Строка без единой буквы (разделитель, номер сцены) — не звук.
    if (!clean || !/\p{L}/u.test(clean)) continue
    out.push(...splitLong(clean))
  }
  return out
}

/** Предложения внутри реплики — та же нарезка, что и у splitLong, но без
 *  порога длины: границей считается точка, а не переполнение куска. */
function splitSentences(line: string): string[] {
  const parts = line.match(/[^.!?…。！？]+[.!?…。！？]*\s*/g) ?? [line]
  const out: string[] = []
  for (const s of parts) {
    const clean = s.trim()
    if (clean) out.push(...splitLong(clean))
  }
  return out.length ? out : [line]
}

/**
 * Единицы озвучки — то, чем меряется промотка.
 *
 * `line` — реплика (строка): так речь звучит естественно, и между репликами
 * диалога слышна пауза. `sentence` нужен плееру: половина записей на слух
 * написана монологом в одну строку, и по репликам такая запись неделима —
 * бегунку не к чему липнуть, а «реплика 1 из 1» не отвечает ни на один вопрос
 * ученика. По предложениям тот же монолог разбирается на четыре куска, к
 * которым можно вернуться.
 */
export function speechUnits(raw: string, unit: 'line' | 'sentence' = 'line'): string[] {
  const lines = speechLines(raw)
  if (unit === 'line') return lines
  return lines.flatMap(splitSentences)
}

// ─── Речь ────────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  /** Код языка или полная локаль: en, ko, pt-BR. */
  lang?: string
  /** Скорость. 1 — обычная; для «медленно» лучше 0.8 плюс gap, чем 0.6: на
   *  0.6 браузерный голос перестаёт быть речью и превращается в кашу. */
  rate?: number
  /** Пауза между репликами, мс. Диалог без пауз звучит сплошняком. */
  gap?: number
  /** Чем резать текст: репликами (по умолчанию) или предложениями. Номер в
   *  `from` считается в ТЕХ ЖЕ единицах — иначе промотка попадёт не туда. */
  unit?: 'line' | 'sentence'
  /** Точное имя голоса (учитель мог выбрать его в редакторе задания). */
  voiceName?: string
  /** Чьё это занятие: номер урока, домашки, текста. На автовыборе диктор
   *  берётся по нему (см. sceneVoice) — разные уроки звучат разными людьми.
   *  Обычно не нужен: экран объявляет сцену один раз через setVoiceScene(). */
  seed?: string
  /**
   * С какой реплики начать (номер в speechLines).
   *
   * Промотка. У синтеза нет таймлайна: узнать «сейчас 0:41» и прыгнуть на
   * 0:52 нечем, единственная точка, к которой можно вернуться, — начало
   * реплики. Поэтому бегунок плеера липнет к границам реплик, а сюда приходит
   * та, с которой отпустили палец.
   */
  from?: number
  /**
   * Голос ЗАЗВУЧАЛ — не «мы попросили», а движок реально начал говорить.
   *
   * Между speak() и первым звуком проходит от десятков миллисекунд до секунды:
   * движок будит голос, а сетевой тянет его из сети. Индикатор, запущенный по
   * клику, к этому моменту уже на середине, и бегунок кончается раньше слова.
   * Всё, что рисует ход озвучки, обязано стартовать отсюда.
   */
  onStart?: () => void
  /** Началась очередная реплика — по этому подсвечивается строка текста.
   *  Зовётся в момент, когда реплика ЗАЗВУЧАЛА, а не когда встала в очередь. */
  onLine?: (index: number, total: number) => void
  /**
   * Голос дошёл до слова: номер реплики и позиция символа ВНУТРИ неё. По этому
   * ведётся караоке-подсветка в «партитуре».
   *
   * Событие boundary есть не у всех голосов (в Safari и у части системных
   * голосов Chrome оно молчит), поэтому оно только уточняет подсветку: тот, кто
   * ведёт караоке, обязан работать и на одном onLine — иначе на половине машин
   * текст просто не подсвечивается.
   */
  onWord?: (line: number, char: number) => void
  /**
   * Речь этого вызова кончилась: дочитана, отменена или перебита другой.
   * Зовётся ровно один раз — на нём безопасно гасить индикаторы.
   *
   * `done` отличает дочитанное до конца от оборванного. Читалке это нужно,
   * чтобы знать, куда возвращаться: текст, прерванный на середине (пауза,
   * клик по слову), должен продолжиться с той же реплики, а дочитанный —
   * начаться сначала.
   */
  onEnd?: (done: boolean) => void
}

export interface SpeechHandle {
  /** Остановить, если говорит всё ещё этот вызов. */
  stop: () => void
}

const NOOP: SpeechHandle = { stop: () => {} }

// Голос в приложении один: любой новый speak() гасит предыдущий. Номер запуска
// отсекает запоздалые onend от уже отменённой речи — без него onend добитой
// реплики гасил бы индикатор той, что только что зазвучала.
let run = 0
let gapTimer: ReturnType<typeof setTimeout> | null = null
let startTimer: ReturnType<typeof setTimeout> | null = null
let activeEnd: ((done: boolean) => void) | null = null

/** Страховка на случай молчащего onstart: столько ждём сигнала от движка,
 *  прежде чем считать, что реплика всё-таки зазвучала.
 *
 *  Заведомо больше любой живой задержки запуска: локальный голос стартует за
 *  десяток миллисекунд, сетевой — за секунду с небольшим. Сработать раньше
 *  настоящего onstart этот таймер не должен, иначе он вернёт ровно ту болячку,
 *  от которой лечит, — бегунок впереди голоса. */
const START_FALLBACK = 2500

/** Закрыть текущую речь: снять таймеры и отдать onEnd тому, кто говорил. */
function finish(done = false) {
  run++
  if (gapTimer) { clearTimeout(gapTimer); gapTimer = null }
  if (startTimer) { clearTimeout(startTimer); startTimer = null }
  const end = activeEnd
  activeEnd = null // до вызова: onEnd вправе сам позвать stopSpeech
  end?.(done)
}

/** Прервать любую речь. */
export function stopSpeech() {
  finish()
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

/**
 * Произнести текст. Многострочный читается репликами по очереди — это и есть
 * лекарство от обрыва в Chrome, и от чтения таймкодов, и повод дать паузу.
 */
export function speak(raw: string, opts: SpeakOptions = {}): SpeechHandle {
  if (typeof speechSynthesis === 'undefined') return NOOP
  // Задание на слух обязано звучать и при выключенном звонке — иначе на айфоне
  // «Прослушать» молчит, и понять почему нельзя (lib/audioSession.ts).
  preferPlaybackSession()
  const lines = speechUnits(raw, opts.unit ?? 'line')
  if (!lines.length) return NOOP

  stopSpeech()
  const mine = run
  activeEnd = opts.onEnd ?? null

  const locale = speechLocale(opts.lang)
  // Голос задания (его выбрал учитель) → голос ученика для этого языка →
  // диктор этого занятия → автовыбор. Выбор ученика бьёт автоматику: она
  // угадывает по именам, а он слышит результат. Ниже него — сцена: пока голос
  // не закреплён, каждый урок и каждая домашка читаются своим человеком.
  const chosen = opts.voiceName || preferredVoice(opts.lang)
  const voice = (chosen && voices.find(v => v.name === chosen))
    || sceneVoice(opts.lang, opts.seed ?? sceneSeed)
    || pickVoice(locale)
  const rate = opts.rate ?? 1
  const gap = opts.gap ?? 0

  // Промотка: читаем не с начала, а с выбранной реплики. Номер зажат в
  // границы списка — снаружи он приходит из бегунка, а список мог смениться.
  const start = Math.min(Math.max(0, Math.floor(opts.from ?? 0)), lines.length - 1)
  let i = start
  const next = () => {
    if (mine !== run) return
    if (i >= lines.length) { finish(true); return }
    const idx = i++
    const said = voiceText(lines[idx])
    const u = new SpeechSynthesisUtterance(said)
    if (locale) u.lang = locale
    if (voice) u.voice = voice
    u.rate = rate
    const step = () => {
      if (mine !== run) return
      if (gap && i < lines.length) gapTimer = setTimeout(next, gap)
      else next()
    }
    // Реплика ЗАЗВУЧАЛА. Признаём это по первому признаку жизни: событию
    // onstart, первому слову или — если движок молчит про оба — по таймеру.
    let began = false
    const begin = () => {
      if (began || mine !== run) return
      began = true
      if (startTimer) { clearTimeout(startTimer); startTimer = null }
      if (idx === start) opts.onStart?.()
      opts.onLine?.(idx, lines.length)
    }
    u.onstart = begin
    u.onboundary = e => {
      if (mine !== run) return
      begin()
      // name === 'sentence' приходит от части голосов вперемешку со словами;
      // для подсветки нужны только слова.
      if (e.name && e.name !== 'word') return
      opts.onWord?.(idx, e.charIndex)
    }
    u.onend = step
    // Ошибка одной реплики не должна ронять весь текст: interrupted/canceled
    // приходят от нашего же cancel() и отсекаются по номеру запуска, остальное
    // просто пропускаем и читаем дальше.
    u.onerror = step
    // Chrome после долгого простоя вкладки залипает в состоянии paused, и
    // speak() уходит в тишину. resume() на не-паузе безвреден.
    speechSynthesis.resume()
    speechSynthesis.speak(u)
    if (startTimer) clearTimeout(startTimer)
    startTimer = setTimeout(begin, START_FALLBACK)
  }
  next()

  return { stop: () => { if (mine === run) stopSpeech() } }
}
