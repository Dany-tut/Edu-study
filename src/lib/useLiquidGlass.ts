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

// ── Displacement map ──────────────────────────────────────────
//
// Safari fix: caller passes a fresh `mapId` string on every call so the
// feImage href changes even if the filter ID is also rotated.
//
// Perf fix: we exploit the four-fold symmetry of a rounded rect — compute
// the top-left quadrant only and mirror into the other three.  Mouse ripple
// (which breaks symmetry) is layered on top as a second pass only when
// the cursor has moved away from centre.
function buildDisplacementMap(
  w: number, h: number,
  cornerRadius: number,
  curvature: number,
  splay: number,
  mouseX: number, mouseY: number,
): string {
  const RES = 0.5
  const cw = Math.max(2, Math.round(w * RES))
  const ch = Math.max(2, Math.round(h * RES))

  const canvas = document.createElement('canvas')
  canvas.width  = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  const img  = ctx.createImageData(cw, ch)
  const data = img.data

  const cx = cw / 2, cy = ch / 2
  const r   = cornerRadius * RES
  const hw  = cx - r, hh = cy - r
  const EPS = 0.8

  // Helper — writes one pixel clamping to [0,255]
  function put(x: number, y: number, dx: number, dy: number) {
    if (x < 0 || x >= cw || y < 0 || y >= ch) return
    const i = (y * cw + x) * 4
    data[i]     = Math.max(0, Math.min(255, 128 + dx * 127))
    data[i + 1] = Math.max(0, Math.min(255, 128 + dy * 127))
    data[i + 3] = 255
  }

  // ── Pass 1: symmetric base (quarter loop) ─────────────────
  const qw = Math.ceil(cw / 2), qh = Math.ceil(ch / 2)

  for (let y = 0; y < qh; y++) {
    for (let x = 0; x < qw; x++) {
      const fpx = x - cx, fpy = y - cy  // top-left quadrant: both ≤ 0

      const sdf = roundedRectSDF(fpx, fpy, hw, hh, r)

      // SDF gradient (outward unit normal of the shape)
      const gx = (roundedRectSDF(fpx + EPS, fpy, hw, hh, r) -
                  roundedRectSDF(fpx - EPS, fpy, hw, hh, r)) / (2 * EPS)
      const gy = (roundedRectSDF(fpx, fpy + EPS, hw, hh, r) -
                  roundedRectSDF(fpx, fpy - EPS, hw, hh, r)) / (2 * EPS)

      // Rim band: peaks exactly at the edge (sdf ≈ 0)
      const rimW = 13 * RES * splay
      const rim  = smoothStep(rimW, 0, sdf) * smoothStep(-rimW * 2.4, 0, sdf)

      // Interior dome: convex paraboloid, zero at centre → 1 at rim
      const inside   = smoothStep(0, -1, sdf)
      const normDist = Math.hypot(fpx / (cx || 1), fpy / (cy || 1))
      const dome     = inside * smoothStep(0, 1, normDist) * curvature

      const baseDx = gx * (rim + dome)
      const baseDy = gy * (rim + dome)

      // Mirror into all four quadrants:
      //   flip across vertical centre  → negate dx
      //   flip across horizontal centre → negate dy
      put(x,        y,        baseDx,  baseDy)
      put(cw-1-x,   y,       -baseDx,  baseDy)
      put(x,        ch-1-y,   baseDx, -baseDy)
      put(cw-1-x,   ch-1-y,  -baseDx, -baseDy)
    }
  }

  // ── Pass 2: mouse ripple (full pass, only when off-centre) ─
  const mx = mouseX * RES, my = mouseY * RES
  const mouseOffCentre = Math.hypot(mouseX - w / 2, mouseY - h / 2) > 4

  if (mouseOffCentre) {
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const fpx = x - cx, fpy = y - cy
        const inside = smoothStep(0, -1, roundedRectSDF(fpx, fpy, hw, hh, r))
        if (inside < 0.02) continue

        const dmx = x - mx, dmy = y - my
        const distM  = Math.hypot(dmx, dmy) + 0.001
        const ripple = smoothStep(Math.max(cw, ch) * 0.55, 0, distM) * 0.44 * inside
        if (ripple < 0.001) continue

        const i = (y * cw + x) * 4
        data[i]     = Math.max(0, Math.min(255, data[i]     + (dmx / distM) * ripple * 127))
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (dmy / distM) * ripple * 127))
      }
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

