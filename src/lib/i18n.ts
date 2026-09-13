import { create } from 'zustand'
import { translateContent, transliterateName } from './i18nContent'

// Dictionary-based i18n. The app was authored entirely in Russian, so the
// translation KEY is the original Russian string and the value is its English
// rendering. Components call `useT()` to get a `t()` bound to the current
// language (so they re-render on switch); `t('…')` returns the Russian source
// verbatim when lang==='ru', or its English match (falling back to the source
// when a phrase isn't translated yet — nothing ever renders blank).

export type Lang = 'ru' | 'en'

// АНГЛИЙСКИЙ СЛОВАРЬ ЖИВЁТ В ОТДЕЛЬНОМ ЧАНКЕ (lib/i18nEn.ts) и приезжает
// только тому, кто переключился на английский.
//
// Ключ здесь — русская строка целиком, поэтому карта весит 205 КБ: крупнейший
// наш файл в главном чанке. Русскому пользователю она не нужна ни на одном
// экране, но качалась и разбиралась при каждом входе.
//
// Пока чанк едет, `t()` отдаёт русский оригинал — ровно то же, что он отдаёт
// для непереведённой строки. Экран не мигает пустотой; максимум, что видит
// англоязычный пользователь на холодном заходе, — долю секунды русского текста.
let EN: Record<string, string> = {}
let enLoading: Promise<void> | null = null

/** Номер ревизии словаря. Меняется, когда чанк доехал, — по нему компоненты
 *  перерисовываются: сам `lang` при этом не менялся, и без счётчика английский
 *  интерфейс остался бы русским до следующего рендера по другой причине. */
function ensureEn(): void {
  if (enLoading) return
  // Названия сид-курсов (i18nContentEn) едут тем же заходом: интерфейсу они
  // не мешают, а искать подпись в двух картах незачем.
  enLoading = Promise.all([import('./i18nEn'), import('./i18nContentEn')])
    .then(([m, c]) => { EN = { ...c.CONTENT_EN, ...m.EN }; useLang.setState(s => ({ rev: s.rev + 1 })) })
    .catch(() => { /* без переводов, но живой */ })
}

const DICTS: Record<Lang, () => Record<string, string>> = { ru: () => ({}), en: () => EN }

function getSaved(): Lang {
  try { return localStorage.getItem('lang') === 'en' ? 'en' : 'ru' } catch { return 'ru' }
}

function apply(lang: Lang) {
  try { localStorage.setItem('lang', lang) } catch {}
  try { document.documentElement.setAttribute('lang', lang) } catch {}
  // Заголовок вкладки живёт в index.html (он нужен до загрузки бандла) —
  // после переключения языка просим его перечитать localStorage.
  try { (window as unknown as { __syncAppTitle?: () => void }).__syncAppTitle?.() } catch {}
}

const _initial = getSaved()
apply(_initial)

interface LangStore {
  lang: Lang
  /** См. ensureEn: растёт, когда доехал английский словарь. */
  rev: number
  setLang: (l: Lang) => void
}

export const useLang = create<LangStore>((set) => ({
  lang: _initial,
  rev: 0,
  setLang: (l) => set(() => {
    apply(l)
    if (l === 'en') ensureEn()
    return { lang: l }
  }),
}))

// Вход уже на английском — начинаем тянуть словарь сразу, не дожидаясь, пока
// первый компонент попросит перевод.
if (_initial === 'en') ensureEn()

// Non-reactive lookup — for use outside React (utils, event handlers). Prefer
// useT() inside components so they re-render when the language changes.
export function t(ru: string): string {
  const { lang } = useLang.getState()
  return DICTS[lang]()[ru] ?? ru
}

// Контентные подписи (названия курсов/модулей/уроков, описание курса) и имена
// людей — см. lib/i18nContent.ts. Внутренности урока не переводятся.
export function tc(ru: string | null | undefined): string {
  const { lang } = useLang.getState()
  if (lang === 'ru') return ru ?? ''
  return translateContent(ru, k => DICTS[lang]()[k])
}
export function tn(ru: string | null | undefined): string {
  return useLang.getState().lang === 'ru' ? (ru ?? '') : transliterateName(ru)
}
/** Реактивная пара к tc/tn: `const { tc, tn } = useTc()`. */
export function useTc() {
  const lang = useLang(s => s.lang)
  useLang(s => s.rev)
  return {
    tc: (ru: string | null | undefined): string =>
      lang === 'ru' ? (ru ?? '') : translateContent(ru, k => DICTS[lang]()[k]),
    tn: (ru: string | null | undefined): string =>
      lang === 'ru' ? (ru ?? '') : transliterateName(ru),
  }
}

// Reactive translator hook — subscribes to the current language.
export function useT() {
  const lang = useLang(s => s.lang)
  // Подписка на ревизию — чтобы перерисоваться, когда словарь доехал.
  useLang(s => s.rev)
  return (ru: string): string => DICTS[lang]()[ru] ?? ru
}
