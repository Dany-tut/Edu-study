import { useEffect, useId, useRef, useState, useCallback } from 'react'

// ── Math helpers ─────────────────────────────────────────────
function smoothStep(a: number, b: number, t: number) {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function roundedRectSDF(px: number, py: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px) - hw
  const qy = Math.abs(py) - hh
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
}

// ── Displacement map generation ───────────────────────────────
//
// The map encodes X (R channel) and Y (G channel) displacement.
// 128 = neutral. SVG feDisplacementMap multiplies by `scale` to get px.
//
// Physical model: a convex glass dome.
//   - At the rim: refraction is strongest — SDF gradient is the direction.
//   - Interior: a paraboloid dome bends light outward from center.
//   - Mouse ripple: surface perturbation.
//   - B channel: encodes displacement magnitude (used only for debug, not by filter).
function buildDisplacementMap(
  w: number, h: number,
  cornerRadius: number,
  curvature: number,   // 0‥1 — how pronounced the interior dome is
  splay: number,       // 1‥2 — rim displacement spread
  mouseX: number, mouseY: number,
): string {
  const RES = 0.5
  const cw = Math.max(2, Math.round(w * RES))
  const ch = Math.max(2, Math.round(h * RES))

  const canvas = document.createElement('canvas')
  canvas.width  = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(cw, ch)
  const px = img.data

  const cx = cw / 2, cy = ch / 2
  const r  = cornerRadius * RES
  const hw = cx - r, hh = cy - r
  const mx = mouseX * RES, my = mouseY * RES
  const EPS = 0.8

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4

      const fpx = x - cx, fpy = y - cy
      const sdf = roundedRectSDF(fpx, fpy, hw, hh, r)

      // ── Gradient of SDF (outward normal of the glass shape) ───────
      // Finite differences — works for any rounded rect, corners included.
      const gx = (roundedRectSDF(fpx + EPS, fpy, hw, hh, r) -
                  roundedRectSDF(fpx - EPS, fpy, hw, hh, r)) / (2 * EPS)
      const gy = (roundedRectSDF(fpx, fpy + EPS, hw, hh, r) -
                  roundedRectSDF(fpx, fpy - EPS, hw, hh, r)) / (2 * EPS)
      // gx,gy is already unit-length for SDF gradients

      // ── Rim band: peaks at the edge (sdf ≈ 0) ────────────────────
      const rimW = 13 * RES * splay
      const rim  = smoothStep(rimW, 0, sdf) * smoothStep(-rimW * 2.2, 0, sdf)

      // ── Interior dome: paraboloid — displacement grows from center ─
      // distance from center in normalized coords [0,1]
      const normDist = Math.hypot(fpx / cx, fpy / cy)
      // inside factor: 1 at center, 0 at/outside rim
      const inside = smoothStep(0, -1, sdf)
      // dome ramps up from zero at center to 1 at the rim (convex lens)
      const dome = inside * smoothStep(0, 1, normDist) * curvature

      // ── Mouse ripple ──────────────────────────────────────────────
      const dmx = x - mx, dmy = y - my
      const distM = Math.hypot(dmx, dmy) + 0.001
      const ripple = smoothStep(Math.max(cw, ch) * 0.55, 0, distM) * 0.42 * inside
      const rnx = dmx / distM, rny = dmy / distM

      // ── Combine ───────────────────────────────────────────────────
      const magnitude = rim + dome + ripple * (1 - rim)
      const dx = gx * (rim + dome) + rnx * ripple * (1 - rim)
      const dy = gy * (rim + dome) + rny * ripple * (1 - rim)

      px[i]     = Math.max(0, Math.min(255, 128 + dx * 127))  // R → X
      px[i + 1] = Math.max(0, Math.min(255, 128 + dy * 127))  // G → Y
      px[i + 2] = Math.round(magnitude * 255)                  // B → magnitude (debug)
      px[i + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

// ── SVG filter builder ────────────────────────────────────────
// Produces three feDisplacementMap passes (R, G, B) with slightly
// different scales for chromatic aberration, then recombines them.
function buildFilter(id: string, scale: number, chroma: number, edgeHighlight: number, specularAngle: number) {
  const chromaFactor = 1 + chroma * 0.08  // ±8% per unit chroma
  const scaleR = scale * chromaFactor
  const scaleG = scale
  const scaleB = scale / chromaFactor

  // Light direction for the edge specular highlight (top-lit by default)
  const rad = (specularAngle * Math.PI) / 180
  const lx  = Math.cos(rad) * 1.5
  const ly  = Math.sin(rad) * 1.5

  return `
    <filter id="${id}"
      x="-14%" y="-50%"
      width="128%" height="200%"
      color-interpolation-filters="sRGB"
    >
      <feImage id="feimg-${id}" result="MAP" preserveAspectRatio="none" />

      ${chroma > 0.01 ? `
      <!-- Chromatic aberration: three passes at different scales ──── -->
      <!-- Isolate R from source -->
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="SRC_R" />
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="SRC_G" />
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
        result="SRC_B" />

      <!-- Displace each channel at its own scale -->
      <feDisplacementMap in="SRC_R" in2="MAP" scale="${scaleR.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="DISP_R" />
      <feDisplacementMap in="SRC_G" in2="MAP" scale="${scaleG.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="DISP_G" />
      <feDisplacementMap in="SRC_B" in2="MAP" scale="${scaleB.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="DISP_B" />

      <!-- Re-isolate displaced channels and add them together -->
      <feColorMatrix in="DISP_R" type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="CHAN_R" />
      <feColorMatrix in="DISP_G" type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result="CHAN_G" />
      <feColorMatrix in="DISP_B" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
        result="CHAN_B" />

      <feComposite in="CHAN_R" in2="CHAN_G" operator="arithmetic" k2="1" k3="1" result="RG" />
      <feComposite in="RG"     in2="CHAN_B" operator="arithmetic" k2="1" k3="1" result="DISPLACED" />
      ` : `
      <!-- No chroma: single displacement pass ──────────────────── -->
      <feDisplacementMap in="SourceGraphic" in2="MAP" scale="${scaleG.toFixed(2)}"
        xChannelSelector="R" yChannelSelector="G" result="DISPLACED" />
      `}

      <!-- Clip to glass shape alpha -->
      <feComposite in="DISPLACED" in2="SourceGraphic" operator="in" result="CLIPPED" />

      ${edgeHighlight > 0.01 ? `
      <!-- Edge specular highlight ──────────────────────────────── -->
      <!-- A thin, directional rim glow from the specular light dir -->
      <feFlood flood-color="white" flood-opacity="${(edgeHighlight * 0.7).toFixed(3)}" result="WHITE" />
      <feComposite in="WHITE" in2="SourceGraphic" operator="in" result="GLASS_WHITE" />
      <feOffset in="GLASS_WHITE" dx="${lx.toFixed(2)}" dy="${ly.toFixed(2)}" result="SHIFTED" />
      <feComposite in="SHIFTED" in2="SourceGraphic" operator="in" result="EDGE_MASK" />
      <feGaussianBlur in="EDGE_MASK" stdDeviation="0.8" result="EDGE_GLOW" />
      <feComposite in="CLIPPED" in2="EDGE_GLOW" operator="arithmetic" k2="1" k3="${(edgeHighlight).toFixed(3)}" result="FINAL" />
      ` : `<feComposite in="CLIPPED" in2="CLIPPED" operator="in" result="FINAL" />`}

      <!-- Output -->
      <feComposite in="FINAL" in2="SourceGraphic" operator="in" />
    </filter>
  `
}

// ── Public hook ───────────────────────────────────────────────
export interface LiquidGlassOptions {
  cornerRadius?: number
  /** Max displacement in px */
  scale?: number
  /** Interior dome strength 0–1 */
  curvature?: number
  /** Rim spread multiplier 1–2 */
  splay?: number
  /** Chromatic aberration 0–1 */
  chroma?: number
  /** Specular edge highlight 0–1 */
  edgeHighlight?: number
  /** Light direction in degrees (0=right, 90=down, 270=up, 315=top-left) */
  specularAngle?: number
}

export function useLiquidGlass({
  cornerRadius   = 32,
  scale          = 30,
  curvature      = 0.5,
  splay          = 1.0,
  chroma         = 0.3,
  edgeHighlight  = 0.25,
  specularAngle  = 315,
}: LiquidGlassOptions = {}) {
  const rawId    = useId()
  const filterId = 'lg' + rawId.replace(/:/g, '')

  const glassRef  = useRef<HTMLElement | null>(null)
  const feImgRef  = useRef<SVGFEImageElement | null>(null)
  const mouseRef  = useRef({ x: 0, y: 0 })
  const rafRef    = useRef<number | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // ── Inject SVG filter defs ──────────────────────────────────
  useEffect(() => {
    const svgId = `svg-${filterId}`
    document.getElementById(svgId)?.remove()  // replace if options changed

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = svgId
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none')
    svg.setAttribute('aria-hidden', 'true')
    svg.innerHTML = `<defs>${buildFilter(filterId, scale, chroma, edgeHighlight, specularAngle)}</defs>`
    document.body.appendChild(svg)
    feImgRef.current = document.getElementById(`feimg-${filterId}`) as unknown as SVGFEImageElement

    return () => { document.getElementById(svgId)?.remove() }
  }, [filterId, scale, chroma, edgeHighlight, specularAngle])

  // ── Watch element size ──────────────────────────────────────
  useEffect(() => {
    const el = glassRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ── Redraw displacement map ─────────────────────────────────
  const redraw = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const { w, h } = size
      if (!feImgRef.current || w === 0 || h === 0) return
      const map = buildDisplacementMap(w, h, cornerRadius, curvature, splay,
                                       mouseRef.current.x, mouseRef.current.y)
      const fi = feImgRef.current
      fi.setAttribute('href',   map)
      fi.setAttribute('width',  String(w))
      fi.setAttribute('height', String(h))
    })
  }, [size, cornerRadius, curvature, splay])

  useEffect(() => {
    if (size.w > 0) {
      mouseRef.current = { x: size.w / 2, y: size.h / 2 }
      redraw()
    }
  }, [size, redraw])

  // ── Mouse tracking ──────────────────────────────────────────
  useEffect(() => {
    const el = glassRef.current
    if (!el || size.w === 0) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      redraw()
    }
    const onLeave = () => {
      mouseRef.current = { x: size.w / 2, y: size.h / 2 }
      redraw()
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [size, redraw])

  return {
    filterId,
    glassRef,
    filterStyle: `url(#${filterId})`,
  }
}
