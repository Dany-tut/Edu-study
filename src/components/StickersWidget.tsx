// Виджет «Стикеры» — коллекция наград за принятые задания.
// В сетке рисуем дешёвые StickerBadge (canvas 2D), а голо-рендер (WebGL)
// включаем только для выбранного стикера в модалке: контекстов WebGL мало.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import StickerBadge from './StickerBadge'
import HoloSticker from './HoloSticker'
import { tierOf, STICKER_TIERS } from '../lib/holo/presets'
import { useStickers, type EarnedSticker } from '../lib/stickers'
import { useT } from '../lib/i18n'

export default function StickersWidget({ columns }: { columns: number }) {
  const t = useT()
  const { stickers, byScore, loading } = useStickers()
  const [open, setOpen] = useState(false)
  const wide = columns >= 2
  const top = stickers.slice(0, wide ? 6 : 4)

  return (
    <div style={{ width: '100%', height: '100%', padding: wide ? '20px 28px' : '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={15} style={{ color: 'var(--color-purple-text)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Стикеры')}</span>
        </div>
        {stickers.length > 0 && (
          <button onClick={() => setOpen(true)} style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-purple-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {t('Вся коллекция →')}
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 12.5, color: 'var(--color-muted)' }}>{t('Загрузка…')}</div>
      ) : stickers.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
          {t('Сдай сложное задание — учитель примет его и поставит балл, а ты получишь стикер. Балл 5 — голограмма.')}
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {top.map(s => (
              <StickerBadge key={s.id} score={s.score} label={`${t('задание')} ${s.taskIndex}`} size={wide ? 66 : 56} onClick={() => setOpen(true)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
            {[5, 4, 3, 2, 1].filter(s => byScore[s]).map(s => {
              const tier = STICKER_TIERS[s as 1 | 2 | 3 | 4 | 5]
              return (
                <span key={s} style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                  color: tier.inkDark, background: `${tier.ink}2E`,
                }}>{s}/5 · {byScore[s]}</span>
              )
            })}
          </div>
        </>
      )}

      {open && <StickerCollectionModal stickers={stickers} onClose={() => setOpen(false)} />}
    </div>
  )
}

export function StickerCollectionModal({ stickers, onClose }: { stickers: EarnedSticker[]; onClose: () => void }) {
  const t = useT()
  const [sel, setSel] = useState<EarnedSticker | null>(stickers[0] ?? null)
  const tier = sel ? tierOf(sel.score) : null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', background: 'rgba(12, 10, 22, 0.6)', backdropFilter: 'blur(6px)', padding: 20 }}
      >
        <motion.div
          initial={{ scale: 0.94, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: 'relative', width: 'min(720px, 100%)', maxHeight: '84vh', overflow: 'auto',
            borderRadius: 24, padding: '22px 22px 20px', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', boxShadow: '0 30px 70px -20px rgba(20, 12, 50, 0.5)',
          }}
        >
          <button onClick={onClose} aria-label={t('Закрыть')} style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 10,
            border: 'none', background: 'var(--color-bg)', color: 'var(--color-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center',
          }}><X size={15} /></button>

          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)' }}>{t('Мои стикеры')}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginBottom: 14 }}>
            {stickers.length} {t('шт. · по одному за каждое принятое задание')}
          </div>

          <div className="stickers-modal-grid" style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 18, alignItems: 'start' }}>
            {/* открытый стикер — единственный WebGL-рендер на экране */}
            <div style={{ display: 'grid', placeItems: 'center', gap: 8, position: 'sticky', top: 0 }}>
              {sel && (
                <>
                  <HoloSticker
                    key={sel.id}
                    score={sel.score}
                    label={`${t('задание')} ${sel.taskIndex}`}
                    sublabel={sel.lessonTitle.slice(0, 22)}
                    size={200}
                  />
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>«{t(tier!.name)}»</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.4 }}>
                    {sel.lessonTitle} · {t('задание')} {sel.taskIndex}
                    {sel.at && <><br />{new Date(sel.at).toLocaleDateString('ru-RU')}</>}
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: 10 }}>
              {stickers.map(s => (
                <StickerBadge
                  key={s.id}
                  score={s.score}
                  label={`${t('задание')} ${s.taskIndex}`}
                  size={78}
                  onClick={() => setSel(s)}
                  style={sel?.id === s.id ? { outline: '2px solid var(--color-accent)', outlineOffset: 3, borderRadius: '50%' } : undefined}
                />
              ))}
            </div>
          </div>
          <style>{`@media (max-width: 620px){ .stickers-modal-grid { grid-template-columns: 1fr !important; } }`}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
