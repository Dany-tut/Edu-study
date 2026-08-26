// ─────────────────────────────────────────────────────────────────────────────
// «Пропуск в диалоге» (dialogGap) — аудирование с участием.
//
// Диалог рисуется чатом (реплики А слева, B справа) и ОЗВУЧИВАЕТСЯ: у каждого
// спикера свой голос синтеза — смена голоса и делает диалог диалогом на слух.
// В одной реплике стоит пропуск («____»): ученик слышит контекст и вставляет
// недостающее — плитками, если автор дал варианты-обманки, иначе вводом.
//
// Проверка — эталон с альтернативами (answerForms), как у диктанта: пропуск в
// диалоге и есть диктант, только с контекстом вокруг.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square, Volume2 } from 'lucide-react'
import { GAP_MARK, type DialogLine } from '../data/taskTypes'
import { speak, stopSpeech, voiceOptions, type SpeechHandle } from '../lib/speech'
import { playPop, vibrate } from '../lib/sound'
import { useT } from '../lib/i18n'
import GrowTextarea, { growMinHeight } from './GrowTextarea'
import ScriptKeyboard, { needsScriptKeyboard, scriptKeyboardCovers } from './ScriptKeyboard'

/** Детерминированная перестановка вариантов — та же, что у плиток сборки. */
function shuffled(list: string[]): string[] {
  const hash = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return h
  }
  return [...list].sort((a, b) => hash(`${a}#${list.indexOf(a)}`) - hash(`${b}#${list.indexOf(b)}`))
}

