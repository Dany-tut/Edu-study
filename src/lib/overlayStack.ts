import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Стек «что закрыть по „Назад“» — общий для всех версий
//
// Листы и окна регистрируют здесь свой onClose, пока открыты. Спрашивают один
// и тот же стек: системная «Назад» на Android (androidBack.ts), а дальше —
// свайп назад на iOS и Escape на ПК. Сам стек ничего не слушает: пока его
// никто не вызывает, поведение окон прежнее.
//
// Порядок шага «Назад»: верхний лист/окно → шаг во вложенном экране (его
// регистрирует навигация экранов через registerScreenBack) → решение самой
// платформы (на Android: вкладка → Главная, Главная → свернуть).
// ─────────────────────────────────────────────────────────────────────────────

type Overlay = { id: number; close: () => void }
type ScreenStep = { id: number; step: () => boolean }

const overlays: Overlay[] = []
const screenSteps: ScreenStep[] = []
let seq = 0

function remover<T extends { id: number }>(list: T[], id: number): () => void {
  return () => {
    const i = list.findIndex(e => e.id === id)
    if (i >= 0) list.splice(i, 1)
  }
}

/** Зарегистрировать открытый лист или окно. Возвращает снятие с учёта. */
export function pushOverlay(close: () => void): () => void {
  const id = ++seq
  overlays.push({ id, close })
  return remover(overlays, id)
}

/** Сколько листов и окон сейчас открыто. */
export function overlayCount(): number {
  return overlays.length
}

/** Закрыть верхний лист или окно. true — было что закрыть. */
export function closeTopOverlay(): boolean {
  const top = overlays[overlays.length - 1]
  if (!top) return false
  top.close()
  return true
}

/**
 * Шаг назад во вложенном экране (урок, задание, экран настроек). Обработчик
 * возвращает true, если сделал шаг, и false, если ему некуда идти.
 */
export function registerScreenBack(step: () => boolean): () => void {
  const id = ++seq
  screenSteps.push({ id, step })
  return remover(screenSteps, id)
}

/** Один шаг «Назад»: лист/окно, затем вложенный экран. true — шаг сделан. */
export function handleBack(): boolean {
  if (closeTopOverlay()) return true
  for (let i = screenSteps.length - 1; i >= 0; i--) {
    if (screenSteps[i].step()) return true
  }
  return false
}

/**
 * Лист или окно стоит в стеке, пока open === true.
 * onClose читается из ref — переподписки на каждом рендере нет.
 */
export function useBackClose(open: boolean, onClose: () => void): void {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!open) return
    return pushOverlay(() => ref.current())
  }, [open])
}
