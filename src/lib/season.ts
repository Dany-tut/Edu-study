import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { useTheme } from '../store/themeStore'

/*
 * Праздничная тема кабинета ученика (пока одна — Хэллоуин). Строка в app_seasons
 * (миграция 0110): даты с/по, вариант оформления и части. Тема включается сама,
 * когда сейчас между starts_at и ends_at, и сама уходит после.
 *
 * Админ смотрит тему заранее «только у себя» — флаг в браузере, другим не виден.
 * Ученик выключает тему у себя в настройках (тоже браузер). Макеты трёх
 * вариантов — Figma «Искра», страница «Хэллоуин 2026 · концепты».
 *
 * ЦВЕТА — НЕ ПЕРЕМЕННЫМИ НА <html>. Оттенок курса (lib/courseTint.ts) пишет
 * акцент и фоны инлайном в style у <html>, и любой селектор html[data-season]
 * ему проигрывает. Поэтому тема рисует свои слои (фон, шапка, 3D-объекты) и
 * красит только то, что помечено её классами (season.css).
 */

export type SeasonKey = 'halloween' | 'new-year'
export type HalloweenVariant = 'lanterns' | 'candy' | 'potions'
/** Новый год 2027: yolka «Ёлка-лаборатория», polnoch «Полночь», shar «Снежный шар».
 *  Макеты — Figma «Искра», стр. «19 · Искра · Новый год 2027 · концепты». */
export type NewYearVariant = 'yolka' | 'polnoch' | 'shar'
export type SeasonVariant = HalloweenVariant | NewYearVariant
/** stickers и video — только у нового года: коллекция стикеров с подарками учителя
 *  и новогоднее оформление видеоурока. Хэллоуину их не показываем. */
export type SeasonPart = 'hero' | 'decor' | 'track' | 'empty' | 'stickers' | 'video'
export type SeasonParts = Record<SeasonPart, boolean>
/** ask — спрашивать ли ученика окном «Сейчас Хэллоуин — выбери тему» (иначе всем сразу
 *  включается variant). В базе лежит в parts.ask: отдельной колонки под флаг не заводили.
 *  variant — тема для всех, только когда не спрашиваем; при ask каждый выбирает свою. */
export type Season = { key: SeasonKey; enabled: boolean; startsAt: string; endsAt: string; variant: SeasonVariant; parts: SeasonParts; ask: boolean }
/** Выбор человека на этот сезон: свой вариант, «не надо» или ещё не выбирал. Личный —
 *  у ученика из окна, у админа из админки; на других он не влияет. */
export type SeasonChoice = SeasonVariant | 'off' | null

export type VariantInfo = { key: SeasonVariant; season: SeasonKey; title: string; about: string }
export const ALL_VARIANTS: VariantInfo[] = [
  { key: 'lanterns', season: 'halloween', title: 'Ночь фонарей', about: 'Тёмная на сезон. Урок — зажжённый фонарь' },
  { key: 'candy', season: 'halloween', title: 'Сладость или гадость', about: 'Светлая. Звёзды — конфеты в ведёрке' },
  { key: 'potions', season: 'halloween', title: 'Зельеварня', about: 'Вечерняя шапка. Успеваемость — колба' },
  { key: 'yolka', season: 'new-year', title: 'Ёлка-лаборатория', about: 'Сданная домашка вешает игрушку на ёлку' },
  { key: 'polnoch', season: 'new-year', title: 'Полночь', about: 'Отсчёт до Нового года и салют. Кабинет станет тёмным' },
  { key: 'shar', season: 'new-year', title: 'Снежный шар', about: 'Пройденный урок зажигает окно в городке' },
]
/** Варианты одного сезона — для окна выбора, меню и админки. */
export const variantsFor = (key: SeasonKey | undefined | null): VariantInfo[] =>
  ALL_VARIANTS.filter(v => v.season === (key ?? 'halloween'))
/** Совместимость: варианты Хэллоуина. Новый код берёт variantsFor(season.key). */
export const VARIANTS = variantsFor('halloween')

