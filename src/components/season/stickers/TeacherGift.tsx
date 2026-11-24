import { useEffect, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import OpticalText from '../../OpticalText'
import FadeText from '../../FadeText'
import { useT } from '../../../lib/i18n'
import { newYearImg } from '../../../lib/season'
import { ACHIEVEMENTS, markStickersSeen, openStickerAlbum, stickerDef, stickerImg, type OwnedSticker } from '../../../lib/seasonStickers'
import StickerSurface, { useStickerSurface } from './StickerSurface'

/*
 * H · «Подарок от учителя»: учитель вернул ДЗ со стикером (и, может быть, ачивкой
 * и подписью). На главной при следующем заходе — сцена: коробка раскрыта, стикер
 * вылетает, рядом медаль ачивки, ниже подпись учителя. «В альбом» — альбом на этом
 * стикере; «Спасибо!» — просто закрыть. Оба, как и ×/фон/свайп, помечают подарок
 * просмотренным, и окно не вернётся. Несколько подарков — по одному подряд.
 * «Уменьшить движение»: коробка сразу открыта, без конфетти и прыжка.
 */

const COLORS = ['#FF5C8A', '#7FE7FF', '#B6FF3B', '#F5B93D', '#B7ACFF']
const PIECES = Array.from({ length: 22 }, (_, i) => ({
  x: `${(i * 29 + 7) % 100}%`, d: `${200 + (i % 6) * 70}ms`, r: `${(i % 2 ? 1 : -1) * (200 + i * 15)}deg`, c: COLORS[i % COLORS.length],
}))

export default function TeacherGift({ studentId, gift, suspended }: {
  studentId: string
  gift: OwnedSticker | null
  /** Поверх уже открыто другое окно (приветствие, альбом) — ждём. */
  suspended: boolean
}) {
  const t = useT()
  const reduce = useReducedMotion()
  const kind = useStickerSurface()
  // Держим показанный подарок, пока окно уезжает: после пометки он пропадает из списка.
  const [shown, setShown] = useState<OwnedSticker | null>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (open || suspended || !gift) return
    setShown(gift)
    setOpen(true)
  }, [gift, suspended, open])

  const def = shown ? stickerDef(shown.stickerKey) : null
  const ach = shown?.achievement ? ACHIEVEMENTS.find(a => a.key === shown.achievement) : undefined
  const done = (toAlbum: boolean) => {
    if (!shown) return
    setOpen(false)
    void markStickersSeen(studentId, [shown.id])
    if (toAlbum) openStickerAlbum(shown.stickerKey)
  }

  const buttons = (
    <>
      <button type="button" data-hover="layer" className="stk-btn stk-btn--primary" onClick={() => done(true)}>
        <OpticalText as="iskra-button-label">{t('В альбом')}</OpticalText>
      </button>
      <button type="button" data-hover="layer" className="stk-btn stk-btn--soft" onClick={() => done(false)}>
        <OpticalText as="iskra-button-label">{t('Спасибо!')}</OpticalText>
      </button>
    </>
  )

  return (
    <StickerSurface
      open={open && !!def} onClose={() => done(false)} label={t('Подарок от учителя')} width={420} zIndex={1220}
      footer={<div className="stk-foot">{buttons}</div>}
      sheetFooter={<div className="stk-sheet-foot">{buttons}</div>}
    >
      {def && shown && (
        <div className={kind === 'window' ? 'stk-gift' : undefined} style={{ textAlign: 'center' }}>
          <div className="stk-scene" aria-hidden>
            {!reduce && (
              <span className="stk-confetti" style={{ '--h': '200px' } as CSSProperties}>
                {PIECES.map((p, i) => <i key={i} style={{ '--x': p.x, '--d': p.d, '--r': p.r, '--c': p.c } as CSSProperties} />)}
              </span>
            )}
            <img src={newYearImg('gifts')} alt="" className="stk-scene__box" />
            <motion.img
              src={stickerImg(def.key)} alt="" className="stk-scene__sticker"
              initial={reduce ? false : { scale: 0.2, y: 60, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.15 }}
            />
            {ach && (
              <motion.span
                className="stk-medal" style={{ background: ach.color }}
                initial={reduce ? false : { scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.45 }}
              >{ach.glyph}</motion.span>
            )}
          </div>
          <div className="stk-gift__from">{t('Подарок от учителя')}</div>
          <FadeText lines={2} className="stk-gift__name">{t(def.title)}</FadeText>
          {shown.note && <div className="stk-gift__note">«{shown.note}»</div>}
          {ach && (
            <div className="stk-gift__ach">
              <span className="stk-medal stk-medal--small" style={{ background: ach.color }} aria-hidden>{ach.glyph}</span>
              <div style={{ minWidth: 0 }}>
                <FadeText className="stk-gift__ach-title">{t('Ачивка')} «{t(ach.title)}»</FadeText>
                <FadeText className="stk-gift__ach-sub">{t('Учитель отметил твою работу')}</FadeText>
              </div>
            </div>
          )}
          {kind === 'sheet' && <p className="stk-gift__hint">{t('Учитель дарит стикеры за работу. Ачивки — за серии и точность.')}</p>}
        </div>
      )}
    </StickerSurface>
  )
}
