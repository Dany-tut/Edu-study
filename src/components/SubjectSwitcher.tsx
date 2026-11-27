import { textFadeStyle } from '../lib/textFades'
import { SubjectMark } from './icons/SubjectMark'
import { useEffect, useRef, useState } from 'react'
import { ICON_GAP } from '../lib/subjects'
import { ChevronDown, Check } from './icons/appIcons'
import ScrollFade from './ScrollFade'
import { supabase } from '../lib/supabase'
import { getStudentSession, setStudentSession } from '../lib/studentSession'
import { getSessionUser } from '../lib/owner'
import { t, tc } from '../lib/i18n'

// A 1:1 student can own several subject cards — each a separate individual group
// + student row for the same person, all sharing one auth account. This switcher
// lists those cards and lets the student jump between subjects with one login.
// Renders nothing when the student has only one card (the common case).

export type Card = {
  id: string; groupId: string; subject: string; level: string; icon: string; color: string
  // Уточнение, когда у человека две карточки с одинаковыми предметом и уровнем
  // (личные занятия + групповой курс): без него в списке две «Биология · ЕГЭ».
  note?: string
}

export const subjectCardLabel = (c: Card) =>
  `${tc(c.subject)}${c.level ? ` · ${tc(c.level)}` : ''}${c.note ? ` — ${c.note}` : ''}`

const sameText = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLocaleLowerCase() === b.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

// Совпадающие «предмет · уровень» различаем названием группы; у личной группы
// название обычно = имя ученика, ему это ничего не скажет — пишем «личные занятия».
function withNotes(cards: (Card & { groupName: string; individual: boolean })[], personName: string): Card[] {
  const key = (c: Card) => `${c.subject}\u0000${c.level}`
  const counts = new Map<string, number>()
  for (const c of cards) counts.set(key(c), (counts.get(key(c)) ?? 0) + 1)
  return cards.map(({ groupName, individual, ...c }) => {
    if ((counts.get(key(c)) ?? 0) < 2) return c
    const name = groupName.trim()
    const note = individual || !name || sameText(name, personName) ? t('личные занятия') : tc(name)
    return { ...c, note }
  })
}

// Карточки человека + переход между ними. Хук, а не только компонент: оболочек
// две — выпадашка в сайдбаре (десктоп) и шторка из шапки профиля (телефон), а
// список карточек и перезагрузка при переходе у них одни.
// Последний известный список карточек — чтобы строка выбора курса в меню
// профиля стояла сразу, а не выпрыгивала после ответа базы (меню иначе
// меняет высоту при каждом открытии). Свежий список всё равно грузим.
const cacheKey = (id: string) => `subject_cards_v1_${id}`
// null — списка ещё не запоминали (первое открытие на этом устройстве).
function readCachedCards(id: string | undefined): Card[] | null {
  if (!id) return null
  try {
    const raw = localStorage.getItem(cacheKey(id))
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed as Card[] : null
  } catch { return null }
}
function writeCachedCards(id: string, cards: Card[]) {
  try { localStorage.setItem(cacheKey(id), JSON.stringify(cards)) } catch { /* приватный режим */ }
}

