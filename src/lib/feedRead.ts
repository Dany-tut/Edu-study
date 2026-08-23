// ─────────────────────────────────────────────────────────────────────────────
// Что из ленты уже видели
//
// ЗАЧЕМ. Лента — единственное место платформы, которое обновляется само (cron в
// 04:30 → scripts/buildFeed.mjs → коммит), и до сих пор об этом невозможно было
// узнать, не открыв её: тренажёр → язык → «Чтение» → «Лента». Ежедневная
// привычка через три клика не строится. Чтобы позвать («сегодня три новых»),
// нужно уметь отличать новое от уже просмотренного — этим здесь и занимаемся.
//
// ЧТО СЧИТАЕТСЯ ПРОСМОТРОМ. Пост, который побыл на экране: лента — это то, что
// листают, и «прочитал» здесь означает ровно то же, что в мессенджере. Кнопки
// «отметить прочитанным» нет и быть не должно — она превращает ленту в список
// дел. Явные действия (включил ролик, развернул текст, открыл перевод или
// комментарии) засчитываются сразу, не дожидаясь таймера.
//
// ПОЧЕМУ localStorage. Та же причина, что у lib/trainerDay и lib/trainerProgress:
// это личный счётчик для себя, учитель его не видит и оценка из него не растёт.
// Таблица с RLS ради строчки «3 новых» дороже, чем она стоит. Цена принята: на
// другом устройстве лента снова покажется свежей.
//
// ПЕРВЫЙ ЗАХОД НЕ ДОЛЖЕН КРИЧАТЬ «50 НОВЫХ». Пятьдесят материалов, накопленных
// до того, как человек вообще узнал о ленте, новостью для него не являются, а
// счётчик, который невозможно обнулить за один вечер, перестают замечать в тот
// же день. Поэтому при первой встрече с языком всё вчерашнее и старше
// помечается просмотренным разом, и остаётся честное «что появилось сегодня».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { hasFeed, loadFeed, type FeedItem } from '../data/feed'
import { useStudentData } from '../store/studentDataStore'
import { useDashboard } from '../store/dashboardStore'
import { getSubject } from './subjects'
import { dayKey } from './trainerDay'

const KEY = 'feed-read-v1'

/**
 * Сколько id держим на язык. Автофайл ленты перезаписывается целиком и хранит
 * несколько десятков материалов, так что шестисот хватает с большим запасом, а
 * потолок защищает от бесконечного роста записи за годы.
 */
const CAP = 600

/** Базовый код языка: pt-BR → pt. Ключи здесь те же, что у LOADERS ленты. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

interface LangState {
  /** Была ли первая встреча с этим языком (см. шапку про «50 новых»). */
  seeded: boolean
  /** Просмотренные id, старые в начале. */
  ids: string[]
}

type Store = Record<string, LangState>

let cache: Store | null = null

function load(): Store {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    cache = {}
  }
  return cache
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cache ?? {})) } catch { /* приватный режим */ }
}

const listeners = new Set<() => void>()
function emit() { listeners.forEach(fn => fn()) }

function langState(lang: string): LangState {
  const store = load()
  return (store[base(lang)] ??= { seeded: false, ids: [] })
}

export function isRead(lang: string, id: string): boolean {
  return langState(lang).ids.includes(id)
}

/** Отметить материал просмотренным. Повтор ничего не делает и никого не будит. */
export function markRead(lang: string, id: string): void {
  const st = langState(lang)
  if (st.ids.includes(id)) return
  st.ids.push(id)
  if (st.ids.length > CAP) st.ids.splice(0, st.ids.length - CAP)
  save()
  emit()
}

/**
 * Первая встреча с лентой языка: всё, что старше сегодняшнего дня, считаем
 * просмотренным. Второй раз для того же языка не срабатывает — иначе материал,
 * добавленный скриптом задним числом, молча уезжал бы в прочитанное.
 */
export function seedRead(lang: string, items: FeedItem[]): void {
  const st = langState(lang)
  if (st.seeded) return
  st.seeded = true
  const today = dayKey()
  for (const item of items) {
    if (item.date < today && !st.ids.includes(item.id)) st.ids.push(item.id)
  }
  if (st.ids.length > CAP) st.ids.splice(0, st.ids.length - CAP)
  save()
  emit()
}

/** Непросмотренные материалы, свежие сверху (порядок приходит из loadFeed). */
export function unreadOf(lang: string, items: FeedItem[]): FeedItem[] {
  const ids = langState(lang).ids
  return items.filter(x => !ids.includes(x.id))
}

// ─── Общая загрузка на всех, кому нужен счётчик ──────────────────────────────
//
// Ленту просят двое: виджет главной (ему нужны заголовки) и бейдж в навбаре
// (ему нужно число). Чанк на язык весит немало, и грузить его дважды или,
// хуже, на каждом переходе — не вариант. Отсюда один кэш на модуль: кто первый
// спросил, тот и запустил загрузку, остальные ждут ту же промису.

const feeds = new Map<string, FeedItem[]>()
const inflight = new Map<string, Promise<FeedItem[]>>()

export function feedOnce(lang: string): Promise<FeedItem[]> {
  const key = base(lang)
  const done = feeds.get(key)
  if (done) return Promise.resolve(done)
  const running = inflight.get(key)
  if (running) return running
  const p = loadFeed(lang).then(list => {
    feeds.set(key, list)
    inflight.delete(key)
    seedRead(lang, list)
    return list
  })
  inflight.set(key, p)
  return p
}

export interface FeedGlance {
  /** Код языка активного курса — пусто, если курс не языковой. */
  lang?: string
  /** Слаг предмета: нужен и палитре виджета, и колоде повторения. */
  subjectId?: string
  /** Вся лента языка, свежее сверху. Пусто, пока чанк не доехал. */
  items: FeedItem[]
  /** Из неё — то, чего человек ещё не видел. */
  unread: FeedItem[]
}

const EMPTY: FeedItem[] = []

/**
 * Лента активного курса — одинаково для виджета и для бейджа.
 *
 * `delayMs` — отсрочка перед загрузкой чанка. Бейджу в навбаре торопиться
 * некуда: он рисуется на каждом экране кабинета, и тянуть ради него чужой чанк
 * наперегонки с данными главной незачем.
 */
export function useFeedGlance(delayMs = 0): FeedGlance {
  const subjects = useStudentData(s => s.subjects)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)

  const active = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
  const def = getSubject(active?.subject)
  const lang = def?.langCode
  const on = !!lang && hasFeed(lang)

  const [items, setItems] = useState<FeedItem[]>(() => (on ? feeds.get(base(lang!)) ?? EMPTY : EMPTY))
  // Пересчитывать непрочитанное надо не только когда приехал список, но и когда
  // ученик листает саму ленту: бейдж в навбаре гаснет на глазах, а не после F5.
  const [, bump] = useState(0)

  useEffect(() => {
    const fn = () => bump(n => n + 1)
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  useEffect(() => {
    if (!on || !lang) { setItems(EMPTY); return }
    const ready = feeds.get(base(lang))
    if (ready) { setItems(ready); return }
    let alive = true
    const timer = setTimeout(() => {
      feedOnce(lang).then(list => { if (alive) setItems(list) })
    }, delayMs)
    return () => { alive = false; clearTimeout(timer) }
  }, [on, lang, delayMs])

  return {
    lang,
    subjectId: def?.id,
    items,
    unread: on && lang ? unreadOf(lang, items) : EMPTY,
  }
}
