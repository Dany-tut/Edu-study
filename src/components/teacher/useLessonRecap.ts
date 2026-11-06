import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadLessonRecap, recapAvailable, requestLessonRecap, saveRecapDraft,
  type RecapDraft, type RecapKind, type RecapRow,
} from '../../lib/lessonRecap'

// Состояние итогов урока для вкладки «Запись» и окна монтажа: один хук на
// урок, чтобы оба входа вели в один и тот же черновик.

let availability: Promise<boolean> | null = null
/** Рубильник читается один раз за сеанс страницы: кнопка не мигает между уроками. */
export function useRecapAvailable() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let alive = true
    availability ??= recapAvailable().catch(() => false)
    void availability.then(v => { if (alive) setOn(v) })
    return () => { alive = false }
  }, [])
  return on
}

export function useLessonRecap(lessonShortId: string | undefined, lang: string, enabled: boolean) {
  const [row, setRow] = useState<RecapRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<'all' | RecapKind | null>(null)
  const [error, setError] = useState('')
  // Поздний ответ прошлого урока не должен лечь в черновик нового.
  const current = useRef(lessonShortId)
  current.current = lessonShortId

  useEffect(() => {
    setRow(null); setError(''); setBusy(null)
    if (!enabled || !lessonShortId) return
    let alive = true
    setLoading(true)
    void loadLessonRecap(lessonShortId).then(r => { if (alive) { setRow(r?.status === 'running' ? null : r); setLoading(false) } })
    return () => { alive = false }
  }, [lessonShortId, enabled])

  // Правки текста — в базу с задержкой: печатают быстро, запросов на букву не нужно.
  const pending = useRef<{ id: string; draft: RecapDraft } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const p = pending.current
    pending.current = null
    if (p) void saveRecapDraft(p.id, p.draft)
  }, [])
  useEffect(() => () => flush(), [flush, lessonShortId])

  const save = useCallback((draft: RecapDraft) => {
    setRow(r => {
      if (!r) return r
      pending.current = { id: r.id, draft }
      return { ...r, draft }
    })
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 700)
  }, [flush])

  const run = useCallback(async (kinds: RecapKind[], which: 'all' | RecapKind, recapId?: string) => {
    if (!lessonShortId) return
    flush()
    const lesson = lessonShortId
    setBusy(which); setError('')
    try {
      const next = await requestLessonRecap({ lesson, kinds, lang, ...(recapId ? { recap: recapId } : {}) })
      if (current.current === lesson) setRow(next)
    } catch (e) {
      if (current.current === lesson) setError(e instanceof Error ? e.message : 'Не удалось собрать итоги. Попробуйте ещё раз.')
    } finally {
      if (current.current === lesson) setBusy(null)
    }
  }, [lessonShortId, lang, flush])

  return {
    row, setRow, loading, busy, error,
    dismissError: () => setError(''),
    build: (kinds: RecapKind[]) => run(kinds, 'all'),
    rebuild: (kind: RecapKind) => run([kind], kind, row?.id),
    save, flush,
  }
}
