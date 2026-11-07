import { App } from '@capacitor/app'
import { IS_APP, PLATFORM } from './platform'
import { handleBack } from './overlayStack'
import { useDashboard } from '../store/dashboardStore'

// ─────────────────────────────────────────────────────────────────────────────
// Системная «Назад» в Android-приложении (решение Дани, 07.11.2026)
//
//   1. Открыт лист или окно — закрыть его.
//   2. Вложенный экран — шаг назад (обработчики экранов в overlayStack).
//   3. Другая вкладка — на Главную.
//   4. Главная — свернуть приложение. Без выхода из аккаунта: при открытии
//      всё продолжается с того же места.
//
// Только в установленном приложении на Android. В браузере кнопкой «Назад»
// управляет сам браузер, на iOS и ПК этот файл ничего не делает.
// Кабинет учителя на Android ещё не согласован: там пока шаги 1 и 4.
// ─────────────────────────────────────────────────────────────────────────────

/** Адреса кабинета ученика: вкладки, урок, задание, тренажёр. */
const STUDENT_HASH = /^(#?|#\/|#\/(courses|diary|trainer|profile|homework)(\/.*)?|#\/lesson\/.+)$/

/** Вкладки нижней навигации ученика: с них «Назад» ведёт на Главную. */
const TAB_PAGES = new Set(['courses', 'homeworkList', 'trainer', 'profile'])

export function onAndroidBack(canGoBack = false): void {
  if (handleBack()) return

  if (STUDENT_HASH.test(window.location.hash)) {
    const s = useDashboard.getState()
    // Урок и задание — вложенные экраны. Пока общая история экранов не
    // построена (шаг 3 iOS), выходим туда, откуда урок открыли.
    if (s.activePage === 'lesson' || s.activePage === 'homework') {
      s.closeLesson()
      return
    }
    if (TAB_PAGES.has(s.activePage)) {
      s.setActivePage('home')
      return
    }
  } else if (canGoBack && !window.location.hash.startsWith('#/teacher')) {
    // Вход, выбор роли и прочие экраны вне кабинетов — обычная история.
    window.history.back()
    return
  }
  void App.minimizeApp()
}

let started = false

export function initAndroidBack(): void {
  if (started || PLATFORM !== 'android' || !IS_APP) return
  started = true
  void App.addListener('backButton', ({ canGoBack }) => onAndroidBack(canGoBack))
}
