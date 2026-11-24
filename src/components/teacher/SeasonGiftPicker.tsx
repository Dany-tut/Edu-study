import { useEffect, useRef, useState } from 'react'
import FadeText from '../FadeText'
import FloatField from '../FloatField'
import { Check, Star, TrendingUp } from '../icons/appIcons'
import { useScrollFades } from '../../lib/useScrollFades'
import { tactile } from '../../lib/feedback'
import { isNewYearLive, newYearImg } from '../../lib/season'
import { alertDialog } from '../ConfirmHost'
import {
  ACHIEVEMENTS, COMMON, giftSticker, stickerDef, stickerImg, useStickers,
  type AchievementKey, type StickerKey,
} from '../../lib/seasonStickers'
import './seasonGiftPicker.css'

/*
 * «Подарок к проверке · необязательно» — учитель дарит новогодний стикер и
 * ачивку при проверке ДЗ (Figma «Искра», стр. 19, секция G, 489:2).
 *
 * Один компонент на все панели проверки: ПК (TeacherHomeworkReviewPage,
 * TeacherHardReviewPage → HardConversation), iPad (та же десктопная разметка),
 * телефон (MobileHomeworkReview, MobileTeacherReview). Подарок уходит ПОСЛЕ
 * успешного сохранения проверки; его ошибка проверку не отменяет.
 * Виден только пока идёт сезон (isNewYearLive).
 */

export type SeasonGift = {
  sticker: StickerKey | null; achievement: AchievementKey | null; note: string
  /** Учитель сам трогал ачивки — автоподстановка «Без ошибок» больше не вмешивается. */
  touched?: boolean
}
const EMPTY: SeasonGift = { sticker: null, achievement: null, note: '' }
const NOTE_MAX = 200

/**
 * Состояние подарка для одного ученика. Смена ученика сбрасывает подарок.
 * Хук можно звать до ранних возвратов страницы: он не зависит от оценки —
 * «Без ошибок» при 100/100 подставляет сам SeasonGiftPicker (проп perfect).
 */
export function useSeasonGift(studentId: string | null | undefined) {
  const live = isNewYearLive()
  const [gift, setGift] = useState<SeasonGift>(EMPTY)
  useEffect(() => { setGift(EMPTY) }, [studentId])
  const active = live && !!studentId
  return {
    /** Показывать ли блок (сезон идёт и ученик известен). */
    active,
    gift,
    /** Подарок выбран — кнопка отправки меняет подпись. */
    selected: active && !!gift.sticker,
    pickerProps: { studentId: studentId ?? '', value: gift, onChange: setGift },
    /**
     * Отправить подарок после сохранённой проверки. Ошибка — окно ALERT-01
     * (суть + пояснение), проверку это не трогает. Возвращает true, если
     * подарок ушёл или его не было.
     */
    async send(lessonRef: string): Promise<boolean> {
      if (!active || !studentId || !gift.sticker) return true
      let error: string | null
      try {
        error = await giftSticker({ studentId, stickerKey: gift.sticker, lessonRef, achievement: gift.achievement, note: gift.note })
      } catch { error = 'network' }
      if (!error) { setGift(EMPTY); return true }
      void alertDialog({
        title: 'Проверка сохранена, а подарок не отправлен',
        message: error === 'Этот подарок уже есть у ученика'
          ? 'Этот стикер у ученика уже есть. Подарите другой при следующей проверке.'
          : 'Проверьте связь — стикер можно подарить при следующей проверке.',
      })
      return false
    },
  }
}

const achievementGlyph = (key: AchievementKey) =>
  key === 'perfect' ? <span className="sgp-glyph-num">100</span>
    : key === 'best' ? <Star size={11} strokeWidth={2.4} fill="currentColor" />
      : <TrendingUp size={12} strokeWidth={2.4} />

