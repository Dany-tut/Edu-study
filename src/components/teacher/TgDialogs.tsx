import { useEffect, useRef, useState } from 'react'
import { Send, MessageCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import {
  fetchThreads, fetchMessages, sendReply, setThreadStatus, markThreadSeen,
  threadName, isUnread, type TgThread, type TgMessage, type TgStatus,
} from '../../lib/tgChat'

const STATUS_META: Record<TgStatus, { label: string; bg: string; color: string }> = {
  new:         { label: 'Новый',    bg: 'var(--color-purple-soft)', color: 'var(--color-purple)' },
  in_progress: { label: 'В работе', bg: 'rgba(75,142,241,0.14)',    color: '#4B8EF1' },
  done:        { label: 'Закрыт',   bg: 'var(--color-green-soft)',  color: 'var(--color-green-text)' },
}

function fmtTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtWhen(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function TgDialogs() {
  const t = useT()
  const [threads, setThreads] = useState<TgThread[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)

  async function loadThreads() {
    setLoading(true)
    setThreads(await fetchThreads())
    setLoading(false)
  }

  useEffect(() => { loadThreads() }, [])

  // Realtime: любое изменение тредов (новое входящее меняет last_message_at) — перезагружаем список.
  useEffect(() => {
    const ch = supabase.channel('tg-threads-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tg_threads' }, () => loadThreads())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const active = threads.find(th => th.id === activeId) ?? null

  return (
    <div style={{ display: 'flex', gap: 14, height: 'min(620px, 70vh)', minHeight: 380 }}>
      {/* ── Список тредов ── */}
      <div style={{
        width: active ? 300 : '100%', flexShrink: 0, display: active ? undefined : 'block',
        borderRight: active ? '1px solid var(--color-border)' : 'none', paddingRight: active ? 14 : 0,
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {t('Диалоги')} · {threads.length}
          </div>
          <button onClick={loadThreads} title={t('Обновить')} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>

        {threads.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-3)' }}>
            <MessageCircle size={28} strokeWidth={1.6} style={{ opacity: 0.5, display: 'block', margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t('Пока никто не писал боту')}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {threads.map(th => {
            const unread = isUnread(th)
            const sel = th.id === activeId
            const sm = STATUS_META[th.status]
            return (
              <button key={th.id} onClick={() => setActiveId(th.id)} style={{
                textAlign: 'left', padding: '11px 12px', borderRadius: 12, cursor: 'pointer', width: '100%',
                border: `1px solid ${sel ? 'var(--color-purple)' : 'var(--color-border)'}`,
                background: sel ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unread && <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--color-purple)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{threadName(th)}</span>
                  <span style={{ marginLeft: 'auto', flexShrink: 0, padding: '2px 7px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, background: sm.bg, color: sm.color }}>{t(sm.label)}</span>
                </div>
                <div style={{ fontSize: 12, color: unread ? 'var(--color-text-2)' : 'var(--color-text-3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread ? 600 : 400 }}>
                  {th.last_message_text ?? '—'}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2 }}>{fmtWhen(th.last_message_at)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Переписка ── */}
      {active && (
        <Conversation
          key={active.id}
          thread={active}
          onBack={() => setActiveId(null)}
          onStatus={async (s) => { await setThreadStatus(active.id, s); loadThreads() }}
        />
      )}
    </div>
  )
}

function Conversation({ thread, onBack, onStatus }: {
  thread: TgThread
  onBack: () => void
  onStatus: (s: TgStatus) => void
}) {
  const t = useT()
  const [msgs, setMsgs] = useState<TgMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const scrollDown = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  async function load() {
    setMsgs(await fetchMessages(thread.id))
    markThreadSeen(thread.id)
    setTimeout(scrollDown, 30)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [thread.id])

  // Realtime: новые сообщения этого треда.
  useEffect(() => {
    const ch = supabase.channel(`tg-msgs-${thread.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tg_messages', filter: `thread_id=eq.${thread.id}` },
        (payload) => {
          setMsgs(prev => prev.some(m => m.id === (payload.new as TgMessage).id) ? prev : [...prev, payload.new as TgMessage])
          setTimeout(scrollDown, 30)
          markThreadSeen(thread.id)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [thread.id])

  async function send() {
    const body = text.trim()
    if (!body || sending) return
    setSending(true); setErr('')
    const { error } = await sendReply(thread.id, body)
    setSending(false)
    if (error) { setErr(t('Не удалось отправить')); return }
    setText('')
    // realtime вставит 'out'-сообщение; на всякий случай подгрузим
    load()
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex', padding: 4 }}><ArrowLeft size={18} /></button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>{threadName(thread)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>
            {thread.username ? `@${thread.username} · ` : ''}chat {thread.chat_id}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {(['new', 'in_progress', 'done'] as TgStatus[]).map(s => {
            const on = thread.status === s
            const sm = STATUS_META[s]
            return (
              <button key={s} onClick={() => onStatus(s)} disabled={on} style={{
                padding: '4px 10px', borderRadius: 8, border: '1px solid var(--color-border)', cursor: on ? 'default' : 'pointer',
                fontSize: 11.5, fontWeight: 600,
                background: on ? sm.bg : 'transparent', color: on ? sm.color : 'var(--color-text-3)',
              }}>{t(sm.label)}</button>
            )
          })}
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map(m => {
          const out = m.direction === 'out'
          return (
            <div key={m.id} style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              <div style={{
                padding: '9px 13px', borderRadius: 14, fontSize: 14, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: out ? 'var(--color-purple)' : 'var(--color-bg-3)',
                color: out ? '#fff' : 'var(--color-text)',
                borderBottomRightRadius: out ? 4 : 14, borderBottomLeftRadius: out ? 14 : 4,
              }}>{m.text}</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 3, textAlign: out ? 'right' : 'left' }}>{fmtTime(m.created_at)}</div>
            </div>
          )
        })}
      </div>

      {/* composer */}
      <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        {err && <div style={{ fontSize: 12, color: '#E86A6A', fontWeight: 600, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={t('Ответ — Enter отправит, Shift+Enter перенос')}
            rows={1}
            style={{
              flex: 1, resize: 'none', maxHeight: 140, minHeight: 44, padding: '11px 14px', borderRadius: 12,
              border: '1.5px solid var(--color-border-medium, var(--color-border))', fontSize: 14, outline: 'none',
              color: 'var(--color-text)', background: 'var(--color-surface)', fontFamily: 'inherit', lineHeight: 1.4,
            }}
          />
          <button onClick={send} disabled={sending || !text.trim()} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12,
            border: 'none', cursor: sending || !text.trim() ? 'default' : 'pointer', flexShrink: 0,
            background: 'var(--color-purple)', color: '#fff', opacity: sending || !text.trim() ? 0.5 : 1,
          }}><Send size={18} /></button>
        </div>
      </div>
    </div>
  )
}
