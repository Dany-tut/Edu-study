import { useState } from 'react'
import Segmented from '../../Segmented'
import Switch from '../../Switch'
import FeedbackTopics, { type TriageActions } from '../FeedbackTopics'
import FeedbackDigestView from '../FeedbackDigestView'
import { useTheme } from '../../../store/themeStore'
import { FIXTURE_DIGESTS, FIXTURE_ITEMS, FIXTURE_TOPICS } from './fixture'
import type { FeedbackItem, FeedbackTopic } from '../../../lib/feedbackTriage'

// DEV-стенд /feedback-triage-stand: вкладки «Темы» и «Сводка недели» на
// различимых данных, без входа админа. Правки идут в память — RPC и модель не
// зовутся. Полный путь с сервером проверяется отдельно, в кабинете.

export default function FeedbackTriageStand() {
  const { dark, toggle } = useTheme()
  const [view, setView] = useState<'topics' | 'digest'>('topics')
  const [items, setItems] = useState<FeedbackItem[]>(FIXTURE_ITEMS)
  const [topics, setTopics] = useState<FeedbackTopic[]>(FIXTURE_TOPICS)
  const [enabled, setEnabled] = useState(true)
  const [empty, setEmpty] = useState(false)
  const [fail, setFail] = useState(false)
  const [busy, setBusy] = useState(false)
  const [digestIdx, setDigestIdx] = useState(0)
  const [digestErr, setDigestErr] = useState<string | null>(null)

  const patchItem = (id: string, p: Partial<FeedbackItem>) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...p } : i))
  const ok = async () => (fail ? 'Сервер ответил 500 (стенд)' : null)

  const actions: TriageActions = {
    classifyItem: async (id, kind, screen) => {
      if (!fail) patchItem(id, { ...(kind ? { kind } : {}), ...(screen ? { screen } : {}), kind_by: 'admin', triage_state: 'done' })
      return ok()
    },
    moveItem: async (id, topic, title) => {
      if (fail) return { topicId: null, error: await ok() }
      let tid = topic
      if (!tid && title) {
        tid = `new-${Date.now()}`
        const it = items.find(i => i.id === id)
        setTopics(prev => [{ id: tid!, kind: it?.kind ?? 'bug', screen: it?.screen ?? 'Другое', title, summary: null, status: 'open', source: 'admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev])
      }
      patchItem(id, { topic_id: tid, topic_by: 'admin', triage_state: 'done' })
      return { topicId: tid, error: null }
    },
    updateTopic: async (id, p) => {
      if (!fail) setTopics(prev => prev.map(x => x.id === id ? { ...x, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v != null)), source: 'admin' } : x))
      return ok()
    },
    mergeTopics: async (from, into) => {
      if (!fail) {
        setItems(prev => prev.map(i => i.topic_id === from ? { ...i, topic_id: into, topic_by: 'admin' } : i))
        setTopics(prev => prev.filter(x => x.id !== from))
      }
      return ok()
    },
    retriageItem: async id => {
      if (!fail) patchItem(id, { triage_state: 'pending', kind_by: null, topic_by: null })
      return ok()
    },
  }

  const run = () => {
    setBusy(true)
    setTimeout(() => {
      setItems(prev => prev.map(i => i.triage_state === 'pending' ? { ...i, triage_state: 'done', kind: 'question', screen: 'Тариф', kind_by: 'model' } : i))
      setBusy(false)
    }, 900)
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: '20px 16px 60px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: 18, fontSize: 13, color: 'var(--color-text-2)' }}>
          <strong style={{ color: 'var(--color-text)' }}>Стенд: сортировка обратной связи</strong>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Тёмная<Switch size="S" checked={dark} onChange={toggle} label="Тёмная тема" /></label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Флаг ИИ<Switch size="S" checked={enabled} onChange={setEnabled} label="Флаг ИИ" /></label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Пусто<Switch size="S" checked={empty} onChange={setEmpty} label="Пусто" /></label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Ошибка сервера<Switch size="S" checked={fail} onChange={setFail} label="Ошибка сервера" /></label>
        </div>
        <Segmented variant="mode" value={view} onChange={setView} style={{ marginBottom: 18 }}
          items={[{ id: 'topics', label: 'Темы' }, { id: 'digest', label: 'Сводка недели' }]} />
        {view === 'topics' ? (
          <FeedbackTopics items={empty ? [] : items} topics={empty ? [] : topics} enabled={enabled} busy={busy}
            onRun={run} onChanged={() => {}} actions={actions} />
        ) : (
          <FeedbackDigestView digests={empty ? [] : FIXTURE_DIGESTS} idx={digestIdx} setIdx={setDigestIdx} enabled={enabled}
            busy={busy} error={digestErr} onRun={() => { setBusy(true); setTimeout(() => { setBusy(false); setDigestErr(fail ? 'шлюз ИИ: no_available_account (стенд)' : null) }, 900) }} />
        )}
      </div>
    </div>
  )
}
