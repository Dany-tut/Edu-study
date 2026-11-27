// ─────────────────────────────────────────────────────────────────────────────
// Избранные ученики учителя («Группы», концепт — Figma «Искра», стр. 25)
//
// Закреплённые идут блоком над остальными в порядке, который учитель задаёт
// перетаскиванием за аватар. Ключ — personKey (человек, а не карточка 1:1).
// Хранение — public.teacher_pinned_students, строки только свои (RLS). Без
// входа (гостевой кабинет превью) — localStorage, чтобы стенд работал.
//
// Запись оптимистичная: интерфейс меняется сразу, ошибка сервера откатывает
// состояние к последнему подтверждённому и пишется в консоль.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { supabase } from './supabase'

const LOCAL_KEY = 'teacher.pinnedStudents'

type PinState = {
  keys: string[]
  loaded: boolean
  owner: string | null
}

const usePinStore = create<PinState>(() => ({ keys: [], loaded: false, owner: null }))

function readLocal(): string[] {
  try { const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [] } catch { return [] }
}
function writeLocal(keys: string[]) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(keys)) } catch { /* приватный режим */ }
}

let loading: Promise<void> | null = null
async function load() {
  const { data: { session } } = await supabase.auth.getSession()
  const owner = session?.user && !session.user.is_anonymous ? session.user.id : null
  if (!owner) { usePinStore.setState({ keys: readLocal(), loaded: true, owner: null }); return }
  const { data, error } = await supabase.from('teacher_pinned_students')
    .select('person_key, position, pinned_at').order('position').order('pinned_at')
  if (error) {
    // Таблицы ещё нет (миграция не накатана) или сеть: избранное просто пустое.
    console.error('pinned students: load', error)
    usePinStore.setState({ keys: [], loaded: true, owner })
    return
  }
  usePinStore.setState({ keys: (data ?? []).map(r => r.person_key as string), loaded: true, owner })
}
function ensureLoaded() {
  if (!loading) loading = load().catch(e => { console.error('pinned students', e); usePinStore.setState({ loaded: true }) })
  return loading
}
supabase.auth.onAuthStateChange(event => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') { loading = null; usePinStore.setState({ loaded: false }); void ensureLoaded() }
})

/** Подтверждённое сервером состояние — для отката при ошибке записи. */
let confirmed: string[] = []

async function persist(prev: string[], next: string[]) {
  const { owner } = usePinStore.getState()
  if (!owner) { writeLocal(next); return }
  const added = next.filter(k => !prev.includes(k))
  const removed = prev.filter(k => !next.includes(k))
  try {
    if (removed.length) {
      const { error } = await supabase.from('teacher_pinned_students').delete().eq('teacher_id', owner).in('person_key', removed)
      if (error) throw error
    }
    if (added.length) {
      const { error } = await supabase.from('teacher_pinned_students')
        .insert(added.map(k => ({ teacher_id: owner, person_key: k, position: next.indexOf(k) })))
      if (error) throw error
    }
    // Позиции выравниваем всегда: после удаления в середине и при перестановке.
    if (next.length) {
      const { error } = await supabase.rpc('reorder_pinned_students', { p_keys: next })
      if (error) throw error
    }
    confirmed = next
  } catch (e) {
    console.error('pinned students: save', e)
    usePinStore.setState({ keys: confirmed })
  }
}

let queue: Promise<void> = Promise.resolve()
function commit(next: string[]) {
  const prev = usePinStore.getState().keys
  if (prev.length === next.length && prev.every((k, i) => k === next[i])) return
  usePinStore.setState({ keys: next })
  // Записи по очереди: быстрые клики не обгоняют друг друга.
  queue = queue.then(() => persist(prev, next))
}

