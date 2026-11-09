import { Capacitor } from '@capacitor/core'

// ─────────────────────────────────────────────────────────────────────────────
// Четыре версии Искры: iPhone, iPad, Android, ПК
//
// Их нельзя путать: у каждой свой язык интерфейса. Определяем версию ОДИН раз
// здесь и пишем её на <html data-platform="…">, чтобы и код, и CSS спрашивали
// одно и то же, а не каждый экран угадывал по ширине окна.
//
//   iphone  — айфон: приложение и Safari. Мягкий край (soft edge) у прокрутки,
//             в приложении — системные вкладки, шапки, алерты и меню.
//   ipad    — айпад: приложение и Safari. Тот же язык iOS, но своя раскладка.
//             iPadOS 13+ представляется Маком — узнаём по тачскрину.
//   android — телефон и планшет на Android (браузер). Без iOS-стекла и мягкого
//             края: фейды по правилу SCROLL-01.
//   pc      — компьютер. Десктопный интерфейс, правила SCROLL-01.
//
// Ширина окна (useIsDesktop, 1024) решает раскладку, а НЕ версию: айпад в
// ландшафте шире 1024, но остаётся айпадом.
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = 'iphone' | 'ipad' | 'android' | 'pc'

function detect(): Platform {
  // DEV-ONLY: ?ipad=1 форсит версию iPad в превью (проверка оболочки iPad на ПК).
  // Строго аддитивно и только в dev-сборке — прод-детект по UA не меняется.
  if (import.meta.env?.DEV && typeof location !== 'undefined' && /[?&]ipad=1(?:&|$)/.test(location.search)) return 'ipad'
  if (typeof navigator === 'undefined') return 'pc'
  const ua = navigator.userAgent
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ipad'
  if (/iPhone|iPod/.test(ua)) return 'iphone'
  if (/Android/.test(ua)) return 'android'
  if (Capacitor.getPlatform() === 'ios') return 'iphone'
  return 'pc'
}

export const PLATFORM: Platform = detect()

/** Айфон или айпад — общий язык iOS (мягкий край, стекло). */
export const IS_IOS = PLATFORM === 'iphone' || PLATFORM === 'ipad'

/** Установленное приложение (Capacitor), а не браузер. */
export const IS_APP = Capacitor.isNativePlatform()

if (typeof document !== 'undefined') {
  const root = document.documentElement
  root.dataset.platform = PLATFORM
  root.dataset.shell = IS_APP ? 'app' : 'web'
}
