import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

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
//
// КЛЮЧ — ЭТО АДРЕС ЗНАЧЕНИЯ, А НЕ ПОДПИСЬ К НЕМУ. Динамический ключ
// (`trainer.${lang}.work`, `${draftScope}.meta`) означает «другая вещь», и при
// его смене состояние перечитывается из хранилища по НОВОМУ ключу. Раньше оно
// оставалось прежним и тут же записывалось в новый ключ: открытый корейский
// рассказ «переезжал» в английский вместе с переключением предмета, а черновик
// одной формы затирал черновик другой.
export function usePersistentState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  // Начальное значение фиксируется на первом рендере: оно нужно как запасное
  // при каждой смене ключа, а пересобранный на лету литерал (`{}`, `[]`) делал
  // бы каждый такой переход новым объектом.
  const initialRef = useRef(initial)
  const load = useCallback((k: string): T => {
    const draft = readDraft<T>(k)
    if (draft !== null) return draft
    const seed = initialRef.current
    return typeof seed === 'function' ? (seed as () => T)() : seed
  }, [])

  const [state, setState] = useState<{ key: string; value: T }>(() => ({ key, value: load(key) }))
  // Ключ уже сменился, а состояние догонит на эффекте — до тех пор значение
  // берём по новому ключу прямо здесь, иначе один кадр показывал бы чужое.
  const value = state.key === key ? state.value : load(key)
  useEffect(() => {
    setState(prev => (prev.key === key ? prev : { key, value: load(key) }))
  }, [key, load])

  useEffect(() => { writeDraft(key, value) }, [key, value])

  const setValue = useCallback<Dispatch<SetStateAction<T>>>(next => {
    setState(prev => {
      const base = prev.key === key ? prev.value : load(key)
      return { key, value: typeof next === 'function' ? (next as (p: T) => T)(base) : next }
    })
  }, [key, load])

  return [value, setValue]
}
