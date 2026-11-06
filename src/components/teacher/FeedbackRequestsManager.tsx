import { useEffect, useState } from 'react'
import Segmented from '../Segmented'
import PhotoGallery from '../PhotoGallery'
import { Inbox, GraduationCap, User, RefreshCw, MessageCircle, Layers, FileText } from '../icons/appIcons'
import { supabase } from '../../lib/supabase'
import type { FeedbackRequest, FeedbackStatus } from '../../lib/feedbackRequests'
import { useT } from '../../lib/i18n'
import TgDialogs from './TgDialogs'
import AssignPlanButton from './AssignPlanButton'
import { fetchTeacherUsage, type TeacherUsageRow } from '../../lib/plan'
import HScrollFade from '../HScrollFade'
import FadeText from '../FadeText'
import FeedbackTopics, { KindChip } from './FeedbackTopics'
import FeedbackDigestView from './FeedbackDigestView'
import {
  fetchTriage, fetchDigests, fetchTriageEnabled, runTriage,
  type FeedbackItem, type FeedbackTopic, type FeedbackDigest,
} from '../../lib/feedbackTriage'

// Вкладка «Заявки» в Админке: список обратной связи от учеников и учителей.
// data-URL картинки нельзя открыть через window.open → показываем в оверлее.

const STATUS_META: Record<FeedbackStatus, { label: string; bg: string; color: string }> = {
  new:         { label: 'Новая',      bg: 'var(--color-purple-soft)', color: 'var(--color-purple)' },
  in_progress: { label: 'В работе',   bg: 'rgba(75,142,241,0.14)',    color: '#4B8EF1' },
  done:        { label: 'Решена',     bg: 'var(--color-green-soft)',  color: 'var(--color-green-text)' },
}

