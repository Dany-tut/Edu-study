import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSeason, setSeasonChoice, seasonImg, VARIANTS, type SeasonVariant } from '../../lib/season'
import { useT } from '../../lib/i18n'
import './season.css'

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

export const VARIANT_ART: Record<SeasonVariant, string> = { lanterns: 'lantern', candy: 'candy-bucket', potions: 'potions' }

const BLURB: Record<SeasonVariant, string> = {
  lanterns: 'Ночное небо и фонари на дорожке уроков. Кабинет станет тёмным',
  candy: 'Конфеты вместо звёзд, тыквы и леденцовая дорожка',
  potions: 'Колбы, зелья и вечерняя шапка на главной',
}

export default function SeasonAsk() {
  const t = useT()
  const s = useSeason()
  const [dismissed, setDismissed] = useState(false)
  const open = s.asking && !dismissed && !!s.season

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setDismissed(true) } }
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
          <div onClick={() => setDismissed(true)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <motion.div
            initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="dialog" aria-modal="true" aria-labelledby="season-ask-title"
            className="season-ask"
          >
            <div className="season-ask__eyebrow">{t('Сейчас Хэллоуин')}</div>
            <div id="season-ask-title" className="season-ask__title">{t('Выбери тему кабинета')}</div>
            <p className="season-ask__text">
              {t('До')} {until} {t('главная будет в праздничном оформлении — или оставь всё как есть.')}
            </p>

            <div className="season-ask__grid">
              {VARIANTS.map(v => (
                <button key={v.key} className="season-ask__opt" onClick={() => setSeasonChoice(v.key)}>
                  <span className={`season-ask__art season-ask__art--${v.key}`}>
                    <img aria-hidden src={seasonImg(VARIANT_ART[v.key])} alt="" className="season-ask__img" />
                  </span>
                  <span className="season-ask__opt-body">
                    <span className="season-ask__opt-name">{t(v.title)}</span>
                    <span className="season-ask__opt-text">{t(BLURB[v.key])}</span>
                  </span>
                </button>
              ))}
            </div>

            <button className="season-ask__btn season-ask__btn--ghost" onClick={() => setSeasonChoice('off')}>
              {t('Оставить как есть')}
            </button>
            <p className="season-ask__note">{t('Поменять тему или выключить — в меню профиля.')}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
