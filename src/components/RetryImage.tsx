import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Картинка, которая не оставляет дыру
//
// 3D-объекты виджетов — PNG по 200–350 КБ. При обрыве сети или недокачанном
// ответе браузер рисует обрезок (верх картинки и размытый хвост) или пустую
// рамку, и так оно и висит до F5. Здесь после загрузки картинка проверяется
// через decode() и naturalWidth: битая или пустая — перезагружается с меткой
// в адресе (мимо кеша и service worker), до трёх раз с паузой 0.6 / 1.8 / 5 с.
// Не вышло — картинка скрывается целиком: пустое место лучше обрезка.
// ─────────────────────────────────────────────────────────────────────────────

const RETRY_DELAYS = [600, 1800, 5000]

function withAttempt(src: string, attempt: number) {
  if (attempt === 0) return src
  return `${src}${src.includes('?') ? '&' : '?'}r=${attempt}`
}

export default function RetryImage({ src, style, onLoad, onError, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => { setAttempt(0); setFailed(false) }, [src])
  useEffect(() => () => clearTimeout(timer.current), [])

  const retry = () => {
    if (attempt >= RETRY_DELAYS.length) { setFailed(true); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setAttempt(a => a + 1), RETRY_DELAYS[attempt])
  }

  return (
    <img
      {...rest}
      src={withAttempt(src, attempt)}
      style={failed ? { ...style, visibility: 'hidden' } : style}
      onLoad={event => {
        const img = event.currentTarget
        onLoad?.(event)
        if (!img.naturalWidth || !img.naturalHeight) { retry(); return }
        // decode() отклоняется на недокачанном или битом файле, даже если
        // load уже пришёл. Где decode нет — достаточно размеров.
        img.decode?.().catch(() => { if (img.isConnected) retry() })
      }}
      onError={event => { onError?.(event); retry() }}
    />
  )
}
