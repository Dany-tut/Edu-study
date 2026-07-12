import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2, AlertCircle, Loader2, Check } from 'lucide-react'
import { isGoogleFormUrl, importGoogleForm, type ImportedForm, type ImportedQuestion } from '../../lib/googleFormsImport'
import { typeVisual } from '../../data/taskTypeVisuals'
import { useT } from '../../lib/i18n'

const TYPE_LABELS: Record<string, string> = {
  single: 'Один ответ', multi: 'Несколько верных', fill: 'Вписать ответ',
  extended: 'Развёрнутый ответ', matching: 'Сопоставление', sequence: 'Последовательность',
  tableFill: 'Таблица', whiteboard: 'Доска',
}

interface Props {
  open: boolean
  onClose: () => void
  onImport: (form: ImportedForm, selectedIds: string[]) => void | Promise<void>
}

export default function GoogleFormImportModal({ open, onClose, onImport }: Props) {
  const t = useT()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ImportedForm | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)

  function reset() {
    setUrl(''); setLoading(false); setError(null); setForm(null); setExcluded(new Set()); setImporting(false)
  }
  function handleClose() {
    reset()
    onClose()
  }

  async function handleParse() {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!isGoogleFormUrl(trimmed)) {
      setError(t('Это не похоже на ссылку Google Forms (forms.gle или docs.google.com/forms/...)'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = await importGoogleForm(trimmed)
      setForm(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Не удалось импортировать форму'))
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (!form) return
    const selectedIds = form.questions.map(q => q.id).filter(id => !excluded.has(id))
    if (!selectedIds.length) return
    setImporting(true)
    try {
      await onImport(form, selectedIds)
      handleClose()
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  const selectedCount = form ? form.questions.filter(q => !excluded.has(q.id)).length : 0

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--color-bg-input)', borderRadius: 22, padding: '24px 24px 20px',
            width: 480, maxWidth: '92vw', maxHeight: '84vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Link2 size={19} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Импорт из Google Forms')}</div>
            <button onClick={handleClose} style={{ marginLeft: 'auto', width: 28, height: 28, borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
              <X size={14} />
            </button>
          </div>

          {!form && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.55, marginBottom: 12 }}>
                {t('Вставьте ссылку на Google-форму с доступом «Всем, у кого есть ссылка». Правильные ответы Google не отдаёт — отметьте их вручную после импорта.')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleParse() }}
                  placeholder="https://forms.gle/..."
                  autoFocus
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <button
                  onClick={handleParse}
                  disabled={loading || !url.trim()}
                  style={{
                    padding: '10px 18px', borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer',
                    background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6, opacity: loading || !url.trim() ? 0.6 : 1, flexShrink: 0,
                  }}
                >
                  {loading ? <Loader2 size={14} style={{ animation: 'gfim-spin 1s linear infinite' }} /> : null}
                  {t('Разобрать')}
                </button>
              </div>
              {error && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, padding: '10px 12px', borderRadius: 12, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12.5, lineHeight: 1.5 }}>
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {form && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 10 }}>{form.title}</div>
              {form.description && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{form.description}</div>}
              <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', margin: '8px 0 6px' }}>
                {t('Найдено вопросов:')} {form.questions.length} · {t('выбрано:')} {selectedCount}
              </div>
              <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 2 }}>
                {form.questions.map((q, i) => (
                  <QuestionRow key={q.id} q={q} index={i} excluded={excluded.has(q.id)} onToggle={() => toggle(q.id)} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button
                  onClick={() => setForm(null)}
                  style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'transparent', color: 'var(--color-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  {t('Назад')}
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !selectedCount}
                  style={{
                    padding: '9px 18px', borderRadius: 12, border: 'none', cursor: importing ? 'default' : 'pointer',
                    background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                    opacity: importing || !selectedCount ? 0.6 : 1,
                  }}
                >
                  {t('Импортировать')} {selectedCount || ''}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
      <style>{`@keyframes gfim-spin { to { transform: rotate(360deg) } }`}</style>
    </AnimatePresence>,
    document.body,
  )
}

function QuestionRow({ q, index, excluded, onToggle }: { q: ImportedQuestion; index: number; excluded: boolean; onToggle: () => void }) {
  const t = useT()
  const visual = typeVisual(q.type)
  const needsAnswer = q.type !== 'extended'
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 11px', borderRadius: 12, cursor: 'pointer',
        background: excluded ? 'var(--color-bg-3)' : 'var(--color-bg)',
        opacity: excluded ? 0.5 : 1, border: '1px solid var(--color-border-soft)',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 6, border: '2px solid', flexShrink: 0, marginTop: 1,
        borderColor: excluded ? 'var(--color-border)' : 'var(--color-accent)',
        background: excluded ? 'transparent' : 'var(--color-accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!excluded && <Check size={12} style={{ color: '#fff' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: visual.color, background: visual.bg, padding: '2px 7px', borderRadius: 999 }}>
            {t(TYPE_LABELS[q.type] ?? q.type)}
          </span>
          {needsAnswer && (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-peach-text)', background: 'var(--color-peach-soft)', padding: '2px 7px', borderRadius: 999 }}>
              {t('нет ответа — отметьте вручную')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.4 }}>{index + 1}. {q.title}</div>
        {q.choices && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 3 }}>
            {q.choices.join(' · ')}
          </div>
        )}
        {q.note && (
          <div style={{ fontSize: 11, color: 'var(--color-peach-text)', marginTop: 3 }}>{q.note}</div>
        )}
      </div>
    </div>
  )
}
