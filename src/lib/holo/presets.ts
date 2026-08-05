// Пресеты голо-стикеров «оценка за задание» + процедурная отрисовка артворка.
//
// Балл 1–5 → редкость стикера: чем выше балл, тем «дороже» фольга.
// Артворк рисуем на canvas 2D (альфа = форма высечки для рендера), поэтому
// цвета здесь — литеральные hex, CSS-переменные в canvas не резолвятся.
import { defaultSettings, type StickerSettings } from './settings'

export type StickerScore = 1 | 2 | 3 | 4 | 5

export interface StickerTier {
  score: StickerScore
  /** Название редкости — показываем ученику */
  name: string
  /** Подпись-объяснение, за что дают */
  hint: string
  /** Цвета артворка: основной / светлый / тёмный */
  ink: string
  inkLight: string
  inkDark: string
  /** Насколько «голографичен» стикер (для CSS-фолбэка и превью) */
  shine: number
}

export const STICKER_TIERS: Record<StickerScore, StickerTier> = {
  5: { score: 5, name: 'Голограмма', hint: 'Безупречно — задание принято с первого раза', ink: '#786AD7', inkLight: '#C6BDFF', inkDark: '#211858', shine: 1 },
  4: { score: 4, name: 'Фольга',     hint: 'Почти идеально — мелкие шероховатости',       ink: '#4F8BE8', inkLight: '#AFCDFF', inkDark: '#123059', shine: 0.72 },
  3: { score: 3, name: 'Глянец',     hint: 'Решено, но с ошибками',                        ink: '#4FBF9A', inkLight: '#A8EBD6', inkDark: '#0F4436', shine: 0.4 },
  2: { score: 2, name: 'Матовый',    hint: 'Есть над чем поработать',                      ink: '#E8A54F', inkLight: '#FFDCA8', inkDark: '#5E3D0F', shine: 0.18 },
  1: { score: 1, name: 'Картон',     hint: 'Задание засчитано частично',                   ink: '#98A0B0', inkLight: '#D6DBE4', inkDark: '#333A45', shine: 0.06 },
}

export function tierOf(score: number | null | undefined): StickerTier {
  const n = Math.max(1, Math.min(5, Math.round(score ?? 3))) as StickerScore
  return STICKER_TIERS[n]
}

/** Настройки рендера фольги под редкость. */
export function stickerSettings(score: number | null | undefined): StickerSettings {
  const s = tierOf(score).score
  const base: StickerSettings = {
    ...defaultSettings,
    size: 0.86,
    border: 0.022,
    cutTolerance: 0.02,
    relief: 0.3,
    layersOn: false,
    peelAmount: 0,
    shadow: 0.35,
    background: 'transparent',
    light: { x: 0.62, y: 0.72 },
  }
  // Голо сильно осветляет печать, поэтому интенсивности держим умеренными —
  // иначе балл на стикере не читается (проверено на превью).
  if (s === 5) return { ...base, finish: 'holo',  overlay: 'triangles', holoIntensity: 0.5,  bands: 10, ink: 1, grain: 0.22, pattern: 'linear' }
  if (s === 4) return { ...base, finish: 'holo',  overlay: 'none',      holoIntensity: 0.36, bands: 8,  ink: 1, grain: 0.14, pattern: 'radial' }
  if (s === 3) return { ...base, finish: 'gloss', overlay: 'none',      holoIntensity: 0.18, bands: 6,  ink: 1, grain: 0.08, pattern: 'linear' }
  if (s === 2) return { ...base, finish: 'matte', overlay: 'none',      holoIntensity: 0.08, bands: 5,  ink: 1, grain: 0.05, pattern: 'linear' }
  return { ...base, finish: 'matte', overlay: 'none', holoIntensity: 0.04, bands: 4, ink: 1, grain: 0.04, pattern: 'linear' }
}

export interface StickerArtSpec {
  score: number
  /** Верхняя подпись, напр. «Задание 13» */
  label?: string
  /** Нижняя подпись, напр. «Профильная математика» */
  sublabel?: string
  /** Пиксельный размер квадратного артворка */
  px?: number
}

