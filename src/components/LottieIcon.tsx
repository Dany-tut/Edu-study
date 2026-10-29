import { useEffect, useRef, useState, type ComponentType } from 'react'

// ── Анимации грузятся с сервера, а не из бандла ──────────────────────────────
//
// Раньше каждый значок делал `import data from '../../hard-star.json'`, и
// сборщик клал JSON внутрь главного чанка — причём в виде JS-литерала, отчего
// 119 КБ на диске превращались в 438 КБ в бандле. Файлов было четыре, три из
// них байт в байт одинаковые (звезда), то есть одна анимация лежала в index.js
// трижды. Вместе с самим lottie-web это давало 2,4 МБ из 12 — пятую часть
// первой загрузки ради четырёх декоративных иконок.
//
// Теперь JSON лежит в public/anim и приезжает обычным fetch (8,6 КБ в gzip),
// а lottie-react подтягивается динамическим импортом при первом показе. До
// готовности значок держит своё место пустой коробкой того же размера, чтобы
// вокруг ничего не дёргалось.

type LottieHandle = { goToAndStop: (v: number, isFrame?: boolean) => void; goToAndPlay: (v: number, isFrame?: boolean) => void; getDuration: (inFrames?: boolean) => number | undefined }
type LottieProps = {
  animationData: unknown
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
  lottieRef?: React.MutableRefObject<LottieHandle | null>
  onDOMLoaded?: () => void
}

// Системная настройка «уменьшить движение» — тогда значок стоит на последнем
// кадре и не играет вовсе.
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let lottiePromise: Promise<ComponentType<LottieProps>> | null = null
function loadLottie() {
  lottiePromise ??= import('lottie-react').then(m => m.default as unknown as ComponentType<LottieProps>)
  return lottiePromise
}

const dataCache = new Map<string, Promise<unknown>>()
function loadData(name: string) {
  let p = dataCache.get(name)
  if (!p) {
    p = fetch(`/anim/${name}.json`).then(r => r.json())
    dataCache.set(name, p)
  }
  return p
}

// Результат transform кешируем по паре имя+ключ: перекраска спутника обходит
// всё дерево анимации, и делать это на каждом монтировании значка ни к чему.
const derivedCache = new Map<string, Promise<unknown>>()

export type LottieIconProps = {
  /** Имя файла в public/anim, без расширения. */
  name: string
  size: number
  /** По умолчанию — один проход и стоп на последнем кадре: значок на экране, где
   *  сидят подолгу, не крутится вечно (экран в покое не рисует кадров).
   *  Повтор — по наведению. */
  loop?: boolean
  style?: React.CSSProperties
  /** Правка данных перед показом (перекраска). Обязателен `transformKey`. */
  transform?: (data: unknown) => unknown
  transformKey?: string
}

export default function LottieIcon({ name, size, loop = false, style, transform, transformKey }: LottieIconProps) {
  const lottieRef = useRef<LottieHandle | null>(null)
  const [ready, setReady] = useState<{ Lottie: ComponentType<LottieProps>; data: unknown } | null>(null)

  useEffect(() => {
    let alive = true
    const key = transform ? `${name}::${transformKey ?? ''}` : name
    let dataP = derivedCache.get(key)
    if (!dataP) {
      dataP = transform ? loadData(name).then(transform) : loadData(name)
      derivedCache.set(key, dataP)
    }
    void Promise.all([loadLottie(), dataP]).then(([Lottie, data]) => {
      if (alive) setReady({ Lottie, data })
    }).catch(() => { /* значок декоративный — молча не показываем */ })
    return () => { alive = false }
  }, [name, transform, transformKey])

  const box: React.CSSProperties = { width: size, height: size, flexShrink: 0, ...style }
  if (!ready) return <span style={{ display: 'inline-block', ...box }} />
  const { Lottie, data } = ready
  const still = reducedMotion()
  const toLast = () => { const h = lottieRef.current; const n = h?.getDuration(true); if (h && n) h.goToAndStop(n - 1, true) }
  return (
    <span
      style={{ display: 'inline-block', lineHeight: 0, ...box }}
      onMouseEnter={loop || still ? undefined : () => lottieRef.current?.goToAndPlay(0, true)}
    >
      <Lottie
        animationData={data} loop={loop && !still} autoplay={!still}
        lottieRef={lottieRef} onDOMLoaded={still ? toLast : undefined}
        style={{ width: '100%', height: '100%' }}
      />
    </span>
  )
}
