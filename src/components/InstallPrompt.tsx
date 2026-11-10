import { useCallback, useEffect, useState, type ComponentType } from 'react'
import { subscribeInstall, subscribeShowInstall, hasInstallPrompt, promptInstall, isStandalone, installSupport } from '../lib/pwaInstall'
import { PLATFORM, type Platform } from '../lib/platform'
import type { InstallViewProps } from './install/InstallParts'
import InstallSheetIphone from './install/InstallSheetIphone'
import InstallPopoverIpad from './install/InstallPopoverIpad'
import InstallSheetLegacy from './install/InstallSheetLegacy'

// ─────────────────────────────────────────────────────────────────────────────
// Лист «Установить „Искру“» — ДИСПЕТЧЕР. Здесь только решение «показывать или
// нет» и выбор оболочки по версии (lib/platform.ts). Сами оболочки — каждая в
// своём файле в ./install/, их ведут чаты своих версий без общего файла:
//   iPhone  — InstallSheetIphone.tsx (нижний лист, стекло iOS, без ×)
//   iPad    — InstallPopoverIpad.tsx (поповер справа, ×)
//   Android — пока InstallSheetLegacy.tsx; свой вью добавит Android-чат
//   ПК      — пока InstallSheetLegacy.tsx; своё окно добавит ПК-чат
// Общее содержимое (Огонёк, заголовок, плашки, шаги) — ./install/InstallParts.
//
// Не показываем вовсе, если уже установлено: приложение Capacitor или PWA с
// экрана «Домой» (isStandalone) — тогда и строки «Установить приложение» в
// профиле нет. Закрытый лист сам не возвращается; строка в профиле открывает.
// ─────────────────────────────────────────────────────────────────────────────

const VIEWS: Record<Platform, ComponentType<InstallViewProps>> = {
  iphone: InstallSheetIphone,
  ipad: InstallPopoverIpad,
  android: InstallSheetLegacy,
  pc: InstallSheetLegacy,
}

const DISMISS_KEY = 'pwa_install_dismissed_v1'
function dismissed(): boolean { try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false } }
function markDismissed() { try { localStorage.setItem(DISMISS_KEY, '1') } catch { /**/ } }

export default function InstallPrompt() {
  const [canPrompt, setCanPrompt] = useState(hasInstallPrompt())
  const [hidden, setHidden] = useState(() => dismissed() || isStandalone())
  // Открыли строкой в профиле: показываем, даже если сами бы не предложили.
  const [forced, setForced] = useState(false)

  useEffect(() => subscribeInstall(() => setCanPrompt(hasInstallPrompt())), [])
  useEffect(() => subscribeShowInstall(() => {
    if (isStandalone()) return
    setHidden(false); setForced(true)
  }), [])

  const support = installSupport(canPrompt)
  // Сами предлагаем только на телефоне и айпаде: iOS — всегда (шаги Safari),
  // Android — когда браузер дал системное окно. ПК — только по строке в профиле.
  const autoEligible = (PLATFORM === 'iphone' || PLATFORM === 'ipad')
    || (PLATFORM === 'android' && support === 'native')
  const open = !hidden && !isStandalone() && (forced || autoEligible)

  const onClose = useCallback(() => { setHidden(true); setForced(false); markDismissed() }, [])
  const onInstall = useCallback(async () => {
    if (await promptInstall()) setHidden(true)
  }, [])

  const View = VIEWS[PLATFORM]
  return <View open={open} onClose={onClose} support={support} onInstall={() => void onInstall()} />
}
