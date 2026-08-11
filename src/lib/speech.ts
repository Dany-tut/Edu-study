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

/** Текст для синтеза: без хвостовой подсказки-чтения в скобках.
 *
 *  Лицо словарной карточки у старых заданий хранится одной строкой вида
 *  «아이 (ai)»: слово и его романизация вместе. Синтезатор читает такую строку
 *  целиком — сначала слово, потом латиницу, — и на слух это неотличимо от
 *  «слово произнеслось дважды». */
export function speechText(raw: string): string {
  const clean = (raw ?? '').replace(/\s*[([][^)\]]*[)\]]\s*$/, '').trim()
  return clean || (raw ?? '').trim()
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
  const t = (text ?? '').trim()
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
 * Голоса языка для выбора учеником: сначала штатные дикторы, потом
 * премиальные, потом остальные.
 *
 * ЗАЧЕМ ДАВАТЬ ВЫБОР. Автоматика угадывает по именам, а имена в системах
 * меняются: на одной машине «Саманта», на другой «Google US English», на
 * третьей ни того, ни другого — и ученик слушает урок голосом, который мы для
 * него выбрали вслепую. Разница между дикторами на слух больше, чем всё
 * остальное в озвучке вместе взятое, поэтому последнее слово — за ухом ученика.
 *
 * ЧЕГО В СПИСКЕ НЕТ. Мультиязычного семейства («Eddy», «Grandma» и прочие
 * характерные голоса Apple): они есть на каждом языке, забивают список и звучат
 * как мультфильм.
 */
export function listVoices(lang?: string): SpeechSynthesisVoice[] {
  const locale = speechLocale(lang)
  if (!locale || typeof speechSynthesis === 'undefined') return []
  if (!voices.length) refreshVoices()
  const known = KNOWN_VOICES[langOf(locale)]
  const rank = (v: SpeechSynthesisVoice) =>
    known?.test(v.name.trim()) ? 0 : GOOD_VOICE.test(v.name) ? 1 : 2
  return voicesFor(locale)
    .filter(v => !characterVoices.has(baseName(v.name)))
    .sort((a, b) => rank(a) - rank(b))
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

// ─── Речь ────────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  /** Код языка или полная локаль: en, ko, pt-BR. */
  lang?: string
  /** Скорость. 1 — обычная; для «медленно» лучше 0.8 плюс gap, чем 0.6: на
   *  0.6 браузерный голос перестаёт быть речью и превращается в кашу. */
  rate?: number
  /** Пауза между репликами, мс. Диалог без пауз звучит сплошняком. */
  gap?: number
  /** Точное имя голоса (учитель мог выбрать его в редакторе задания). */
  voiceName?: string
  /** Началась очередная реплика — по этому подсвечивается строка текста. */
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
  /** Речь этого вызова кончилась: дочитана, отменена или перебита другой.
   *  Зовётся ровно один раз — на нём безопасно гасить индикаторы. */
  onEnd?: () => void
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
let activeEnd: (() => void) | null = null

/** Закрыть текущую речь: снять таймер паузы и отдать onEnd тому, кто говорил. */
function finish() {
  run++
  if (gapTimer) { clearTimeout(gapTimer); gapTimer = null }
  const end = activeEnd
  activeEnd = null // до вызова: onEnd вправе сам позвать stopSpeech
  end?.()
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
  const lines = speechLines(raw)
  if (!lines.length) return NOOP

  stopSpeech()
  const mine = run
  activeEnd = opts.onEnd ?? null

  const locale = speechLocale(opts.lang)
  // Голос задания (его выбрал учитель) → голос ученика для этого языка →
  // автовыбор. Выбор ученика бьёт автоматику: она угадывает по именам, а он
  // слышит результат.
  const chosen = opts.voiceName || preferredVoice(opts.lang)
  const voice = (chosen && voices.find(v => v.name === chosen)) || pickVoice(locale)
  const rate = opts.rate ?? 1
  const gap = opts.gap ?? 0

  let i = 0
  const next = () => {
    if (mine !== run) return
    if (i >= lines.length) { finish(); return }
    const idx = i++
    opts.onLine?.(idx, lines.length)
    const u = new SpeechSynthesisUtterance(lines[idx])
    if (locale) u.lang = locale
    if (voice) u.voice = voice
    u.rate = rate
    const step = () => {
      if (mine !== run) return
      if (gap && i < lines.length) gapTimer = setTimeout(next, gap)
      else next()
    }
    if (opts.onWord) {
      u.onboundary = e => {
        if (mine !== run) return
        // name === 'sentence' приходит от части голосов вперемешку со словами;
        // для подсветки нужны только слова.
        if (e.name && e.name !== 'word') return
        opts.onWord?.(idx, e.charIndex)
      }
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
  }
  next()

  return { stop: () => { if (mine === run) stopSpeech() } }
}
