import { useMemo, useState } from 'react'
import Segmented from '../Segmented'
import HScrollFade from '../HScrollFade'
import FadeText from '../FadeText'
import TeacherSelect from './TeacherSelect'
import { Alert } from '../Alert'
import { ChevronDown, FileText, Send, Pencil, Sparkles, RefreshCw, Inbox } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { textFadeLines } from '../../lib/textFades'
import {
  FEEDBACK_KINDS, KIND_META, TRIAGE_SCREENS,
  classifyItem, moveItem, updateTopic, mergeTopics, retriageItem,
  type FeedbackItem, type FeedbackKind, type FeedbackTopic,
} from '../../lib/feedbackTriage'

// Вкладка «Заявки → Темы»: обращения из формы и Telegram, склеенные в темы
// со счётчиком. Фильтры по типу и экрану. Тип, экран и тему можно поправить
// руками — правка помечается как ручная, и модель её больше не трогает.

const WEEK = 7 * 864e5

/** Ручные правки. Стенд подменяет их локальными, кабинет зовёт RPC. */
export type TriageActions = {
  classifyItem: typeof classifyItem
  moveItem: typeof moveItem
  updateTopic: typeof updateTopic
  mergeTopics: typeof mergeTopics
  retriageItem: typeof retriageItem
}
const RPC_ACTIONS: TriageActions = { classifyItem, moveItem, updateTopic, mergeTopics, retriageItem }
type Act = (p: Promise<string | null | { error: string | null }>) => Promise<void>
const NO_TOPIC = '__none__'

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) } catch { return iso }
}

export function KindChip({ kind }: { kind: FeedbackKind | null }) {
  const t = useT()
  if (!kind) {
    return <span style={chip('var(--color-bg-3)', 'var(--color-text-3)')}>{t('Без типа')}</span>
  }
  const m = KIND_META[kind]
  return <span style={chip(m.bg, m.color)}>{t(m.label)}</span>
}

const chip = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 7,
  fontSize: 12, fontWeight: 700, background: bg, color, flexShrink: 0, whiteSpace: 'nowrap',
})

// На телефоне кнопки не ниже 44 px (MOBILE-01), на ПК — плотнее.
const ghost = (mobile: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: mobile ? 44 : 32, padding: '6px 12px', borderRadius: 9,
  border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-2)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
})

