import { useEffect } from 'react'
import { setGlassHeader, removeGlassHeader, type GlassHeader } from '../lib/nativeGlass'

// Верхняя шапка экрана в приложении на iOS — плавающие стеклянные капсулы,
// которые рисует система (lib/nativeGlass.ts). Веб-topZone при этом не
// рендерится (см. MobileScreen). Компонент ничего не рисует в DOM: только
// передаёт подпись и счётчик в нативную шапку и убирает её при уходе с экрана.
export default function MobileGlassHeader(h: GlassHeader) {
  useEffect(() => {
    setGlassHeader(h)
    return () => removeGlassHeader()
  }, [h.leading, h.leadingSymbol, h.trailingText, h.trailingSymbol])
  return null
}
