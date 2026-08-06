import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getStudentSession, setStudentSession } from '../lib/studentSession'

// A 1:1 student can own several subject cards — each a separate individual group
// + student row for the same person, all sharing one auth account. This switcher
// lists those cards and lets the student jump between subjects with one login.
// Renders nothing when the student has only one card (the common case).

type Card = { id: string; groupId: string; subject: string; level: string; icon: string; color: string }

export default function SubjectSwitcher({ compact = false, style }: { compact?: boolean; style?: React.CSSProperties }) {
  const session = getStudentSession()
  const [cards, setCards] = useState<Card[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session) return
      // Prefer the auth account (all sibling cards share auth_user_id). Fall back
      // to name-matching for legacy temp_password logins with no linked auth user.
      const { data: auth } = await supabase.auth.getUser()
      let query = supabase
        .from('students')
        .select('id, group_id, name, groups(subject, level, icon, color, is_individual)')
      query = auth?.user
        ? query.eq('auth_user_id', auth.user.id)
        : query.eq('name', session.name)
      const { data } = await query
      if (cancelled || !data) return
      // Every card the person belongs to — their 1:1 subject groups AND any
      // regular group they were later enrolled into (e.g. bought a group course).
      // Each switch re-points the session to that group so its course/lessons load.
      const mapped: Card[] = (data as any[])
        .filter(r => r.groups)
        .map(r => ({
          id: r.id,
          groupId: r.group_id,
          subject: r.groups?.subject ?? '',
          level: r.groups?.level ?? '',
          icon: r.groups?.icon ?? '📚',
          color: r.groups?.color ?? 'var(--color-accent)',
        }))
      setCards(mapped)
    })()
    return () => { cancelled = true }
  }, [session?.id])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!session || cards.length <= 1) return null

  const current = cards.find(c => c.groupId === session.groupId) ?? cards[0]

  function switchTo(card: Card) {
    if (!session) return
    if (card.groupId === session.groupId) { setOpen(false); return }
    setStudentSession({ id: card.id, name: session.name, groupId: card.groupId })
    // Full reload so App's data-load effect re-runs against the new card
    // (same reasoning as JoinPage / StudentLoginPage — a bare hash change
    // wouldn't re-fire load()).
    window.location.hash = '#/'
    window.location.reload()
  }

  const label = (c: Card) => `${c.icon} ${c.subject}${c.level ? ` · ${c.level}` : ''}`

  return (
    <div ref={ref} style={{ position: 'relative', width: compact ? 'auto' : '100%', ...style }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: compact ? 'auto' : '100%',
          justifyContent: 'space-between', padding: compact ? '8px 12px' : '11px 14px',
          borderRadius: 12, cursor: 'pointer',
          border: `1px solid ${current.color}44`, background: current.color + '18',
          color: 'var(--color-text)', fontSize: 14, fontWeight: 600,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label(current)}</span>
        <ChevronDown size={16} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: compact ? 'auto' : 0, minWidth: compact ? 200 : undefined,
          zIndex: 50, background: 'var(--color-bg-input)', borderRadius: 14, padding: 6,
          border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}>
          <ScrollFade maxHeight={264} bg="var(--color-bg-input)" overlayScrollbar
            scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cards.map(c => {
            const active = c.groupId === session.groupId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => switchTo(c)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '9px 10px', borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: active ? c.color + '18' : 'transparent',
                  color: 'var(--color-text)', fontSize: 13, fontWeight: active ? 700 : 500, textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-3)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label(c)}</span>
                {active && <Check size={15} style={{ flexShrink: 0, color: c.color }} />}
              </button>
            )
          })}
          </ScrollFade>
        </div>
      )}
    </div>
  )
}
