import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

// Draft persistence for form state. Any in-progress user input must survive a
// page reload / remount (tab switch triggering a dev-server reload, the
// post-deploy chunk-error auto-reload in main.tsx, browser tab discard, …).
// Drafts live in sessionStorage: they survive reloads of the same tab but
// don't leak across tabs or linger after the browser closes.
//
// Contract: a draft is cleared ONLY on explicit user intent — successful save
// or explicit cancel/close. Never clear it as a side effect of a reload.

const PREFIX = 'draft:'

export function readDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function writeDraft(key: string, value: unknown) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch { /* quota/serialization failure must never break the form */ }
}

export function clearDraft(key: string) {
  try { sessionStorage.removeItem(PREFIX + key) } catch { /**/ }
}

// Remove every draft whose key starts with `prefix` — call on save/cancel to
// wipe all fields of one form at once (fields share a "form." key namespace).
export function clearDrafts(prefix: string) {
  try {
    const full = PREFIX + prefix
    const doomed: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith(full)) doomed.push(k)
    }
    doomed.forEach(k => sessionStorage.removeItem(k))
  } catch { /**/ }
}

// Drop-in useState replacement that mirrors the value into sessionStorage and
// restores it on mount. Use for every user-entered field of a form, plus the
// "is this modal open" flag so an open form re-opens after a reload.
// `initial` may be a value or lazy initializer, like useState.
export function usePersistentState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const draft = readDraft<T>(key)
    if (draft !== null) return draft
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })
  useEffect(() => { writeDraft(key, value) }, [key, value])
  return [value, setValue]
}
