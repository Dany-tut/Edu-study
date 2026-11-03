// Полка стикеров на мобильной главной: лента наград + тап → коллекция.
import { useState } from 'react'
import MobileHScroll from './MobileHScroll'
import StickerBadge from './StickerBadge'
import StickerCollectionModal from './StickerCollectionModal'
import { useStickers, stickerLabel } from '../lib/stickers'
import { useT } from '../lib/i18n'

export default function MobileStickersRow() {
  const t = useT()
  const { stickers, emblems } = useStickers()
  const [selected, setSelected] = useState<string | null>(null)
  if (!stickers.length) return null

  return (
    <div className="holo-mobile-shelf">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color:'inherit', margin: 0 }}>{t('Мои стикеры')}</p>
        <button onClick={() => setSelected(stickers[0].id)} style={{ fontSize: 12, fontWeight: 600, color:'var(--color-purple-text)', minHeight:44, background: 'none', border: 'none', padding: 0 }}>
          {t('Коллекция')} · {stickers.length}
        </button>
      </div>
      <div style={{ marginLeft: -16, marginRight: -16 }}>
        <MobileHScroll padX={16} gap={10}>
          {stickers.slice(0, 12).map(s => (
            <StickerBadge key={s.id} score={s.score} label={stickerLabel(s, t)}
              stickerId={s.id} emblem={emblems[s.id]} size={88} onClick={() => setSelected(s.id)} />
          ))}
        </MobileHScroll>
      </div>
      {selected !== null && <StickerCollectionModal stickers={stickers} initialId={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
