// Живой 3D-Огонёк в местах лендинга. Модель и движок (three + GLTF) грузятся
// ленивым чанком только когда блок подъезжает к экрану, и выгружаются, когда
// уезжает, — чтобы на странице никогда не висело восемь WebGL-контекстов сразу
// и three не попадал в основной бандл.
//
// Холст прозрачный и лежит ПОВЕРХ растровой картинки той же позы: пока модель
// не загрузилась, при «Уменьшить движение», без WebGL и там, где не идёт
// requestAnimationFrame (превью в приложении), сквозь прозрачный холст видна
// картинка. Как только модель отрисовалась — она перекрывает её собой.

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTheme } from '../../../store/themeStore'
import type { OgonekHandle, OgonekPoseName } from '../../../lib/ogonek3d/ogonekViewer'
import { asset } from './kit'

type Props = {
  pose: OgonekPoseName
  /** Растровая картинка той же позы — фон и запасной вид. */
  fallback: string
  alt?: string
  className?: string
  style?: CSSProperties
  /** Вызывается, когда модель готова, — чтобы снаружи дернуть play (прыжок по клику). */
  onReady?: (h: OgonekHandle) => void
}

function canUseModel(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

export default function OgonekModel({ pose, fallback, alt = '', className = '', style, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const dark = useTheme(s => s.dark)
  const handle = useRef<OgonekHandle | null>(null)
  const [capable] = useState(canUseModel)

  // Монтируем движок, только когда блок рядом с экраном; размонтируем, когда ушёл.
  useEffect(() => {
    if (!capable) return
    const el = host.current
    if (!el) return
    let cancelled = false
    let mounting = false

    const mount = async () => {
      if (handle.current || mounting) return
      mounting = true
      try {
        const { mountOgonek } = await import('../../../lib/ogonek3d/ogonekViewer')
        if (cancelled || !host.current) return
        const h = mountOgonek(host.current, { pose, dark: useTheme.getState().dark })
        handle.current = h
        onReady?.(h)
      } catch { /* нет модели — остаётся картинка */ }
      finally { mounting = false }
    }
    const unmount = () => { handle.current?.dispose(); handle.current = null }

    const io = new IntersectionObserver(
      es => { for (const e of es) e.isIntersecting ? void mount() : unmount() },
      { rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => { cancelled = true; io.disconnect(); unmount() }
    // pose фиксирован на точку лендинга; dark/onReady меняем через ref, не пересоздавая
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capable, pose])

  // Тему прокидываем в уже смонтированную модель.
  useEffect(() => { handle.current?.setDark(dark) }, [dark])

  return (
    <div ref={host} className={`[&>canvas]:absolute [&>canvas]:inset-0 ${className}`} style={style}>
      <img src={asset(fallback)} alt={alt} aria-hidden={alt ? undefined : true} decoding="async" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain" />
    </div>
  )
}
