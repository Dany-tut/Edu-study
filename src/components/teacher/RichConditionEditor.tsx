import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, PenLine } from 'lucide-react'
import { useTheme } from '../../store/themeStore'
import WhiteboardCanvas from './WhiteboardCanvas'
import { optimizePhoto } from '../../lib/imageOptim'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ToolbarBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean
}) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer',
        background: active ? 'var(--color-bg-3)' : 'transparent',
        color: active ? 'var(--color-text)' : 'var(--color-text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s',
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg-3)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

const HIGHLIGHT_COLORS = [
  { hex: '#FFD700', label: 'Жёлтый' },
  { hex: '#FF8787', label: 'Красный' },
  { hex: '#74C0FC', label: 'Синий' },
  { hex: '#69DB7C', label: 'Зелёный' },
  { hex: '#FFA94D', label: 'Оранжевый' },
]

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28']

const DEFAULT_INPUT_ST: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 11, border: '1.5px solid var(--color-border-medium)',
  fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg-input)',
  outline: 'none', fontFamily: 'inherit',
}

// ─── Component ────────────────────────────────────────────────────────────────

// Detects "question + lettered/bulleted options" paste pattern.
// Returns null if the text doesn't look like a multi-choice block.
export function parseSmartPaste(text: string): { question: string; options: string[] } | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  // Matches: "• а) …", "- б. …", "а) …", "А) …", "a) …", "1) …"
  const optRe = /^(?:[•\-\*]\s*)?(?:[а-яёa-zА-ЯЁA-Z\d][).]\s+)/
  const optIdxs = lines.map((l, i) => (optRe.test(l) ? i : -1)).filter(i => i >= 0)
  if (optIdxs.length < 2) return null
  const firstOpt = optIdxs[0]
  const question = lines.slice(0, firstOpt).join(' ').trim()
  const options = lines.slice(firstOpt).map(l =>
    l.replace(/^[•\-\*]\s*/, '').replace(/^[а-яёa-zA-ZА-ЯЁ\d][).]\s+/, '').trim()
  ).filter(Boolean)
  if (!question || options.length < 2) return null
  return { question, options }
}