export default function FeedbackTopics({
  items, topics, enabled, busy, onRun, onChanged, focusTopic, actions = RPC_ACTIONS,
}: {
  actions?: TriageActions
  items: FeedbackItem[]
  topics: FeedbackTopic[]
  /** Подняты ли рубильники ai_enabled + ai_feedback_triage. */
  enabled: boolean
  busy: boolean
  onRun: () => void
  /** Перечитать данные после ручной правки. */
  onChanged: () => Promise<void> | void
  focusTopic?: string | null
}) {
  const t = useT()
  const mobile = !useIsDesktop()
  const [kind, setKind] = useState<FeedbackKind | 'all'>('all')
  const [screen, setScreen] = useState('')
  const [closed, setClosed] = useState<'open' | 'closed'>('open')
  const [open, setOpen] = useState<Set<string>>(() => new Set(focusTopic ? [focusTopic] : []))
  const [err, setErr] = useState<string | null>(null)

  const byTopic = useMemo(() => {
    const m = new Map<string, FeedbackItem[]>()
    for (const it of items) {
      const k = it.topic_id ?? NO_TOPIC
      m.set(k, [...(m.get(k) ?? []), it])
    }
    return m
  }, [items])

  const now = Date.now()
  const groups = topics
    .filter(tp => tp.status === closed)
    .map(tp => {
      const own = byTopic.get(tp.id) ?? []
      return { tp, own, week: own.filter(i => now - new Date(i.last_at).getTime() < WEEK).length, last: own[0]?.last_at ?? tp.updated_at }
    })
    .filter(g => g.own.length > 0)
  const kindCount = (k: FeedbackKind) => groups.filter(g => g.tp.kind === k).length
  const shown = groups
    .filter(g => (kind === 'all' || g.tp.kind === kind) && (!screen || g.tp.screen === screen))
    .sort((a, b) => b.week - a.week || b.own.length - a.own.length || b.last.localeCompare(a.last))

  const loose = (byTopic.get(NO_TOPIC) ?? [])
    .filter(i => closed === 'open' && (kind === 'all' || i.kind === kind) && (!screen || i.screen === screen))
  const pending = items.filter(i => i.triage_state === 'pending').length

  const screensInUse = [...new Set([...topics.map(x => x.screen), ...items.map(i => i.screen).filter(Boolean) as string[]])]
  const screenOptions = TRIAGE_SCREENS.filter(s => screensInUse.includes(s)).map(s => ({ value: s, label: t(s) }))

  const toggle = (id: string) => setOpen(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n
  })

  async function act(p: Promise<string | null | { error: string | null }>) {
    setErr(null)
    const r = await p
    const e = typeof r === 'string' || r === null ? r : r.error
    if (e) setErr(e)
    await onChanged()
  }

  const kindItems = [
    { id: 'all' as const, label: t('Все'), count: groups.length },
    ...FEEDBACK_KINDS.map(k => ({ id: k, label: t(KIND_META[k].plural), count: kindCount(k) })),
  ]

  return (
    <div>
      <HScrollFade gap={0} style={{ marginBottom: 10 }}>
        <Segmented variant="filter" value={kind} onChange={setKind} items={kindItems} />
      </HScrollFade>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 200, maxWidth: '100%' }}>
          <TeacherSelect value={screen} onChange={setScreen} options={screenOptions} placeholder={t('Все экраны')} small />
        </div>
        <Segmented variant="filter" value={closed} onChange={setClosed}
          items={[{ id: 'open', label: t('Открытые') }, { id: 'closed', label: t('Закрытые') }]} />
        {enabled && pending > 0 && (
          <button type="button" data-hover="layer" onClick={onRun} disabled={busy} style={{ ...ghost(mobile), marginLeft: 'auto', opacity: busy ? 0.6 : 1 }}>
            {busy
              ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Sparkles size={14} />}
            {busy ? t('Разбираем…') : `${t('Разобрать новые')} · ${pending}`}
          </button>
        )}
      </div>

      {!enabled && pending > 0 && (
        <Alert tone="info" style={{ marginBottom: 14 }}
          title={`${t('Ждут разбора')}: ${pending}`}
          text={t('Сортировка моделью выключена. Тип и тему можно поставить вручную в карточке обращения.')} />
      )}
      {err && <Alert tone="danger" style={{ marginBottom: 14 }} title={t('Не сохранилось')} text={err} />}

      {shown.length === 0 && loose.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-3)' }}>
          <Inbox size={28} strokeWidth={1.5} style={{ opacity: 0.5, display: 'block', margin: '0 auto' }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 10 }}>
            {items.length === 0 ? t('Обращений пока нет') : t('Под фильтр ничего не подходит')}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loose.length > 0 && (
          <TopicCard
            id={NO_TOPIC} title={t('Без темы')} count={loose.length} week={loose.filter(i => now - new Date(i.last_at).getTime() < WEEK).length}
            last={loose[0].last_at} expanded={open.has(NO_TOPIC)} onToggle={() => toggle(NO_TOPIC)}
          >
            {loose.map(it => <ItemRow key={it.id} it={it} topics={topics} enabled={enabled} act={act} api={actions} />)}
          </TopicCard>
        )}

        {shown.map(g => (
          <TopicCard
            key={g.tp.id} id={g.tp.id} title={g.tp.title} topic={g.tp} count={g.own.length} week={g.week}
            last={g.last} expanded={open.has(g.tp.id)} onToggle={() => toggle(g.tp.id)}
          >
            <TopicEditor tp={g.tp} topics={topics} act={act} api={actions} />
            {g.own.map(it => <ItemRow key={it.id} it={it} topics={topics} enabled={enabled} act={act} api={actions} />)}
          </TopicCard>
        ))}
      </div>
    </div>
  )
}

