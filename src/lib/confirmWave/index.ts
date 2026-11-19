/**
 * Волна подтверждения Искры (концепты согласованы Дани 19.11.2026,
 * прототип https://claude.ai/artifact/JE6CavEbUyUnXvYztboLaD).
 *
 * Волна играет один раз, только на окончательном действии: «Сдать домашку»,
 * «Завершить проверку» / «Принять работу», закрытый модуль. Ошибки, доработку
 * и итог ниже порога волной не празднуем — там обычная смена.
 *
 * Как работает. Карточка (host) держит одного живого ребёнка (live) — обычный
 * React-контент. `beginConfirmWave` синхронно кладёт поверх неподвижную копию
 * «до»; приложение меняет состояние; `play()` ведёт волну от копии к живому «после».
 * В покое ни одного кадра: холст создаётся на время волны и убирается.
 * Reduce Motion и отсутствие WebGL2 библиотека сама превращает в мягкую смену.
 *
 * Библиотека весит ~95 КБ и грузится отдельным чанком: `preloadConfirmWave()`
 * при показе экрана с кнопкой. Если чанк не успел — волны просто нет.
 */
import type { WaveController as WaveControllerT, WavePaletteSpec, WaveRect, WaveType, Rgb } from './distortionWaves'
import { haptic } from '../feedback'

type Lib = typeof import('./distortionWaves')
let lib: Lib | null = null
let loading: Promise<Lib | null> | null = null

export function preloadConfirmWave(): Promise<Lib | null> {
  if (lib) return Promise.resolve(lib)
  if (!loading) {
    loading = import('./distortionWaves')
      .then(m => (lib = m))
      .catch(() => { loading = null; return null })
  }
  return loading
}

/** Сила волны по весу события. */
export type WaveWeight = 'quiet' | 'full' | 'major'

/* Тихий контур: только свечение края, без линзы, размытия и искр (~0,9 с). */
const QUIET = {
  anticipation: 0.08, travel: 1.1, linger: -0.2, rimFade: 1.0, hairlineLinger: 0.15, hairlineFade: 0.9,
  particleLife: 0.01, particleCount: 0, strength: 0, amplitude: 0, aberration: 0, swell: 0, pull: 0, inhale: 0,
  gatherGlow: 0, gatherDots: 0, blurAhead: 0.05, blurBehind: 0.05, rimStrength: 0.8, rimWidth: 11,
}
/* Модуль закрыт: больше искр, ярче полоса. */
const MAJOR = { particleCount: 110, particleLife: 2.7, strength: 1, rimStrength: 0.95, particleReach: 190 }

/* Палитры собираются один раз: рендерер сравнивает их по ссылке. */
export const WAVE_PALETTES: Record<'chemistry' | 'biology' | 'ogonek', WavePaletteSpec> = {
  chemistry: { colors: [[99, 84, 207], [156, 140, 240], [255, 190, 96], [124, 104, 236], [196, 182, 255], [255, 214, 140], [140, 118, 255]], ahead: [214, 206, 255], behind: [70, 55, 180] },
  biology: { colors: [[29, 185, 125], [110, 231, 160], [42, 189, 138], [170, 242, 196], [0, 160, 120], [255, 214, 140], [90, 210, 170]], ahead: [200, 250, 214], behind: [0, 130, 90] },
  ogonek: { colors: [[99, 84, 207], [255, 181, 71], [156, 140, 240], [245, 154, 192], [255, 214, 140], [124, 104, 236], [255, 160, 90]], ahead: [255, 226, 160], behind: [70, 55, 180] },
}

const hexCache = new Map<string, WavePaletteSpec>()
function rgbOfHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const WHITE: Rgb = [255, 255, 255], BLACK: Rgb = [0, 0, 0], AMBER: Rgb = [255, 200, 110]

/** Палитра из двух цветов: акцент + второй, с тёплой искрой Огонька. */
function paletteOf(a: Rgb, b: Rgb = a): WavePaletteSpec {
  return {
    colors: [a, mix(a, WHITE, 0.3), b, mix(b, WHITE, 0.45), mix(a, b, 0.5), AMBER, mix(a, BLACK, 0.12)],
    ahead: mix(a, WHITE, 0.55),
    behind: mix(b, BLACK, 0.3),
  }
}

/** Волна в цвете предмета: химия и биология — свои палитры, остальные — из акцента. */
export function subjectWavePalette(subjectId: string | undefined | null, accentHex?: string | null): WavePaletteSpec {
  const id = (subjectId || '').toLowerCase()
  if (id === 'chemistry' || id === 'химия') return WAVE_PALETTES.chemistry
  if (id === 'biology' || id === 'биология') return WAVE_PALETTES.biology
  const rgb = accentHex ? rgbOfHex(accentHex) : null
  if (!rgb) return WAVE_PALETTES.ogonek
  const key = accentHex!.toLowerCase()
  let p = hexCache.get(key)
  if (!p) { p = paletteOf(rgb); hexCache.set(key, p) }
  return p
}