/** Фестончатый контур («печать») — он же линия высечки стикера. */
function scallopPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, lobes: number, depth: number) {
  ctx.beginPath()
  const steps = lobes * 24
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2
    const rr = r * (1 - depth + depth * Math.cos(a * lobes) * 0.5 + depth * 0.5)
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/**
 * Рисует артворк стикера: фестончатая печать, крупный балл, звёзды по числу
 * баллов и подписи. Прозрачный фон — по нему рендер строит die-cut рамку.
 */
export function drawStickerArt(spec: StickerArtSpec): HTMLCanvasElement {
  const px = spec.px ?? 512
  const tier = tierOf(spec.score)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = px
  const ctx = canvas.getContext('2d')!
  const c = px / 2
  const R = px * 0.46

  // Корпус печати держим светлым: рендер подмешивает под краску серебряную
  // фольгу (ink < 1), и радужные полосы читаются только на светлом.
  scallopPath(ctx, c, c, R, 14, 0.075)
  const body = ctx.createLinearGradient(0, c - R, 0, c + R)
  body.addColorStop(0, '#FFFFFF')
  body.addColorStop(0.55, tier.inkLight)
  body.addColorStop(1, tier.ink)
  ctx.fillStyle = body
  ctx.fill()

  // кольца-канты
  ctx.beginPath()
  ctx.arc(c, c, R * 0.88, 0, Math.PI * 2)
  ctx.strokeStyle = tier.ink
  ctx.lineWidth = px * 0.016
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(c, c, R * 0.8, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = px * 0.008
  ctx.stroke()

  // светлая «шайба» под цифрой — на ней балл читается на любой фольге
  ctx.beginPath()
  ctx.arc(c, c - px * 0.02, R * 0.58, 0, Math.PI * 2)
  const disc = ctx.createRadialGradient(c - R * 0.2, c - R * 0.3, R * 0.05, c, c - px * 0.02, R * 0.58)
  disc.addColorStop(0, '#FFFFFF')
  disc.addColorStop(1, 'rgba(255,255,255,0.72)')
  ctx.fillStyle = disc
  ctx.fill()

  // балл
  ctx.fillStyle = tier.inkDark
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `800 ${px * 0.4}px "Manrope", "Inter", system-ui, sans-serif`
  ctx.fillText(String(tier.score), c, c - px * 0.035)

  // «из 5»
  ctx.fillStyle = `${tier.ink}CC`
  ctx.font = `700 ${px * 0.075}px "Manrope", "Inter", system-ui, sans-serif`
  ctx.fillText('из 5', c, c + px * 0.13)

  // звёзды по числу баллов — дуга снизу
  const stars = tier.score
  const starR = R * 0.7
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i - 2) * 0.235
    drawStar(ctx, c + Math.cos(a) * starR, c + Math.sin(a) * starR, px * 0.036, i < stars ? tier.inkDark : 'rgba(255,255,255,0.75)')
  }

  // подписи по дуге сверху и снизу
  if (spec.label) arcText(ctx, spec.label.toUpperCase(), c, c, R * 0.945, px * 0.055, tier.inkDark)
  if (spec.sublabel) arcText(ctx, spec.sublabel.toUpperCase(), c, c, R * 0.95, px * 0.04, `${tier.inkDark}B0`, true)

  return canvas
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const px2 = Math.cos(a) * rr
    const py = Math.sin(a) * rr
    if (i === 0) ctx.moveTo(px2, py)
    else ctx.lineTo(px2, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()
}

/** Текст по дуге: сверху (по часовой) или снизу (перевёрнутый). */
function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, size: number, color: string, bottom = false) {
  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${size}px "Manrope", "Inter", system-ui, sans-serif`
  const chars = [...text]
  const step = (size * 0.78) / r
  const total = chars.length * step
  chars.forEach((ch, i) => {
    const a = (bottom ? Math.PI / 2 + total / 2 - i * step : -Math.PI / 2 - total / 2 + i * step + step / 2)
    ctx.save()
    ctx.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
    ctx.rotate(bottom ? a - Math.PI / 2 : a + Math.PI / 2)
    ctx.fillText(ch, 0, 0)
    ctx.restore()
  })
  ctx.restore()
}

/** Артворк как ImageBitmap для WebGL-рендера. */
export async function stickerBitmap(spec: StickerArtSpec): Promise<ImageBitmap> {
  return createImageBitmap(drawStickerArt(spec))
}