export default function RichConditionEditor({
  value, onChange, inputSt, placeholder, autoGrow = false, minHeight = 120, onSmartPaste,
}: {
  value: string
  onChange: (html: string) => void
  inputSt?: React.CSSProperties
  placeholder?: string
  autoGrow?: boolean
  minHeight?: number
  onSmartPaste?: (question: string, options: string[]) => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sizeBtnRef = useRef<HTMLButtonElement>(null)
  const [focused, setFocused] = useState(false)
  const [fontSize, setFontSize] = useState('16')
  const [sizeOpen, setSizeOpen] = useState(false)
  const [sizeDropPos, setSizeDropPos] = useState({ top: 0, left: 0 })
  const sizeDropRef = useRef<HTMLDivElement>(null)
  const lastHtmlRef = useRef('')
  const savedRangeRef = useRef<Range | null>(null)
  const [drawMode, setDrawMode] = useState(false)
  const drawDataRef = useRef<string>('')

  useEffect(() => {
    if (!sizeOpen) return
    const handler = (e: MouseEvent) => {
      if (
        sizeBtnRef.current?.contains(e.target as Node) ||
        sizeDropRef.current?.contains(e.target as Node)
      ) return
      setSizeOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sizeOpen])

  const dark = useTheme(s => s.dark)
  const hlAlpha = dark ? 0.3 : 0.8

  useEffect(() => {
    if (!editorRef.current) return
    if (value !== lastHtmlRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value
      lastHtmlRef.current = value
    }
  }, [value])

  const emit = () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    lastHtmlRef.current = html
    onChange(html)
  }

  const exec = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    emit()
  }

  const selectedImgRef = useRef<HTMLImageElement | null>(null)

  const inScript = () =>
    document.queryCommandState('superscript') || document.queryCommandState('subscript')

  const exitScript = () => {
    if (document.queryCommandState('superscript')) exec('superscript')
    if (document.queryCommandState('subscript'))   exec('subscript')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImgRef.current) {
      e.preventDefault()
      selectedImgRef.current.remove()
      selectedImgRef.current = null
      emit()
      return
    }
    if (e.key === 'ArrowUp')   { e.preventDefault(); exitScript(); exec('superscript'); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); exitScript(); exec('subscript');   return }
    if (e.key === ' ' && inScript()) { e.preventDefault(); exitScript(); return }
    if (e.key === 'ArrowRight' && inScript()) { e.preventDefault(); exitScript(); return }
    if (e.key === 'Escape' && inScript()) { e.preventDefault(); exitScript(); return }
  }

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      if (selectedImgRef.current && selectedImgRef.current !== target)
        selectedImgRef.current.style.outline = ''
      const img = target as HTMLImageElement
      img.style.outline = '2.5px solid var(--color-accent)'
      selectedImgRef.current = img
    } else {
      if (selectedImgRef.current) {
        selectedImgRef.current.style.outline = ''
        selectedImgRef.current = null
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData?.items ?? [])
    const imgItem = items.find(it => it.type.startsWith('image/'))
    if (imgItem) {
      e.preventDefault()
      const file = imgItem.getAsFile()
      if (!file) return
      const sel = window.getSelection()
      const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
      insertImageFile(file, savedRange)
      return
    }
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    if (onSmartPaste) {
      const parsed = parseSmartPaste(text)
      if (parsed) {
        if (editorRef.current) {
          editorRef.current.innerHTML = parsed.question
          lastHtmlRef.current = parsed.question
          onChange(parsed.question)
        }
        onSmartPaste(parsed.question, parsed.options)
        return
      }
    }
    document.execCommand('insertText', false, text)
    emit()
  }

  const insertImageFile = (file: File, savedRange?: Range | null) => {
    optimizePhoto(file).then(src => {
      if (!src) return
      editorRef.current?.focus()
      const sel = window.getSelection()
      if (!sel) return
      const range = savedRange ?? (sel.rangeCount > 0 ? sel.getRangeAt(0) : null)
      if (!range) return
      sel.removeAllRanges()
      sel.addRange(range)
      range.deleteContents()
      const img = document.createElement('img')
      img.src = src
      img.style.maxWidth = '100%'
      img.style.borderRadius = '8px'
      img.style.marginTop = '6px'
      img.style.display = 'block'
      img.style.cursor = 'pointer'
      range.insertNode(img)
      range.setStartAfter(img)
      range.setEndAfter(img)
      sel.removeAllRanges()
      sel.addRange(range)
      emit()
    })
  }

  const applyFontSize = (size: string) => {
    setFontSize(size)
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel) return
    const range = savedRangeRef.current
    if (!range) return
    sel.removeAllRanges()
    sel.addRange(range)
    if (sel.isCollapsed) { emit(); return }
    try {
      const span = document.createElement('span')
      span.style.fontSize = `${size}px`
      range.surroundContents(span)
    } catch {
      document.execCommand('fontSize', false, '4')
      editorRef.current?.querySelectorAll('font[size="4"]').forEach(el => {
        const f = el as HTMLElement
        f.removeAttribute('size')
        f.style.fontSize = `${size}px`
      })
    }
    emit()
  }

  const insertDrawing = () => {
    const src = drawDataRef.current
    if (!src) return
    editorRef.current?.focus()
    const sel = window.getSelection()
    if (!sel) return
    const range = savedRangeRef.current ?? (sel.rangeCount > 0 ? sel.getRangeAt(0) : null)
    if (range) {
      sel.removeAllRanges()
      sel.addRange(range)
      range.deleteContents()
      const img = document.createElement('img')
      img.src = src
      img.style.maxWidth = '100%'
      img.style.borderRadius = '8px'
      img.style.marginTop = '6px'
      img.style.display = 'block'
      img.style.cursor = 'pointer'
      range.insertNode(img)
      range.setStartAfter(img)
      range.setEndAfter(img)
      sel.removeAllRanges()
      sel.addRange(range)
      emit()
    } else {
      const img = document.createElement('img')
      img.src = src
      img.style.maxWidth = '100%'
      img.style.borderRadius = '8px'
      img.style.display = 'block'
      editorRef.current?.appendChild(img)
      emit()
    }
    drawDataRef.current = ''
    setDrawMode(false)
  }

  const st = inputSt ?? DEFAULT_INPUT_ST
  const isEmpty = !value || value === '<br>' || value === ''
  const divider = <div style={{ width: 1, height: 20, background: 'var(--color-border-medium)', margin: '0 3px', flexShrink: 0 }} />

  return (
    <div>
      <div style={{ position: 'relative' }}>
        {isEmpty && !focused && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '12px 16px', fontSize: 16, lineHeight: 1.6,
            color: 'var(--color-text-4)', pointerEvents: 'none', zIndex: 1,
          }}>
            {placeholder ?? 'Введите текст задания…'}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onFocus={() => setFocused(true)}
          onBlur={() => { emit(); setTimeout(() => setFocused(false), 200) }}
          onClick={handleEditorClick}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          style={{
            ...st,
            minHeight,
            fontSize: 16,
            padding: '12px 16px',
            paddingBottom: focused ? 56 : 12,
            lineHeight: 1.6,
            // autoGrow → grow with content (height auto, no inner scrollbar);
            // otherwise keep the scroll-and-resize behaviour.
            overflowY: autoGrow ? 'visible' : 'auto',
            height: autoGrow ? 'auto' : undefined,
            wordBreak: 'break-word',
            transition: 'padding-bottom 0.18s ease',
            cursor: 'text',
            resize: autoGrow ? 'none' : 'vertical',
          }}
        />

        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.14 }}
              onMouseDown={e => e.preventDefault()}
              style={{
                position: 'absolute', bottom: 8, left: 8, right: 8,
                height: 40, display: 'flex', alignItems: 'center', gap: 1,
                background: 'var(--color-bg-2)',
                borderRadius: 10,
                border: '1px solid var(--color-border-medium)',
                padding: '0 6px',
                zIndex: 20,
                boxShadow: '0 2px 14px rgba(0,0,0,0.18)',
                flexWrap: 'nowrap', overflowX: 'auto',
              }}
            >
              {/* Font size */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  ref={sizeBtnRef}
                  onMouseDown={e => {
                    e.preventDefault()
                    const sel = window.getSelection()
                    savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
                    if (!sizeOpen && sizeBtnRef.current) {
                      const r = sizeBtnRef.current.getBoundingClientRect()
                      setSizeDropPos({ top: r.bottom + 6, left: r.left })
                    }
                    setSizeOpen(o => !o)
                  }}
                  style={{
                    height: 28, padding: '0 8px', borderRadius: 7,
                    border: 'none', outline: 'none',
                    background: sizeOpen ? 'var(--color-bg-3)' : 'var(--color-bg-input)',
                    color: 'var(--color-text)', fontSize: 12,
                    cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                    alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                  }}
                >
                  {fontSize}px <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
                </button>
                {sizeOpen && createPortal(
                  <div ref={sizeDropRef} style={{
                    position: 'fixed', top: sizeDropPos.top, left: sizeDropPos.left,
                    background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
                    borderRadius: 10, padding: '4px', zIndex: 9999,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    display: 'flex', flexDirection: 'column', gap: 1, minWidth: 70,
                  }}>
                    {FONT_SIZES.map(s => (
                      <button key={s}
                        onMouseDown={e => { e.preventDefault(); applyFontSize(s); setSizeOpen(false) }}
                        style={{
                          padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: fontSize === s ? 'var(--color-bg-3)' : 'transparent',
                          color: 'var(--color-text)', fontSize: 12, fontFamily: 'inherit',
                          textAlign: 'left', fontWeight: fontSize === s ? 700 : 400,
                        }}
                      >
                        {s}px
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>

              {divider}

              <ToolbarBtn title="Жирный (Ctrl+B)" onClick={() => exec('bold')}>
                <span style={{ fontWeight: 800, fontSize: 13, lineHeight: 1 }}>B</span>
              </ToolbarBtn>
              <ToolbarBtn title="Курсив (Ctrl+I)" onClick={() => exec('italic')}>
                <span style={{ fontStyle: 'italic', fontSize: 13, lineHeight: 1 }}>I</span>
              </ToolbarBtn>
              <ToolbarBtn title="Подчёркнутый (Ctrl+U)" onClick={() => exec('underline')}>
                <span style={{ textDecoration: 'underline', fontSize: 13, lineHeight: 1 }}>U</span>
              </ToolbarBtn>

              {divider}

              <ToolbarBtn title="Надстрочный (↑ чтобы войти, пробел/→ выйти)" onClick={() => exec('superscript')}>
                <span style={{ fontSize: 12, lineHeight: 1, fontFamily: 'inherit' }}>
                  x<sup style={{ fontSize: '68%' }}>2</sup>
                </span>
              </ToolbarBtn>
              <ToolbarBtn title="Подстрочный (↓ чтобы войти, пробел/→ выйти)" onClick={() => exec('subscript')}>
                <span style={{ fontSize: 12, lineHeight: 1, fontFamily: 'inherit' }}>
                  x<sub style={{ fontSize: '68%' }}>2</sub>
                </span>
              </ToolbarBtn>

              {divider}

              {HIGHLIGHT_COLORS.map(({ hex, label }) => (
                <button
                  key={hex}
                  title={`Выделить: ${label}`}
                  onMouseDown={e => { e.preventDefault(); exec('hiliteColor', hexToRgba(hex, hlAlpha)) }}
                  style={{
                    width: 16, height: 16, borderRadius: 4,
                    border: '1.5px solid rgba(0,0,0,0.12)',
                    background: hexToRgba(hex, hlAlpha), cursor: 'pointer', flexShrink: 0,
                  }}
                />
              ))}
              <button
                title="Убрать выделение"
                onMouseDown={e => { e.preventDefault(); exec('hiliteColor', 'transparent') }}
                style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: '1.5px solid var(--color-border-medium)',
                  background: 'transparent', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text-3)',
                }}
              >
                <X size={9} />
              </button>

              {divider}

              <ToolbarBtn title="Вставить фото (или Ctrl+V)" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon size={13} />
              </ToolbarBtn>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) insertImageFile(file)
                  e.target.value = ''
                }}
              />

              {divider}

              <ToolbarBtn
                title="Рисунок (Доска)"
                active={drawMode}
                onClick={() => {
                  const sel = window.getSelection()
                  savedRangeRef.current = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null
                  setDrawMode(m => !m)
                }}
              >
                <PenLine size={13} />
              </ToolbarBtn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {drawMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden', marginTop: 8 }}
          >
            <WhiteboardCanvas compact onSave={data => { drawDataRef.current = data }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { drawDataRef.current = ''; setDrawMode(false) }}
                style={{ padding: '6px 14px', borderRadius: 9, border: '1.5px solid var(--color-border-medium)', background: 'transparent', color: 'var(--color-text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Отменить
              </button>
              <button
                onClick={insertDrawing}
                style={{ padding: '6px 14px', borderRadius: 9, border: 'none', background: 'var(--color-blue-pill-bg)', color: 'var(--color-blue-pill-text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Вставить рисунок
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