export function usePinnedStudents() {
  const keys = usePinStore(s => s.keys)
  const loaded = usePinStore(s => s.loaded)
  useEffect(() => { void ensureLoaded().then(() => { confirmed = usePinStore.getState().keys }) }, [])
  return {
    keys,
    loaded,
    isPinned: (key: string) => keys.includes(key),
    /** Закрепить в конец блока или открепить. */
    toggle: (key: string) => commit(keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]),
    reorder: (next: string[]) => commit(next),
  }
}

/** Закреплённые сверху в своём порядке, остальные — как пришли. */
export function splitPinned<T>(items: T[], keyOf: (item: T) => string, keys: string[]): { pinned: T[]; rest: T[] } {
  const rank = new Map(keys.map((k, i) => [k, i]))
  const pinned = items.filter(i => rank.has(keyOf(i))).sort((a, b) => rank.get(keyOf(a))! - rank.get(keyOf(b))!)
  const rest = items.filter(i => !rank.has(keyOf(i)))
  return { pinned, rest }
}

/**
 * Новый порядок видимых закреплённых (поиск/фильтр могли скрыть часть) —
 * в полный список: скрытые остаются на своих местах, видимые занимают свои
 * слоты в новом порядке.
 */
export function mergeVisibleOrder(all: string[], visibleNext: string[]): string[] {
  const visible = new Set(visibleNext)
  let i = 0
  return all.map(k => visible.has(k) ? visibleNext[i++] : k)
}

/**
 * Перетаскивание закреплённых за аватар.
 * Мышь — зажать и повести (порог 4 px). Касание и перо — долгое нажатие
 * 350 мс, затем строка поднимается; сдвиг раньше срока — это прокрутка, не
 * перетаскивание. Строки помечаются data-pin-row; индекс вставки считается по
 * серединам строк того же контейнера.
 */
export function usePinDrag(order: string[], onCommit: (next: string[]) => void, onLift?: () => void) {
  const [drag, setDrag] = useState<{ key: string; dy: number; over: number } | null>(null)
  const suppressClick = useRef(false)
  const latest = useRef({ order, onCommit, onLift })
  latest.current = { order, onCommit, onLift }

  function start(key: string, e: React.PointerEvent<HTMLElement>) {
    if (e.button !== 0) return
    const row = e.currentTarget.closest<HTMLElement>('[data-pin-row]')
    const box = row?.parentElement
    if (!row || !box) return
    const touch = e.pointerType !== 'mouse'
    const startY = e.clientY, startX = e.clientX, pointerId = e.pointerId
    const target = e.currentTarget
    let active = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let mids: number[] = []
    let over = order.indexOf(key)

    const lift = () => {
      active = true
      const rows = [...box.querySelectorAll<HTMLElement>('[data-pin-row]')].filter(r => r !== row)
      mids = rows.map(r => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 })
      try { target.setPointerCapture(pointerId) } catch { /* уже отпущен */ }
      latest.current.onLift?.()
      setDrag({ key, dy: 0, over })
    }
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      const dy = ev.clientY - startY, dx = ev.clientX - startX
      if (!active) {
        if (touch) { if (Math.hypot(dx, dy) > 8) cleanup() ; return }
        if (Math.abs(dy) > 4) lift(); else return
      }
      ev.preventDefault()
      over = mids.filter(m => m < ev.clientY).length
      setDrag({ key, dy, over })
    }
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      if (active) {
        const rest = latest.current.order.filter(k => k !== key)
        rest.splice(over, 0, key)
        latest.current.onCommit(rest)
        suppressClick.current = true
        setTimeout(() => { suppressClick.current = false }, 0)
      }
      cleanup()
    }
    const cleanup = () => {
      if (timer) clearTimeout(timer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      setDrag(null)
    }
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === pointerId) cleanup() }
    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    if (touch) timer = setTimeout(lift, 350)
  }

  return {
    drag,
    /** Обработчик pointerdown для аватара закреплённой строки. */
    handle: (key: string) => (e: React.PointerEvent<HTMLElement>) => start(key, e),
    /** Клик сразу после перетаскивания не открывает ученика. */
    swallowClick: () => suppressClick.current,
  }
}
