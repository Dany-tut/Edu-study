import { useEffect, useRef } from 'react'
import { setGlassHeader, removeGlassHeader, onGlassHeaderBack, type GlassHeader } from '../lib/nativeGlass'

// Верхняя шапка экрана в приложении на iOS — плавающие стеклянные капсулы,
// которые рисует система (lib/nativeGlass.ts). Веб-topZone при этом не
// рендерится (см. MobileScreen). Компонент ничего не рисует в DOM: только
// передаёт подпись и счётчик в нативную шапку и убирает её при уходе с экрана.
export default function MobileGlassHeader(h: GlassHeader) {
  const back = useRef(h.onBack)
  back.current = h.onBack
  useEffect(() => onGlassHeaderBack(() => back.current?.()), [])
  useEffect(() => {
    setGlassHeader(h)
    return () => removeGlassHeader()
  }, [h.leading, h.leadingSymbol, h.trailingText, h.trailingSymbol, !!h.onBack, h.backLabel])
  return null
}
