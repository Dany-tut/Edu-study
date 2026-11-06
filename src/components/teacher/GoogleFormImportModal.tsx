import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Modal from '../Modal'
import { Link2, Loader2, Check } from '../icons/appIcons'
import { isGoogleFormUrl, importGoogleForm, type ImportedForm, type ImportedQuestion } from '../../lib/googleFormsImport'
import { typeVisual } from '../../data/taskTypeVisuals'
import { useT } from '../../lib/i18n'
import { Alert } from '../Alert'
import { btn } from '../../lib/pillStyles'

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

  const sequence = useRef(0)
  const pending = useRef(false)
  const controller = useRef<AbortController | null>(null)
  const visible = useRef(open)
  visible.current = open

  const reset = useCallback(() => {
    sequence.current++; pending.current = false; controller.current?.abort()
    setUrl(''); setLoading(false); setError(null); setForm(null); setExcluded(new Set()); setImporting(false)
  }, [])

  useEffect(() => {
    if (!open) reset()
    return () => { sequence.current++; pending.current = false; controller.current?.abort() }
  }, [open, reset])

  function handleClose() {
    reset()
    onClose()
  }

  async function handleParse() {
    const trimmed = url.trim()
    if (!trimmed || pending.current) return
    if (!isGoogleFormUrl(trimmed)) {
      setError(t('Это не похоже на ссылку Google Forms (forms.gle или docs.google.com/forms/...)'))
      return
    }
    pending.current = true
    const id = ++sequence.current
    controller.current = new AbortController()
    const signal = AbortSignal.any([controller.current.signal, AbortSignal.timeout(45000)])
    setLoading(true)
    setError(null)
    try {
      const parsed = await importGoogleForm(trimmed, signal)
      if (visible.current && id === sequence.current) { setForm(parsed); setExcluded(new Set()) }
    } catch (e) {
      if (visible.current && id === sequence.current) setError(signal.aborted ? t('Сервер не ответил вовремя. Попробуйте ещё раз.') : e instanceof Error ? e.message : t('Не удалось импортировать форму'))
    } finally {
      if (id === sequence.current) { pending.current = false; setLoading(false) }
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
    if (!form || importing) return
    const selectedIds = form.questions.map(q => q.id).filter(id => !excluded.has(id))
    if (!selectedIds.length) return
    const id = ++sequence.current
    setImporting(true)
    setError(null)
    try {
      await onImport(form, selectedIds)
      if (visible.current && id === sequence.current) handleClose()
    } catch {
      if (visible.current && id === sequence.current) setError(t('Не удалось импортировать форму'))
    } finally {
      if (id === sequence.current) setImporting(false)
    }
  }

  if (!open) return null

  const selectedCount = form ? form.questions.filter(q => !excluded.has(q.id)).length : 0

  return (
    <AnimatePresence>
      <Modal onClose={handleClose} title={t('Импорт из Google Forms')} width={520} closeButtonStyle={{ width: 44, height: 44 }}
        icon={<Link2 size={24} style={{ color: 'var(--color-accent)' }} />}
        footer={form ? <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button data-hover="layer" disabled={importing} onClick={() => { setForm(null); setError(null) }} style={{ ...btn('M', 'secondary'), minHeight: 44 }}>{t('Назад')}</button>
          <button data-hover="layer" onClick={handleImport} disabled={importing || !selectedCount} style={{ ...btn('M', 'primary'), background: 'var(--color-control-accent)', minHeight: 44 }}>{t('Импортировать')} {selectedCount || ''}</button>
        </div> : undefined}>
          {!form && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                {t('Вставьте ссылку на Google-форму с доступом «Всем, у кого есть ссылка». Правильные ответы Google не отдаёт — отметьте их вручную после импорта.')}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={url}
                  onChange={e => { setUrl(e.target.value); setError(null) }}
                  aria-label={t('Ссылка Google Forms')}
                  disabled={loading}
                  onKeyDown={e => { if (e.key === 'Enter') handleParse() }}
                  placeholder="https://forms.gle/..."
                  autoFocus
                  style={{
                    flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 12, border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 16, fontFamily: 'inherit', minHeight: 44, boxSizing: 'border-box',
                  }}
                />
                <button data-hover="layer"
                  onClick={handleParse}
                  disabled={loading || !url.trim()}
                  style={{ minHeight: 44,
                    padding: '0 16px', borderRadius: 12, border: 'none', cursor: loading ? 'default' : 'pointer',
                    background: 'var(--color-control-accent)', color: '#fff', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 6, opacity: loading || !url.trim() ? 0.6 : 1, flexShrink: 0,
                  }}
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                  {t('Разобрать')}
                </button>
              </div>
            </div>
          )}

          {form && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginTop: 10 }}>{form.title}</div>
              {form.description && <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{form.description}</div>}
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '8px 0 6px' }}>
                {t('Найдено вопросов:')} {form.questions.length} · {t('выбрано:')} {selectedCount}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.questions.map((q, i) => (
                  <QuestionRow key={q.id} q={q} index={i} excluded={excluded.has(q.id)} disabled={importing} onToggle={() => toggle(q.id)} />
                ))}
              </div>
            </>
          )}
        {error && <Alert tone="danger" text={error} style={{ marginTop: 12 }} />}
      </Modal>
    </AnimatePresence>
  )
}

function QuestionRow({ q, index, excluded, disabled, onToggle }: { q: ImportedQuestion; index: number; excluded: boolean; disabled: boolean; onToggle: () => void }) {
  const t = useT()
  const visual = typeVisual(q.type)
  const needsAnswer = q.type !== 'extended'
  return (
    <button data-hover="layer" type="button" role="checkbox" aria-checked={!excluded} aria-label={q.title} disabled={disabled}
      onClick={onToggle}
      style={{
        display: 'flex', width: '100%', textAlign: 'left', fontFamily: 'inherit', minHeight: 44, alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
        background: excluded ? 'var(--color-bg-3)' : 'var(--color-bg)',
        opacity: excluded ? 0.5 : 1, border: '1px solid var(--color-border-soft)',
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 6, border: '2px solid', flexShrink: 0, marginTop: 1,
        borderColor: excluded ? 'var(--color-border)' : 'var(--color-control-accent)',
        background: excluded ? 'transparent' : 'var(--color-control-accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!excluded && <Check size={12} style={{ color: '#fff' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: visual.color, background: visual.bg, padding: '2px 8px', borderRadius: 999 }}>
            {t(TYPE_LABELS[q.type] ?? q.type)}
          </span>
          {needsAnswer && (
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-peach-text)', background: 'var(--color-peach-soft)', padding: '2px 8px', borderRadius: 999 }}>
              {t('нет ответа — отметьте вручную')}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.4 }}>{index + 1}. {q.title}</div>
        {q.choices && (
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
            {q.choices.join(' · ')}
          </div>
        )}
        {q.note && (
          <div style={{ fontSize: 11, color: 'var(--color-peach-text)', marginTop: 4 }}>{q.note}</div>
        )}
      </div>
    </button>
  )
}