function TopicCard({ id, title, topic, count, week, last, expanded, onToggle, children }: {
  id: string; title: string; topic?: FeedbackTopic; count: number; week: number; last: string
  expanded: boolean; onToggle: () => void; children: React.ReactNode
}) {
  const t = useT()
  return (
    <div data-topic={id} style={{ borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', overflow: 'hidden' }}>
      <button type="button" data-hover="card" onClick={onToggle} aria-expanded={expanded}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}>
        <div style={{ minWidth: 44, height: 44, padding: '0 6px', boxSizing: 'border-box', borderRadius: 12, background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)', flexShrink: 0 }}
          aria-label={`${t('Обращений')}: ${count}`}>
          {count}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <FadeText lines={2} style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>{title}</FadeText>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-3)' }}>
            {topic && <KindChip kind={topic.kind} />}
            {topic && <span style={{ color: 'var(--color-text-2)', fontWeight: 600 }}>{t(topic.screen)}</span>}
            {week > 0 && <span>{`+${week} ${t('за неделю')}`}</span>}
            <span>{fmtDate(last)}</span>
          </div>
        </div>
        <ChevronDown size={16} style={{ color: 'var(--color-text-3)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '4px 14px 12px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function TopicEditor({ tp, topics, act, api }: {
  tp: FeedbackTopic; topics: FeedbackTopic[]; act: Act; api: TriageActions
}) {
  const t = useT()
  const mobile = !useIsDesktop()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(tp.title)

  const save = () => {
    setEditing(false)
    const v = draft.trim()
    if (v && v !== tp.title) void act(api.updateTopic(tp.id, { title: v }))
    else setDraft(tp.title)
  }

  return (
    <div style={{ padding: '10px 0 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {editing ? (
        <input autoFocus value={draft} maxLength={200} aria-label={t('Название темы')}
          onChange={e => setDraft(e.target.value)} onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(tp.title); setEditing(false) } }}
          style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'inherit', background: 'transparent', border: 'none', borderBottom: '1.5px solid var(--color-accent)', borderRadius: 0, padding: 0, outline: 'none', width: '100%' }} />
      ) : (
        <button type="button" data-hover="link" onClick={() => { setDraft(tp.title); setEditing(true) }}
          style={{ ...ghost(mobile), border: 'none', padding: 0, minHeight: mobile ? 44 : 24, alignSelf: 'flex-start', color: 'var(--color-text-3)' }}>
          <Pencil size={13} /> {t('Переименовать тему')}
        </button>
      )}
      {tp.summary && <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.4 }}>{tp.summary}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Field label={t('Тип темы')}>
          <TeacherSelect small clearable={false} search={false} value={tp.kind}
            options={FEEDBACK_KINDS.map(k => ({ value: k, label: t(KIND_META[k].label) }))}
            onChange={v => { if (v) void act(api.updateTopic(tp.id, { kind: v as FeedbackKind })) }} />
        </Field>
        <Field label={t('Экран')}>
          <TeacherSelect small clearable={false} value={tp.screen}
            options={TRIAGE_SCREENS.map(s => ({ value: s, label: t(s) }))}
            onChange={v => { if (v) void act(api.updateTopic(tp.id, { screen: v })) }} />
        </Field>
        <Field label={t('Склеить с темой')}>
          <TeacherSelect small value="" placeholder={t('Выбрать…')}
            options={topics.filter(x => x.id !== tp.id && x.status === 'open').map(x => ({ value: x.id, label: x.title }))}
            onChange={v => { if (v) void act(api.mergeTopics(tp.id, v)) }} />
        </Field>
        <button type="button" data-hover="layer" style={{ ...ghost(mobile), alignSelf: 'flex-end' }}
          onClick={() => void act(api.updateTopic(tp.id, { status: tp.status === 'open' ? 'closed' : 'open' }))}>
          {tp.status === 'open' ? t('Закрыть тему') : t('Открыть снова')}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 150px', minWidth: 0, maxWidth: 260 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)' }}>{label}</span>
      {children}
    </div>
  )
}

