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

export type SeasonKey = 'halloween'
export type SeasonVariant = 'lanterns' | 'candy' | 'potions'
export type SeasonPart = 'hero' | 'decor' | 'track' | 'empty'
export type SeasonParts = Record<SeasonPart, boolean>
/** ask — спрашивать ли ученика модалкой «Сейчас Хэллоуин — включить тему?» (иначе тема
 *  включается всем сама). В базе лежит в parts.ask: отдельной колонки под флаг не заводили. */
export type Season = { key: SeasonKey; enabled: boolean; startsAt: string; endsAt: string; variant: SeasonVariant; parts: SeasonParts; ask: boolean }
/** Ответ ученика на этот сезон: включить, не надо или ещё не ответил. */
export type SeasonChoice = 'on' | 'off' | null

export const VARIANTS: { key: SeasonVariant; title: string; about: string }[] = [
  { key: 'lanterns', title: 'Ночь фонарей', about: 'Тёмная на сезон. Урок — зажжённый фонарь' },
  { key: 'candy', title: 'Сладость или гадость', about: 'Светлая. Звёзды — конфеты в ведёрке' },
  { key: 'potions', title: 'Зельеварня', about: 'Вечерняя шапка. Успеваемость — колба' },
]

export const PARTS: { key: SeasonPart; title: string }[] = [
  { key: 'hero', title: 'Шапка и фон на главной' },
  { key: 'decor', title: '3D-объекты на плитках' },
  { key: 'track', title: 'Дорожка уроков в стиле темы' },
  { key: 'empty', title: 'Пустой день: привидение-листок' },
]

const ALL_ON: SeasonParts = { hero: true, decor: true, track: true, empty: true }

const PREVIEW_KEY = 'season.preview'
/** Старый выключатель (до модалки) — читаем как ответ «не надо». */
const LEGACY_OFF_KEY = 'season.off'
const THEME_WAS = 'season.themeWas'

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
  if (v === 'on' || v === 'off') return v
  return ls.get(LEGACY_OFF_KEY) === '1' ? 'off' : null
}

export async function loadSeason(): Promise<Season | null> {
  const { data, error } = await supabase
    .from('app_seasons')
    .select('key, enabled, starts_at, ends_at, variant, parts')
    .eq('key', 'halloween')
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data as Row) : null
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

type State = { season: Season | null; preview: boolean; choice: SeasonChoice; now: number }
let state: State = { season: null, preview: ls.get(PREVIEW_KEY) === '1', choice: null, now: Date.now() }
const subs = new Set<() => void>()
function emit() { subs.forEach(f => f()); mark() }
let started = false
/** Только в разработке: localStorage['season.dev'] = 'lanterns' | 'candy' | 'potions' —
 *  тема включена с этим вариантом без строки в базе (проверить вёрстку всех трёх).
 *  localStorage['season.devAsk'] = '1' — без предпросмотра, как у ученика: с модалкой. */
function devSeason(): Season | null {
  if (!import.meta.env.DEV) return null
  const v = ls.get('season.dev') as SeasonVariant | null
  if (!v || !VARIANTS.some(x => x.key === v)) return null
  return { key: 'halloween', enabled: true, startsAt: '2026-10-25T00:00:00+03:00', endsAt: '2026-11-02T00:00:00+03:00', variant: v, parts: ALL_ON, ask: true }
}

function start() {
  if (started) return
  started = true
  const dev = devSeason()
  if (dev) { state = { ...state, season: dev, preview: ls.get('season.devAsk') !== '1', choice: readChoice(dev) }; queueMicrotask(emit); return }
  loadSeason().then(s => { state = { ...state, season: s, choice: readChoice(s) }; emit() }).catch(() => { /* нет связи — без темы */ })
  // Граница дат проходит, пока вкладка открыта: раз в минуту сверяем часы.
  setInterval(() => { const was = isOn(state); state = { ...state, now: Date.now() }; if (isOn(state) !== was) emit() }, 60_000)
}
const subscribe = (f: () => void) => { start(); subs.add(f); return () => { subs.delete(f) } }

/** Админ: показать тему у себя до начала (или после конца) сезона. */
export function setSeasonPreview(on: boolean) {
  ls.set(PREVIEW_KEY, on ? '1' : null)
  state = { ...state, preview: on }
  emit()
}

/** Ученик: ответ из модалки или переключатель в меню/профиле. */
export function setSeasonChoice(on: boolean) {
  const choice: SeasonChoice = on ? 'on' : 'off'
  if (state.season) ls.set(choiceKey(state.season), choice)
  ls.set(LEGACY_OFF_KEY, null)
  state = { ...state, choice }
  emit()
}

export type SeasonStatus = 'soon' | 'live' | 'over'
export const statusOf = (s: Season, now = Date.now()): SeasonStatus =>
  now < Date.parse(s.startsAt) ? 'soon' : now < Date.parse(s.endsAt) ? 'live' : 'over'
const isLive = (st: State) => !!st.season && (st.preview || (st.season.enabled && statusOf(st.season, st.now) === 'live'))
/** Тема на экране: сезон идёт, ученик не отказался и либо согласился, либо спрашивать
 *  не велено. Админский предпросмотр модалку пропускает. */
const isOn = (st: State) => isLive(st) && st.choice !== 'off'
  && (st.preview || !st.season!.ask || st.choice === 'on')
/** Пора спросить: сезон идёт, спрашивать велено, ответа ещё нет. */
const isAsking = (st: State) => isLive(st) && !st.preview && !!st.season?.ask && st.choice === null

export type SeasonView = {
  /** тема сейчас в кабинете (по датам или предпросмотром) и не выключена у себя */
  active: boolean
  /** сезон идёт — в настройках показываем выключатель */
  live: boolean
  /** показать ученику модалку «Сейчас Хэллоуин — включить тему?» */
  asking: boolean
  preview: boolean
  season: Season | null
  variant: SeasonVariant | null
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
    active, live: isLive(state), asking: isAsking(state), preview: state.preview, season: s,
    variant: active && s ? s.variant : null,
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
 * «Ночь фонарей» — тёмная: включаем тёмную тему один раз за сезон, как в Taskly,
 * и возвращаем прежнюю, когда тема ушла (если ученик сам её не поменял).
 */
function mark() {
  const v = snapshot()
  const el = document.documentElement
  if (v.active && v.season) {
    el.dataset.season = v.season.key
    el.dataset.seasonVariant = v.season.variant
  } else {
    delete el.dataset.season
    delete el.dataset.seasonVariant
  }
  syncTheme(v)
}

function syncTheme(v: SeasonView) {
  const theme = useTheme.getState()
  const wantDark = v.variant === 'lanterns'
  const was = ls.get(THEME_WAS)
  if (wantDark && v.season) {
    const once = `season.dark.${v.season.key}.${new Date(v.season.startsAt).getFullYear()}`
    if (ls.get(once)) return
    ls.set(once, '1')
    ls.set(THEME_WAS, theme.dark ? 'dark' : 'light')
    if (!theme.dark) theme.toggle()
  } else if (was) {
    ls.set(THEME_WAS, null)
    if (was === 'light' && theme.dark) theme.toggle()
    // Вернули — значит, при следующем включении «Ночи фонарей» снова потемнеет.
    if (v.season) ls.set(`season.dark.${v.season.key}.${new Date(v.season.startsAt).getFullYear()}`, null)
  }
}

/** Картинки темы лежат в public/season/halloween (исходники — design/halloween-2026). */
export const seasonImg = (name: string) => `/season/halloween/${name}.webp`
