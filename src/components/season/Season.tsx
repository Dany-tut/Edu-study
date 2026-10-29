import type { CSSProperties } from 'react'
import { useSeason, seasonImg, type SeasonVariant } from '../../lib/season'
import { useT } from '../../lib/i18n'
import './season.css'

/*
 * Слои праздничной темы на главной ученика. Каждый компонент сам решает, рисоваться
 * ли (useSeason): без темы — null, и главная выглядит как обычно. 3D-объекты —
 * прозрачные webp из public/season/halloween; всё декоративное — aria-hidden и
 * без касаний, чтобы не мешать кликам по карточкам под ним.
 */

/** «до 1 ноября» — последний день темы (конец — полночь следующего дня). */
function untilLabel(endsAt: string): string {
  const d = new Date(Date.parse(endsAt) - 1)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })
}

type HeroCopy = { chip: string; title: string; sub: string; img: string }
function heroCopy(v: SeasonVariant, until: string): HeroCopy {
  if (v === 'candy') return {
    chip: '31 октября · Хэллоуин', title: 'Сладость или гадость?',
    sub: 'Звёзды этой недели падают конфетами в ведёрко.', img: 'candy-bucket',
  }
  if (v === 'potions') return {
    chip: `Хэллоуин · до ${until}`, title: 'Зельеварня',
    sub: 'Решённая задача — пузырёк в колбе. Пройденный урок — зелье на дорожке.', img: 'potions',
  }
  return {
    chip: 'Хэллоуин в Искре', title: 'Ночь фонарей',
    sub: `Каждый пройденный урок зажигает фонарь на дорожке. До ${until}.`, img: 'lantern',
  }
}

/** Фон страницы за всеми блоками (десктоп): ночь с баннером, вечерняя шапка или мягкие пятна. */
export function SeasonBackdrop() {
  const s = useSeason()
  if (!s.on('hero') || !s.variant) return null
  return (
    <div aria-hidden className={`season-backdrop season-backdrop--${s.variant}`}>
      {s.variant === 'lanterns' && <img src={seasonImg('night-banner')} alt="" className="season-backdrop__banner" />}
      {s.variant === 'potions' && (
        <div className="season-backdrop__dusk">
          <span className="season-glow season-glow--mint" />
          <span className="season-glow season-glow--amber" />
          <span className="season-stars" />
        </div>
      )}
      {s.variant === 'candy' && (
        <>
          <span className="season-blob season-blob--amber" />
          <span className="season-blob season-blob--violet" />
        </>
      )}
    </div>
  )
}

/** Шапка темы: подпись, заголовок и герой-объект. compact — телефон. */
export function SeasonHero({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const s = useSeason()
  if (!s.on('hero') || !s.variant || !s.season) return null
  const c = heroCopy(s.variant, untilLabel(s.season.endsAt))
  return (
    <div className={`season-hero season-hero--${s.variant}${compact ? ' season-hero--compact' : ''}`}>
      <div className="season-hero__copy">
        <span className="season-hero__chip">{t(c.chip)}</span>
        <h2 className="season-hero__title">{t(c.title)}</h2>
        <p className="season-hero__sub">{t(c.sub)}</p>
      </div>
      <img aria-hidden src={seasonImg(c.img)} alt="" className="season-hero__img season-float" />
    </div>
  )
}

/** Кот на стопке книг: сидит на ряду виджетов. Родитель — position: relative. */
export function SeasonCat() {
  const s = useSeason()
  if (!s.on('decor') || (s.variant !== 'lanterns' && s.variant !== 'potions')) return null
  return <img aria-hidden src={seasonImg('cat-books')} alt="" className={`season-cat season-cat--${s.variant}`} />
}

/** Тыква выглядывает из нижнего правого угла. */
export function SeasonCornerPumpkin() {
  const s = useSeason()
  if (!s.on('decor') || (s.variant !== 'candy' && s.variant !== 'potions')) return null
  // Обрезающий слой: тыква выглядывает из-за края окна, но не удлиняет страницу —
  // иначе у главной появлялась прокрутка ровно на высоту её выступа.
  return (
    <div aria-hidden className="season-clip">
      <img src={seasonImg('pumpkin-spark')} alt="" className={`season-corner season-corner--${s.variant}`} />
    </div>
  )
}

/** Пустой день в расписании: привидение-листок вместо «Пока нет данных». */
export function SeasonEmptyDay() {
  const t = useT()
  const s = useSeason()
  if (!s.on('empty')) return null
  const sub = s.variant === 'potions' ? 'Загляни в тренажёр — зелье само не сварится'
    : s.variant === 'candy' ? 'Самое время перебрать конфеты'
    : 'Привидение-листок ждёт новую домашку'
  return (
    <div className="season-empty">
      <img aria-hidden src={seasonImg('ghost-paper')} alt="" className="season-empty__ghost season-float" />
      <div style={{ minWidth: 0 }}>
        <p className="season-empty__title">{t('Бу! Уроков нет')}</p>
        <p className="season-empty__sub">{t(sub)}</p>
      </div>
    </div>
  )
}

/** Иконка и подпись карточки «Звёзды» в теме. null — тема не трогает карточку. */
export function useSeasonStars(): { img: string; label: string } | null {
  const s = useSeason()
  if (!s.on('decor')) return null
  if (s.variant === 'candy') return { img: 'candy-bucket', label: 'Конфеты' }
  if (s.variant === 'potions') return { img: 'potions', label: 'Зелья' }
  if (s.variant === 'lanterns') return { img: 'pumpkin-spark', label: 'Тыквы-искры' }
  return null
}

/** Колба успеваемости («Зельеварня»): уровень жидкости = процент. */
export function SeasonFlask({ pct, height = 96 }: { pct: number; height?: number }) {
  const level = Math.max(0, Math.min(100, pct))
  return (
    <span aria-hidden className="season-flask" style={{ height, width: Math.round(height * 0.47) } as CSSProperties}>
      <span className="season-flask__liquid" style={{ height: `${level}%` }} />
      <span className="season-flask__shine" />
    </span>
  )
}

/** Текущий урок на дорожке: фонарь, конфета или светящийся шарик зелья. */
export function SeasonCurrentNode({ size }: { size: number }) {
  const s = useSeason()
  if (!s.on('track') || !s.variant) return null
  if (s.variant === 'potions') return <span aria-hidden className="season-node-orb" />
  const img = s.variant === 'candy' ? 'sticker-candy' : 'lantern'
  const h = s.variant === 'candy' ? size * 1.5 : size * 2.1
  return (
    <img
      aria-hidden src={seasonImg(img)} alt=""
      className={`season-node-img season-node-img--${s.variant}`}
      style={{ height: h }}
    />
  )
}
