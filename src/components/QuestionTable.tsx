import { useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Minimize2, Maximize2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// QuestionTable — ONE table renderer for every surface (trainer, homework,
// tests, constructor preview). Shared data model → shared look.
//
//  • Mobile default: the table keeps its natural size and scrolls horizontally.
//  • Mobile "сжать" (⤢): instead of reflowing/wrapping text (which chops words
//    mid-letter), the whole table is scaled DOWN proportionally to fit the
//    screen width — one clean overview, nothing breaks. The scale/size morph
//    is animated so the toggle reads as one continuous motion.
//  • Desktop: natural size, capped at ~half the column; scrolls if wider.
//
// Cells: plain text · blank "—" · fill-in box (emptyCells, interactive) · image.
// Fill-in supports a JSON blob (homework) or per-cell accessors (tests), and
// blankAsInput makes blank cells fillable too (tests).
// ─────────────────────────────────────────────────────────────────────────────

export type QTable = {
  headers: string[]
  rows: string[][]
  emptyCells?: Record<string, boolean>
  blankCells?: Record<string, boolean>
  cellImages?: Record<string, string>
  cellImageSizes?: Record<string, number>
}

const DESKTOP_MAX = 560
const MORPH = { type: 'spring', stiffness: 420, damping: 40, mass: 0.7 } as const

export default function QuestionTable({
  table, mobile = false, interactive = false, value, onChange, disabled = false,
  cellValue, onCellChange, blankAsInput = false,
}: {
  table: QTable
  mobile?: boolean
  interactive?: boolean
  value?: string
  onChange?: (v: string) => void
  cellValue?: (key: string) => string
  onCellChange?: (key: string, v: string) => void
  blankAsInput?: boolean
  disabled?: boolean
}) {
  // Mobile only: false = scroll (natural), true = shrink-to-fit (scaled down).
  const [compact, setCompact] = useState(false)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  // Natural table size + available wrapper width, kept live so the box/scale
  // can be driven by plain numbers on BOTH sides of the toggle — that's what
  // lets framer animate the morph instead of snapping between px and auto.
  const [natW, setNatW] = useState(0)
  const [natH, setNatH] = useState(0)
  const [avail, setAvail] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)

  const fitting = mobile && compact

  useLayoutEffect(() => {
    const measure = () => {
      const t = tableRef.current, wrap = wrapRef.current
      if (!t || !wrap) return
      setNatW(t.offsetWidth)
      setNatH(t.offsetHeight)
      setAvail(wrap.clientWidth)
      const box = boxRef.current
      if (box && !fitting) {
        setAtStart(box.scrollLeft <= 1)
        setAtEnd(box.scrollLeft + box.clientWidth >= box.scrollWidth - 1)
      }
    }
    measure()
    // Observe the table (natural size can settle late — fonts, images) and the
    // outer wrapper (always full width, unaffected by the box's own size) so
    // neither side of the ratio goes stale.
    const ro = new ResizeObserver(measure)
    if (tableRef.current) ro.observe(tableRef.current)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [fitting, mobile, table])

  // Have we measured yet? Distinct from "natW/avail are 0" so a legitimately-
  // falsy 0 never gets confused with "not measured" (see boxWidth below).
  const measured = natW > 0 && avail > 0
  // Shrink to a hair under the available width so a sub-pixel measurement lag
  // can never leave the last column clipped by the box edge.
  const fitScale = measured ? Math.min(1, (avail - 2) / natW) : 1
  const scale = fitting ? fitScale : 1
  // `scaled` drives the border-radius morph and the toggle button's fade —
  // tie it to the MODE itself (fitting), not to the measured fitScale<1
  // comparison. The measurement is fed by an async ResizeObserver, so basing
  // a visual on-off on it raced against React's render and could flip the
  // radius only on every OTHER tap; the chosen mode never races.
  const scaled = fitting
  // undefined (not 0) until measured, so framer never receives a bogus 0 width
  // that it would then latch onto — `0 || undefined` used to collapse a real,
  // valid 0 down to "stop animating", freezing the box at whatever px value
  // happened to be set at that moment instead of resuming at the next resize.
  const boxWidth = !measured ? undefined : fitting ? Math.max(1, natW * fitScale) : avail
  const boxHeight = !measured ? undefined : natH * scale

  const onScroll = () => {
    const el = boxRef.current
    if (!el) return
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }

  // Fill-in answers: JSON blob (value/onChange) or per-cell (cellValue/onCellChange).
  let vals: Record<string, string> = {}
  try { if (value) vals = JSON.parse(value) } catch { vals = {} }
  const getVal = (key: string) => cellValue ? cellValue(key) : (vals[key] ?? '')
  const putVal = (key: string, v: string) =>
    onCellChange ? onCellChange(key, v) : onChange?.(JSON.stringify({ ...vals, [key]: v }))

  const border = '1px solid var(--color-border-medium)'
  const cellPad = mobile ? '7px 10px' : '9px 14px'

  function renderCell(cell: string, r: number, c: number) {
    const key = `${r},${c}`
    const isEmpty = !!table.emptyCells?.[key]
    const isBlank = !!table.blankCells?.[key]
    const img = table.cellImages?.[key]
    const imgSize = table.cellImageSizes?.[key] ?? 50
    const fillable = interactive && (isEmpty || (blankAsInput && isBlank))
    if (fillable) {
      return (
        <input
          value={getVal(key)}
          onChange={e => putVal(key, e.target.value)}
          disabled={disabled}
          placeholder="Впиши…"
          style={{ width: '100%', minWidth: 84, boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: cellPad, fontFamily: 'inherit', fontSize: mobile ? 16 : 13, color: 'var(--color-accent)', fontWeight: 600 }}
        />
      )
    }
    if (isEmpty) return <div style={{ padding: cellPad, minWidth: 48, minHeight: 20 }}>&nbsp;</div>
    if (isBlank) return <div style={{ padding: cellPad, color: 'var(--color-text-4)' }}>—</div>
    if (img) return (
      <div style={{ padding: '6px 8px' }}>
        <img src={img} alt="" style={{ display: 'block', width: `${imgSize}%`, borderRadius: 6 }} />
        {cell && <div style={{ padding: '4px 2px', color: 'var(--color-text-2)', fontSize: mobile ? 12 : 13 }}>{cell}</div>}
      </div>
    )
    return <div style={{ padding: cellPad, color: 'var(--color-text)' }}>{cell}</div>
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', alignSelf: 'flex-start', maxWidth: mobile ? '100%' : DESKTOP_MAX, width: mobile ? '100%' : 'fit-content' }}>
      <motion.div
        ref={boxRef}
        className="no-scrollbar"
        onScroll={onScroll}
        initial={false}
        // Box width/height morph via the framer spring below — one motion
        // value drives the whole shrink/grow so it reads as continuous motion
        // instead of the table popping between two fixed states.
        animate={mobile ? { width: boxWidth, height: boxHeight } : {}}
        transition={MORPH}
        style={{
          overflowX: fitting ? 'hidden' : 'auto',
          WebkitOverflowScrolling: 'touch',
          // Plain CSS transition, deliberately NOT part of the framer `animate`
          // spring above: sharing one spring cycle between width/height AND
          // border-radius let the radius occasionally read a stale target when
          // retargeted mid-flight (visible as "works every other tap"). A plain
          // transition on its own independent property is simple and reliable.
          borderRadius: mobile ? (scaled ? 6 : 16) : 16,
          transition: 'border-radius 0.22s ease',
          border, maxWidth: '100%',
        }}
      >
        <motion.div
          initial={false}
          animate={{ scale }}
          transition={MORPH}
          style={{ transformOrigin: 'top left', width: 'max-content' }}
        >
          <table ref={tableRef} style={{ borderCollapse: 'collapse', width: 'max-content', fontSize: mobile ? 13 : 13 }}>
            <thead>
              <tr>{table.headers.map((h, c) => (
                <th key={c} style={{ borderBottom: border, borderRight: c < table.headers.length - 1 ? border : undefined, padding: cellPad, fontWeight: 700, background: 'var(--color-table-header-bg)', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {table.rows.map((row, r) => (
                <tr key={r} style={{ background: r % 2 === 1 ? 'rgba(0,0,0,0.02)' : undefined }}>
                  {row.map((cell, c) => {
                    const key = `${r},${c}`
                    const cellFillable = interactive && (table.emptyCells?.[key] || (blankAsInput && table.blankCells?.[key]))
                    return (
                      <td key={c} style={{
                        borderTop: '1px solid var(--color-border)', borderRight: c < row.length - 1 ? '1px solid var(--color-border)' : undefined,
                        padding: 0, verticalAlign: 'top', whiteSpace: 'nowrap',
                        background: cellFillable ? 'var(--color-bg-input)' : undefined,
                        color: 'var(--color-text)',
                      }}>
                        {renderCell(cell, r, c)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </motion.div>

      {/* Light scroll-hint fades — only while scrolling is possible (not in the
          shrink-to-fit mode). Right fade until you reach the end, left once
          you've scrolled in. */}
      {!fitting && !atEnd && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, right: 1, width: 24, borderRadius: '0 15px 15px 0', pointerEvents: 'none', background: 'linear-gradient(to left, var(--color-bg), transparent)' }} />
      )}
      {!fitting && !atStart && (
        <div style={{ position: 'absolute', top: 1, bottom: 1, left: 1, width: 18, borderRadius: '15px 0 0 15px', pointerEvents: 'none', background: 'linear-gradient(to right, var(--color-bg), transparent)' }} />
      )}

      {/* Scroll ⇄ shrink-to-fit toggle (mobile only) */}
      {mobile && (
        <motion.button
          onClick={() => setCompact(v => !v)}
          aria-label={compact ? 'Показать в натуральную величину' : 'Вписать в экран'}
          whileTap={{ scale: 0.9 }}
          animate={{ opacity: scaled ? 0.4 : 1 }}
          transition={{ duration: 0.2 }}
          onTouchStart={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.opacity = scaled ? '0.4' : '1' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = scaled ? '0.4' : '1' }}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 4,
            width: 32, height: 32, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(var(--glass-rgb), 0.72)',
            backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-pill)',
            cursor: 'pointer', color: 'var(--color-text-2)',
          }}
        >
          {/* Crossfade + rotate between the two glyphs so the icon itself
              animates in step with the table's shrink/grow. */}
          <AnimatePresence mode="wait" initial={false}>
            {compact ? (
              <motion.span key="max" initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 45 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}>
                <Maximize2 size={15} />
              </motion.span>
            ) : (
              <motion.span key="min" initial={{ opacity: 0, rotate: 45 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -45 }} transition={{ duration: 0.18 }} style={{ display: 'flex' }}>
                <Minimize2 size={15} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </div>
  )
}
