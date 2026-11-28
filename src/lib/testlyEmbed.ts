// Тестли внутри Искры: протокол postMessage v1.
//
// Лист теста (раскладка cards / notebook / feed и оформление учителя) рисует
// Тестли в iframe `?embed=iskra`. Рамку — шапку, нижнюю панель, карту заданий,
// проверку перед сдачей и итог — рисует Искра по настройкам теста, которые
// Тестли присылает в `testly:state`. Пока Искра не ответила `iskra:hello`,
// Тестли рисует свои кнопки сам, поэтому без рукопожатия ничего не ломается.
// Полное описание — docs/iskra-embed-protocol.md в репозитории Тестли.
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { TESTLY_SITE } from './testlyModule'

export const TESTLY_ORIGIN = new URL(TESTLY_SITE).origin

export type TestlyLayout = 'cards' | 'notebook' | 'feed'
export type TestlyStage = 'loading' | 'code' | 'join' | 'resume' | 'lobby' | 'test' | 'review' | 'done' | 'error'

export interface TestlyItem { n: number | null; index: number; answered: boolean; flag: boolean }

export interface TestlyState {
  frame: boolean
  stage: TestlyStage
  layout: TestlyLayout
  allowBack: boolean
  showQuestionNumbers: boolean
  /** мс; null — без ограничения времени */
  deadline: number | null
  skew: number
  total: number
  accent: string | null
  btn: string | null
  index?: number
  n?: number | null
  info?: boolean
  answered?: number
  flags?: number[]
  empty?: number[]
  items?: TestlyItem[]
  last?: boolean
  returnToEnd?: boolean
  saving?: 'saved' | 'saving' | 'offline'
  savedAt?: number | null
  submitting?: boolean
}

export interface TestlyQuestionResult { n: number; state: 'ok' | 'bad' | 'pending'; got: number | null; max: number }

export interface TestlyDone {
  submittedAt: string | number | null
  showAfter: 'none' | 'score' | 'review'
  got?: number
  max?: number
  percent?: number
  pending?: boolean
  review?: string | null
  perQuestion?: TestlyQuestionResult[] | null
}

export type TestlyCommand =
  | { cmd: 'next' | 'back' | 'review' | 'submit' }
  | { cmd: 'goto'; index: number }

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'

/** Слушает iframe Тестли, отвечает на рукопожатие и отдаёт состояние листа. */
export function useTestlyEmbed(frameRef: RefObject<HTMLIFrameElement | null>, src: string) {
  const origin = (() => { try { return new URL(src, window.location.href).origin } catch { return TESTLY_ORIGIN } })()
  const [state, setState] = useState<TestlyState | null>(null)
  const [done, setDone] = useState<TestlyDone | null>(null)
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)

  const post = useCallback((msg: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ ...msg, v: 1 }, origin)
  }, [frameRef, origin])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.source !== frameRef.current?.contentWindow) return
      const data = e.data
      if (!isRecord(data) || data.v !== 1 || typeof data.type !== 'string') return
      if (data.type === 'testly:state') {
        const next = data as unknown as TestlyState
        // Рамку Тестли прячет только после hello — отвечаем на каждое состояние без неё.
        if (!next.frame) post({ type: 'iskra:hello' })
        setState(next)
      } else if (data.type === 'testly:done') {
        setDone(data as unknown as TestlyDone)
      } else if (data.type === 'testly:zoom' && typeof data.src === 'string') {
        setZoom({ src: data.src, alt: typeof data.alt === 'string' ? data.alt : '' })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [origin, frameRef, post])

  const send = useCallback((c: TestlyCommand) => { post({ type: 'iskra:cmd', ...c }) }, [post])

  return { state, done, zoom, setZoom, send }
}

/** Секунд до конца, раз в секунду; null — без таймера. */
export function useTestlyCountdown(deadline: number | null | undefined, skew = 0) {
  const remaining = () => deadline ? Math.max(0, Math.round((deadline - (Date.now() + skew)) / 1000)) : null
  const [left, setLeft] = useState(remaining)
  const ref = useRef(remaining)
  ref.current = remaining
  useEffect(() => {
    setLeft(ref.current())
    if (!deadline) return
    const id = window.setInterval(() => setLeft(ref.current()), 1000)
    return () => window.clearInterval(id)
  }, [deadline, skew])
  return left
}

export const formatLeft = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(sec).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Текст на кнопке цвета теста: тёмный на светлом акценте, белый на тёмном. */
export function accentInk(hex: string | null | undefined) {
  const m = hex && /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.72 ? '#0b0f14' : '#fff'
}
