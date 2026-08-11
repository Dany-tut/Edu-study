// «Ты получил стикер» — показываем новые стикеры за принятые задания.
// Открывается один раз на стикер: после закрытия id уходит в «просмотрено».
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import HoloSticker from './HoloSticker'
import { tierOf } from '../lib/holo/presets'
import { stickerLabel, type EarnedSticker } from '../lib/stickers'
import type { StickerEmblem } from '../lib/holo/presets'
import { useT } from '../lib/i18n'

// emblems приходит снаружи и посчитан по ВСЕЙ коллекции: своя раздача по items
// нарисовала бы здесь не тот стикер, который потом лежит в коллекции.
export default function StickerRevealModal({ items, emblems, onClose }: { items: EarnedSticker[]; emblems: Record<string, StickerEmblem>; onClose: () => void }) {
  const t = useT()
  const [i, setI] = useState(0)
  const cur = items[i]
  if (!cur) return null
  const tier = tierOf(cur.score)
  const last = i === items.length - 1

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center',
          background: 'rgba(12, 10, 22, 0.62)', backdropFilter: 'blur(6px)', padding: 20,
        }}
      >
        <motion.div
          initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative', width: 'min(420px, 100%)', borderRadius: 24, padding: '26px 24px 22px',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            boxShadow: '0 30px 70px -20px rgba(20, 12, 50, 0.5)', textAlign: 'center',
          }}
        >
          <button onClick={onClose} aria-label={t('Закрыть')} style={{
            position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 10,
            border: 'none', background: 'var(--color-bg)', color: 'var(--color-muted)', cursor: 'pointer',
            display: 'grid', placeItems: 'center',
          }}><X size={15} /></button>

          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
            {items.length > 1 ? `${t('Новый стикер')} ${i + 1}/${items.length}` : t('Новый стикер')}
          </div>

          <div style={{ display: 'grid', placeItems: 'center', margin: '10px 0 6px' }}>
            {/* без key: перелистывание стикеров идёт внутри HoloSticker,
                иначе между ними мелькает пустой квадрат канваса */}
            <HoloSticker
              score={cur.score}
              label={stickerLabel(cur, t)}
              sublabel={cur.lessonTitle.slice(0, 22)}
              stickerId={cur.id}
              emblem={emblems[cur.id]}
              size={240}
              reveal
            />
          </div>

          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)' }}>«{t(tier.name)}»</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.45 }}>
            {t(tier.hint)}
          </div>
          {cur.comment && (
            <div style={{
              marginTop: 12, padding: '9px 12px', borderRadius: 12, textAlign: 'left',
              fontSize: 12.5, lineHeight: 1.45, color: 'var(--color-text-2)',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            }}>
              <b style={{ color: 'var(--color-accent)' }}>{t('Учитель')}:</b> {cur.comment}
            </div>
          )}

          <button
            onClick={() => (last ? onClose() : setI(i + 1))}
            style={{
              marginTop: 16, width: '100%', padding: '11px 16px', borderRadius: 14, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: `linear-gradient(135deg, ${tier.ink}, ${tier.inkDark})`,
            }}
          >
            {last ? t('В коллекцию') : t('Дальше')} <ChevronRight size={15} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
