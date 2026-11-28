import OpticalText from './OpticalText'
import { useEffect, useRef, useState } from 'react'
import { Mic, Check, X, RotateCcw } from './icons/appIcons'
import { isAsrAvailable, listenLong, type AsrSession } from '../lib/asr'
import { micProblem } from '../lib/micAccess'
import { deleteAnswerFile } from '../lib/answerFiles'
import {
  uploadAnswerVoice, tidyDictated, joinDictated, MAX_VOICE_CLIPS, type AnswerVoiceClip,
} from '../lib/answerVoice'
import { useT } from '../lib/i18n'
import { textFadeLines } from '../lib/textFades'

// Ответ голосом под полем развёрнутого ответа (Figma «Искра», стр. 29).
//
// КАК В ДИКТОВКЕ CLAUDE. Нажал микрофон — справа капсула записи (точка,
// таймер, уровень голоса, × и ✓), а сказанное сразу печатается в само поле
// следом за уже написанным. Enter или ✓ — вставка остаётся, Escape или × —
// поле возвращается к тому, что было до записи.
//
// ТЕКСТ, А НЕ ГОЛОСОВОЕ. Наружу уходит текст поля (onChange) — его ученик правит
// как обычный ответ. Запись при `keep` загружается в приватный бакет и
// прикладывается клипом (onClips) — учителю послушать.
//
// СОХРАННОСТЬ (docs/data-preservation.md). Вписанное руками не стирается
// никогда: «Перезаписать» снимает только последнюю вставку и только если
// поле с тех пор не трогали; после снятия 8 секунд висит «Вернуть».
//
// БЕЗ РАСПОЗНАВАЛКИ (Firefox, приложение на айфоне до нативного плагина)
// микрофона нет вовсе — поле остаётся обычным, как было.

type Phase = 'idle' | 'recording' | 'saving'

const MAX_SECONDS = 300
const UNDO_MS = 8000

