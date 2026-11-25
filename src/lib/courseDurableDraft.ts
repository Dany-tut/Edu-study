// sessionStorage drafts die when iOS evicts the app or tab. This keeps one
// durable copy of an UNSAVED course draft in localStorage, scoped to the signed-in
// account so a shared device never shows one teacher's work to another. It is
// only a fallback: the session draft wins, and the restored copy goes through
// the normal recovery path, which checks it against the server version.

const PREFIX = 'iskra:course-draft:'
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

function signedInUserId(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      if (!/^sb-.+-auth-token$/.test(key)) continue
      const id = (JSON.parse(localStorage.getItem(key) ?? 'null') as { user?: { id?: string } } | null)?.user?.id
      if (id) return id
    }
  } catch { /* blocked storage or foreign value */ }
  return null
}

const keyFor = (owner: string, courseKey: string) => `${PREFIX}${owner}:${courseKey}`

// «Взять из базы» отбрасывает версию курса на всём устройстве, а не только в
// одной вкладке. Копия в localStorage общая: другая вкладка, открытая раньше,
// со старой версией, при каждом сворачивании записывала её обратно, и окно
// сверки возвращалось после перезагрузки. Отметка времени отказа запрещает
// таким вкладкам писать копию и не даёт поднять копию, записанную до отказа.
// Вкладка теряет только запасную копию; её собственный черновик в
// sessionStorage остаётся, и при сохранении она пройдёт обычную сверку.
const DISCARD_PREFIX = 'iskra:course-draft-discarded:'
const TAB_OPENED_AT = Date.now()
const discardKeyFor = (owner: string, courseKey: string) => `${DISCARD_PREFIX}${owner}:${courseKey}`

function discardedAt(owner: string, courseKey: string): number {
  try { return Number(localStorage.getItem(discardKeyFor(owner, courseKey))) || 0 } catch { return 0 }
}

export function discardDurableCourseDraft(courseKey: string) {
  const owner = signedInUserId()
  if (!owner) return
  try {
    localStorage.setItem(discardKeyFor(owner, courseKey), String(Date.now()))
    localStorage.removeItem(keyFor(owner, courseKey))
  } catch { /* blocked storage */ }
}

export function writeDurableCourseDraft(courseKey: string, draft: unknown) {
  const owner = signedInUserId()
  if (!owner) return
  if (discardedAt(owner, courseKey) >= TAB_OPENED_AT) return
  try { localStorage.setItem(keyFor(owner, courseKey), JSON.stringify({ savedAt: Date.now(), draft })) } catch { /* quota */ }
}

export function readDurableCourseDraft<T>(courseKey: string): T | null {
  const owner = signedInUserId()
  if (!owner) return null
  try {
    const raw = localStorage.getItem(keyFor(owner, courseKey))
    if (!raw) return null
    const saved = JSON.parse(raw) as { savedAt?: number; draft?: T }
    if (!saved.draft || !saved.savedAt || Date.now() - saved.savedAt > MAX_AGE_MS
      || saved.savedAt <= discardedAt(owner, courseKey)) {
      localStorage.removeItem(keyFor(owner, courseKey))
      return null
    }
    return saved.draft
  } catch { return null }
}

export function clearDurableCourseDraft(courseKey: string) {
  const owner = signedInUserId()
  if (!owner) return
  try { localStorage.removeItem(keyFor(owner, courseKey)) } catch { /* blocked storage */ }
}
