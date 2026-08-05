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

// Название стикера — про работу ученика, а не про материал печати: «Фольга» и
// «Глянец» описывали способ рендера, ученику это ничего не говорит. Уровень
// редкости и так виден по самой фольге, поэтому слово несёт оценку.
export const STICKER_TIERS: Record<StickerScore, StickerTier> = {
  5: { score: 5, name: 'Безупречно',  hint: 'Принято с первого раза, без замечаний', ink: '#786AD7', inkLight: '#C6BDFF', inkDark: '#211858', shine: 1 },
  4: { score: 4, name: 'Уверенно',    hint: 'Всё верно, поправить пару мелочей',     ink: '#4F8BE8', inkLight: '#AFCDFF', inkDark: '#123059', shine: 0.72 },
  3: { score: 3, name: 'Хорошо',      hint: 'Решено, но с ошибками',                 ink: '#4FBF9A', inkLight: '#A8EBD6', inkDark: '#0F4436', shine: 0.4 },
  2: { score: 2, name: 'Почти',       hint: 'Ход верный, есть над чем поработать',   ink: '#E8A54F', inkLight: '#FFDCA8', inkDark: '#5E3D0F', shine: 0.18 },
  1: { score: 1, name: 'Первый шаг',  hint: 'Задание засчитано частично',            ink: '#98A0B0', inkLight: '#D6DBE4', inkDark: '#333A45', shine: 0.06 },
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

/**
 * Что нарисовано в середине печати. Балл — не единственный вариант: коллекция
 * из одних цифр выглядит как шесть копий одного стикера, потому что редкостей
 * всего пять, а работ — десятки. Эмблема даёт различие при той же редкости.
 */
export type StickerEmblem =
  | 'score' | 'rocket' | 'trophy' | 'laurel' | 'star' | 'bolt'
  | 'crown' | 'gem' | 'flame' | 'medal'

/**
 * Пул для автоматической раздачи. Цифры (`score`) в него НЕ входят: балл и так
 * читается по звёздам под эмблемой и по редкости фольги, а в ряду эмблем один
 * стикер с голым числом выглядит как недорисованный. `score` остаётся
 * допустимым значением — его можно задать явно.
 *
 * Порядок важен: по хешу берётся стартовый индекс, перестановка перетасует уже
 * выданные стикеры.
 */
const AUTO_EMBLEMS: StickerEmblem[] = [
  'rocket', 'trophy', 'laurel', 'star', 'bolt', 'crown', 'gem', 'flame', 'medal',
]

export interface StickerArtSpec {
  score: number
  /** Верхняя подпись, напр. «Задание 13» */
  label?: string
  /** Нижняя подпись, напр. «Профильная математика» */
  sublabel?: string
  /** Пиксельный размер квадратного артворка */
  px?: number
  /** Принудительная эмблема; по умолчанию выводится из отпечатка. */
  emblem?: StickerEmblem
  /**
   * Устойчивая личность стикера (id награды, ключ коллекции). Именно она держит
   * артворк: подписи у витрины и у открытого стикера разные (в плитке помещается
   * только верхняя строка), и без общего id один и тот же стикер рисовался с
   * разной эмблемой и разной высечкой.
   */
  stickerId?: string
}

/** FNV-1a. Нужен отдельно от spec: по нему же раздаются эмблемы коллекции. */
function hashOf(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

/**
 * Стабильный отпечаток стикера. Одна и та же работа всегда даёт одну и ту же
 * эмблему и форму высечки — иначе стикер «менялся» бы при каждой перерисовке,
 * а коллекционная вещь обязана быть постоянной.
 */
function fingerprint(spec: StickerArtSpec): number {
  return hashOf(spec.stickerId ?? `${spec.label ?? ''}|${spec.sublabel ?? ''}`)
}

/**
 * Раздаёт коллекции эмблемы БЕЗ повторов: хеш даёт стартовое место, занятое
 * место уступается следующему свободному. Хеша одного мало — при пуле в 9
 * эмблем шесть стикеров сталкиваются примерно в половине случаев, что и видно
 * как две одинаковые звезды в ряду.
 *
 * Считаем в порядке отсортированных id, а не в порядке показа: тогда сортировка
 * коллекции (сначала новые / по баллу) не перетасовывает уже выданные эмблемы.
 * Когда стикеров больше, чем эмблем, пул идёт на второй круг — уникальность
 * держится внутри девятки, дальше повтор неизбежен.
 */
export function assignEmblems(ids: string[]): Record<string, StickerEmblem> {
  const N = AUTO_EMBLEMS.length
  const out: Record<string, StickerEmblem> = {}
  let used = new Set<number>()
  for (const id of [...ids].sort()) {
    if (used.size >= N) used = new Set()
    let i = hashOf(id) % N
    while (used.has(i)) i = (i + 1) % N
    used.add(i)
    out[id] = AUTO_EMBLEMS[i]
  }
  return out
}

/** Фестончатый контур («печать») — он же линия высечки стикера. */
function scallopPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, lobes: number, depth: number, phase = 0) {
  ctx.beginPath()
  const steps = lobes * 24
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2 - Math.PI / 2
    const rr = r * (1 - depth + depth * Math.cos(a * lobes + phase) * 0.5 + depth * 0.5)
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

  // Отпечаток: он же выбирает эмблему и слегка меняет высечку, чтобы две
  // работы с одинаковым баллом не выглядели одним и тем же стикером.
  const fp = fingerprint(spec)
  const emblem = spec.emblem ?? AUTO_EMBLEMS[fp % AUTO_EMBLEMS.length]
  const lobes = [12, 14, 16][(fp >> 3) % 3]

  // Корпус печати держим светлым: рендер подмешивает под краску серебряную
  // фольгу (ink < 1), и радужные полосы читаются только на светлом.
  scallopPath(ctx, c, c, R, lobes, 0.075, ((fp >> 5) % 6) * 0.26)
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

  // лицо стикера: балл цифрой либо эмблема
  ctx.fillStyle = tier.inkDark
  if (emblem === 'score') {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${px * 0.4}px "Manrope", "Inter", system-ui, sans-serif`
    ctx.fillText(String(tier.score), c, c - px * 0.02)
  } else {
    drawEmblem(ctx, emblem, c, c - px * 0.02, R * 0.36, tier)
  }

  // Звёзды по числу баллов — дуга снизу. Пустые места не рисуем вовсе: бледная
  // звезда «которой нет» на мелком стикере читается как полноценная, и балл 4
  // выглядит как 5. Оставшиеся звёзды центрируем по дуге.
  const stars = tier.score
  const starR = R * 0.7
  for (let i = 0; i < stars; i++) {
    const a = Math.PI / 2 + (i - (stars - 1) / 2) * 0.235
    drawStar(ctx, c + Math.cos(a) * starR, c + Math.sin(a) * starR, px * 0.036, tier.inkDark)
  }

  // подписи по дуге сверху и снизу
  if (spec.label) arcText(ctx, spec.label.toUpperCase(), c, c, R * 0.945, px * 0.055, tier.inkDark)
  if (spec.sublabel) arcText(ctx, spec.sublabel.toUpperCase(), c, c, R * 0.95, px * 0.04, `${tier.inkDark}B0`, true)

  return canvas
}

/**
 * Эмблема в середине печати. Рисуется в квадрате [-1, 1], масштабируется на s,
 * поэтому одинаково узнаётся и на плитке 46px, и на открытом стикере 240px.
 * Контуры намеренно крупные и без мелких деталей — на 46px тонкая линия
 * схлопывается в кашу.
 */
function drawEmblem(
  ctx: CanvasRenderingContext2D,
  emblem: StickerEmblem,
  cx: number, cy: number, s: number,
  tier: StickerTier,
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(s, s)
  ctx.fillStyle = tier.inkDark
  ctx.strokeStyle = tier.inkDark
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  if (emblem === 'rocket') {
    // корпус
    ctx.beginPath()
    ctx.moveTo(0, -1.05)
    ctx.bezierCurveTo(0.5, -0.45, 0.42, 0.15, 0.3, 0.5)
    ctx.lineTo(-0.3, 0.5)
    ctx.bezierCurveTo(-0.42, 0.15, -0.5, -0.45, 0, -1.05)
    ctx.closePath()
    ctx.fill()
    // крылья
    ctx.beginPath()
    ctx.moveTo(-0.3, 0.06); ctx.lineTo(-0.78, 0.62); ctx.lineTo(-0.3, 0.52); ctx.closePath()
    ctx.moveTo(0.3, 0.06); ctx.lineTo(0.78, 0.62); ctx.lineTo(0.3, 0.52); ctx.closePath()
    ctx.fill()
    // иллюминатор — светлым, иначе на мелком размере корпус читается как капля
    ctx.beginPath()
    ctx.arc(0, -0.34, 0.2, 0, Math.PI * 2)
    ctx.fillStyle = tier.inkLight
    ctx.fill()
    // выхлоп
    ctx.beginPath()
    ctx.moveTo(-0.17, 0.56); ctx.lineTo(0, 1.05); ctx.lineTo(0.17, 0.56); ctx.closePath()
    ctx.fillStyle = tier.inkDark
    ctx.fill()
  } else if (emblem === 'trophy') {
    // чаша
    ctx.beginPath()
    ctx.moveTo(-0.52, -0.78)
    ctx.lineTo(0.52, -0.78)
    ctx.lineTo(0.44, -0.12)
    ctx.bezierCurveTo(0.4, 0.2, -0.4, 0.2, -0.44, -0.12)
    ctx.closePath()
    ctx.fill()
    // ручки
    ctx.lineWidth = 0.16
    ctx.beginPath(); ctx.arc(-0.62, -0.44, 0.28, Math.PI * 0.55, Math.PI * 1.5); ctx.stroke()
    ctx.beginPath(); ctx.arc(0.62, -0.44, 0.28, Math.PI * 1.5, Math.PI * 0.45); ctx.stroke()
    // ножка и основание
    ctx.beginPath(); ctx.rect(-0.12, 0.16, 0.24, 0.42); ctx.fill()
    ctx.beginPath(); ctx.rect(-0.46, 0.58, 0.92, 0.22); ctx.fill()
  } else if (emblem === 'laurel') {
    // две ветви, раскрытые кверху; между ними — маленькая звезда
    ctx.lineWidth = 0.13
    for (const dir of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(dir * 0.18, 0.92)
      ctx.quadraticCurveTo(dir * 0.98, 0.35, dir * 0.66, -0.88)
      ctx.stroke()
      for (let i = 0; i < 4; i++) {
        const t = 0.18 + i * 0.22
        const lx = dir * (0.28 + t * 0.95 - t * t * 0.5)
        const ly = 0.86 - t * 1.75
        ctx.save()
        ctx.translate(lx, ly)
        ctx.rotate(dir * (0.9 - t))
        ctx.beginPath()
        ctx.ellipse(dir * 0.18, 0, 0.24, 0.115, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }
    drawStar(ctx, 0, -0.36, 0.33, tier.inkDark)
  } else if (emblem === 'star') {
    drawStar(ctx, 0, 0, 1.02, tier.inkDark)
  } else if (emblem === 'bolt') {
    ctx.beginPath()
    ctx.moveTo(0.28, -1.02)
    ctx.lineTo(-0.62, 0.1)
    ctx.lineTo(-0.1, 0.1)
    ctx.lineTo(-0.28, 1.02)
    ctx.lineTo(0.62, -0.12)
    ctx.lineTo(0.1, -0.12)
    ctx.closePath()
    ctx.fill()
  } else if (emblem === 'crown') {
    // три зубца одним контуром: на 46px раздельные зубцы сливаются в гребёнку
    ctx.beginPath()
    ctx.moveTo(-0.92, -0.28)
    ctx.lineTo(-0.5, 0.16)
    ctx.lineTo(0, -0.62)
    ctx.lineTo(0.5, 0.16)
    ctx.lineTo(0.92, -0.28)
    ctx.lineTo(0.72, 0.78)
    ctx.lineTo(-0.72, 0.78)
    ctx.closePath()
    ctx.fill()
    // камень в ободе — светлым, иначе корона читается как трапеция
    ctx.beginPath()
    ctx.arc(0, 0.46, 0.15, 0, Math.PI * 2)
    ctx.fillStyle = tier.inkLight
    ctx.fill()
    ctx.fillStyle = tier.inkDark
  } else if (emblem === 'gem') {
    // Камень занимал по вертикали -0.5…0.96 — центр контура уходил на 0.23 ВНИЗ
    // от начала координат, то есть от середины светлой шайбы, и на фоне ровно
    // сидящих звезды/кубка/молнии кристалл читался как съехавший. Здесь габарит
    // симметричный (-0.84…0.84) и по высоте такой же, как у остальных эмблем:
    // раньше он был на четверть ниже и казался мельче соседей.
    ctx.beginPath()
    ctx.moveTo(-0.69, -0.84)
    ctx.lineTo(0.69, -0.84)
    ctx.lineTo(1.1, -0.31)
    ctx.lineTo(0, 0.84)
    ctx.lineTo(-1.1, -0.31)
    ctx.closePath()
    ctx.fill()
    // грани светлым: без них камень выглядит пятиугольным пятном
    ctx.strokeStyle = tier.inkLight
    ctx.lineWidth = 0.1
    ctx.beginPath()
    ctx.moveTo(-1.1, -0.31); ctx.lineTo(1.1, -0.31)
    ctx.moveTo(-0.69, -0.84); ctx.lineTo(-0.39, -0.31); ctx.lineTo(0, 0.84)
    ctx.moveTo(0.69, -0.84); ctx.lineTo(0.39, -0.31)
    ctx.stroke()
    ctx.strokeStyle = tier.inkDark
  } else if (emblem === 'flame') {
    ctx.beginPath()
    ctx.moveTo(0, -1.05)
    ctx.bezierCurveTo(0.74, -0.24, 0.66, 0.52, 0.18, 0.9)
    ctx.bezierCurveTo(-0.06, 1.04, -0.52, 0.94, -0.64, 0.48)
    ctx.bezierCurveTo(-0.78, -0.04, -0.3, -0.44, 0, -1.05)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0.02, -0.22)
    ctx.bezierCurveTo(0.38, 0.18, 0.3, 0.54, 0.04, 0.7)
    ctx.bezierCurveTo(-0.24, 0.56, -0.32, 0.2, 0.02, -0.22)
    ctx.closePath()
    ctx.fillStyle = tier.inkLight
    ctx.fill()
    ctx.fillStyle = tier.inkDark
  } else if (emblem === 'medal') {
    // ленты
    ctx.beginPath()
    ctx.moveTo(-0.6, -1.02); ctx.lineTo(-0.18, -1.02); ctx.lineTo(-0.1, -0.2); ctx.lineTo(-0.48, -0.24)
    ctx.closePath()
    ctx.moveTo(0.6, -1.02); ctx.lineTo(0.18, -1.02); ctx.lineTo(0.1, -0.2); ctx.lineTo(0.48, -0.24)
    ctx.closePath()
    ctx.fill()
    // диск с светлой сердцевиной
    ctx.beginPath()
    ctx.arc(0, 0.3, 0.68, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, 0.3, 0.38, 0, Math.PI * 2)
    ctx.fillStyle = tier.inkLight
    ctx.fill()
    ctx.fillStyle = tier.inkDark
  }

  ctx.restore()
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
