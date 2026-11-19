import { useCallback, useEffect, useMemo, useRef } from 'react'
import { beginConfirmWave, preloadConfirmWave, type ConfirmWaveHandle, type ConfirmWaveOptions } from './index'

/**
 * Карточка с волной подтверждения: `hostRef` — на карточку (непрозрачная,
 * со скруглением), `liveRef` — на единственного ребёнка с её содержимым.
 * `begin()` замораживает «до»; после смены состояния — `handle.play()`.
 * Чанк библиотеки начинает грузиться, когда карточка появилась.
 */
export function useConfirmWave<H extends HTMLElement = HTMLDivElement, L extends HTMLElement = HTMLDivElement>(enabled = true) {
  const hostRef = useRef<H>(null)
  const liveRef = useRef<L>(null)
  useEffect(() => { if (enabled) void preloadConfirmWave() }, [enabled])
  const begin = useCallback(
    (opts?: ConfirmWaveOptions): ConfirmWaveHandle | null => (enabled ? beginConfirmWave(hostRef.current, liveRef.current, opts) : null),
    [enabled],
  )
  return useMemo(() => ({ hostRef, liveRef, begin }), [begin])
}