export default function SeasonGiftPicker({ studentId, value, onChange, perfect = false, disabled = false }: {
  studentId: string; value: SeasonGift; onChange: (next: SeasonGift) => void
  /** Итог 100/100 (или 5/5): «Без ошибок» подставляется сама, пока ачивки не трогали; снять можно. */
  perfect?: boolean
  disabled?: boolean
}) {
  const { owned, loaded } = useStickers(studentId || null)
  const have = new Set(owned.map(o => o.stickerKey))
  const stickersRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  // SCROLL-01: фейд у края, за которым есть стикеры/ачивки.
  useScrollFades(stickersRef, true, ':scope', 22, true)
  useScrollFades(chipsRef, true, ':scope', 22, true)
  // Стикер, который у ученика появился (другая вкладка, авто-выдача), снимаем.
  useEffect(() => {
    if (value.sticker && have.has(value.sticker)) onChange({ ...value, sticker: null })
  }, [owned.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (value.touched) return
    const next = perfect ? 'perfect' : value.achievement === 'perfect' ? null : value.achievement
    if (next !== value.achievement) onChange({ ...value, achievement: next })
  }, [perfect, value.touched, value.achievement]) // eslint-disable-line react-hooks/exhaustive-deps

  const def = value.sticker ? stickerDef(value.sticker) : undefined
  const ach = ACHIEVEMENTS.find(a => a.key === value.achievement)

  return <section className="sgp" aria-label="Подарок к проверке">
    <div className="sgp-head">
      <h3>Подарок к проверке</h3>
      <span>необязательно</span>
    </div>

    <div ref={stickersRef} className="sgp-stickers no-scrollbar" role="radiogroup" aria-label="Стикер в подарок">
      {COMMON.map(key => {
        const d = stickerDef(key)!
        const own = have.has(key)
        const on = value.sticker === key
        return <button key={key} type="button" role="radio" aria-checked={on} data-hover="layer"
          className={'sgp-sticker' + (on ? ' sgp-on' : '') + (own ? ' sgp-owned' : '')}
          disabled={disabled || own || !loaded}
          aria-label={own ? `${d.title} — уже есть у ученика` : d.title}
          title={own ? `${d.title} — уже есть у ученика` : d.title}
          onClick={() => { tactile(); onChange({ ...value, sticker: on ? null : key }) }}>
          <img src={stickerImg(key)} alt="" draggable={false} />
          {on && <span className="sgp-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
        </button>
      })}
    </div>

    <div className="sgp-sub">Ачивка</div>
    <div ref={chipsRef} className="sgp-chips no-scrollbar" role="group" aria-label="Ачивка к подарку">
      {ACHIEVEMENTS.map(a => {
        const on = value.achievement === a.key
        return <button key={a.key} type="button" data-hover="layer" aria-pressed={on} disabled={disabled}
          className={'sgp-chip' + (on ? ' sgp-on' : '')}
          onClick={() => { tactile(); onChange({ ...value, achievement: on ? null : a.key, touched: true }) }}>
          <span className="sgp-glyph" style={{ background: a.color }} aria-hidden="true">{achievementGlyph(a.key)}</span>
          <span className="sgp-chip-label">{a.title}</span>
        </button>
      })}
    </div>

    <FloatField label="Подпись к подарку" value={value.note} maxLength={NOTE_MAX} disabled={disabled}
      onChange={note => onChange({ ...value, note: note.slice(0, NOTE_MAX) })}
      hint={value.note.length > NOTE_MAX - 40 ? `${value.note.length} / ${NOTE_MAX}` : undefined} />

    {def && <div className="sgp-preview" role="status">
      <img src={newYearImg('gifts')} alt="" draggable={false} />
      <div className="sgp-preview-text">
        <span>Ученик откроет подарок</span>
        <FadeText className="sgp-preview-title">{def.title}{ach ? ` + «${ach.title}»` : ''}</FadeText>
      </div>
    </div>}
  </section>
}