export default function DialogGapSolver({ dialog, answer, distractors = [], lang, value, disabled, showVerdict, correct, onChange }: {
  dialog: DialogLine[]
  /** Эталон пропуска — нужен плиткам и озвучке заполненной реплики. */
  answer: string
  /** Варианты-обманки; пусто — ученик вписывает пропуск сам. */
  distractors?: string[]
  lang?: string
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  /** Вердикт считает родитель (у него все правила форм ответа). */
  correct?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const [speakingLine, setSpeakingLine] = useState(-1)
  const handle = useRef<SpeechHandle | null>(null)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false; stopSpeech() }, [])

  // Спикеры в порядке появления; сторона и голос назначаются по этому порядку.
  const speakers = useMemo(() => {
    const out: string[] = []
    for (const l of dialog) if (!out.includes(l.speaker)) out.push(l.speaker)
    return out
  }, [dialog])

  // Свой голос каждому спикеру. Голосов может быть меньше, чем спикеров, —
  // тогда крайние делят диктора (хуже, чем ничего не бывает: gap между
  // репликами всё равно держит диалоговый ритм).
  const voiceFor = useMemo(() => {
    const names = voiceOptions(lang).map(o => o.voice.name)
    return (speaker: string) => names.length ? names[speakers.indexOf(speaker) % names.length] : undefined
  }, [lang, speakers])

  /** Текст реплики для озвучки: заполненный пропуск звучит, пустой — пауза. */
  const lineText = (l: DialogLine) =>
    l.text.includes(GAP_MARK) ? l.text.replace(GAP_MARK, value?.trim() || GAP_MARK) : l.text

  const speakLine = (i: number) => {
    const line = dialog[i]
    if (!line) { setSpeakingLine(-1); return }
    handle.current = speak(lineText(line), {
      lang,
      voiceName: voiceFor(line.speaker),
      onStart: () => { if (alive.current) setSpeakingLine(i) },
      onEnd: () => { if (alive.current) setSpeakingLine(s => (s === i ? -1 : s)) },
    })
  }

  /** Прослушать весь диалог: реплики по очереди, каждая своим голосом. */
  const speakAll = (from = 0) => {
    const line = dialog[from]
    if (!line) { setSpeakingLine(-1); return }
    handle.current = speak(lineText(line), {
      lang,
      voiceName: voiceFor(line.speaker),
      onStart: () => { if (alive.current) setSpeakingLine(from) },
      onEnd: done => {
        if (!alive.current) return
        if (done && from + 1 < dialog.length) setTimeout(() => speakAll(from + 1), 350)
        else setSpeakingLine(-1)
      },
    })
  }

  const playing = speakingLine >= 0
  const options = useMemo(
    () => (distractors.length ? shuffled([answer, ...distractors]) : []),
    [answer, distractors],
  )

  const gapSlot = (line: DialogLine) => {
    const [before, after] = line.text.split(GAP_MARK)
    return (
      <>
        {before}
        <span style={{
          display: 'inline-block', minWidth: 64, margin: '0 4px', padding: '1px 10px',
          borderRadius: 8, textAlign: 'center', fontWeight: 700,
          border: showVerdict
            ? `1.5px solid ${correct ? '#6EE7A0' : '#F48B91'}`
            : value?.trim() ? '1.5px solid rgba(var(--accent-rgb), 0.38)' : '1.5px dashed var(--color-border-strong)',
          background: showVerdict
            ? (correct ? 'var(--color-green-soft)' : 'var(--color-red-soft)')
            : value?.trim() ? 'var(--color-purple-soft)' : 'transparent',
          color: value?.trim() ? 'var(--color-text)' : 'var(--color-muted)',
        }}>
          {value?.trim() || '…'}
        </span>
        {after}
      </>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <button
        onClick={() => { if (playing) { stopSpeech(); setSpeakingLine(-1) } else speakAll(0) }}
        className="flex items-center self-start cursor-pointer"
        style={{
          gap: 8, padding: '9px 16px', borderRadius: 999, border: 'none',
          background: 'var(--grad-purple)', color: '#fff',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
        }}
      >
        {playing ? <Square size={13} /> : <Play size={13} />}
        {playing ? t('Остановить') : t('Прослушать диалог')}
      </button>

      {/* Чат: реплики первого спикера слева, второго — справа. */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        {dialog.map((line, i) => {
          const side = speakers.indexOf(line.speaker) % 2
          const hasGap = line.text.includes(GAP_MARK)
          const active = speakingLine === i
          return (
            <div key={i} className="flex" style={{ justifyContent: side ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '86%', padding: '9px 13px',
                borderRadius: side ? '15px 15px 4px 15px' : '15px 15px 15px 4px',
                background: side ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                border: `1px solid ${active ? 'rgba(var(--accent-rgb), 0.45)' : 'var(--color-border-soft)'}`,
              }}>
                <div className="flex items-center" style={{ gap: 7, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-accent)' }}>
                    {line.speaker}
                  </span>
                  <button
                    onClick={() => { stopSpeech(); speakLine(i) }}
                    aria-label={t('Озвучить реплику')}
                    className="cursor-pointer"
                    style={{
                      border: 'none', background: 'transparent', padding: 2, display: 'flex',
                      color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                    }}
                  >
                    <Volume2 size={13} />
                  </button>
                </div>
                <div style={{ fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-text)' }}>
                  {hasGap ? gapSlot(line) : line.text}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Ответ: плитки-варианты, а без них — ввод. */}
      {options.length > 0
        ? (
          <div className="flex flex-wrap" style={{ gap: 8 }}>
            {options.map(opt => {
              const active = value === opt
              return (
                <button
                  key={opt}
                  onClick={() => {
                    if (disabled) return
                    playPop()
                    vibrate(8)
                    onChange(active ? '' : opt)
                  }}
                  className="cursor-pointer"
                  style={{
                    padding: '9px 14px', borderRadius: 12, fontFamily: 'inherit',
                    fontSize: 14, fontWeight: 650, lineHeight: 1.3,
                    border: `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
                    background: active ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
                    color: active ? 'var(--color-accent)' : 'var(--color-text)',
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        )
        : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            <GrowTextarea
              value={value ?? ''}
              onChange={onChange}
              disabled={disabled}
              minHeight={growMinHeight(1, 14, 11, 1.5)}
              placeholder={t('Впиши пропущенную реплику…')}
              inputMode={scriptKeyboardCovers(answer) ? 'none' : undefined}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 14,
                fontFamily: 'inherit', fontSize: 14, color: 'var(--color-text)',
                background: 'var(--color-bg-input)', outline: 'none',
                border: `1px solid ${showVerdict ? (correct ? '#6EE7A0' : '#F48B91') : 'var(--color-border)'}`,
              }}
            />
            {/* Реплику ждут письмом, которого нет на клавиатуре ученика. */}
            {needsScriptKeyboard(answer) && !disabled && (
              <ScriptKeyboard answer={answer} value={value} onChange={onChange} />
            )}
          </div>
        )}

      {showVerdict && !correct && (
        <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--color-green-text)', fontWeight: 700 }}>
          {t('Правильно')}: {answer}
        </p>
      )}
    </div>
  )
}
