import { useEffect, useMemo, useRef, useState } from 'react'
import { useLang, useT } from '../lib/i18n'
import { assignEmblems, type StickerEmblem } from '../lib/holo/presets'
import { stickerLabel, type EarnedSticker } from '../lib/stickers'
import Modal from './Modal'
import HScrollFade from './HScrollFade'
import HoloSticker from './HoloSticker'
import StickerBadge from './StickerBadge'
import Skeleton from './Skeleton'
import './stickerAlbum.css'

const emblemNames: Record<StickerEmblem, string> = {
  bolt: 'Импульс', crown: 'Корона', rocket: 'Взлёт', trophy: 'Кубок', laurel: 'Лавр',
  star: 'Звезда', gem: 'Кристалл', flame: 'Пламя', medal: 'Медаль', score: 'Стикер',
}

export default function StickerCollectionModal({ stickers, initialId, loading, onClose }: {
  stickers: EarnedSticker[]
  initialId?: string
  loading?: boolean
  onClose: () => void
}) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const [selectedId, setSelectedId] = useState(initialId)
  const selected = stickers.find(s => s.id === selectedId) ?? stickers[0]
  const emblems = useMemo(() => assignEmblems(stickers.map(s => s.id)), [stickers])
  const selectedButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const button = selectedButton.current
    const rail = button?.parentElement
    if (!button || !rail) return
    const tile = button.getBoundingClientRect()
    const viewport = rail.getBoundingClientRect()
    if (tile.left < viewport.left) rail.scrollLeft += tile.left - viewport.left - 4
    else if (tile.right > viewport.right) rail.scrollLeft += tile.right - viewport.right + 4
  }, [selected?.id])
  const title = selected && selected.lessonTitle !== selected.lessonRef ? selected.lessonTitle : ''
  return <Modal title={t('Мои стикеры')} width={520} padding={20} onClose={onClose}>
    {loading ? <div role="status" aria-label={t('Загрузка')}><Skeleton w="100%" h={160} radius={18} /></div> :
      selected ? <div className="sticker-album">
        <section className="album-stage" aria-live="polite">
          <div className="album-serial"><span>{t('Стикер')} № {String(stickers.indexOf(selected) + 1).padStart(2, '0')}</span><b>{selected.score} / 5</b></div>
          <HoloSticker score={selected.score} stickerId={selected.id} emblem={emblems[selected.id]}
            label={stickerLabel(selected, t)} size={230} />
          <div className="album-caption">
            <h3>{t(emblemNames[emblems[selected.id]])}</h3>
            <p>{title && <>{title} · </>}{selected.kind === 'deck'
              ? `${selected.cards ?? 0} ${t('фраз без ошибок')}` : stickerLabel(selected, t)}</p>
            {selected.at && <time dateTime={selected.at}>{new Date(selected.at).toLocaleDateString(lang, { day:'numeric', month:'long', year:'numeric' })}</time>}
          </div>
        </section>
        <div className="album-strip">
          <HScrollFade padX={4} padTop={4} padBottom={4} fadeWidth={18} style={{ minWidth:0 }}>
          {stickers.map((s, i) => <button data-hover="layer" type="button" key={s.id} aria-pressed={s.id === selected.id}
            aria-label={`№ ${i + 1} · ${t(emblemNames[emblems[s.id]])} · ${stickerLabel(s, t)}`}
            ref={s.id === selected.id ? selectedButton : undefined}
            onClick={() => setSelectedId(s.id)}>
            <StickerBadge size={62} score={s.score} label={stickerLabel(s,t)} stickerId={s.id} emblem={emblems[s.id]} />
          </button>)}
          </HScrollFade>
          <span className="album-position">{String(stickers.indexOf(selected) + 1).padStart(2, '0')} / {String(stickers.length).padStart(2, '0')}</span>
        </div>
      </div> : <section className="album-stage album-empty">
        <h3>{t('Альбом ждёт первый стикер')}</h3>
        <p>{t('Стикер даётся за принятое сложное задание и за тему разговорника, пройденную без единой ошибки. Балл 5 — голограмма.')}</p>
      </section>}
  </Modal>
}
