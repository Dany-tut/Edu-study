import { useState, useRef, useLayoutEffect } from 'react'
import { Plus, Camera, X } from 'lucide-react'
import { optimizePhoto, ImageTooLargeError } from '../../lib/imageOptim'

// Фото не влезло в потолок base64 даже после дожима — сообщаем и не вставляем.
const onPhotoTooLarge = (e: unknown) => {
  if (e instanceof ImageTooLargeError) window.alert(e.message)
  else throw e
}
import { getContrastColor } from '../../lib/utils'

// ─── Shared table editor (Notion-style) ──────────────────────────────────────
// Extracted from the trainer creator so the course constructor uses the exact
// same widget: rounded clipped table, "+" handles in the gutters, per-cell
// «Текст / Вписать / Пусто» marking, click-to-select row/column + Delete,
// paste-from-Excel. Fully controlled: holds only ephemeral UI state.

export interface TableEditorValue {
  headers: string[]
  rows: string[][]
  /** Keys "r,c" marked as student-answer fields (student types here). */
  emptyCells?: Record<string, boolean>
  /** Keys "r,c" marked as explicitly blank — student sees "—", cannot type. */
  blankCells?: Record<string, boolean>
  /** Keys "r,c" → base64 data URL — image content for that cell. */
  cellImages?: Record<string, string>
  /** Keys "r,c" → percentage (10–100) for cell image display width. */
  cellImageSizes?: Record<string, number>
}

function InsertHandle({ accent, title, onClick, style }: {
  accent: string; title: string; onClick: () => void; style: React.CSSProperties
}) {
  const [h, setH] = useState(false)
  return (
    <div
      title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
      style={{ position: 'absolute', zIndex: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: accent, color: getContrastColor(accent),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.28)', pointerEvents: 'none',
        opacity: h ? 1 : 0, transform: h ? 'scale(1)' : 'scale(0.6)',
        transition: 'opacity 0.12s ease, transform 0.12s ease',
      }}>
        <Plus size={12} strokeWidth={3} />
      </div>
    </div>
  )
}

const CELL_IMG_SIZES: { label: string; value: number }[] = [
  { label: 'S', value: 25 },
  { label: 'M', value: 50 },
  { label: 'L', value: 75 },
  { label: '↔', value: 100 },
]

