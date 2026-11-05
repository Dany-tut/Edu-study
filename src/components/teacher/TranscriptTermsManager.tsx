import { useEffect, useMemo, useState } from 'react'
import Segmented from '../Segmented'
import TeacherSelect from './TeacherSelect'
import { Alert } from '../Alert'
import { ArrowRight, AudioLines, Check, RefreshCw, Search, Trash2, X } from '../icons/appIcons'
import { supabase } from '../../lib/supabase'
import { getSubject } from '../../lib/subjects'
import { btn } from '../../lib/pillStyles'
import { useT } from '../../lib/i18n'
import FadeText from '../FadeText'
import './transcriptTerms.css'
import type { AdminTerm } from '../../lib/transcriptTerms'

// Админка → «Словарь»: термины и ошибки распознавания для локальной расшифровки.
// Учителя пополняют его правками реплик; общим пара становится, когда её внесли
// 3 разных учителя или её одобрили здесь. Модуль получает словарь с каждой записью.

type StatusFilter = 'pending' | 'approved' | 'rejected'
const FIELD: React.CSSProperties = { minHeight: 36, padding: '7px 10px', borderRadius: 10, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg)', color: 'var(--color-text)', font: 'inherit', fontSize: 13, minWidth: 0 }

function subjectLabel(id: string) { const s = getSubject(id); return s ? `${s.icon} ${s.name}` : id }

