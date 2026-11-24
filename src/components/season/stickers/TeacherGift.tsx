import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import OpticalText from '../../OpticalText'
import FadeText from '../../FadeText'
import ScratchFoil from '../../ScratchFoil'
import { useT } from '../../../lib/i18n'
import { ACHIEVEMENTS, markStickersSeen, openStickerAlbum, stickerDef, stickerImg, type OwnedSticker } from '../../../lib/seasonStickers'
import StickerSurface, { useStickerSurface } from './StickerSurface'

/*
 * H · «Подарок от учителя»: учитель вернул ДЗ со стикером (и, может быть, ачивкой
 * и подписью). На главной при следующем заходе — подарок под фольгой (ИСК-4):
 * ученик стирает её пальцем или жмёт «Открыть», от места, где дотёр, проходит
 * волна, и только тогда видно, какой стикер, медаль ачивки и подпись учителя.
 *
 * «В альбом» — альбом на этом стикере; «Спасибо!» — просто закрыть. Оба, как и
 * ×/фон/свайп ПОСЛЕ открытия, помечают подарок просмотренным, и окно не вернётся.
 * Закрыли, не стерев, — подарок ждёт следующего захода на главную: нераскрытый
 * подарок не должен пропадать молча. Несколько подарков — по одному подряд.
 * «Уменьшить движение»: без волны и наклона, фольга просто исчезает.
 */

export default function TeacherGift({ studentId, gifts, suspended }: {
  studentId: string
  /** Непросмотренные подарки (unseenGifts). Показываем первый, который ученик не отложил. */
  gifts: OwnedSticker[]
  /** Поверх уже открыто другое окно (приветствие, альбом) — ждём. */
  suspended: boolean
}) {
  const t = useT()
  const reduce = useReducedMotion()
  const kind = useStickerSurface()
  // Держим показанный подарок, пока окно уезжает: после пометки он пропадает из списка.
  const [shown, setShown] = useState<OwnedSticker | null>(null)
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  // Закрытые без стирания — до следующего захода не показываем снова.
  const later = useRef(new Set<string>())
  const gift = gifts.find(g => !later.current.has(g.id)) ?? null
  useEffect(() => {
    if (open || suspended || !gift) return
    setShown(gift)
    setRevealed(false)
    setOpen(true)
  }, [gift, suspended, open])

  const def = shown ? stickerDef(shown.stickerKey) : null
  const ach = shown?.achievement ? ACHIEVEMENTS.find(a => a.key === shown.achievement) : undefined
  const done = (toAlbum: boolean) => {
    if (!shown) return
    setOpen(false)
    if (!revealed) { later.current.add(shown.id); return }
    void markStickersSeen(studentId, [shown.id])
    if (toAlbum) openStickerAlbum(shown.stickerKey)
  }

  // До стирания в подвале одна «Потом»: высота окна не прыгает, когда появляются
  // «В альбом» и «Спасибо!», а нераскрытый подарок подождёт следующего захода.
  const buttons = !revealed ? (
    <button type="button" data-hover="layer" className="stk-btn stk-btn--soft" onClick={() => done(false)}>
      <OpticalText as="iskra-button-label">{t('Потом')}</OpticalText>
    </button>
  ) : (
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
          {/* Подпись — над фольгой: сначала «от кого», потом стирание. */}
          <div className="stk-gift__from stk-gift__from--top">{t('Подарок от учителя')}</div>
          {/* key: следующий подарок — новая фольга, а не уже стёртая. */}
          <ScratchFoil key={shown.id} revealed={revealed} onReveal={() => setRevealed(true)}
            minHeight={190} radius={18} hint={t('Сотри фольгу — внутри подарок')}>
            <div className="stk-scene stk-scene--foil">
              <img src={stickerImg(def.key)} alt="" className="stk-scene__sticker" draggable={false} />
              {ach && <span className="stk-medal" style={{ background: ach.color }}>{ach.glyph}</span>}
            </div>
          </ScratchFoil>
          {/* Что внутри — раскрывается плавно, пока проходит волна: окно растёт, а не прыгает. */}
          {revealed && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ height: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: 0.25 }, opacity: { duration: 0.3, delay: 0.4 } }}
              style={{ overflow: 'hidden', paddingTop: 10 }}
            >
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
            </motion.div>
          )}
          {kind === 'sheet' && <p className="stk-gift__hint">{t('Учитель дарит стикеры за работу. Ачивки — за серии и точность.')}</p>}
        </div>
      )}
    </StickerSurface>
  )
}
