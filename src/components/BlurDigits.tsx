import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './blurDigits.css'

/** Разложить «1.25×» на знаки с ключами относительно десятичной точки: целая
 *  часть получает отрицательные ключи, точка — 0, дробь — 1, 2… Так «1.5» →
 *  «1.25» меняет только дробь, а «1» не перескакивает в чужую клетку.
 *  Хвост-единица («×», «%») живёт отдельно и просто едет за числом. */
function split(value: string) {
  const m = /^(.*?)([^\d.]*)$/.exec(value)!
  const num = m[1], unit = m[2]
  const dot = num.indexOf('.')
  const anchor = dot < 0 ? num.length : dot
  const map = new Map<number, string>()
  ;[...num].forEach((ch, i) => map.set(i - anchor, ch))
  return { map, unit }
}

type Leaving = { ch: string; id: number }

/** Число, у которого меняющиеся знаки сменяются через размытие (как numericText
 *  в iOS): старый знак уходит и тает в размытии, новый проявляется с другой
 *  стороны. Растёт число — знаки едут вверх, падает — вниз. Знаки табличные,
 *  появившийся/исчезнувший разряд плавно раздвигает соседей, а не прыгает.
 *  Частые смены (ведение ползунка) не копят хвост: на клетку не больше одного
 *  уходящего знака. */
export default function BlurDigits({ value, className }: { value: string; className?: string }) {
  const { map, unit } = split(value)
  const prev = useRef(value)
  const dir = useRef<'up' | 'down'>('up')
  /** Клетки первого кадра не «вырастают»: таблетка открывается сразу готовой. */
  const born = useRef<Set<number> | null>(null)
  const seq = useRef(0)
  const [leaving, setLeaving] = useState<Map<number, Leaving>>(() => new Map())
  /** Номер последней смены знака в клетке: новый номер = новый узел = анимация
   *  входа ровно один раз. Клетки первого кадра номера не имеют и не мигают. */
  const inIds = useRef(new Map<number, number>())
  const drawn = useRef(value)
  if (drawn.current !== value) {
    const old = split(drawn.current).map
    for (const [k, ch] of map) if (old.get(k) !== ch) inIds.current.set(k, ++seq.current)
    const a = parseFloat(drawn.current), b = parseFloat(value)
    if (!Number.isNaN(a) && !Number.isNaN(b) && a !== b) dir.current = b > a ? 'up' : 'down'
    drawn.current = value
  }

  const timers = useRef(new Set<number>())
  useEffect(() => () => { for (const t of timers.current) window.clearTimeout(t) }, [])

  // До отрисовки: новый знак сразу встаёт с анимацией и верным направлением.
  useLayoutEffect(() => {
    const before = prev.current
    if (before === value) return
    prev.current = value
    const old = split(before).map
    const gone: [number, Leaving][] = []
    for (const [k, ch] of old) if (map.get(k) !== ch) gone.push([k, { ch, id: ++seq.current }])
    if (gone.length === 0) return
    setLeaving(l => { const n = new Map(l); for (const [k, v] of gone) n.set(k, v); return n })
    const timer = window.setTimeout(() => {
      setLeaving(l => {
        const n = new Map(l)
        for (const [k, v] of gone) if (n.get(k)?.id === v.id) n.delete(k)
        return n
      })
      timers.current.delete(timer)
    }, 340)
    timers.current.add(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const keys = [...new Set([...map.keys(), ...leaving.keys()])].sort((x, y) => x - y)
  if (!born.current) born.current = new Set(keys)
  return (
    <span
      className={`blur-digits${className ? ` ${className}` : ''}`}
      data-dir={dir.current}
      aria-label={value}
    >
      {keys.map(k => {
        const ch = map.get(k)
        const out = leaving.get(k)
        return (
          <span key={k} className={`blur-digits-slot${born.current!.has(k) ? '' : ' blur-digits-slot-new'}${ch === undefined ? ' blur-digits-slot-gone' : ''}`} aria-hidden="true">
            {ch !== undefined && <span key={inIds.current.get(k) ?? 0} className={inIds.current.has(k) ? 'blur-digits-in' : undefined}>{ch}</span>}
            {out && <span key={`o${out.id}`} className="blur-digits-out">{out.ch}</span>}
          </span>
        )
      })}
      {unit && <span aria-hidden="true">{unit}</span>}
    </span>
  )
}
