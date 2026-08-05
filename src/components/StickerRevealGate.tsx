// Показывает «новые стикеры» один раз на входе в кабинет.
// Живёт в App рядом с DashboardPage — один экземпляр на обе вёрстки (PC и
// мобильная рендерятся одновременно, см. [[dual-layout-rendering]]).
import StickerRevealModal from './StickerRevealModal'
import { useStickers } from '../lib/stickers'

export default function StickerRevealGate() {
  const { fresh, dismissFresh } = useStickers()
  if (!fresh.length) return null
  return <StickerRevealModal items={fresh} onClose={dismissFresh} />
}
