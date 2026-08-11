// Полка стикеров на мобильной главной: лента наград + тап → коллекция.
import { useState } from 'react'
import MobileHScroll from './MobileHScroll'
import StickerBadge from './StickerBadge'
import { StickerCollectionModal } from './StickersWidget'
import { useStickers, stickerLabel } from '../lib/stickers'
import { useT } from '../lib/i18n'

export default function MobileStickersRow() {
  const t = useT()
  const { stickers, emblems } = useStickers()
  const [open, setOpen] = useState(false)
  if (!stickers.length) return null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{t('Мои стикеры')}</p>
        <button onClick={() => setOpen(true)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-purple-text)', background: 'none', border: 'none', padding: 0 }}>
          {t('все')} · {stickers.length}
        </button>
      </div>
      <div style={{ marginLeft: -16, marginRight: -16 }}>
        <MobileHScroll padX={16} gap={10}>
          {stickers.slice(0, 12).map(s => (
            <StickerBadge key={s.id} score={s.score} label={stickerLabel(s, t)}
              stickerId={s.id} emblem={emblems[s.id]} size={72} onClick={() => setOpen(true)} />
          ))}
        </MobileHScroll>
      </div>
      {open && <StickerCollectionModal stickers={stickers} onClose={() => setOpen(false)} />}
    </div>
  )
}