const elementCache = new Map<string, WavePaletteSpec>()
/** Палитра аватара: цвета его градиента (или заливки). Кольцо идёт в цветах человека. */
export function avatarWavePalette(el: Element | null | undefined): WavePaletteSpec {
  if (!el) return WAVE_PALETTES.ogonek
  const cs = getComputedStyle(el)
  const found = `${cs.backgroundImage} ${cs.backgroundColor}`.match(/rgba?\([^)]+\)/g) || []
  const rgbs = found
    .map(s => s.match(/[\d.]+/g)!.map(Number))
    .filter(v => v.length < 4 || v[3] > 0.5)
    .map(v => [v[0], v[1], v[2]] as Rgb)
  if (!rgbs.length) return WAVE_PALETTES.ogonek
  const key = rgbs.slice(0, 2).map(c => c.join(',')).join('|')
  let p = elementCache.get(key)
  if (!p) { p = paletteOf(rgbs[0], rgbs[1] ?? rgbs[0]); elementCache.set(key, p) }
  return p
}

export interface ConfirmWaveOptions {
  /** Откуда идёт волна: кнопка, аватар или прямоугольник в CSS-пикселях карточки. */
  source?: HTMLElement | WaveRect | null
  type?: WaveType
  weight?: WaveWeight
  palette?: WavePaletteSpec
  cornerRadius?: number
  /** Куда слетаются искры волны. Функция — если цель появляется только в «после». */
  sparksTo?: HTMLElement | (() => HTMLElement | null) | null
  /** Когда большая часть искр долетела: время обновить счётчик серии. */
  onSparksLanded?: () => void
  onDone?: () => void
}

export interface ConfirmWaveHandle {
  /** Вызывать после того, как React показал «после». */
  play(): void
  /** Снять копию «до» без волны (например, сохранение не удалось). */
  cancel(): void
}

function quietMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

let webgl2: boolean | null = null
/**
 * Сыграет ли сейчас настоящая волна: чанк загружен, есть WebGL2, нет Reduce
 * Motion. Экран решает по этому, показывать ли волну вместо прежнего салюта.
 */
export function confirmWaveReady(): boolean {
  if (!lib) { void preloadConfirmWave(); return false }
  if (quietMotion()) return false
  if (webgl2 === null) {
    try {
      const gl = document.createElement('canvas').getContext('webgl2')
      webgl2 = !!gl
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch { webgl2 = false }
  }
  return webgl2
}

/** Цвет, на котором лежит карточка: копия «до» должна быть непрозрачной. */
function groundOf(el: HTMLElement): string {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor
    const a = bg.match(/rgba?\(([^)]+)\)/)
    if (a) {
      const parts = a[1].split(',').map(s => parseFloat(s))
      if (parts.length < 4 || parts[3] > 0.95) return bg
    }
  }
  return document.documentElement.dataset.theme === 'dark' ? '#111113' : '#ffffff'
}

/**
 * Замораживает вид карточки и готовит волну. `host` — карточка с одним живым
 * ребёнком `live`. Возвращает null, если волна сейчас невозможна (чанк ещё
 * не загружен, карточка не на экране) — тогда приложение просто меняет вид.
 */
