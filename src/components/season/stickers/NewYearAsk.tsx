import { useEffect, useState, useSyncExternalStore } from 'react'
import { MODAL_RADIUS } from '../../Modal'
import { motion, useReducedMotion } from 'framer-motion'
import OpticalText from '../../OpticalText'
import FadeText from '../../FadeText'
import { Check } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import { useSeason, setSeasonChoice, openSeasonPicker, variantsFor, newYearImg, type SeasonVariant } from '../../../lib/season'
import { COMMON, STICKERS, stickerImg } from '../../../lib/seasonStickers'
import StickerSurface, { useStickerSurface } from './StickerSurface'

/*
 * D · «Собери новогоднюю коллекцию» — первый заход в новогодний сезон (и вызов
 * из меню «Тема кабинета»). Три темы карточками, первая подсвечена; «Начать
 * собирать» включает подсвеченную, «Без темы» — кабинет как был, но стикеры всё
 * равно копятся (lib/seasonStickers.ts). Фон, ×, Escape и свайп листа закрывают
 * без ответа — до следующего захода, как у окна Хэллоуина.
 */

const SHORT: Record<string, string> = {
  yolka: 'ДЗ вешает игрушку',
  polnoch: 'отсчёт и салют',
  shar: 'урок зажигает окно',
}
const ROW = COMMON.slice(0, 7)

// Открыто ли окно сейчас — чтобы подарок учителя подождал, пока ученик выберет тему.
let askOpen = false
const askSubs = new Set<() => void>()
const setAskOpen = (v: boolean) => { if (askOpen !== v) { askOpen = v; askSubs.forEach(f => f()) } }
export function useNewYearAskOpen(): boolean {
  return useSyncExternalStore(f => { askSubs.add(f); return () => { askSubs.delete(f) } }, () => askOpen, () => false)
}

// Баннер в окне — вложенная карточка: одинаковый отступ сверху и по бокам,
// радиус концентричен окну (внешний − рамка − отступ). Крестик стоит
// на том же расстоянии от верха и правого края баннера, что и чипсы слева.
const BANNER_INSET = 8
const BANNER_RADIUS = MODAL_RADIUS - 1 - BANNER_INSET
const CLOSE_INSET = 14

export default function NewYearAsk() {
  const t = useT()
  const s = useSeason()
  const kind = useStickerSurface()
  const reduce = useReducedMotion()
  const [dismissed, setDismissed] = useState(false)
  const open = ((s.asking && !dismissed) || s.picking) && s.season?.key === 'new-year'
  const variants = variantsFor('new-year')
  const current = s.active && s.variant && variants.some(v => v.key === s.variant) ? s.variant : null
  const [pick, setPick] = useState<SeasonVariant>(current ?? variants[0].key)
  // Каждое открытие начинается с текущей темы (или первой).
  useEffect(() => { if (open) setPick(current ?? variants[0].key) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setDismissed(true); openSeasonPicker(false) }
  useEffect(() => { setAskOpen(open); return () => setAskOpen(false) }, [open])

  const until = s.season
    ? new Date(Date.parse(s.season.endsAt) - 1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })
    : ''
  const rare = STICKERS.filter(x => x.rare).length

  const header = (
    <div style={{ padding: kind === 'window' ? `${BANNER_INSET}px ${BANNER_INSET}px 0` : 0 }}>
      <div className="stk-banner" style={{
        height: kind === 'window' ? 150 : 128,
        backgroundImage: `url(${newYearImg('banner-yolka')})`,
        ...(kind === 'window' ? { borderRadius: BANNER_RADIUS } : null),
      }}>
        <div className="stk-banner__chips">
          <span className="stk-chip">{t('Новый год в Искре')}</span>
          {until && <span className="stk-chip">{t('до')} {until}</span>}
        </div>
        <motion.img
          aria-hidden alt="" src={stickerImg('og_santa')} className="stk-banner__og"
          initial={reduce ? false : { y: 40, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.12 }}
        />
      </div>
    </div>
  )

  const buttons = (stack: boolean) => (
    <>
      <button type="button" data-hover="layer" className="stk-btn stk-btn--primary" onClick={() => setSeasonChoice(pick)}>
        <OpticalText as="iskra-button-label">{t(s.picking && current === pick ? 'Оставить эту тему' : 'Начать собирать')}</OpticalText>
      </button>
      <button type="button" data-hover="layer" className="stk-btn stk-btn--link" onClick={() => setSeasonChoice('off')}>
        <OpticalText as="iskra-button-label">{t('Без темы')}</OpticalText>
      </button>
      {!stack && <span className="stk-ask__note">{t('Тему можно сменить в профиле')}</span>}
    </>
  )

  return (
    <StickerSurface
      open={open} onClose={close} label={t('Собери новогоднюю коллекцию')} width={600}
      closeInset={BANNER_INSET + CLOSE_INSET}
      header={header}
      footer={<div className="stk-ask__foot">{buttons(false)}</div>}
      sheetFooter={<div className="stk-sheet-foot">{buttons(true)}</div>}
    >
      <div className={kind === 'window' ? 'stk-ask' : undefined} style={kind === 'window' ? { paddingTop: 0 } : undefined}>
        <h2 className="stk-ask__title">{t('Собери новогоднюю коллекцию')}</h2>
        <p className="stk-ask__text">
          {t('Выбери, как украсить кабинет. За уроки, домашки и видео ты получаешь стикеры')} — {t('всего')} {STICKERS.length}, {t('из них редких')}: {rare}.
        </p>

        <div className="stk-themes" role="radiogroup" aria-label={t('Тема кабинета')}>
          {variants.map(v => (
            <button
              key={v.key} type="button" data-hover="layer" className="stk-theme"
              role="radio" aria-checked={pick === v.key} aria-pressed={pick === v.key}
              onClick={() => setPick(v.key)}
            >
              <span className="stk-theme__art" style={{ backgroundImage: `url(${newYearImg(`banner-${v.key}`)})` }} />
              {pick === v.key && <span className="stk-theme__check" aria-hidden><Check size={13} /></span>}
              <span className="stk-theme__body">
                <FadeText lines={2} className="stk-theme__name">{t(v.title)}</FadeText>
                <FadeText lines={2} className="stk-theme__about">{t(SHORT[v.key] ?? v.about)}</FadeText>
              </span>
            </button>
          ))}
        </div>

        <div className="stk-how">
          <div className="stk-how__label">{t('Как получить стикер')}</div>
          <div className="stk-ways">
            <span className="stk-way"><span className="stk-badge">+1</span>{t('Сдал домашку')}</span>
            <span className="stk-way"><span className="stk-badge">+1</span>{t('Досмотрел видеоурок')}</span>
            <span className="stk-way"><span className="stk-badge stk-badge--gold">★</span>{t('7 дней подряд — редкий')}</span>
          </div>
        </div>

        <div className="stk-row" aria-hidden>
          {ROW.map(k => <img key={k} src={stickerImg(k)} alt="" className="stk-row__img" />)}
          <span className="stk-badge stk-row__more">+{STICKERS.length - ROW.length}</span>
        </div>
      </div>
    </StickerSurface>
  )
}