export const PARTS: { key: SeasonPart; title: string }[] = [
  { key: 'hero', title: 'Шапка и фон на главной' },
  { key: 'decor', title: '3D-объекты на плитках' },
  { key: 'track', title: 'Дорожка уроков в стиле темы' },
  { key: 'empty', title: 'Пустой день: привидение-листок' },
]
const NEW_YEAR_PARTS: { key: SeasonPart; title: string }[] = [
  { key: 'hero', title: 'Баннер, гирлянда и снег на главной' },
  { key: 'decor', title: 'Сугроб, снеговик и виджет сезона' },
  { key: 'track', title: 'Огонёк на дорожке уроков' },
  { key: 'empty', title: 'Пустой день: снеговик' },
  { key: 'stickers', title: 'Стикеры за учёбу и подарки учителя' },
  { key: 'video', title: 'Новогодний видеоурок' },
]
/** Части, которые есть у сезона, — для админки. */
export const partsFor = (key: SeasonKey | undefined | null) => (key === 'new-year' ? NEW_YEAR_PARTS : PARTS)

const ALL_ON: SeasonParts = { hero: true, decor: true, track: true, empty: true, stickers: true, video: true }

const PREVIEW_KEY = 'season.preview'
const personalKey = (key: SeasonKey | undefined) => `season.personal-${key ?? 'halloween'}`
/** Старый выключатель (до модалки) — читаем как ответ «не надо». */
const LEGACY_OFF_KEY = 'season.off'
const THEME_WAS = 'season.themeWas'
const isVariant = (v: string | null): v is SeasonVariant => ALL_VARIANTS.some(x => x.key === v)

const ls = {
  get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v) } catch { /* без хранилища — не запомним */ } },
}

type Row = { key: SeasonKey; enabled: boolean; starts_at: string; ends_at: string; variant: SeasonVariant; parts: (Partial<SeasonParts> & { ask?: boolean }) | null }
const fromRow = (r: Row): Season => {
  const { ask, ...parts } = r.parts ?? {}
  return {
    key: r.key, enabled: r.enabled, startsAt: r.starts_at, endsAt: r.ends_at, variant: r.variant,
    parts: { ...ALL_ON, ...parts }, ask: ask ?? true,
  }
}

/** Ответ хранится на сезон-год: на следующий Хэллоуин спросим заново. */
const choiceKey = (s: Season) => `season.choice.${s.key}.${new Date(s.startsAt).getFullYear()}`
function readChoice(s: Season | null): SeasonChoice {
  if (!s) return null
  const v = ls.get(choiceKey(s))
  if (v === 'off' || (isVariant(v) && seasonOfVariant(v) === s.key)) return v
  // «on» — ответ из окна до выбора вариантов: тогда включалась общая тема.
  if (v === 'on') return s.variant
  return ls.get(LEGACY_OFF_KEY) === '1' ? 'off' : null
}

export const SEASON_KEYS: SeasonKey[] = ['halloween', 'new-year']

/** Все сезоны из базы (админка). */
export async function loadSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('app_seasons')
    .select('key, enabled, starts_at, ends_at, variant, parts')
    .in('key', SEASON_KEYS)
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map(fromRow)
}

/** Сезон кабинета: идущий, ближайший или последний. Админский предпросмотр
 *  другого сезона (season.preview = его ключ) берёт именно его. */
export async function loadSeason(): Promise<Season | null> {
  const rows = await loadSeasons()
  const pv = ls.get(PREVIEW_KEY)
  return rows.find(r => r.key === pv) ?? pickSeason(rows)
}

/** Какой сезон сейчас главный: идущий, иначе ближайший предстоящий, иначе последний прошедший. */
export function pickSeason(rows: Season[], now = Date.now()): Season | null {
  if (!rows.length) return null
  const live = rows.find(r => statusOf(r, now) === 'live')
  if (live) return live
  const soon = rows.filter(r => statusOf(r, now) === 'soon').sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0]
  if (soon) return soon
  return [...rows].sort((a, b) => Date.parse(b.endsAt) - Date.parse(a.endsAt))[0]
}

