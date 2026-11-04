import { useEffect, useState } from 'react'

// Фейд для экранов, где прокручивается сам документ (урок, ДЗ на телефоне).
// Маску на обёртку не повесить: внутри фиксированные доки, их бы тоже погасило.
// Полоса лежит под доками и видна, только пока ниже есть содержимое.
export default function WindowBottomFade({ clearance }: { clearance: string }) {
  const [more, setMore] = useState(false)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const root = document.documentElement
      setMore(root.scrollHeight - window.innerHeight - window.scrollY > 1)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const resize = new ResizeObserver(schedule)
    resize.observe(document.body)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    update()
    return () => {
      cancelAnimationFrame(frame); resize.disconnect()
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule)
    }
  }, [])
  return (
    <div
      aria-hidden
      data-window-bottom-fade={more ? 'on' : 'off'}
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 5,
        height: `calc(${clearance} + 28px)`,
        background: 'linear-gradient(to bottom, transparent, var(--color-bg) 28px)',
        opacity: more ? 1 : 0, transition: 'opacity 160ms ease',
        pointerEvents: 'none',
      }}
    />
  )
}
