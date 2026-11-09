import { useEffect, useRef } from 'react'
import { registerScreenBack } from './overlayStack'
import { useDashboard, type AppPage } from '../store/dashboardStore'

// ─────────────────────────────────────────────────────────────────────────────
// Шаг «Назад» вложенного экрана ученика (урок, домашка) в общем стеке
// overlayStack — тот же обработчик, что у кнопки «Назад» в шапке и у свайпа
// от левого края (useSwipeBack). Через стек его делают системная «Назад» на
// Android (androidBack.ts) и всё, что спросит handleBack().
//
// Шаг срабатывает, только пока открыт именно этот экран: урок не закроется
// «Назад» с другой вкладки, даже если его страница ещё смонтирована.
// Обработчик читается из ref — переподписки на каждом рендере нет.
// ─────────────────────────────────────────────────────────────────────────────

export function useScreenBack(page: AppPage, back: () => void, enabled = true): void {
  const ref = useRef(back)
  ref.current = back
  useEffect(() => {
    if (!enabled) return
    return registerScreenBack(() => {
      if (useDashboard.getState().activePage !== page) return false
      ref.current()
      return true
    })
  }, [page, enabled])
}