export function beginConfirmWave(host: HTMLElement | null, live: HTMLElement | null, opts: ConfirmWaveOptions = {}): ConfirmWaveHandle | null {
  if (!lib || !host || !live || !live.isConnected || host.dataset.cwBusy) {
    if (!lib) void preloadConfirmWave()
    return null
  }
  const rect = host.getBoundingClientRect()
  if (rect.width < 8 || rect.height < 8 || rect.bottom < 0 || rect.top > window.innerHeight) return null

  // Копия «до» поверх живого контента, той же ширины и высоты.
  const frozen = live.cloneNode(true) as HTMLElement
  frozen.removeAttribute('id')
  frozen.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'))
  frozen.setAttribute('aria-hidden', 'true')
  frozen.setAttribute('inert', '')
  const lr = live.getBoundingClientRect()
  Object.assign(frozen.style, {
    position: 'absolute', left: `${lr.left - rect.left - host.clientLeft}px`, top: `${lr.top - rect.top - host.clientTop}px`,
    width: `${lr.width}px`, height: `${lr.height}px`, margin: '0', pointerEvents: 'none', zIndex: '0',
    background: groundOf(live), boxSizing: 'border-box',
  } as Partial<CSSStyleDeclaration>)
  const hostPos = getComputedStyle(host).position
  const restorePos = hostPos === 'static'
  if (restorePos) host.style.position = 'relative'
  // «После» бывает ниже «до»: копия не должна вылезать за карточку.
  const prevOverflow = host.style.overflow
  host.style.overflow = 'hidden'
  host.appendChild(frozen)
  host.dataset.cwBusy = '1'

  const weight = opts.weight ?? 'full'
  let ctl: WaveControllerT | null = null
  let done = false
  let guard = 0
  const cleanup = () => {
    if (done) return
    done = true
    window.clearTimeout(guard)
    try { ctl?.destroy() } catch { /* the wave is decoration */ }
    frozen.remove()
    for (const p of ['opacity', 'pointer-events'] as const) live.style.removeProperty(p)
    live.removeAttribute('inert'); live.removeAttribute('aria-hidden')
    if (restorePos) host.style.removeProperty('position')
    host.style.overflow = prevOverflow
    delete host.dataset.cwBusy
    opts.onDone?.()
  }
  try {
    ctl = new lib.WaveController(host, frozen, live)
    ctl.update({
      revealed: false,
      type: opts.type ?? 'vertical',
      palette: opts.palette ?? WAVE_PALETTES.ogonek,
      waveStyle: weight === 'quiet' ? QUIET : weight === 'major' ? MAJOR : undefined,
      cornerRadius: opts.cornerRadius,
      prewarm: false,
      onFinish: () => cleanup(),
    })
  } catch {
    cleanup()
    return null
  }
  // Предохранитель: что бы ни случилось, копия не остаётся висеть.
  guard = window.setTimeout(cleanup, 6000)

  return {
    play() {
      if (done || !ctl) return
      // Два кадра, чтобы React успел показать «после», а библиотека — снять его.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (done || !ctl) return
        const source = opts.source
        ctl.play({ source: source && 'getBoundingClientRect' in source && !source.isConnected ? null : source })
        if (opts.sparksTo && weight !== 'quiet' && !quietMotion()) {
          window.setTimeout(() => {
            const to = typeof opts.sparksTo === 'function' ? opts.sparksTo() : opts.sparksTo
            if (to) flySparks(host, to, opts.palette, opts.onSparksLanded)
            else opts.onSparksLanded?.()
          }, 1750)
        } else if (opts.onSparksLanded) {
          window.setTimeout(opts.onSparksLanded, 320)
        }
      }))
      window.clearTimeout(guard)
      guard = window.setTimeout(cleanup, 9000)
    },
    cancel() { cleanup() },
  }
}

/**
 * Тихий контур: только свечение края карточки, ~0,9 с, без снимков и линзы.
 * Для частого события (верный ответ подряд). С Reduce Motion — ничего.
 */
export function pulseConfirmEdge(host: HTMLElement | null, opts: { palette?: WavePaletteSpec; cornerRadius?: number } = {}) {
  if (!host || !host.isConnected || host.dataset.cwBusy || !confirmWaveReady()) return
  const r = host.getBoundingClientRect()
  if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight) return
  host.dataset.cwBusy = '1'
  const restorePos = getComputedStyle(host).position === 'static'
  let ctl: WaveControllerT | null = null
  const end = () => {
    try { ctl?.destroy() } catch { /* decoration */ }
    ctl = null
    if (restorePos) host.style.removeProperty('position')
    delete host.dataset.cwBusy
  }
  try {
    ctl = new lib!.WaveController(host, host, null)
    ctl.update({
      revealed: false, type: 'vertical', capture: false, prewarm: false,
      palette: opts.palette ?? WAVE_PALETTES.ogonek, waveStyle: QUIET, cornerRadius: opts.cornerRadius,
      onFinish: end,
    })
    ctl.play()
    window.setTimeout(() => { if (ctl) end() }, 3000)
  } catch { end() }
}

/* ── «Один раз»: волна на событие, которое ученик видит позже (зачёт, модуль) ──
   Список ключей в localStorage по пространствам. На первом запуске (списка ещё
   нет) всё, что уже есть, считается увиденным: после выпуска не празднуем
   историю. Без localStorage — один раз за сессию. */
