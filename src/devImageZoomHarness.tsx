// Стенд увеличения схем конспекта (dev-image-zoom.html).
//
// ЗАЧЕМ. Концепт ImageZoom согласуется по кадрам четырёх версий в двух темах
// (docs/platforms.md §3.1), а живой урок с курсом есть только у записанного
// ученика. Здесь — колонка конспекта с настоящей схемой курса «Бухгалтерия»
// и тот же компонент, что в уроке. Без базы, без записи.
//
// ?p=pc|ipad|iphone|android — хром какой версии показать (по умолчанию — по
// устройству); ?theme=dark; ?open=1 — сразу открыть схему; ?fig=N — какую по
// счёту схему курса взять.
import './lib/platform'
import './store/studentDataStore'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ImageZoom from './components/ImageZoom'
import Prose from './components/Prose'
import { proseWrap } from './lib/typography'
import { PLATFORM, type Platform } from './lib/platform'
import { ACC_LESSONS } from './data/accounting/accountingLessons'
import './index.css'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
const platform = (q.get('p') as Platform | null) ?? PLATFORM
document.documentElement.dataset.platform = platform

const figures = ACC_LESSONS.flatMap(x => x.lesson.content.paragraphs.filter(p => p.image).map(p => ({ lesson: x.lesson.title, p })))
const pick = figures[Number(q.get('fig') ?? 3) % figures.length]

function Stand() {
  const [open, setOpen] = useState(q.get('open') === '1')
  const phone = platform === 'iphone' || platform === 'android'
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: phone ? '64px 16px 32px' : '48px 32px', paddingRight: platform === 'ipad' ? 116 : undefined }}>
      <article style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Бухгалтерия · Конспект</div>
        <h1 style={{ fontSize: phone ? 24 : 30, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{pick.lesson}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, ...proseWrap }}>
          Схема ниже собирает шаги урока на одном листе. Нажмите на неё, чтобы рассмотреть подписи крупно.
        </p>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            data-hover="layer"
            onClick={() => setOpen(true)}
            style={{ padding: 10, borderRadius: 16, cursor: 'zoom-in', border: '1px solid var(--color-border-soft)', background: 'rgba(255,255,255,0.9)', display: 'block', width: '100%', maxWidth: 680, margin: '0 auto' }}
          >
            <img src={pick.p.image} alt="" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }} />
          </button>
          {pick.p.text && (
            <figcaption style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-muted)', textAlign: 'center' }}>
              <Prose text={pick.p.text} />
            </figcaption>
          )}
        </figure>
        <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, ...proseWrap }}>
          На ПК схему увеличивают колесом и двигают мышью, на телефоне и айпаде — щипком и двойным тапом.
        </p>
      </article>
      <ImageZoom src={open ? pick.p.image! : null} caption={pick.p.text} onClose={() => setOpen(false)} platform={platform} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
