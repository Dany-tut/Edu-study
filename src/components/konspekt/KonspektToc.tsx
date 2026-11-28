// ─────────────────────────────────────────────────────────────────────────────
// Оглавление урока справа от конспекта (ПК ≥ 1280, вариант A — выбор Дани
// 28.11.2026, Figma стр. 31). Пункты — заголовки разделов конспекта; текущий
// раздел подсвечен по мере чтения. Колонка липкая, своей прокрутки нет —
// пунктов немного, поэтому фейды не нужны.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useT } from '../../lib/i18n'

/** Текущий раздел конспекта: последний заголовок, ушедший выше трети экрана. */
export function useActiveHeading(items: { id: string }[]) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null)
  const key = items.map(i => i.id).join('|')
  useEffect(() => {
    const els = key.split('|').map(id => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    if (!els.length) return
    let raf = 0
    const update = () => {
      raf = 0
      const line = window.innerHeight / 3
      let cur: string | null = els[0].id
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id
      setActive(cur)
    }
    // Прокрутка бывает и у окна, и у мобильного контейнера — слушаем захватом.
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    update()
    return () => { document.removeEventListener('scroll', onScroll, { capture: true }); if (raf) cancelAnimationFrame(raf) }
  }, [key])
  return [active, setActive] as const
}

/** Перейти к разделу конспекта. Без smooth: в части вебвью плавная прокрутка
 *  молча не срабатывает (memory: invisible-in-dark). */
export function goToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
}

export default function KonspektToc({ items }: { items: { id: string; text: string }[] }) {
  const t = useT()
  const [active, setActive] = useActiveHeading(items)

  return (
    <nav className="konspekt-toc" aria-label={t('В уроке')}>
      <span style={{ padding: '0 10px 8px', fontSize: 12, fontWeight: 600, lineHeight: 1.35, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
        {t('В уроке')}
      </span>
      {items.map(it => {
        const on = it.id === active
        return (
          <button
            key={it.id}
            type="button"
            data-hover="layer"
            aria-current={on ? 'location' : undefined}
            onClick={() => { goToHeading(it.id); setActive(it.id) }}
            style={{
              display: 'block', width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', fontFamily: 'inherit',
              padding: '6px 10px', borderRadius: 8, fontSize: 14, lineHeight: 1.35,
              fontWeight: on ? 600 : 400,
              background: on ? 'var(--color-accent-soft)' : 'transparent',
              color: on ? 'var(--color-purple-text)' : 'var(--color-text-2)',
            }}
          >
            {it.text}
          </button>
        )
      })}
    </nav>
  )
}
