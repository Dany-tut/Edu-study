import LottieIcon from './LottieIcon'

// Перекрашиваем все сплошные заливки в жёлтый (#F5C842). Данные те же, что у
// звезды: hard-star-satellite.json был её точной копией, отличалась только
// эта правка цвета.
function recolor(data: unknown, r: number, g: number, b: number): unknown {
  if (Array.isArray(data)) return data.map(v => recolor(v, r, g, b))
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    // Lottie fill shape: ty === "fl", color value at c.k (static) or c.k[*].s
    if (obj['ty'] === 'fl' && obj['c']) {
      const c = obj['c'] as Record<string, unknown>
      if (Array.isArray(c['k'])) {
        const k = c['k'] as number[]
        if (typeof k[0] === 'number') {
          return { ...obj, c: { ...c, k: [r, g, b, k[3] ?? 1] } }
        }
        // animated keyframes
        return {
          ...obj,
          c: {
            ...c,
            k: k.map((kf: unknown) => {
              const frame = kf as Record<string, unknown>
              if (frame['s'] && Array.isArray(frame['s'])) {
                return { ...frame, s: [r, g, b, (frame['s'] as number[])[3] ?? 1] }
              }
              return frame
            }),
          },
        }
      }
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, recolor(v, r, g, b)]))
  }
  return data
}

const toYellow = (data: unknown) => recolor(data, 0.96, 0.78, 0.26)

export default function HardSatelliteLottie({ size = 18 }: { size?: number }) {
  return (
    <LottieIcon
      name="star"
      size={size}
      transform={toYellow}
      transformKey="yellow"
      style={{ marginTop: -2 }}
    />
  )
}
