import { useEffect, useState, type ComponentType } from 'react'

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

type LottieProps = {
  animationData: unknown
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}

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
  loop?: boolean
  style?: React.CSSProperties
  /** Правка данных перед показом (перекраска). Обязателен `transformKey`. */
  transform?: (data: unknown) => unknown
  transformKey?: string
}

export default function LottieIcon({ name, size, loop = true, style, transform, transformKey }: LottieIconProps) {
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
  return <Lottie animationData={data} loop={loop} autoplay style={box} />
}