export default function VoiceDictation({
  value, onChange, disabled, lang, keep, clips, onClips, studentId,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  /** BCP-47 для распознавания (см. dictationLang). */
  lang: string
  /** Прикладывать запись учителю. */
  keep: boolean
  clips: AnswerVoiceClip[]
  onClips: (next: AnswerVoiceClip[]) => void
  /** Карточка ученика — папка записи в бакете. */
  studentId: string
}) {
  const t = useT()
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [levels, setLevels] = useState<number[]>([0.2, 0.2, 0.2, 0.2, 0.2])
  const [note, setNote] = useState('')
  const [undo, setUndo] = useState<string | null>(null)
  // Последняя вставка: что было до неё и что стало. «Перезаписать» сработает,
  // только пока поле равно `after`.
  const [last, setLast] = useState<{ before: string; after: string; clip?: string } | null>(null)

  const baseRef = useRef('')
  const liveRef = useRef('')
  const startedRef = useRef(0)
  const asrRef = useRef<AsrSession | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const meterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Самые свежие пропсы — для обработчиков, живущих дольше одного рендера.
  const propsRef = useRef({ value, clips, onChange, onClips })
  propsRef.current = { value, clips, onChange, onClips }

  const [available] = useState(() => isAsrAvailable())

  function release() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (meterRef.current) { clearInterval(meterRef.current); meterRef.current = null }
    streamRef.current?.getTracks().forEach(tr => tr.stop())
    streamRef.current = null
    void audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
  }
  useEffect(() => () => {
    asrRef.current?.cancel()
    release()
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
  }, [])

  function offerUndo(prev: string) {
    setUndo(prev)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setUndo(null), UNDO_MS)
  }

  async function start(base: string) {
    if (phase !== 'idle' || disabled) return
    setNote('')
    baseRef.current = base
    liveRef.current = ''
    const session = listenLong(lang, text => {
      liveRef.current = text
      propsRef.current.onChange(joinDictated(baseRef.current, text))
    })
    if (!session) { setNote(t('Распознавание речи здесь недоступно')); return }
    asrRef.current = session
    startedRef.current = Date.now()
    setElapsed(0)
    setPhase('recording')
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startedRef.current) / 1000)
      setElapsed(sec)
      if (sec >= MAX_SECONDS) void commit()
    }, 500)

    // Запись для учителя — параллельно распознаванию, своим доступом к
    // микрофону. Не дали микрофон записи — распознавание всё равно идёт.
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (asrRef.current !== session) { stream.getTracks().forEach(tr => tr.stop()); return }
        streamRef.current = stream
        if (keep && typeof MediaRecorder !== 'undefined') {
          const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : ''
          const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
          chunksRef.current = []
          rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data) }
          rec.start(1000)
          recRef.current = rec
        }
        // Уровень голоса — полоски в капсуле. setInterval, не rAF (превью).
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (Ctx) {
          const ctx = new Ctx()
          audioCtxRef.current = ctx
          const an = ctx.createAnalyser()
          an.fftSize = 256
          ctx.createMediaStreamSource(stream).connect(an)
          const buf = new Uint8Array(an.frequencyBinCount)
          meterRef.current = setInterval(() => {
            an.getByteTimeDomainData(buf)
            let peak = 0
            for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
            const lvl = Math.min(1, peak / 60)
            setLevels(prev => [...prev.slice(1), Math.max(0.15, lvl)])
          }, 110)
        }
      } catch (e) {
        if (keep) setNote(t(micProblem(e).text))
      }
    }
  }

  function stopRecorder(): Promise<Blob | null> {
    const rec = recRef.current
    recRef.current = null
    if (!rec || rec.state === 'inactive') return Promise.resolve(null)
    return new Promise(res => {
      rec.onstop = () => res(chunksRef.current.length ? new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }) : null)
      try { rec.stop() } catch { res(null) }
    })
  }

  async function commit() {
    const session = asrRef.current
    if (!session) return
    asrRef.current = null
    setPhase('saving')
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    session.stop()
    const [heardRaw, blob] = await Promise.all([
      Promise.race([session.done, new Promise<string>(r => setTimeout(() => r(liveRef.current), 1500))]),
      stopRecorder(),
    ])
    release()
    const heard = (heardRaw || liveRef.current).trim()
    const sec = Math.max(1, Math.round((Date.now() - startedRef.current) / 1000))
    const base = baseRef.current
    if (!heard) {
      propsRef.current.onChange(base)
      setNote(t('Ничего не расслышал — попробуйте ещё раз'))
      setPhase('idle')
      return
    }
    const after = joinDictated(base, tidyDictated(heard))
    propsRef.current.onChange(after)
    setLast({ before: base, after })
    setPhase('idle')
    if (keep && blob && propsRef.current.clips.length < MAX_VOICE_CLIPS) {
      try {
        const clip = await uploadAnswerVoice(blob, studentId, sec, heard)
        propsRef.current.onClips([...propsRef.current.clips, clip])
        setLast(l => (l && l.after === after ? { ...l, clip: clip.path } : l))
      } catch {
        setNote(t('Текст на месте, а запись не загрузилась'))
      }
    }
  }

  function cancel() {
    const session = asrRef.current
    asrRef.current = null
    session?.cancel()
    void stopRecorder()
    release()
    propsRef.current.onChange(baseRef.current)
    setPhase('idle')
  }

  // Enter — оставить, Escape — отменить. Ловим на документе в фазе захвата,
  // чтобы Enter не добавил в поле перенос строки.
  useEffect(() => {
    if (phase !== 'recording') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); void commit() }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
    // commit/cancel читают refs — пересоздавать подписку на каждый рендер незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function rerecord() {
    if (!last || value !== last.after) return
    offerUndo(value)
    if (last.clip) {
      void deleteAnswerFile(last.clip)
      onClips(clips.filter(c => c.path !== last.clip))
    }
    onChange(last.before)
    setLast(null)
    void start(last.before)
  }

  if (!available || disabled) return null

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const canRerecord = phase === 'idle' && !!last && value === last.after
  const hint = phase === 'recording' ? (value.trim() && baseRef.current.trim() ? t('Дописываю к ответу') : t('Говорите — текст появится в поле'))
    : phase === 'saving' ? t('Сохраняю…')
    : note

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36 }}>
      <span style={{
        flex: 1, minWidth: 0, fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-3)',
        ...textFadeLines(2), overflow: 'hidden',
      }}>
        {hint}
      </span>

      {undo !== null && phase === 'idle' && (
        <button data-hover="layer" type="button"
          onClick={() => { asrRef.current?.cancel(); onChange(undo); setUndo(null) }}
          style={pill('var(--color-bg)', 'var(--color-text)')}>
          <RotateCcw size={14} /> <OpticalText as="iskra-button-label">{t('Вернуть')}</OpticalText>
        </button>
      )}

      {canRerecord && (
        <button data-hover="layer" type="button" onClick={rerecord} style={pill('var(--color-bg-3)', 'var(--color-text-2)')}>
          <RotateCcw size={14} /> <OpticalText as="iskra-button-label">{t('Перезаписать')}</OpticalText>
        </button>
      )}

      {phase === 'idle' ? (
        <button data-hover="layer" type="button" aria-label={t('Ответить голосом')} title={t('Ответить голосом')}
          onClick={() => void start(value)}
          style={{
            width: 36, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-purple-soft)', color: 'var(--color-accent)',
          }}>
          <Mic size={18} />
        </button>
      ) : (
        <div role="group" aria-label={t('Запись ответа')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 36, padding: '0 4px 0 12px',
          borderRadius: 999, background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-red-text)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{mmss(elapsed)}</span>
          <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 18 }}>
            {levels.map((l, i) => (
              <span key={i} style={{ width: 3, height: Math.round(4 + l * 14), borderRadius: 2, background: 'var(--color-accent)', transition: 'height 0.1s' }} />
            ))}
          </span>
          <button data-hover="layer" type="button" aria-label={t('Отменить запись')} onClick={cancel} disabled={phase === 'saving'}
            style={roundBtn('var(--color-bg-3)', 'var(--color-text-2)')}>
            <X size={14} />
          </button>
          <button data-hover="layer" type="button" aria-label={t('Готово')} onClick={() => void commit()} disabled={phase === 'saving'}
            style={roundBtn('var(--color-accent)', '#fff')}>
            <Check size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

function pill(bg: string, color: string): React.CSSProperties {
  return {
    height: 32, padding: '0 12px', borderRadius: 999, border: '1px solid var(--color-border)', cursor: 'pointer',
    background: bg, color, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }
}

function roundBtn(bg: string, color: string): React.CSSProperties {
  return {
    width: 28, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: bg, color,
  }
}
