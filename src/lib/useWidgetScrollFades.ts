import { useEffect, type RefObject } from 'react'
import { installWidgetScrollFades } from './widgetScrollFades'

export function useWidgetScrollFades(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    if (enabled && ref.current) return installWidgetScrollFades(ref.current)
  }, [ref, enabled])
}