export default function TableEditor({ value, onChange, accent, accentBg, allowEmptyCells = true, allowCellImages = false, hint = true }: {
  value: TableEditorValue
  onChange: (next: TableEditorValue) => void
  accent: string
  accentBg: string
  allowEmptyCells?: boolean
  allowCellImages?: boolean
  hint?: boolean
}) {
  const headers = value.headers
  const rows = value.rows
  const emptyCells = value.emptyCells ?? {}
  const blankCells = value.blankCells ?? {}
  const cellImages = value.cellImages ?? {}
  const cellImageSizes = value.cellImageSizes ?? {}
  const cellImgInputRef = useRef<HTMLInputElement>(null)
  const pendingCellKey = useRef<string | null>(null)
  const activeCellRef = useRef<HTMLInputElement | null>(null)

  const [activeCell, setActiveCellState] = useState<string | null>(null)
  const [sel, setSel] = useState<{ type: 'row' | 'col'; index: number } | null>(null)

  function setActiveCell(key: string | null) {
    setActiveCellState(key)
    if (key) {
      // Focus is handled by autoFocus on mount; but if cell was already active
      // and re-activated, we manually focus via ref.
      setTimeout(() => activeCellRef.current?.focus(), 0)
    }
  }

  const boxRef = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState<{ colX: number[]; rowY: number[] }>({ colX: [], rowY: [] })
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => {
      const er = el.getBoundingClientRect()
      const colX: number[] = []
      el.querySelectorAll('thead th').forEach((th, i) => {
        const r = (th as HTMLElement).getBoundingClientRect()
        if (i === 0) colX.push(r.left - er.left)
        colX.push(r.right - er.left)
      })
      const rowY: number[] = []
      el.querySelectorAll('tbody tr').forEach((tr, i) => {
        const r = (tr as HTMLElement).getBoundingClientRect()
        if (i === 0) rowY.push(r.top - er.top)
        rowY.push(r.bottom - er.top)
      })
      setBounds({ colX, rowY })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [headers.length, rows.length])

  function emit(next: Partial<TableEditorValue>) {
    onChange({ headers, rows, emptyCells, blankCells, cellImages, cellImageSizes, ...next })
  }
  function setHeader(c: number, v: string) {
    emit({ headers: headers.map((h, ci) => ci === c ? v : h) })
  }
  function setCell(r: number, c: number, v: string) {
    emit({ rows: rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? v : cell) : row) })
  }
  function insertRow(index: number) {
    const blank = (rows[0] ?? headers).map(() => '')
    const n = [...rows]; n.splice(index, 0, blank); emit({ rows: n })
  }
  function insertCol(index: number) {
    const h = [...headers]; h.splice(index, 0, '')
    const r = rows.map(row => { const n = [...row]; n.splice(index, 0, ''); return n })
    emit({ headers: h, rows: r })
  }
  function removeRow(r: number) {
    if (rows.length <= 1) return
    emit({ rows: rows.filter((_, ri) => ri !== r) }); setSel(null)
  }
  function removeCol(c: number) {
    if (headers.length <= 1) return
    emit({ headers: headers.filter((_, i) => i !== c), rows: rows.map(row => row.filter((_, i) => i !== c)) })
    setSel(null)
  }
  function setEmpty(key: string, on: boolean) {
    const n = { ...emptyCells }
    if (on) { n[key] = true; const b = { ...blankCells }; delete b[key]; emit({ emptyCells: n, blankCells: b }) }
    else { delete n[key]; emit({ emptyCells: n }) }
  }
  function setBlank(key: string, on: boolean) {
    const n = { ...blankCells }
    if (on) { n[key] = true; const e = { ...emptyCells }; delete e[key]; emit({ blankCells: n, emptyCells: e }) }
    else { delete n[key]; emit({ blankCells: n }) }
  }
  function setCellImage(key: string, url: string) {
    emit({ cellImages: { ...cellImages, [key]: url } })
  }
  function removeCellImage(key: string) {
    const n = { ...cellImages }; delete n[key]
    const s = { ...cellImageSizes }; delete s[key]
    emit({ cellImages: n, cellImageSizes: s })
  }
  function setCellImageSize(key: string, size: number) {
    emit({ cellImageSizes: { ...cellImageSizes, [key]: size } })
  }
  function pickCellImage(key: string) {
    pendingCellKey.current = key
    cellImgInputRef.current?.click()
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text/plain')
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
    if (lines.length < 1) return
    const parsed = lines.map(l => l.split('\t'))
    const colCount = Math.max(...parsed.map(r => r.length))
    if (colCount < 2 && lines.length < 2) return
    e.preventDefault()
    const h = parsed[0].map(c => c.trim())
    while (h.length < colCount) h.push('')
    const r = parsed.slice(1).map(row => {
      const cells = row.map(c => c.trim())
      while (cells.length < colCount) cells.push('')
      return cells
    })
    if (r.length === 0) r.push(h.map(() => ''))
    onChange({ headers: h, rows: r, emptyCells: {}, blankCells: {} })
    setActiveCellState(null)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!sel || (e.key !== 'Delete' && e.key !== 'Backspace')) return
    const el = e.target as HTMLElement
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).value.length > 0) return
    e.preventDefault()
    if (sel.type === 'row') removeRow(sel.index)
    else removeCol(sel.index)
  }

  return (
    <>
      <input ref={cellImgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]; if (!file || !pendingCellKey.current) return
          const key = pendingCellKey.current
          optimizePhoto(file).then(url => {
            setCellImage(key, url)
            if (!cellImageSizes[key]) setCellImageSize(key, 50)
          }).catch(onPhotoTooLarge)
          e.target.value = ''
        }}
      />
      <div onKeyDown={onKeyDown} onClick={() => setSel(null)} style={{ position: 'relative', padding: 20 }}>
        <div ref={boxRef} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border-strong)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, tableLayout: 'fixed' }}>
            <thead><tr>{headers.map((h, c) => {
              const colSel = sel?.type === 'col' && sel.index === c
              return (
                <th key={c} onDoubleClick={() => setSel({ type: 'col', index: c })}
                  style={{ borderRight: '1px solid var(--color-border-medium)', borderBottom: '1px solid var(--color-border-strong)', background: colSel ? accentBg : 'var(--color-table-header-bg)', padding: 0, cursor: 'text', transition: 'background 0.12s', minWidth: 90 }}>
                  <input value={h} onChange={e => setHeader(c, e.target.value)} placeholder={`Заголовок ${c + 1}`}
                    onPaste={c === 0 ? handlePaste : undefined}
                    style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', color: 'var(--color-text)', padding: '8px 10px', fontWeight: 700, fontFamily: 'inherit', fontSize: 13 }} />
                </th>
              )
            })}</tr></thead>
            <tbody>{rows.map((row, r) => (
              <tr key={r}>{row.map((cell, c) => {
                const hl = (sel?.type === 'row' && sel.index === r) || (sel?.type === 'col' && sel.index === c)
                const key = `${r},${c}`
                const isExplicitlyEmpty = !!emptyCells[key]
                const isExplicitlyBlank = !!blankCells[key]
                const isActive = activeCell === key
                const cellImg = cellImages[key]
                const showChoice = allowEmptyCells && !isExplicitlyEmpty && !isExplicitlyBlank && !isActive && cell === '' && !cellImg
                return (
                  <td key={c}
                    onClick={e => { if (showChoice) { e.stopPropagation(); setActiveCell(key) } }}
                    onDoubleClick={() => setSel({ type: 'row', index: r })}
                    style={{ borderRight: '1px solid var(--color-border)', borderTop: r > 0 ? '1px solid var(--color-border)' : undefined, padding: 0, cursor: showChoice ? 'default' : 'text', background: hl ? accentBg : 'var(--color-table-cell-bg)', transition: 'background 0.12s', position: 'relative' }}>
                    {cellImg ? (
                      <div style={{ padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          {CELL_IMG_SIZES.map(s => {
                            const active = (cellImageSizes[key] ?? 50) === s.value
                            return (
                              <button key={s.value} onMouseDown={e => { e.stopPropagation(); setCellImageSize(key, s.value) }}
                                style={{ padding: '1px 6px', borderRadius: 5, border: `1px solid ${active ? accent : 'var(--color-border-strong)'}`, background: active ? accentBg : 'var(--color-bg-3)', color: active ? accent : 'var(--color-text-2)', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: 'inherit', lineHeight: 1.4 }}>
                                {s.label}
                              </button>
                            )
                          })}
                          <button onMouseDown={e => { e.stopPropagation(); removeCellImage(key) }}
                            style={{ marginLeft: 2, width: 18, height: 18, borderRadius: 5, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
                            <X size={9} />
                          </button>
                        </div>
                        <img src={cellImg} alt="" style={{ display: 'block', width: `${cellImageSizes[key] ?? 50}%`, borderRadius: 6 }} />
                      </div>
                    ) : isExplicitlyEmpty ? (
                      // Student will type here — show "вписать" badge + X to remove
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', minHeight: 34, gap: 4 }}>
                        <span style={{ fontSize: 11, color: accent, fontWeight: 700, letterSpacing: 0.2 }}>вписать</span>
                        <button
                          onMouseDown={e => { e.stopPropagation(); setEmpty(key, false) }}
                          style={{ width: 16, height: 16, borderRadius: 4, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}
                          title="Убрать поле ответа"
                        ><X size={9} /></button>
                      </div>
                    ) : isExplicitlyBlank ? (
                      <div style={{ padding: '8px 10px', minHeight: 34, display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: 'var(--color-text-4)' }}>—</span>
                      </div>
                    ) : showChoice ? (
                      <div
                        tabIndex={0}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', minHeight: 34, flexWrap: 'wrap', outline: 'none' }}
                        onPaste={allowCellImages ? e => {
                          const imgItem = Array.from(e.clipboardData?.items ?? []).find(it => it.type.startsWith('image/'))
                          if (!imgItem) return
                          e.preventDefault()
                          const file = imgItem.getAsFile(); if (!file) return
                          optimizePhoto(file).then(url => { setCellImage(key, url); if (!cellImageSizes[key]) setCellImageSize(key, 50) }).catch(onPhotoTooLarge)
                        } : undefined}
                      >
                        <button
                          onMouseDown={e => { e.stopPropagation(); setActiveCell(key) }}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}
                        >Текст</button>
                        <button
                          onMouseDown={e => { e.stopPropagation(); setEmpty(key, true) }}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}
                        >Вписать</button>
                        <button
                          onMouseDown={e => { e.stopPropagation(); setBlank(key, true) }}
                          onClick={e => e.stopPropagation()}
                          style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}
                        >Пусто</button>
                        {allowCellImages && (
                          <button
                            onClick={e => { e.stopPropagation(); pickCellImage(key) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1.2 }}
                          ><Camera size={10} /> Фото</button>
                        )}
                      </div>
                    ) : (
                      <input
                        ref={el => { activeCellRef.current = el; if (el && isActive) el.focus() }}
                        value={cell}
                        onChange={e => setCell(r, c, e.target.value)}
                        onFocus={() => setActiveCellState(key)}
                        onBlur={() => { if (cell === '') setActiveCellState(null) }}
                        placeholder="—"
                        style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', background: 'transparent', padding: '8px 10px', fontFamily: 'inherit', fontSize: 13, color: 'var(--color-text)' }}
                        onPaste={allowCellImages ? e => {
                          const imgItem = Array.from(e.clipboardData?.items ?? []).find(it => it.type.startsWith('image/'))
                          if (!imgItem) return
                          e.preventDefault()
                          const file = imgItem.getAsFile(); if (!file) return
                          optimizePhoto(file).then(url => { setCellImage(key, url); setActiveCellState(null) }).catch(onPhotoTooLarge)
                        } : undefined}
                      />
                    )}
                  </td>
                )
              })}</tr>
            ))}</tbody>
          </table>
        </div>
        {bounds.colX.map((x, i) => (
          <InsertHandle key={`c${i}`} accent={accent} title="Добавить столбец" onClick={() => insertCol(i)}
            style={{ left: 20 + x - 18, top: 0, width: 36, height: 20 }} />
        ))}
        {bounds.rowY.map((y, j) => (
          <InsertHandle key={`r${j}`} accent={accent} title="Добавить строку" onClick={() => insertRow(j)}
            style={{ left: 0, top: 20 + y - 18, width: 20, height: 36 }} />
        ))}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 6 }}>
          Внутри таблицы клик выделяет строку (по ячейке) или столбец (по заголовку), удалить выделенное — клавишей Delete. Кружки «+» по краям: сверху добавляют столбец, слева — строку.
        </div>
      )}
    </>
  )
}
