import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import OpticalText from '../../OpticalText'
import FadeText from '../../FadeText'
import { ArrowRight } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import { PLATFORM } from '../../../lib/platform'
import { onStickerEarned, openStickerAlbum, stickerDef, useStickerAlbum, type OwnedSticker } from '../../../lib/seasonStickers'
import './stickers.css'

/*
 * «Новый стикер!» — на каждый полученный стикер (onStickerEarned): конфетти,
 * плитка фольги (какой стикер — видно, когда сотрёшь в альбоме), «Открыть альбом →». ПК и iPad — правый нижний угол; iPhone — сверху
 * под островом; Android — снизу над нав-баром. Сама уходит через 5 с; наведение
 * и фокус держат её, пока на ней мышь или клавиатура. Подарки учителя сюда не
 * приходят — для них своё окно.
 */

const LIFE_MS = 5000
const COLORS = ['#FF5C8A', '#7FE7FF', '#B6FF3B', '#F5B93D', '#8B7CF6']
const PIECES = Array.from({ length: 16 }, (_, i) => ({
  x: `${(i * 37) % 100}%`, d: `${(i % 5) * 60}ms`, r: `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`, c: COLORS[i % COLORS.length],
}))

export default function StickerToast() {
  const t = useT()
  const reduce = useReducedMotion()
  const album = useStickerAlbum()
  const [items, setItems] = useState<OwnedSticker[]>([])
  const [hold, setHold] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const current = items[0] ?? null

  useEffect(() => onStickerEarned(s => {
    if (s.source === 'teacher') return
    setItems(list => list.some(x => x.id === s.id) ? list : [...list, s])
  }), [])

  // Таймер жизни: по одной, следующая — после закрытия предыдущей.
  useEffect(() => {
    if (!current || hold) return
    timer.current = setTimeout(() => setItems(list => list.slice(1)), LIFE_MS)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [current, hold])

  // Альбом открыли — всплывашки больше не нужны: всё новое видно там.
  useEffect(() => { if (album.open) setItems([]) }, [album.open])

  const place = PLATFORM === 'iphone' ? 'top' : PLATFORM === 'android' ? 'bottom' : 'corner'
  const from = place === 'top' ? { y: -24 } : { y: 24 }
  const def = current ? stickerDef(current.stickerKey) : null

  return createPortal(
    <div className="stk-toast-wrap" data-place={place} aria-live="polite">
      <AnimatePresence>
        {current && def && (
          <motion.div
            key={current.id}
            className="stk-toast"
            role="status"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, ...from }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, ...from }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, opacity: { duration: 0.16 } }}
            onPointerEnter={e => { if (e.pointerType === 'mouse') setHold(true) }}
            onPointerLeave={() => setHold(false)}
            onFocus={() => setHold(true)}
            onBlur={() => setHold(false)}
          >
            {!reduce && (
              <span className="stk-confetti" aria-hidden>
                {PIECES.map((p, i) => <i key={i} style={{ '--x': p.x, '--d': p.d, '--r': p.r, '--c': p.c } as CSSProperties} />)}
              </span>
            )}
            {/* Стикер приходит запечатанным: какой — видно, когда сотрёшь в альбоме. */}
            <motion.span
              aria-hidden className="stk-toast__foil"
              initial={reduce ? false : { scale: 0.4, rotate: -14 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 14, delay: 0.08 }}
            />
            <div className="stk-toast__body">
              <span className="stk-toast__eyebrow">{t(def.rare ? 'Редкий стикер!' : 'Новый стикер!')}</span>
              <FadeText className="stk-toast__name">{t('Какой?')}</FadeText>
            </div>
            <button
              type="button" data-hover="layer" className="stk-btn stk-btn--soft stk-btn--small"
              onClick={() => { setItems([]); openStickerAlbum(def.key) }}
            >
              <OpticalText as="iskra-button-label">{t('Открыть альбом')}</OpticalText>
              <ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  )
}
