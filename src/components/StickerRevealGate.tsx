// Показывает «новые стикеры» один раз на входе в кабинет.
// Живёт в App рядом с DashboardPage — один экземпляр на обе вёрстки (PC и
// мобильная рендерятся одновременно, см. [[dual-layout-rendering]]).
import { lazy, Suspense } from 'react'
import { retryImport } from '../lib/chunkError'
import { useStickers } from '../lib/stickers'

const StickerRevealModal = lazy(() => retryImport(() => import('./StickerRevealModal')))

export default function StickerRevealGate() {
  const { fresh, emblems, dismissFresh } = useStickers()
  if (!fresh.length) return null
  return <Suspense fallback={null}><StickerRevealModal items={fresh} emblems={emblems} onClose={dismissFresh} /></Suspense>
}
