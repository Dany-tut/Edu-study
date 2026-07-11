import { create } from 'zustand'

// Dictionary-based i18n. The app was authored entirely in Russian, so the
// translation KEY is the original Russian string and the value is its English
// rendering. Components call `useT()` to get a `t()` bound to the current
// language (so they re-render on switch); `t('…')` returns the Russian source
// verbatim when lang==='ru', or its English match (falling back to the source
// when a phrase isn't translated yet — nothing ever renders blank).

export type Lang = 'ru' | 'en'

// EN translations keyed by the exact Russian source string. Grow this map as
// screens get wrapped in t(); an unknown key harmlessly falls through to RU.
const EN: Record<string, string> = {
  // — Профиль / Settings —
  'Ученик': 'Student',
  'Уровень': 'Level',
  'Все предметы': 'All subjects',
  'Статистика': 'Statistics',
  'Средний балл': 'Average score',
  'Выполнено': 'Completed',
  'Пройдено': 'Progress',
  'Всего уроков': 'Total lessons',
  'Заданий': 'Tasks',
  'Дней': 'Days',
  'Звёзды': 'Stars',
  'Настройки': 'Settings',
  'Тема оформления': 'Appearance',
  'Светлая': 'Light',
  'Тёмная': 'Dark',
  'Обратная связь': 'Feedback',
  'Установить приложение': 'Install app',
  'Выйти из аккаунта': 'Log out',
  'Переключить тему': 'Toggle theme',
  'Все': 'All',
  'дней': 'days',
  // Ranks
  'Старт': 'Start',
  'Атомы': 'Atoms',
  'Молекулы': 'Molecules',
  'Реакции': 'Reactions',
  'Растворы': 'Solutions',
  'Эксперт': 'Expert',
  'Мастер': 'Master',
  // Язык
  'Язык': 'Language',
}

const DICTS: Record<Lang, Record<string, string>> = { ru: {}, en: EN }

function getSaved(): Lang {
  try { return localStorage.getItem('lang') === 'en' ? 'en' : 'ru' } catch { return 'ru' }
}

function apply(lang: Lang) {
  try { localStorage.setItem('lang', lang) } catch {}
  try { document.documentElement.setAttribute('lang', lang) } catch {}
}

const _initial = getSaved()
apply(_initial)

interface LangStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useLang = create<LangStore>((set) => ({
  lang: _initial,
  setLang: (l) => set(() => { apply(l); return { lang: l } }),
}))

// Non-reactive lookup — for use outside React (utils, event handlers). Prefer
// useT() inside components so they re-render when the language changes.
export function t(ru: string): string {
  const { lang } = useLang.getState()
  return DICTS[lang][ru] ?? ru
}

// Reactive translator hook — subscribes to the current language.
export function useT() {
  const lang = useLang(s => s.lang)
  return (ru: string): string => DICTS[lang][ru] ?? ru
}