const seenNow = new Set<string>()
const storeKey = (ns: string) => `iskra.confirmWave.${ns}`
function seenList(ns: string): string[] | null {
  try {
    const raw = localStorage.getItem(storeKey(ns))
    if (raw === null) return null
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch { return [] }
}
export function markWaveSeen(ns: string, key: string) {
  seenNow.add(`${ns}:${key}`)
  try { localStorage.setItem(storeKey(ns), JSON.stringify([...(seenList(ns) ?? []).filter(k => k !== key), key].slice(-300))) } catch { /* private mode */ }
}
export function waveSeen(ns: string, key: string): boolean {
  if (seenNow.has(`${ns}:${key}`)) return true
  const list = seenList(ns)
  if (list === null) { markWaveSeen(ns, key); return true }
  return list.includes(key)
}

let drinkStyle = false
/* Вспышка цели, когда в неё влетают искры: свечение и короткий подскок. */
function ensureDrinkStyle() {
  if (drinkStyle) return
  drinkStyle = true
  const st = document.createElement('style')
  st.textContent = '@keyframes cw-drink{0%{transform:scale(1);filter:none}35%{transform:scale(1.18);filter:drop-shadow(0 0 8px rgba(255,190,90,.9))}100%{transform:scale(1);filter:none}}'
    + '.cw-drink{animation:cw-drink .9s cubic-bezier(.2,1.6,.4,1)}'
    + '@media (prefers-reduced-motion: reduce){.cw-drink{animation:none}}'
  document.head.appendChild(st)
}

/* ── Искры в Огонёк ──
   Холст поверх окна живёт только пока они летят. Искры поднимаются из области,
   где дрейфуют частицы волны, и втягиваются в цель (Огонёк серии). */
function flySparks(from: HTMLElement, target: HTMLElement, palette: WavePaletteSpec | undefined, onLanded?: () => void) {
  const box = from.getBoundingClientRect(), tb = target.getBoundingClientRect()
  if (!target.isConnected || tb.width === 0) { onLanded?.(); return }
  const dark = document.documentElement.dataset.theme === 'dark'
  const cv = document.createElement('canvas')
  cv.setAttribute('aria-hidden', 'true')
  Object.assign(cv.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: '2147483000' })
  document.body.appendChild(cv)
  const dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
  const ctx = cv.getContext('2d')
  if (!ctx) { cv.remove(); onLanded?.(); return }
  const base = palette?.colors ?? WAVE_PALETTES.ogonek.colors
  const tint: Rgb[] = dark ? [AMBER, base[1] ?? AMBER, WHITE] : [[240, 150, 40], base[0], base[4] ?? base[0]]
  const tx = tb.left + Math.min(tb.width, tb.height) / 2, ty = tb.top + tb.height / 2
  const N = 26
  const list = Array.from({ length: N }, (_, i) => {
    const sx = box.left + box.width * (0.1 + 0.8 * Math.random())
    const sy = box.top + box.height * (0.3 + 0.55 * Math.random())
    const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) || 1, bend = (Math.random() * 2 - 1) * 0.45 * len
    return {
      sx, sy, cx: (sx + tx) / 2 - dy / len * bend, cy: (sy + ty) / 2 + dx / len * bend,
      delay: i * 26 + Math.random() * 120, dur: 900 + Math.random() * 420, size: 1.6 + Math.random() * 1.6,
      c: tint[i % tint.length], done: false,
    }
  })
  const core: Rgb = dark ? WHITE : [255, 246, 220]
  let landed = 0
  const t0 = performance.now()
  const at = (p: typeof list[number], u: number) => {
    const v = 1 - u
    return [v * v * p.sx + 2 * v * u * p.cx + u * u * tx, v * v * p.sy + 2 * v * u * p.cy + u * u * ty]
  }
  ensureDrinkStyle()
  const pulse = () => {
    target.classList.remove('cw-drink'); void target.offsetWidth; target.classList.add('cw-drink')
    window.setTimeout(() => target.classList.remove('cw-drink'), 950)
  }
  const frame = (now: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
    let alive = 0
    for (const p of list) {
      const k = (now - t0 - p.delay) / p.dur
      if (k < 0) { alive++; continue }
      if (k >= 1) {
        if (!p.done) {
          p.done = true; landed++
          if (landed === 1) pulse()
          if (landed === Math.round(N * 0.6)) { pulse(); haptic(12); onLanded?.() }
        }
        continue
      }
      alive++
      let u = k * k * (3 - 2 * k); u = u * u * 0.35 + u * 0.65
      const fadeIn = Math.min(k / 0.12, 1)
      for (let j = 4; j >= 0; j--) {
        const q = at(p, Math.max(u - j * 0.035, 0)), a = fadeIn * (1 - j / 5), r = p.size * (1 - j * 0.14)
        const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 4)
        g.addColorStop(0, `rgba(${core[0]},${core[1]},${core[2]},${0.95 * a})`)
        g.addColorStop(dark ? 0.3 : 0.22, `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},${(dark ? 0.7 : 0.85) * a})`)
        g.addColorStop(1, `rgba(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0},0)`)
        ctx.fillStyle = g
        ctx.beginPath(); ctx.arc(q[0], q[1], r * 4, 0, Math.PI * 2); ctx.fill()
      }
    }
    if (alive) requestAnimationFrame(frame)
    else cv.remove()
  }
  requestAnimationFrame(frame)
}
