import { useLayoutEffect, type RefObject } from 'react'
import { refreshOpticalText, trackOpticalText } from './opticalText'

export function useOpticalText(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => ref.current ? trackOpticalText(ref.current) : undefined, [ref])
  // Inherited weight/font may change with a fixed-width selection label.
  // Queue a cached read after rendering; this never sets React state.
  useLayoutEffect(() => { if (ref.current) refreshOpticalText(ref.current) })
}