export default function TranscriptTermsManager() {
  const t = useT()
  const [rows, setRows] = useState<AdminTerm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusFilter>('approved')
  const [subject, setSubject] = useState('chemistry')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState({ written: '', heard: '', spoken: '' })
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<{ id: string; written: string; heard: string; spoken: string } | null>(null)

  async function load() {
    setLoading(true); setError('')
    const { data, error } = await supabase.from('transcript_terms')
      .select('id, subject, written, heard, spoken, status, source, hits, created_at').order('hits', { ascending: false }).limit(2000)
    if (error) { setError(t('Словарь недоступен: таблица ещё не создана в базе.')); setRows([]); setLoading(false); return }
    const list = (data ?? []) as AdminTerm[]
    const { data: votes } = await supabase.rpc('transcript_term_voters', { p_ids: list.filter(r => r.source === 'teacher').map(r => r.id) })
    const voters = new Map(((votes ?? []) as { term_id: string; voters: number }[]).map(v => [v.term_id, v.voters]))
    setRows(list.map(r => ({ ...r, voters: voters.get(r.id) })))
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const subjects = useMemo(() => [...new Set(['chemistry', 'biology', ...rows.map(r => r.subject)])], [rows])
  const inSubject = rows.filter(r => r.subject === subject)
  const counts = { pending: 0, approved: 0, rejected: 0 }
  for (const r of inSubject) counts[r.status]++
  const needle = query.trim().toLocaleLowerCase('ru')
  const visible = inSubject.filter(r => r.status === status && (!needle || [r.written, r.heard, r.spoken].some(v => v?.toLocaleLowerCase('ru').includes(needle))))

  async function setTermStatus(id: string, next: StatusFilter) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: next } : r))
    const { error } = await supabase.from('transcript_terms').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setError(t('Не удалось сохранить. Попробуйте ещё раз.')); void load() }
  }
  async function remove(id: string) {
    setRows(prev => prev.filter(r => r.id !== id))
    const { error } = await supabase.from('transcript_terms').delete().eq('id', id)
    if (error) { setError(t('Не удалось удалить. Попробуйте ещё раз.')); void load() }
  }
  function startEdit(r: AdminTerm) { setEditing({ id: r.id, written: r.written, heard: r.heard ?? '', spoken: r.spoken ?? '' }) }
  async function saveEdit() {
    if (!editing || busy) return
    const written = editing.written.trim(), heard = editing.heard.trim() || null, spoken = editing.spoken.trim() || null
    if (!written) return
    setBusy(true); setError('')
    const { error } = await supabase.from('transcript_terms').update({ written, heard, spoken, updated_at: new Date().toISOString() }).eq('id', editing.id)
    setBusy(false)
    if (error) { setError(error.code === '23505' ? t('Такая запись уже есть в словаре.') : t('Не удалось сохранить. Попробуйте ещё раз.')); return }
    setRows(prev => prev.map(r => r.id === editing.id ? { ...r, written, heard, spoken } : r))
    setEditing(null)
  }
  async function add() {
    const written = draft.written.trim(), heard = draft.heard.trim(), spoken = draft.spoken.trim()
    if (!written || busy) return
    setBusy(true); setError('')
    const { error } = await supabase.from('transcript_terms').insert({ subject, written, heard: heard || null, spoken: spoken || null, status: 'approved', source: 'admin', hits: 3 })
    setBusy(false)
    if (error) { setError(error.code === '23505' ? t('Такая запись уже есть в словаре.') : t('Не удалось добавить. Попробуйте ещё раз.')); return }
    setDraft({ written: '', heard: '', spoken: '' }); setStatus('approved'); void load()
  }

  return <div>
    <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-3)', maxWidth: 720 }}>
      {t('Термины подсказывают распознаванию, как пишется слово; пары «как распозналось → как правильно» исправляют известные ошибки. Учителя пополняют словарь правками реплик: пара становится общей, когда её внесли 3 учителя или вы её одобрили. «*» в конце — любое окончание слова.')}
    </p>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ width: 200 }}><TeacherSelect search={false} value={subject} onChange={setSubject} options={subjects.map(id => ({ value: id, label: subjectLabel(id) }))} /></div>
      <Segmented variant="filter" value={status} onChange={setStatus} items={([['pending', 'Предложены'], ['approved', 'Общие'], ['rejected', 'Отклонены']] as const).map(([id, label]) => ({ id, label: `${t(label)} · ${counts[id]}` }))} />
      <label style={{ ...FIELD, display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 180px', maxWidth: 280 }}>
        <Search size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Найти в словаре')} aria-label={t('Найти в словаре')} style={{ border: 0, outline: 'none', background: 'transparent', color: 'inherit', font: 'inherit', minWidth: 0, flex: 1 }} />
      </label>
      <button type="button" onClick={() => void load()} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
        <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />{t('Обновить')}
      </button>
    </div>

    <div className="tterms-add">
      <input style={FIELD} value={draft.written} onChange={e => setDraft({ ...draft, written: e.target.value })} placeholder={t('Как пишется: HSO₄⁻')} aria-label={t('Как пишется')} maxLength={80} />
      <input style={FIELD} value={draft.heard} onChange={e => setDraft({ ...draft, heard: e.target.value })} placeholder={t('Как распознаётся (необязательно)')} aria-label={t('Как распознаётся')} maxLength={80} />
      <input style={FIELD} value={draft.spoken} onChange={e => setDraft({ ...draft, spoken: e.target.value })} placeholder={t('Как произносят (необязательно)')} aria-label={t('Как произносят')} maxLength={80} onKeyDown={e => { if (e.key === 'Enter') void add() }} />
      <button type="button" style={btn('M', 'primary')} disabled={!draft.written.trim() || busy} onClick={() => void add()}>{t('Добавить')}</button>
    </div>

    {error && <Alert tone="danger" text={error} style={{ marginBottom: 12 }} />}
    {!loading && !error && visible.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
      <AudioLines size={26} style={{ opacity: .5, display: 'block', margin: '0 auto' }} />
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{t(status === 'pending' ? 'Новых предложений нет' : 'Здесь пока пусто')}</div>
    </div>}

    <div className="tterms-grid">
      {visible.map(r => editing?.id === r.id
        ? <form key={r.id} className="tterms-card is-editing" onSubmit={e => { e.preventDefault(); void saveEdit() }} onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}>
          <input autoFocus style={FIELD} value={editing.written} onChange={e => setEditing({ ...editing, written: e.target.value })} placeholder={t('Как пишется')} aria-label={t('Как пишется')} maxLength={80} />
          <input style={FIELD} value={editing.heard} onChange={e => setEditing({ ...editing, heard: e.target.value })} placeholder={t('Как распознаётся (необязательно)')} aria-label={t('Как распознаётся')} maxLength={80} />
          <input style={FIELD} value={editing.spoken} onChange={e => setEditing({ ...editing, spoken: e.target.value })} placeholder={t('Как произносят (необязательно)')} aria-label={t('Как произносят')} maxLength={80} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" style={btn('S', 'quiet')} onClick={() => setEditing(null)}>{t('Отмена')}</button>
            <button type="submit" style={btn('S', 'primary')} disabled={!editing.written.trim() || busy}>{t('Сохранить')}</button>
          </div>
        </form>
        : <div key={r.id} className="tterms-card" role="button" tabIndex={0} title={t('Нажмите, чтобы изменить')}
          onClick={() => startEdit(r)} onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) startEdit(r) }}>
          {r.heard
            ? <div className="tterms-word tterms-pair"><FadeText className="tterms-heard">{r.heard}</FadeText><ArrowRight size={12} aria-label={t('исправляется на')} className="tterms-arrow" /><FadeText>{r.written}</FadeText></div>
            : <FadeText className="tterms-word">{r.written}</FadeText>}
          <FadeText className="tterms-meta">{[r.spoken && `${t('произносят')}: ${r.spoken}`, r.source === 'seed' ? null : r.source === 'admin' ? t('из админки') : `${t('учителей')}: ${r.voters ?? 1}`, `${t('встречалось')}: ${r.hits}`].filter(Boolean).join(' · ')}</FadeText>
          <div className="tterms-actions" onClick={e => e.stopPropagation()}>
            {r.status !== 'approved' && <button type="button" aria-label={t('Одобрить')} title={t('Одобрить')} onClick={() => void setTermStatus(r.id, 'approved')}><Check size={14} /></button>}
            {r.status !== 'rejected' && <button type="button" aria-label={t('Отклонить')} title={t('Отклонить')} onClick={() => void setTermStatus(r.id, 'rejected')}><X size={14} /></button>}
            <button type="button" className="is-danger" aria-label={t('Удалить из словаря')} title={t('Удалить из словаря')} onClick={() => void remove(r.id)}><Trash2 size={14} /></button>
          </div>
        </div>)}
    </div>
  </div>
}
