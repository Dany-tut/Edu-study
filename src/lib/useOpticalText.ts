import { useLayoutEffect, type RefObject } from 'react'
import { refreshOpticalText, trackOpticalText } from './opticalText'

export function useOpticalText(ref: RefObject<HTMLElement | null>, text: string | number, enabled = true) {
  useLayoutEffect(() => enabled && ref.current ? trackOpticalText(ref.current) : undefined, [enabled, ref])
  // Inherited weight/font may change with a fixed-width selection label.
  // Queue a cached read after rendering; this never sets React state.
  useLayoutEffect(() => { if (enabled && ref.current) refreshOpticalText(ref.current) })
}
