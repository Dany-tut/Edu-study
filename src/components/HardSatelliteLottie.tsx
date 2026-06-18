import Lottie from 'lottie-react'
import animationData from '../../hard-star-satellite.json'

// Deep-clone and recolor all solid fill colors to yellow (#F5C842)
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

// Yellow: #F5C842 → 0.96, 0.78, 0.26 in [0..1]
const yellowData = recolor(animationData, 0.96, 0.78, 0.26)

export default function HardSatelliteLottie({ size = 18 }: { size?: number }) {
  return (
    <Lottie
      animationData={yellowData}
      loop
      autoplay
      style={{ width: size, height: size, flexShrink: 0, marginTop: -2 }}
    />
  )
}
