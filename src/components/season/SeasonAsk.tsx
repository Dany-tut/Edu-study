import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSeason, setSeasonChoice, seasonImg, type SeasonVariant } from '../../lib/season'
import { useT } from '../../lib/i18n'
import './season.css'

/*
 * «Сейчас Хэллоуин — включить тему?» Каждый ученик решает сам: тема не появляется,
 * пока он не ответил, а «Ночь фонарей» переводит кабинет в тёмную тему только после
 * «Включить». Ответ запоминается на этот сезон (lib/season.ts → setSeasonChoice),
 * передумать можно переключателем в меню и в профиле.
 *
 * Фон и Esc закрывают окно без ответа — до следующего захода: случайный клик мимо
 * карточки не должен навсегда решать за ученика.
 */

const ART: Record<SeasonVariant, string> = { lanterns: 'lantern', candy: 'candy-bucket', potions: 'potions' }

function copy(v: SeasonVariant, until: string): { name: string; text: string } {
  if (v === 'candy') return {
    name: 'Сладость или гадость',
    text: `Конфеты вместо звёзд, тыквы и леденцовая дорожка уроков на главной — до ${until}.`,
  }
  if (v === 'potions') return {
    name: 'Зельеварня',
    text: `Колбы, зелья и вечерняя шапка на главной — до ${until}.`,
  }
  return {
    name: 'Ночь фонарей',
    text: `Ночное небо, фонари на дорожке уроков, и кабинет станет тёмным — до ${until}. Потом всё вернётся как было.`,
  }
}

export default function SeasonAsk() {
  const t = useT()
  const s = useSeason()
  const [dismissed, setDismissed] = useState(false)
  const okRef = useRef<HTMLButtonElement>(null)
  const open = s.asking && !dismissed && !!s.season

  useEffect(() => {
    if (!open) return
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setDismissed(true) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const v = s.season?.variant ?? 'lanterns'
  const until = s.season
    ? new Date(Date.parse(s.season.endsAt) - 1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })
    : ''
  const c = copy(v, until)

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="season-ask"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          style={{ position: 'fixed', inset: 0, zIndex: 4100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={() => setDismissed(true)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <motion.div
            initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="dialog" aria-modal="true" aria-labelledby="season-ask-title"
            className="season-ask"
          >
            <div className={`season-ask__art season-ask__art--${v}`}>
              <img aria-hidden src={seasonImg(ART[v])} alt="" className="season-ask__img season-float" />
            </div>
            <div style={{ padding: '18px 22px 20px' }}>
              <div className="season-ask__eyebrow">{t('Сейчас Хэллоуин')}</div>
              <div id="season-ask-title" className="season-ask__title">
                {t('Включить тему')} «{t(c.name)}»?
              </div>
              <p className="season-ask__text">{t(c.text)}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button className="season-ask__btn season-ask__btn--ghost" onClick={() => setSeasonChoice(false)}>
                  {t('Оставить как есть')}
                </button>
                <button ref={okRef} className="season-ask__btn season-ask__btn--main" onClick={() => setSeasonChoice(true)}>
                  {t('Включить')}
                </button>
              </div>
              <p className="season-ask__note">{t('Передумать можно в меню профиля.')}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
