import { useState } from 'react'
import { useT } from '../lib/i18n'
import { stickerLabel, useStickers } from '../lib/stickers'
import { HomeWidgetCard, Action, Value } from './HomeWidgetPresentation'
import StickerCollectionModal from './StickerCollectionModal'
import Skeleton from './Skeleton'
import StickerBadge from './StickerBadge'
import './stickerAlbum.css'

export default function StickersWidget() {
  const t = useT()
  const { stickers, emblems, loading } = useStickers()
  const [open, setOpen] = useState(false)
  return <>
    <HomeWidgetCard id={8} title={t('Мои стикеры')} onOpen={() => setOpen(true)}
      footer={<Action label={t('Коллекция')} onClick={() => setOpen(true)} />}
      artwork={stickers.length ? <div className="sticker-fan" aria-hidden="true">
        {stickers.slice(0, 2).map(s => <div className="sticker-cutout" key={s.id}>
          <StickerBadge size={128} score={s.score} label={stickerLabel(s,t)} stickerId={s.id} emblem={emblems[s.id]} />
        </div>)}
      </div> : undefined}>
      {loading ? <Skeleton w={88} h={18} /> : <Value label={t('Получено стикеров')}>{stickers.length}</Value>}
    </HomeWidgetCard>
    {open && <StickerCollectionModal stickers={stickers} loading={loading} onClose={() => setOpen(false)} />}
  </>
}