// ── SVG filter HTML ───────────────────────────────────────────
// Each call creates a self-contained filter with the provided `id`.
// Chromatic aberration: R/G/B get displaced at slightly different scales,
// channels are re-isolated and added back (feComposite arithmetic).
function makeFilterHTML(
  id: string, scale: number,
  chroma: number, edgeHighlight: number, specularAngle: number,
): string {
  const cf    = 1 + chroma * 0.08
  const sR    = (scale * cf).toFixed(2)
  const sG    = scale.toFixed(2)
  const sB    = (scale / cf).toFixed(2)
  const rad   = (specularAngle * Math.PI) / 180
  const lx    = (Math.cos(rad) * 1.4).toFixed(2)
  const ly    = (Math.sin(rad) * 1.4).toFixed(2)
  const hi    = edgeHighlight.toFixed(3)
  const hiAlp = (edgeHighlight * 0.65).toFixed(3)

  const chromaBlock = chroma > 0.01 ? `
    <feColorMatrix in="SourceGraphic" type="matrix"
      values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="SRC_R"/>
    <feColorMatrix in="SourceGraphic" type="matrix"
      values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="SRC_G"/>
    <feColorMatrix in="SourceGraphic" type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="SRC_B"/>
    <feDisplacementMap in="SRC_R" in2="MAP" scale="${sR}" xChannelSelector="R" yChannelSelector="G" result="D_R"/>
    <feDisplacementMap in="SRC_G" in2="MAP" scale="${sG}" xChannelSelector="R" yChannelSelector="G" result="D_G"/>
    <feDisplacementMap in="SRC_B" in2="MAP" scale="${sB}" xChannelSelector="R" yChannelSelector="G" result="D_B"/>
    <feColorMatrix in="D_R" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="C_R"/>
    <feColorMatrix in="D_G" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="C_G"/>
    <feColorMatrix in="D_B" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="C_B"/>
    <feComposite in="C_R" in2="C_G" operator="arithmetic" k2="1" k3="1" result="C_RG"/>
    <feComposite in="C_RG" in2="C_B" operator="arithmetic" k2="1" k3="1" result="DISPLACED"/>
  ` : `
    <feDisplacementMap in="SourceGraphic" in2="MAP" scale="${sG}"
      xChannelSelector="R" yChannelSelector="G" result="DISPLACED"/>
  `

  // Safari highlight fix: restrict the highlight pass to lens-only region
  // by using feComposite(in) to clip to SourceGraphic alpha before offsetting.
  const highlightBlock = edgeHighlight > 0.01 ? `
    <feComposite in="DISPLACED" in2="SourceGraphic" operator="in" result="CLIPPED"/>
    <feFlood flood-color="white" flood-opacity="${hiAlp}" result="WHITE"/>
    <feComposite in="WHITE" in2="SourceGraphic" operator="in" result="LENS_WHITE"/>
    <feOffset in="LENS_WHITE" dx="${lx}" dy="${ly}" result="SHIFTED"/>
    <feComposite in="SHIFTED" in2="SourceGraphic" operator="in" result="EDGE_MASK"/>
    <feGaussianBlur in="EDGE_MASK" stdDeviation="0.7" result="EDGE_BLUR"/>
    <feComposite in="CLIPPED" in2="EDGE_BLUR" operator="arithmetic" k2="1" k3="${hi}"/>
  ` : `
    <feComposite in="DISPLACED" in2="SourceGraphic" operator="in"/>
  `

  return `
    <filter id="${id}"
      x="-10%" y="-40%" width="120%" height="180%"
      color-interpolation-filters="sRGB">
      <feImage id="feimg-${id}" result="MAP" preserveAspectRatio="none"/>
      ${chromaBlock}
      ${highlightBlock}
    </filter>
  `
}

// ── Public hook ───────────────────────────────────────────────
export interface LiquidGlassOptions {
  cornerRadius?  : number
  scale?         : number   // max displacement px
  curvature?     : number   // 0–1 interior dome
  splay?         : number   // 1–2 rim spread
  chroma?        : number   // 0–1 chromatic aberration
  edgeHighlight? : number   // 0–1 specular rim
  specularAngle? : number   // degrees (315 = top-left)
}

export function useLiquidGlass({
  cornerRadius  = 32,
  scale         = 30,
  curvature     = 0.5,
  splay         = 1.0,
  chroma        = 0.3,
  edgeHighlight = 0.25,
  specularAngle = 315,
}: LiquidGlassOptions = {}) {
  const baseId   = useId().replace(/:/g, '')
  const nsId     = `lg-${baseId}`          // namespace (stable, not used as filter id)

  const glassRef   = useRef<HTMLElement | null>(null)
  const mouseRef   = useRef({ x: 0, y: 0 })
  const rafRef     = useRef<number | null>(null)
  const versionRef = useRef(0)             // incremented on every map redraw
  const [size, setSize] = useState({ w: 0, h: 0 })

  // ── Redraw ──────────────────────────────────────────────────
  // Safari fix: generate a brand-new filter ID on every frame so Safari
  // cannot serve a stale cached output.
  const redraw = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const { w, h } = size
      if (w === 0 || h === 0) return

      // ① Fresh filter ID this frame
      versionRef.current++
      const fid     = `${nsId}-${versionRef.current}`
      const prevFid = `${nsId}-${versionRef.current - 1}`

      // ② Build displacement map
      const map = buildDisplacementMap(
        w, h, cornerRadius, curvature, splay,
        mouseRef.current.x, mouseRef.current.y,
      )

      // ③ Inject new SVG filter
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.id = `svg-${fid}`
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none')
      svg.setAttribute('aria-hidden', 'true')
      svg.innerHTML = `<defs>${makeFilterHTML(fid, scale, chroma, edgeHighlight, specularAngle)}</defs>`
      document.body.appendChild(svg)

      // ④ Point feImage at the new map
      const fi = document.getElementById(`feimg-${fid}`) as unknown as SVGFEImageElement
      if (fi) {
        fi.setAttribute('href',   map)
        fi.setAttribute('width',  String(w))
        fi.setAttribute('height', String(h))
      }

      // ⑤ Switch the element's filter to the new ID — direct DOM mutation,
      //    no setState so no extra React re-render.
      const el = glassRef.current
      if (el) {
        el.style.filter = `url(#${fid})`
        ;(el.style as CSSStyleDeclaration & { webkitFilter?: string }).webkitFilter = `url(#${fid})`
      }

      // ⑥ Remove the previous filter after one more frame (avoids flicker)
      requestAnimationFrame(() => {
        document.getElementById(`svg-${prevFid}`)?.remove()
      })
    })
  }, [size, cornerRadius, curvature, splay, scale, chroma, edgeHighlight, specularAngle, nsId])

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

  // ── Cleanup on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      // Remove any leftover filter SVGs for this instance
      document.querySelectorAll(`[id^="svg-${nsId}"]`).forEach(el => el.remove())
    }
  }, [nsId])

  return { glassRef }
}
