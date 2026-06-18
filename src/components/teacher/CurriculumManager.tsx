import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown, Plus, Trash2, X, Check, RotateCcw, Layers, Hash, BookOpen, GripVertical,
  Cloud, CloudOff, Loader2,
} from 'lucide-react'
import { useCurriculum } from '../../store/curriculumStore'
import { subjectTheme } from '../../lib/theme'
import { useTheme } from '../../store/themeStore'
import type { Subject } from '../../data/taskBankData'

// ── Inline-editable text ──────────────────────────────────────────────────────
// Click to edit; commit on Enter/blur, cancel on Escape.
function InlineText({ value, onCommit, placeholder, style, inputStyle }: {
  value: string; onCommit: (v: string) => void; placeholder?: string
  style?: React.CSSProperties; inputStyle?: React.CSSProperties
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) { setDraft(value); setTimeout(() => ref.current?.select(), 10) } }, [editing]) // eslint-disable-line
  if (editing) {
    return (
      <input
        ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onClick={e => e.stopPropagation()}
        onBlur={() => { setEditing(false); if (draft.trim() && draft !== value) onCommit(draft.trim()) }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); setEditing(false); if (draft.trim() && draft !== value) onCommit(draft.trim()) }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
        }}
        style={{ border: '1.5px solid var(--color-accent)', borderRadius: 8, padding: '3px 8px', outline: 'none', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontFamily: 'inherit', ...inputStyle }}
      />
    )
  }
  return (
    <span onClick={e => { e.stopPropagation(); setEditing(true) }}
      title="Нажмите, чтобы переименовать"
      style={{ cursor: 'text', borderRadius: 6, ...style }}>
      {value || <span style={{ color: 'var(--color-text-4)' }}>{placeholder ?? '—'}</span>}
    </span>
  )
}

