import OpticalText from '../OpticalText'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSeason, setSeasonChoice, openSeasonPicker, seasonImg, VARIANTS, type HalloweenVariant } from '../../lib/season'
import { PLATFORM } from '../../lib/platform'
import NewYearAsk from './stickers/NewYearAsk'
import { useT } from '../../lib/i18n'
import './season.css'
import { useNativeOverlay } from '../../lib/nativeGlass'

/*
 * «Сейчас Хэллоуин — выбери тему». Каждый ученик сам выбирает одну из трёх или
 * оставляет кабинет как есть; вариант, который админ выбрал себе, на него не влияет.
 * Пока ответа нет, темы нет, а «Ночь фонарей» переводит кабинет в тёмную тему только
 * после выбора. Ответ — на этот сезон (lib/season.ts → setSeasonChoice), передумать
 * можно переключателем в меню и в профиле.
 *
 * Фон и Esc закрывают окно без ответа — до следующего захода: случайный клик мимо
 * карточки не должен навсегда решать за ученика.
 */

export const VARIANT_ART: Record<HalloweenVariant, string> = { lanterns: 'lantern', candy: 'candy-bucket', potions: 'potions' }

const BLURB: Record<HalloweenVariant, string> = {
  lanterns: 'Ночное небо и фонари на дорожке уроков. Кабинет станет тёмным',
  candy: 'Конфеты вместо звёзд, тыквы и леденцовая дорожка',
  potions: 'Колбы, зелья и вечерняя шапка на главной',
}

/** Окно выбора темы сезона. Новый год — своё окно «Собери новогоднюю коллекцию»
 *  (stickers/NewYearAsk) на всех четырёх версиях; Хэллоуин на iPhone не показывали
 *  и не показываем. */
export default function SeasonAsk() {
  const s = useSeason()
  if (s.season?.key === 'new-year') return <NewYearAsk />
  if (PLATFORM === 'iphone') return null
  return <HalloweenAsk />
}

function HalloweenAsk() {
  const t = useT()
  const s = useSeason()
  const [dismissed, setDismissed] = useState(false)
  // Само при первом входе (asking) или по строке «Хэллоуин-тема» в настройках (picking).
  const open = ((s.asking && !dismissed) || s.picking) && !!s.season
  const close = () => { setDismissed(true); openSeasonPicker(false) }
  useNativeOverlay(open)
  // Вызвано из настроек: подсвечиваем текущую тему, вторая кнопка — «Без темы».
  const current = s.picking && s.active ? s.variant : null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const until = s.season
    ? new Date(Date.parse(s.season.endsAt) - 1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })
    : ''

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="season-ask"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          style={{ position: 'fixed', inset: 0, zIndex: 4100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div onClick={close} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <motion.div
            initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="dialog" aria-modal="true" aria-labelledby="season-ask-title"
            className="season-ask"
          >
            <div className="season-ask__eyebrow">{t('Сейчас Хэллоуин')}</div>
            <div id="season-ask-title" className="season-ask__title">{t(s.picking ? 'Тема кабинета' : 'Выбери тему кабинета')}</div>
            <p className="season-ask__text">
              {t('До')} {until} {t('главная будет в праздничном оформлении — или оставь всё как есть.')}
            </p>

            <div className="season-ask__grid">
              {VARIANTS.map(v => (
                <button key={v.key} className="season-ask__opt" data-current={current === v.key || undefined} aria-pressed={current === v.key} onClick={() => setSeasonChoice(v.key)}>
                  <span className={`season-ask__art season-ask__art--${v.key}`}>
                    <img aria-hidden src={seasonImg(VARIANT_ART[v.key as HalloweenVariant])} alt="" className="season-ask__img" />
                  </span>
                  <span className="season-ask__opt-body">
                    <span className="season-ask__opt-name">{t(v.title)}</span>
                    <span className="season-ask__opt-text">{t(BLURB[v.key as HalloweenVariant])}</span>
                  </span>
                </button>
              ))}
            </div>

            <button data-hover="layer" className="season-ask__btn season-ask__btn--ghost" onClick={() => setSeasonChoice('off')}>
              <OpticalText as="iskra-button-label">{t(s.picking ? 'Без темы' : 'Оставить как есть')}</OpticalText>
            </button>
            <p className="season-ask__note">{t('Поменять тему или выключить — в меню профиля.')}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