export function useSubjectCards() {
  const session = getStudentSession()
  const [cached] = useState(() => readCachedCards(session?.id))
  const [cards, setCards] = useState<Card[]>(() => cached ?? [])
  // Первое открытие: запомненного списка нет, база ещё не ответила — сколько
  // карточек, неизвестно. Оболочка ставит заглушку высотой со строку курса.
  const [loading, setLoading] = useState(() => !!session && cached === null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session) return
      // Prefer the auth account (all sibling cards share auth_user_id). Fall back
      // to name-matching for legacy temp_password logins with no linked auth user.
      const authUser = await getSessionUser()
      let query = supabase
        .from('students')
        .select('id, group_id, name, groups(name, subject, level, icon, color, is_individual)')
      query = authUser
        ? query.eq('auth_user_id', authUser.id)
        : query.eq('name', session.name)
      const { data } = await query
      if (cancelled) return
      setLoading(false)
      if (!data) return
      // Every card the person belongs to — their 1:1 subject groups AND any
      // regular group they were later enrolled into (e.g. bought a group course).
      // Each switch re-points the session to that group so its course/lessons load.
      const mapped = (data as any[])
        .filter(r => r.groups)
        .map(r => ({
          id: r.id,
          groupId: r.group_id,
          subject: r.groups?.subject ?? '',
          level: r.groups?.level ?? '',
          icon: r.groups?.icon ?? '📚',
          color: r.groups?.color ?? 'var(--color-accent)',
          groupName: r.groups?.name ?? '',
          individual: !!r.groups?.is_individual,
        }))
      const next = withNotes(mapped, session.name)
      writeCachedCards(session.id, next)
      setCards(next)
    })().catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session?.id])

  const current = session ? cards.find(c => c.groupId === session.groupId) ?? cards[0] ?? null : null

  // Возврат false = перехода не было (та же карточка), вызвавшему остаётся
  // просто закрыть свою оболочку.
  function switchTo(card: Card) {
    if (!session) return false
    if (card.groupId === session.groupId) return false
    setStudentSession({ id: card.id, name: session.name, groupId: card.groupId })
    // Full reload so App's data-load effect re-runs against the new card
    // (same reasoning as JoinPage / StudentLoginPage — a bare hash change
    // wouldn't re-fire load()).
    window.location.hash = '#/'
    window.location.reload()
    return true
  }

  // Переключать нечего, пока карточка одна.
  return { cards, current, switchTo, hasChoice: !!session && cards.length > 1, loading }
}

export default function SubjectSwitcher({ compact = false, style }: { compact?: boolean; style?: React.CSSProperties }) {
  const { cards, current, switchTo, hasChoice, loading } = useSubjectCards()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (loading) {
    // Та же коробка, что у кнопки ниже (отступы, рамка, шрифт), — высота
    // строки совпадает, и меню не прыгает, когда список придёт.
    return (
      <div style={{ width: compact ? 'auto' : '100%', ...style }} aria-hidden>
        <div className="skeleton" style={{
          display: 'flex', alignItems: 'center', gap: 8, width: compact ? 120 : '100%',
          padding: compact ? '8px 12px' : '12px 14px', borderRadius: 12,
          border: '1px solid transparent', fontSize: 14, fontWeight: 600, boxSizing: 'border-box',
        }}>
          <span style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span style={{ visibility: 'hidden' }}>{'\u00a0'}</span>
        </div>
      </div>
    )
  }

  if (!hasChoice || !current) return null

  const label = subjectCardLabel

  return (
    <div ref={ref} style={{ position: 'relative', width: compact ? 'auto' : '100%', ...style }}>
      <button data-hover="layer"
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: compact ? 'auto' : '100%',
          justifyContent: 'space-between', padding: compact ? '8px 12px' : '12px 14px',
          borderRadius: 12, cursor: 'pointer',
          border: `1px solid ${current.color}44`, background: current.color + '18',
          color: 'var(--color-text)', fontSize: 14, fontWeight: 600,
        }}
      >
        <SubjectMark subject={current.subject} size={16} /><span style={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', ...textFadeStyle }}>{label(current)}</span>
        <ChevronDown size={16} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: compact ? 'auto' : 0, minWidth: compact ? 200 : undefined,
          zIndex: 50, background: 'var(--color-bg-input)', borderRadius: 14, padding: 6,
          border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-4)',
        }}>
          <ScrollFade maxHeight={264} bg="var(--color-bg-input)" overlayScrollbar
            scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {cards.map(c => {
            const active = c.groupId === current.groupId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { switchTo(c); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '10px 10px', borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: active ? c.color + '18' : 'transparent',
                  color: 'var(--color-text)', fontSize: 13, fontWeight: active ? 700 : 500, textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-bg-3)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <SubjectMark subject={c.subject} size={16} /><span style={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', ...textFadeStyle }}>{label(c)}</span>
                {active && <Check size={16} style={{ flexShrink: 0, color: c.color }} />}
              </button>
            )
          })}
          </ScrollFade>
        </div>
      )}
    </div>
  )
}