/** Админка: сохранить строку. Возвращает текст ошибки или null. */
export async function saveSeason(s: Season): Promise<string | null> {
  const { error } = await supabase.from('app_seasons').upsert({
    key: s.key, enabled: s.enabled, starts_at: s.startsAt, ends_at: s.endsAt,
    variant: s.variant, parts: { ...s.parts, ask: s.ask }, updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) return error.message
  state = { ...state, season: s }
  emit()
  return null
}

// ── общее состояние: грузим один раз на вкладку, все хуки видят одно и то же ──

type State = { season: Season | null; preview: boolean; choice: SeasonChoice; now: number; picker: boolean }
let state: State = { season: null, preview: !!ls.get(PREVIEW_KEY), choice: null, now: Date.now(), picker: false }
const subs = new Set<() => void>()
function emit() { subs.forEach(f => f()); mark() }
let started = false
/** Только в разработке: localStorage['season.dev'] = 'lanterns' | 'candy' | 'potions' —
 *  тема включена с этим вариантом без строки в базе (проверить вёрстку всех трёх).
 *  localStorage['season.devAsk'] = '1' — без предпросмотра, как у ученика: с модалкой. */
function devSeason(): Season | null {
  const designPreview = window.location.pathname.replace(/\/+$/, '') === '/student-track-stand'
  if (!import.meta.env.DEV && !designPreview) return null
  // The public design stand uses fixtures even after the real season ends.
  // It must not enable a holiday for the ordinary student home.
  const requested = new URLSearchParams(window.location.search).get('season')
  const v = designPreview ? (isVariant(requested) ? requested : 'candy') : ls.get('season.dev') as SeasonVariant | null
  if (!isVariant(v)) return null
  if (seasonOfVariant(v) === 'new-year') {
    return { key: 'new-year', enabled: true, startsAt: '2026-11-20T00:00:00+03:00', endsAt: '2027-01-11T00:00:00+03:00', variant: v, parts: ALL_ON, ask: true }
  }
  return { key: 'halloween', enabled: true, startsAt: '2026-10-25T00:00:00+03:00', endsAt: '2026-11-02T00:00:00+03:00', variant: v, parts: ALL_ON, ask: true }
}

function start() {
  if (started) return
  started = true
  const dev = devSeason()
  if (dev) { state = { ...state, season: dev, preview: ls.get('season.devAsk') !== '1', choice: readChoice(dev) }; queueMicrotask(emit); return }
  loadSeason().then(s => {
    const latestPersonal = ls.get(personalKey(s?.key))
    const personal = latestPersonal === 'off' || (isVariant(latestPersonal) && seasonOfVariant(latestPersonal) === s?.key) ? latestPersonal as SeasonChoice : null
    state = { ...state, season: s, choice: personal ?? readChoice(s) }
    emit()
  }).catch(() => { /* нет связи — без темы */ })
  // Граница дат проходит, пока вкладка открыта: раз в минуту сверяем часы.
  setInterval(() => { const was = isOn(state); state = { ...state, now: Date.now() }; if (isOn(state) !== was) emit() }, 60_000)
}
const subscribe = (f: () => void) => { start(); subs.add(f); return () => { subs.delete(f) } }

/** Админ: показать тему у себя до начала (или после конца) сезона. */
export function setSeasonPreview(on: boolean, persist = true) {
  if (persist) ls.set(PREVIEW_KEY, on ? (state.season?.key ?? '1') : null)
  state = { ...state, preview: on }
  emit()
}

/** Админка: работать с конкретным сезоном (вкладка «Хэллоуин» / «Новый год»).
 *  Только у этого человека: выбор темы и предпросмотр относятся к нему. */
export function focusSeason(s: Season) {
  if (state.season?.key === s.key && state.season === s) return
  const pv = ls.get(PREVIEW_KEY)
  const preview = !!pv && (pv === s.key || pv === '1')
  state = { ...state, season: s, choice: readChoice(s), preview }
  emit()
}

/** Свой выбор: вариант из окна (ученик) или из админки (админ, только у себя), либо 'off'. */
export function setSeasonChoice(choice: SeasonVariant | 'off', persist = true) {
  if (persist && state.season) ls.set(choiceKey(state.season), choice)
  if (persist) ls.set(LEGACY_OFF_KEY, null)
  state = { ...state, choice, picker: false }
  emit()
}

/** Explicit personal appearance; never changes the school's seasonal settings. */
export function setPersonalHalloween(choice: SeasonVariant | 'off') {
  ls.set(personalKey(state.season?.key), choice)
  ls.set(PREVIEW_KEY, null)
  state = { ...state, preview: false, choice, picker: false }
  emit()
}

/** Окно выбора темы по запросу — строка «Хэллоуин-тема» в меню и профиле. */
export function openSeasonPicker(open = true) {
  state = { ...state, picker: open }
  emit()
}


export type SeasonStatus = 'soon' | 'live' | 'over'
export const statusOf = (s: Season, now = Date.now()): SeasonStatus =>
  now < Date.parse(s.startsAt) ? 'soon' : now < Date.parse(s.endsAt) ? 'live' : 'over'
const isLive = (st: State) => !!st.season && (st.preview || (st.season.enabled && statusOf(st.season, st.now) === 'live'))
/** Тема на экране: сезон идёт, человек не отказался и либо выбрал вариант, либо спрашивать
 *  не велено. Админский предпросмотр окно пропускает. */
const isOn = (st: State) => isLive(st) && st.choice !== 'off'
  && (st.preview || !st.season!.ask || isVariant(st.choice))
/** Чей вариант на экране: свой выбор, иначе общий из базы. */
const variantOf = (st: State): SeasonVariant | null =>
  isVariant(st.choice) ? st.choice : st.season?.variant ?? null
/** Пора спросить: сезон идёт, спрашивать велено, ответа ещё нет. */
const isAsking = (st: State) => isLive(st) && !st.preview && !!st.season?.ask && st.choice === null

export type SeasonView = {
  /** тема сейчас в кабинете (по датам или предпросмотром) и не выключена у себя */
  active: boolean
  /** сезон идёт — в настройках показываем выключатель */
  live: boolean
  /** показать ученику окно «Сейчас Хэллоуин — выбери тему» */
  asking: boolean
  /** окно выбора открыли сами из настроек */
  picking: boolean
  preview: boolean
  season: Season | null
  /** вариант на экране (null — темы нет) */
  variant: SeasonVariant | null
  /** свой выбор на этот сезон — для карточек в админке и окне */
  choice: SeasonChoice
  on: (p: SeasonPart) => boolean
}

let view: SeasonView | null = null
let viewOf: State | null = null
const snapshot = (): SeasonView => {
  if (viewOf === state && view) return view
  const active = isOn(state)
  const s = state.season
  viewOf = state
  view = {
    active, live: isLive(state), asking: isAsking(state), picking: state.picker && isLive(state), preview: state.preview, season: s,
    variant: active ? variantOf(state) : null, choice: state.choice,
    on: p => active && !!s?.parts[p],
  }
  return view
}

export function useSeason(): SeasonView {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/**
 * Атрибуты на <html>: season.css красит помеченные классами места
 * (html[data-season-variant="lanterns"] .season-track-fill и т. п.).
 * Режим кабинета — под вариант (MODE): при выборе ставим один раз, как в Taskly,
 * и возвращаем прежний, когда тема ушла (если ученик сам его не поменял).
 */
function mark() {
  const v = snapshot()
  const el = document.documentElement
  if (v.active && v.season && v.variant) {
    el.dataset.season = v.season.key
    el.dataset.seasonVariant = v.variant
  } else {
    delete el.dataset.season
    delete el.dataset.seasonVariant
  }
  syncTheme(v)
}

/** Режим кабинета у варианта: «Ночь фонарей» — ночь, две другие нарисованы на светлом. */
const MODE: Record<SeasonVariant, 'dark' | 'light'> = { lanterns: 'dark', candy: 'light', potions: 'light', yolka: 'light', polnoch: 'dark', shar: 'light' }
/** Вариант, чей режим уже поставлен: ставим один раз при выборе, дальше ученик меняет сам. */
const APPLIED = 'season.themeApplied'

function syncTheme(v: SeasonView) {
  const theme = useTheme.getState()
  const applied = ls.get(APPLIED)
  if (v.variant) {
    if (applied === v.variant) return
    // Исходный режим запоминаем один раз — при смене варианта он не перезаписывается.
    if (!ls.get(THEME_WAS)) ls.set(THEME_WAS, theme.dark ? 'dark' : 'light')
    ls.set(APPLIED, v.variant)
    if (theme.dark !== (MODE[v.variant] === 'dark')) theme.toggle()
  } else if (applied) {
    // Тема ушла: возвращаем прежний режим, если на экране всё ещё тот, что ставила тема.
    const was = ls.get(THEME_WAS)
    ls.set(APPLIED, null)
    ls.set(THEME_WAS, null)
    const ours = isVariant(applied) && theme.dark === (MODE[applied] === 'dark')
    if (was && ours && theme.dark !== (was === 'dark')) theme.toggle()
  }
}

/** Картинки темы лежат в public/season/halloween (исходники — design/halloween-2026). */
export const seasonImg = (name: string) => `/season/halloween/${name}.webp`
/** Картинки новогодней темы и стикеров: public/season/new-year (исходники — design/new-year-2027). */
export const newYearImg = (name: string) => `/season/new-year/${name}.webp`
export const seasonOfVariant = (v: SeasonVariant): SeasonKey => ALL_VARIANTS.find(x => x.key === v)?.season ?? 'halloween'
/** Идёт ли новогодний сезон (стикеры копятся и без включённой темы). */
export function isNewYearLive(): boolean {
  start()
  return state.season?.key === 'new-year' && isLive(state) && state.season.parts.stickers
}