function ItemRow({ it, topics, enabled, act, api }: {
  it: FeedbackItem; topics: FeedbackTopic[]; enabled: boolean; act: Act; api: TriageActions
}) {
  const t = useT()
  const mobile = !useIsDesktop()
  const SourceIcon = it.source === 'telegram' ? Send : FileText
  const manual = it.kind_by === 'admin' || it.topic_by === 'admin'
  return (
    <div data-item={it.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6, minWidth: 0 }}>
        <SourceIcon size={14} style={{ flexShrink: 0 }} aria-label={it.source === 'telegram' ? 'Telegram' : t('Форма')} />
        <FadeText style={{ fontWeight: 700, color: 'var(--color-text-2)', flex: '0 1 auto' }}>{it.author_label ?? '—'}</FadeText>
        <span style={{ flexShrink: 0 }}>{fmtDate(it.created_at)}</span>
        {it.section && <FadeText style={{ flex: '0 1 auto' }}>{`· ${it.section}`}</FadeText>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
          {it.triage_state === 'pending' && <span style={chip('var(--color-bg-3)', 'var(--color-text-3)')}>{t('Ждёт разбора')}</span>}
          {it.triage_state === 'failed' && <span style={chip('var(--color-red-soft)', 'var(--color-red-text)')}>{t('Не разобрано')}</span>}
          {manual && <span style={chip('var(--color-bg-3)', 'var(--color-text-2)')}>{t('Вручную')}</span>}
        </span>
      </div>
      {/* Переносы строк в обращении — смысловые («вот скрин», «на телефоне»),
          поэтому pre-wrap ставится ПОСЛЕ textFadeLines, который задаёт normal. */}
      <div data-text-fade={6} style={{ ...textFadeLines(6), whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--color-text)', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
        {it.body}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'flex-end' }}>
        <Field label={t('Тип')}>
          <TeacherSelect small clearable={false} search={false} value={it.kind ?? ''} placeholder={t('Без типа')}
            options={FEEDBACK_KINDS.map(k => ({ value: k, label: t(KIND_META[k].label) }))}
            onChange={v => { if (v) void act(api.classifyItem(it.id, v as FeedbackKind, null)) }} />
        </Field>
        <Field label={t('Экран')}>
          <TeacherSelect small clearable={false} value={it.screen ?? ''} placeholder={t('Не указан')}
            options={TRIAGE_SCREENS.map(s => ({ value: s, label: t(s) }))}
            onChange={v => { if (v) void act(api.classifyItem(it.id, null, v)) }} />
        </Field>
        <Field label={t('Тема')}>
          <TeacherSelect small value={it.topic_id ?? ''} placeholder={t('Без темы')}
            options={topics.filter(x => x.status === 'open' || x.id === it.topic_id).map(x => ({ value: x.id, label: x.title }))}
            // После «Добавить» TeacherSelect зовёт ещё и onChange(название) —
            // тему создаёт onAddOption, а здесь принимаем только известный id.
            onChange={v => { if (!v || topics.some(x => x.id === v)) void act(api.moveItem(it.id, v || null)) }}
            onAddOption={label => void act(api.moveItem(it.id, null, label))} />
        </Field>
        {enabled && (it.triage_state !== 'pending') && (
          <button type="button" data-hover="layer" style={ghost(mobile)} onClick={() => void act(api.retriageItem(it.id))}>
            <RefreshCw size={13} /> {t('Разобрать заново')}
          </button>
        )}
      </div>
      {it.triage_state === 'failed' && it.triage_error && (
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 6 }}>{it.triage_error}</div>
      )}
    </div>
  )
}
