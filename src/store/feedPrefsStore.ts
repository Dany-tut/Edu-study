// ─────────────────────────────────────────────────────────────────────────────
// Что показывать в ленте: темы, их порядок и тип материала
//
// ЛЕНТА — ЕДИНСТВЕННЫЙ ЭКРАН, КОТОРЫЙ ЧЕЛОВЕК НЕ ВЫБИРАЕТ, А ЛИСТАЕТ. Именно
// поэтому он вправе решать, ЧТО в ней окажется: одному нужны новости и ничего
// кроме, другой пришёл за роликами, третьему видео мешает — он читает в метро
// без звука, и каждый второй пост у него просто чёрный прямоугольник.
//
// ТРИ РАЗНЫЕ РУЧКИ, И ОНИ НЕ ЗАМЕНЯЮТ ДРУГ ДРУГА:
//
//   • ТИП материала (текст / ролик) — про то, чем сейчас можно заниматься.
//     Ролик требует звука и внимания, текст читается где угодно.
//   • ТЕМА (новости, наука, техника…) — про интерес. Выключенная тема исчезает
//     из ленты вместе со своим чипсом: чипс рубрики, которой в ленте нет, —
//     обещание пустого экрана.
//   • ПОРЯДОК тем — про то, с чего начинать. Работает, только когда включено
//     «сначала по темам»: по умолчанию лента идёт по времени, как любая лента,
//     и молча пересобрать её по темам значило бы отобрать свежесть, ради
//     которой её и открывают.
//
// РУБРИКА (чипс наверху) — НЕ ОТСЮДА. Она временная: ткнул «Наука» — смотришь
// науку, ушёл с экрана — снова всё. Здесь же настройка, которая переживает
// перезаход, и путать их нельзя.
//
// ЖИВЁТ НА УСТРОЙСТВЕ, как и раскладка жестов ([[feedGesturesStore]]).
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { THEME_ORDER, feedKind, itemTheme, type FeedItem, type FeedKind, type FeedTheme } from '../data/feed'

export interface FeedPrefsState {
  /** Порядок тем. Полный список — темы, которых нет у языка, просто не встретятся. */
  order: FeedTheme[]
  /** Выключенные темы: этих постов в ленте нет вовсе. */
  hidden: FeedTheme[]
  /** Выключенные типы материала. */
  hiddenKinds: FeedKind[]
  /** Лента идёт по порядку тем, а не по времени. */
  byTheme: boolean

  setOrder: (o: FeedTheme[]) => void
  toggleTheme: (t: FeedTheme) => void
  toggleKind: (k: FeedKind) => void
  setByTheme: (v: boolean) => void
  reset: () => void
}

const CLEAN = {
  order: [...THEME_ORDER],
  hidden: [] as FeedTheme[],
  hiddenKinds: [] as FeedKind[],
  byTheme: false,
}

export const useFeedPrefs = create<FeedPrefsState>()(persist((set, get) => ({
  ...CLEAN,

  setOrder: (order) => set({ order }),
  toggleTheme: (t) => set({
    hidden: get().hidden.includes(t) ? get().hidden.filter(x => x !== t) : [...get().hidden, t],
  }),
  toggleKind: (k) => set({
    hiddenKinds: get().hiddenKinds.includes(k) ? get().hiddenKinds.filter(x => x !== k) : [...get().hiddenKinds, k],
  }),
  setByTheme: (byTheme) => set({ byTheme }),
  reset: () => set({ ...CLEAN, order: [...THEME_ORDER] }),
}), {
  name: 'feed-prefs',
  storage: createJSONStorage(() => localStorage),
  version: 1,
  // Порядок ЧИНИТСЯ при чтении: появится новая тема — она встанет в конец
  // сохранённого списка, а не пропадёт из настроек навсегда.
  merge: (saved, current) => {
    const s = (saved ?? {}) as Partial<FeedPrefsState>
    const kept = (s.order ?? []).filter(t => THEME_ORDER.includes(t))
    return {
      ...current,
      ...s,
      order: [...kept, ...THEME_ORDER.filter(t => !kept.includes(t))],
    }
  },
}))

/** Тронуты ли настройки — по этому у кнопки фильтра горит точка. */
export function prefsTouched(p: Pick<FeedPrefsState, 'hidden' | 'hiddenKinds' | 'byTheme'>): boolean {
  return p.hidden.length > 0 || p.hiddenKinds.length > 0 || p.byTheme
}

/**
 * Отбор и порядок ленты по настройкам.
 *
 * Сортировка СТАБИЛЬНАЯ (Array.prototype.sort в ES2019 такова по спецификации):
 * внутри темы материалы остаются в том порядке, в каком приехали, то есть по
 * времени. «Сначала по темам» меняет очерёдность тем, а не ломает свежесть
 * внутри каждой.
 */
export function applyFeedPrefs(items: FeedItem[], p: FeedPrefsState): FeedItem[] {
  const kept = items.filter(it =>
    !p.hiddenKinds.includes(feedKind(it)) && !p.hidden.includes(itemTheme(it)))
  if (!p.byTheme) return kept
  const rank = new Map(p.order.map((t, i) => [t, i]))
  return [...kept].sort((a, b) =>
    (rank.get(itemTheme(a)) ?? 99) - (rank.get(itemTheme(b)) ?? 99))
}