// ── Add-input row (reveals an input + confirm) ────────────────────────────────
function AddInline({ onAdd, placeholder, accent }: { onAdd: (v: string) => void; placeholder: string; accent: string }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const commit = () => { if (draft.trim()) onAdd(draft.trim()); setDraft(''); setOpen(false) }
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setTimeout(() => ref.current?.focus(), 20) }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, border: `1px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Plus size={13} strokeWidth={2.6} /> {placeholder}
      </button>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim()) commit(); else setOpen(false) }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') { setDraft(''); setOpen(false) } }}
        placeholder={placeholder}
        style={{ border: `1.5px solid ${accent}`, borderRadius: 999, padding: '5px 12px', outline: 'none', background: 'var(--color-bg-input)', color: 'var(--color-text)', fontSize: 12, fontFamily: 'inherit', minWidth: 160 }} />
      <button onMouseDown={e => { e.preventDefault(); commit() }}
        style={{ display: 'flex', background: accent, color: '#fff', border: 'none', borderRadius: 999, padding: 5, cursor: 'pointer' }}>
        <Check size={13} strokeWidth={2.8} />
      </button>
    </span>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ subject, section, accent, accentBg, partFilter }: {
  subject: Subject; section: string; accent: string; accentBg: string; partFilter: 0 | 1 | 2
}) {
  const data = useCurriculum(s => s.data[subject])
  const { renameSection, removeSection, addTopic, renameTopic, removeTopic, addLine, updateLine, removeLine } = useCurriculum()
  const [open, setOpen] = useState(false)

  const topics = data.topics[section] ?? []
  const lines = useMemo(
    () => data.lines.filter(l => l.section === section && (partFilter === 0 || l.part === partFilter)).sort((a, b) => a.n - b.n),
    [data.lines, section, partFilter],
  )
  const totalLines = data.lines.filter(l => l.section === section).length

  return (
    <div style={{
      borderRadius: 18, border: '1px solid var(--color-border-glass)',
      background: 'rgba(var(--glass-rgb), 0.96)', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', cursor: 'pointer' }}>
        <GripVertical size={15} style={{ color: 'var(--color-text-5)', flexShrink: 0 }} />
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.18 }} style={{ display: 'flex', color: 'var(--color-text-3)', flexShrink: 0 }}>
          <ChevronDown size={16} />
        </motion.span>
        <InlineText value={section} onCommit={v => renameSection(subject, section, v)}
          style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)', flex: 1, minWidth: 0 }} inputStyle={{ fontSize: 14.5, fontWeight: 700 }} />
        <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: accentBg, color: accent, fontSize: 11, fontWeight: 700 }}>
            <Hash size={11} /> {totalLines}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, background: 'var(--color-bg-5)', color: 'var(--color-muted)', fontSize: 11, fontWeight: 700 }}>
            <BookOpen size={11} /> {topics.length}
          </span>
        </span>
        <button onClick={e => { e.stopPropagation(); if (confirm(`Удалить раздел «${section}» со всеми темами и линиями?`)) removeSection(subject, section) }}
          style={{ display: 'flex', width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', flexShrink: 0 }}>
          <Trash2 size={13} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Topics */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' }}>Темы</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {topics.map(t => (
                    <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 6px 5px 11px', borderRadius: 999, background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)' }}>
                      <InlineText value={t} onCommit={v => renameTopic(subject, section, t, v)} style={{ fontSize: 12.5, color: 'var(--color-text)', fontWeight: 500 }} inputStyle={{ fontSize: 12.5 }} />
                      <button onClick={() => removeTopic(subject, section, t)} style={{ display: 'flex', width: 18, height: 18, borderRadius: 999, border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--color-text-4)' }}>
                        <X size={12} strokeWidth={2.4} />
                      </button>
                    </span>
                  ))}
                  <AddInline onAdd={v => addTopic(subject, section, v)} placeholder="Тема" accent={accent} />
                </div>
              </div>

              {/* Lines */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.4, marginBottom: 8, textTransform: 'uppercase' }}>Линии</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {lines.map(l => (
                    <div key={l.n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 11, background: 'var(--color-bg-input)', border: '1px solid var(--color-border-soft)' }}>
                      {/* Number */}
                      <input type="number" min={1} value={l.n}
                        onChange={e => { const v = Number(e.target.value); if (v > 0) updateLine(subject, l.n, { n: v }) }}
                        style={{ width: 48, padding: '5px 6px', borderRadius: 8, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: accent, fontWeight: 700, fontSize: 12, textAlign: 'center', outline: 'none', fontFamily: 'inherit', flexShrink: 0 }} />
                      {/* Name */}
                      <input value={l.name} onChange={e => updateLine(subject, l.n, { name: e.target.value })}
                        style={{ flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 8, border: '1px solid transparent', background: 'transparent', color: 'var(--color-text)', fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-border-medium)'; e.currentTarget.style.background = 'var(--color-bg-2)' }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }} />
                      {/* Part toggle */}
                      <div style={{ display: 'flex', borderRadius: 8, background: 'var(--color-bg-3)', padding: 2, flexShrink: 0 }}>
                        {([1, 2] as const).map(p => (
                          <button key={p} onClick={() => updateLine(subject, l.n, { part: p })}
                            style={{ padding: '3px 9px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                              background: l.part === p ? accent : 'transparent', color: l.part === p ? '#fff' : 'var(--color-text-3)' }}>
                            Ч{p}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => removeLine(subject, l.n)} style={{ display: 'flex', width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center', background: 'var(--color-red-soft)', color: 'var(--color-red-text)', flexShrink: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {lines.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-4)', padding: '6px 2px' }}>Нет линий{partFilter ? ` (Часть ${partFilter})` : ''}</div>
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => addLine(subject, section, partFilter === 2 ? 2 : 1)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 999, border: `1px dashed ${accent}66`, background: 'transparent', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Plus size={13} strokeWidth={2.6} /> Добавить линию
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Curriculum manager (the "Банк заданий" tab body) ─────────────────────────
export default function CurriculumManager() {
  const { dark } = useTheme()
  const [subject, setSubject] = useState<Subject>('biology')
  const [partFilter, setPartFilter] = useState<0 | 1 | 2>(0)
  const data = useCurriculum(s => s.data[subject])
  const addSection = useCurriculum(s => s.addSection)
  const resetSubject = useCurriculum(s => s.resetSubject)
  const saveState = useCurriculum(s => s.saveState)
  const load = useCurriculum(s => s.load)
  useEffect(() => { load() }, [load])
  const palette = subjectTheme(subject, dark)
  const accent = palette.accent, accentBg = palette.soft

  const totalLines = data.lines.length
  const totalTopics = Object.values(data.topics).reduce((s, t) => s + t.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 920 }}>
      {/* Intro / controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
            <Layers size={19} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)' }}>Банк заданий — структура</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Разделы, темы, линии и части. Меняется всюду в фильтрах тренажёра.</div>
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Save status */}
          {saveState === 'saving' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)' }}>
              <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}><Loader2 size={13} /></motion.span> Сохранение…
            </span>
          )}
          {saveState === 'saved' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--color-green-text)' }}>
              <Cloud size={13} /> Сохранено в БД
            </span>
          )}
          {saveState === 'error' && (
            <span title="Войдите как преподаватель, чтобы сохранять изменения" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--color-red-text)' }}>
              <CloudOff size={13} /> Не сохранено — нужен вход
            </span>
          )}
          {/* Subject pills */}
          <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 999, background: 'var(--color-bg-3)' }}>
            {(['biology', 'chemistry'] as Subject[]).map(s => (
              <button key={s} onClick={() => setSubject(s)}
                style={{ padding: '7px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  background: subject === s ? (s === 'biology' ? 'var(--color-green-soft)' : 'var(--color-purple-soft)') : 'transparent',
                  color: subject === s ? (s === 'biology' ? 'var(--color-green-text)' : 'var(--color-purple-text)') : 'var(--color-muted)' }}>
                {s === 'biology' ? 'Биология' : 'Химия'}
              </button>
            ))}
          </div>
          <button onClick={() => { if (confirm('Вернуть стандартную структуру ЕГЭ для этого предмета? Ваши правки будут потеряны.')) resetSubject(subject) }}
            title="Сбросить к стандарту ЕГЭ"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1px solid var(--color-border-medium)', cursor: 'pointer', background: 'rgba(var(--glass-rgb),0.9)', color: 'var(--color-muted)', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit' }}>
            <RotateCcw size={13} /> Сбросить
          </button>
        </div>
      </div>

      {/* Stats + part filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
          {data.sections.length} разделов · {totalTopics} тем · {totalLines} линий
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, padding: 3, borderRadius: 999, background: 'var(--color-bg-3)' }}>
          {([[0, 'Все'], [1, 'Часть 1'], [2, 'Часть 2']] as [0 | 1 | 2, string][]).map(([p, l]) => (
            <button key={p} onClick={() => setPartFilter(p)}
              style={{ padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                background: partFilter === p ? 'var(--color-surface)' : 'transparent', color: partFilter === p ? 'var(--color-text)' : 'var(--color-muted)',
                boxShadow: partFilter === p ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.sections.map(s => (
          <SectionCard key={s} subject={subject} section={s} accent={accent} accentBg={accentBg} partFilter={partFilter} />
        ))}
      </div>

      <div>
        <AddInline onAdd={v => addSection(subject, v)} placeholder="Добавить раздел" accent={accent} />
      </div>
    </div>
  )
}