const STATUS_ORDER: FeedbackStatus[] = ['new', 'in_progress', 'done']

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export default function FeedbackRequestsManager() {
  const t = useT()
  const [rows, setRows] = useState<FeedbackRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all')
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  // Учителя с тарифом и почтой: по ним заявка с лендинга находит аккаунт
  // (у неё нет author_id, только contact), а кнопка тарифа знает текущий.
  const [teachers, setTeachers] = useState<TeacherUsageRow[]>([])
  const [view, setView] = useState<'requests' | 'topics' | 'digest' | 'dialogs'>(() => {
    // Быстрый переход из меню профиля «Диалоги» кладёт сюда флаг.
    const v = sessionStorage.getItem('feedback_view')
    if (v) sessionStorage.removeItem('feedback_view')
    return v === 'dialogs' ? 'dialogs' : 'requests'
  })
  // Сортировка: обращения из формы и Telegram, темы и недельные сводки.
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [topics, setTopics] = useState<FeedbackTopic[]>([])
  const [triageOn, setTriageOn] = useState(false)
  const [focusTopic, setFocusTopic] = useState<string | null>(null)
  const [digests, setDigests] = useState<FeedbackDigest[]>([])
  const [digestIdx, setDigestIdx] = useState(0)
  const [busy, setBusy] = useState<'classify' | 'digest' | null>(null)
  const [runErr, setRunErr] = useState<string | null>(null)

  async function loadTriage() {
    const [tr, on] = await Promise.all([fetchTriage(), fetchTriageEnabled()])
    setItems(tr.items); setTopics(tr.topics); setTriageOn(on)
  }

  async function load() {
    setLoading(true)
    const [{ data }] = await Promise.all([
      supabase.from('feedback_requests').select('*').order('created_at', { ascending: false }),
      loadTriage(),
    ])
    setRows((data as FeedbackRequest[] | null) ?? [])
    setTeachers(await fetchTeacherUsage())
    setLoading(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (view !== 'digest') return
    let alive = true
    void fetchDigests().then(d => { if (alive) { setDigests(d); setDigestIdx(0) } })
    return () => { alive = false }
  }, [view])

  async function run(mode: 'classify' | 'digest') {
    setBusy(mode); setRunErr(null)
    const r = await runTriage(mode)
    if (r.error) setRunErr(r.error)
    if (mode === 'digest') { setDigests(await fetchDigests()); setDigestIdx(0) }
    else await loadTriage()
    setBusy(null)
  }

  const itemByRequest = new Map(items.filter(i => i.feedback_id).map(i => [i.feedback_id as string, i]))
  const topicTitle = new Map(topics.map(x => [x.id, x.title]))
  const pendingCount = items.filter(i => i.triage_state === 'pending').length

  async function setStatus(id: string, status: FeedbackStatus) {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))
    await supabase.from('feedback_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  }

  const visible = rows.filter(r => filter === 'all' || r.status === filter)
  const counts = {
    all: rows.length,
    new: rows.filter(r => r.status === 'new').length,
    in_progress: rows.filter(r => r.status === 'in_progress').length,
    done: rows.filter(r => r.status === 'done').length,
  }

  return (
    <div>
      {/* Верхний переключатель: разовые заявки ↔ диалоги из Telegram-бота */}
      <HScrollFade gap={0} style={{ marginBottom: 18 }}>
        <Segmented
          variant="mode" value={view} onChange={v => { setView(v); setRunErr(null); if (v !== 'topics') setFocusTopic(null) }}
          items={[
            { id: 'requests', label: t('Заявки'), icon: Inbox },
            { id: 'topics', label: t('Темы'), icon: Layers, count: pendingCount || undefined },
            { id: 'digest', label: t('Сводка недели'), icon: FileText },
            { id: 'dialogs', label: t('Диалоги'), icon: MessageCircle },
          ]}
        />
      </HScrollFade>

      {view === 'dialogs' && <TgDialogs />}

      {view === 'topics' && (
        <>
          {runErr && <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--color-red-text)' }}>{runErr}</div>}
          <FeedbackTopics
            key={focusTopic ?? 'all'}
            items={items} topics={topics} enabled={triageOn} busy={busy === 'classify'}
            onRun={() => void run('classify')} onChanged={loadTriage} focusTopic={focusTopic}
          />
        </>
      )}

      {view === 'digest' && (
        <FeedbackDigestView
          digests={digests} idx={digestIdx} setIdx={setDigestIdx} enabled={triageOn}
          busy={busy === 'digest'} error={runErr} onRun={() => void run('digest')}
        />
      )}

      {view === 'requests' && (
      <>
      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Segmented
          variant="filter" value={filter} onChange={setFilter}
          items={(['all', ...STATUS_ORDER] as const).map(key => ({ id: key, label: `${key === 'all' ? t('Все') : t(STATUS_META[key].label)} · ${counts[key]}` }))}
        />
        <button data-hover="layer" onClick={load} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
          <RefreshCw size={14} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {t('Обновить')}
        </button>
      </div>

      {visible.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
          <Inbox size={28} strokeWidth={1.5} style={{ opacity: 0.5, display: 'block', margin: '0 auto' }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>{t('Заявок пока нет')}</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map(r => {
          const sm = STATUS_META[r.status]
          const RoleIcon = r.author_role === 'teacher' ? GraduationCap : r.author_role === 'lead' ? Inbox : User
          const roleLabel = r.author_role === 'teacher' ? t('учитель') : r.author_role === 'lead' ? t('заявка с лендинга') : t('ученик')
          const contact = r.contact?.trim().toLowerCase()
          const account = r.author_role === 'teacher'
            ? teachers.find(x => x.teacher_id === r.author_id)
            : r.author_role === 'lead' && contact
              ? teachers.find(x => x.email?.toLowerCase() === contact)
              : undefined
          const planTeacherId = r.author_role === 'teacher' ? r.author_id : account?.teacher_id
          return (
            <div key={r.id} style={{ borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RoleIcon size={15} style={{ color: 'var(--color-text-2)' }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                    {r.author_name || (r.author_role === 'teacher' ? t('Учитель') : r.author_role === 'lead' ? t('Заявка') : t('Ученик'))}
                    <span style={{ fontWeight: 500, color: 'var(--color-text-3)' }}> · {roleLabel}</span>
                  </div>
                  {r.contact && (
                    <div style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 2, fontWeight: 600 }}>{r.contact}</div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                    {r.section ? `${r.section} · ` : ''}{fmtDate(r.created_at)}
                  </div>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12, fontWeight: 700, background: sm.bg, color: sm.color, flexShrink: 0 }}>{t(sm.label)}</span>
              </div>

              <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.message}</div>

              {(() => {
                // Тип и тема из сортировки; заявки с лендинга её не проходят.
                const it = itemByRequest.get(r.id)
                if (!it) return null
                const title = it.topic_id ? topicTitle.get(it.topic_id) : null
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, minWidth: 0, fontSize: 12, color: 'var(--color-text-3)' }}>
                    {it.triage_state === 'pending' && !it.kind
                      ? <span>{t('Ждёт разбора')}</span>
                      : <KindChip kind={it.kind} />}
                    {it.screen && <span style={{ flexShrink: 0, fontWeight: 600, color: 'var(--color-text-2)' }}>{t(it.screen)}</span>}
                    {title && (
                      <button type="button" data-hover="link"
                        onClick={() => { setFocusTopic(it.topic_id); setView('topics') }}
                        style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, color: 'var(--color-purple-text)', fontWeight: 600 }}>
                        <Layers size={13} style={{ flexShrink: 0 }} />
                        <FadeText>{title}</FadeText>
                      </button>
                    )}
                  </div>
                )
              })()}

              {r.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {r.attachments.map((src, i) => (
                    <button data-hover="layer" key={i} aria-label={`${t('Открыть фото')} ${i + 1}`} onClick={() => setLightbox({ photos: r.attachments, index: i })} style={{ width: 64, height: 64, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--color-border)', cursor: 'pointer', padding: 0, background: 'none' }}>
                      <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {STATUS_ORDER.map(s => (
                  <button data-hover="layer" key={s} onClick={() => setStatus(r.id, s)} disabled={r.status === s}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: r.status === s ? 'default' : 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: r.status === s ? STATUS_META[s].bg : 'transparent',
                      color: r.status === s ? STATUS_META[s].color : 'var(--color-text-3)',
                      opacity: r.status === s ? 1 : 0.85,
                    }}>
                    {t(STATUS_META[s].label)}
                  </button>
                ))}
                {/* Заявка от учителя или с лендинга от того, у кого уже есть аккаунт
                    (совпала почта) → назначить тариф прямо тут */}
                {planTeacherId ? (
                  <div style={{ marginLeft: 'auto' }}>
                    <AssignPlanButton teacherId={planTeacherId}
                      currentCode={account?.plan_code} expiresAt={account?.expires_at}
                      onChanged={(code, expiresAt) => {
                        setTeachers(prev => prev.map(x => x.teacher_id === planTeacherId ? { ...x, plan_code: code, expires_at: expiresAt } : x))
                        setStatus(r.id, 'done')
                      }} size="sm" />
                  </div>
                ) : r.author_role === 'lead' && !loading && (
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-3)' }}>{t('Аккаунта с этой почтой нет')}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {lightbox && <PhotoGallery photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}
      </>
      )}
    </div>
  )
}
