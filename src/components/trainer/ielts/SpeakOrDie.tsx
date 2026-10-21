// ─────────────────────────────────────────────────────────────────────────────
// Speak or Die — минута речи без пауз
//
// Что тренирует. Fluency and Coherence — четверть балла Speaking, и теряется
// она не на грамматике, а на паузах: человек знает, что сказать, но
// останавливается подобрать слово. Игра наказывает ровно это — тишину. Тема
// выпадает случайно (как карточка Part 2), минута на ответ, и если речь
// замирает дольше порога, раунд проигран.
//
// КАК СЛЫШИМ ТИШИНУ. Не по громкости микрофона (кашель и «эээ» громкие), а по
// распознаванию: тишина — это время, за которое не прибавилось ни одного
// слова. Так «ммм» на три секунды честно считается паузой.
//
// Ничего не уходит наружу: расшифровка живёт только в этом раунде, рекорд — в
// localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogOut, Mic, RotateCcw, Trophy } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { isAsrAvailable, listenLong, type AsrSession } from '../../../lib/asr'
import { wordCount } from '../../../lib/ieltsScore'
import { loadArcade, saveArcade } from '../../../lib/ieltsMocks'

const TOPICS = [
  'Describe a place in your city where you like to spend time.',
  'Talk about a skill you would like to learn and why.',
  'Describe a book or a film that changed how you think.',
  'Talk about a time you helped someone.',
  'Describe your perfect weekend.',
  'Talk about a technology you could not live without.',
  'Describe a teacher who influenced you.',
  'Talk about a journey that did not go as planned.',
  'Describe a tradition in your family or country.',
  'Should students wear school uniforms? Give your opinion.',
  'Is it better to live in a city or in the countryside?',
  'Talk about a goal you achieved and how you did it.',
  'Describe a meal you remember well.',
  'Should public transport be free? Explain your view.',
  'Talk about something you bought recently and regret.',
  'Describe a piece of advice that helped you.',
  'Are social networks good for friendships?',
  'Describe an interesting job and what makes it interesting.',
  'Talk about how your daily routine has changed in the last few years.',
  'Should children learn a second language from an early age?',
]

const LEVELS = [
  { id: 'easy', label: 'Лёгкий', silence: 5 },
  { id: 'mid', label: 'Средний', silence: 3.5 },
  { id: 'hard', label: 'Сложный', silence: 2.5 },
] as const

const ROUND = 60

type Phase = 'ready' | 'play' | 'won' | 'lost'

export default function SpeakOrDie({ accent, soft, onClose }: { accent: string; soft: string; onClose: () => void }) {
  const t = useT()
  const [level, setLevel] = useState<(typeof LEVELS)[number]>(LEVELS[1])
  const [topic, setTopic] = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)])
  const [phase, setPhase] = useState<Phase>('ready')
  const [now, setNow] = useState(Date.now())
  const [text, setText] = useState('')
  const [record, setRecord] = useState(loadArcade)
  const startRef = useRef(0)
  const lastWordRef = useRef(0)
  const wordsRef = useRef(0)
  const asrRef = useRef<AsrSession | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev; asrRef.current?.cancel() }
  }, [])

  // setInterval, а не rAF: в превью rAF не срабатывает. Четверть секунды —
  // полоса тишины должна ползти, а не прыгать.
  useEffect(() => {
    if (phase !== 'play') return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [phase])

  const elapsed = phase === 'play' ? (now - startRef.current) / 1000 : 0
  const silent = phase === 'play' ? (now - lastWordRef.current) / 1000 : 0

  const finish = (won: boolean) => {
    asrRef.current?.stop()
    asrRef.current = null
    const words = wordsRef.current
    const next = { best: Math.max(record.best, won ? words : 0), plays: record.plays + 1, last: Date.now() }
    saveArcade(next)
    setRecord(next)
    setPhase(won ? 'won' : 'lost')
  }

  useEffect(() => {
    if (phase !== 'play') return
    if (elapsed >= ROUND) finish(true)
    else if (silent >= level.silence) finish(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  const start = () => {
    setText('')
    wordsRef.current = 0
    startRef.current = Date.now()
    // Первые слова приходят не сразу: распознавалке нужна секунда, чтобы
    // проснуться. Две секунды форы — чтобы не проиграть, не успев начать.
    lastWordRef.current = Date.now() + 2000
    setNow(Date.now())
    setPhase('play')
    asrRef.current = listenLong('en-US', said => {
      const n = wordCount(said)
      if (n > wordsRef.current) {
        wordsRef.current = n
        lastWordRef.current = Date.now()
      }
      setText(said)
    })
  }

  const again = () => {
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)])
    setPhase('ready')
  }

  const danger = Math.min(1, Math.max(0, silent / level.silence))
  const asr = isAsrAvailable()

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px',
        borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
      }}>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 850, color: 'var(--color-text)' }}>Speak or Die</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--color-text-2)' }}>
          <Trophy size={14} style={{ color: accent }} /> {t('рекорд')}: {record.best} {t('слов')}
        </span>
        <button type="button" onClick={onClose} title={t('Закрыть')} style={{
          width: 34, height: 34, borderRadius: 999, border: 'none', background: 'var(--color-bg-3)',
          color: 'var(--color-text)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}><LogOut size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 16px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ padding: '18px 20px', borderRadius: 18, background: soft }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6 }}>{t('Тема')}</div>
            <div style={{ fontSize: 20, lineHeight: 1.4, fontWeight: 800, color: 'var(--color-text)' }}>{topic}</div>
          </div>

          {phase === 'ready' && (
            <>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: 'var(--color-text)' }}>
                {t('Говорите минуту без остановки. Замолчали дольше, чем позволяет уровень, — раунд проигран. «Эээ» не спасает: считаются только слова.')}
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LEVELS.map(l => (
                  <button key={l.id} type="button" onClick={() => setLevel(l)} style={{
                    height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 700,
                    border: `1.5px solid ${level.id === l.id ? accent : 'var(--color-border-soft)'}`,
                    background: level.id === l.id ? soft : 'var(--color-bg-2)',
                    color: level.id === l.id ? accent : 'var(--color-text)',
                  }}>
                    {t(l.label)} · {String(l.silence).replace('.', ',')} {t('с тишины')}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={start} disabled={!asr} style={{
                  height: 44, padding: '0 24px', borderRadius: 999, border: 'none', cursor: asr ? 'pointer' : 'default',
                  background: 'var(--grad-purple)', color: '#fff', fontWeight: 750, fontSize: 15, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 8, opacity: asr ? 1 : 0.5,
                }}>
                  <Mic size={16} /> {t('Начать')}
                </button>
                <button type="button" onClick={again} style={{
                  height: 44, padding: '0 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'var(--color-bg-3)', color: 'var(--color-text)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <RotateCcw size={15} /> {t('Другая тема')}
                </button>
              </div>
              {!asr && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-red-text)' }}>
                  {t('В этом браузере нет распознавания речи. Откройте в Chrome, Edge или Safari.')}
                </p>
              )}
            </>
          )}

          {phase === 'play' && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <span style={{ fontSize: 44, fontWeight: 850, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.max(0, Math.ceil(ROUND - elapsed))}
                </span>
                <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{t('секунд')} · {wordsRef.current} {t('слов')}</span>
              </div>
              {/* Полоса тишины: пустая, пока идут слова, краснеет к порогу. */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: danger > 0.6 ? 'var(--color-red-text)' : 'var(--color-text-2)', marginBottom: 6 }}>
                  {danger > 0.6 ? t('Говорите!') : t('Тишина')}
                </div>
                <div style={{ height: 12, borderRadius: 6, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${danger * 100}%`, height: '100%', transition: 'width 0.25s linear',
                    background: danger > 0.6 ? 'var(--color-red-text)' : accent,
                  }} />
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: 'var(--color-text-2)', minHeight: 70 }}>
                {text.split(' ').slice(-30).join(' ')}
              </p>
            </>
          )}

          {(phase === 'won' || phase === 'lost') && (
            <>
              <div style={{ fontSize: 28, fontWeight: 850, color: phase === 'won' ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>
                {phase === 'won' ? t('Минута выдержана!') : t('Пауза слишком длинная')}
              </div>
              <div style={{ fontSize: 15, color: 'var(--color-text)' }}>
                {wordsRef.current} {t('слов')}
                {phase === 'won' && wordsRef.current >= record.best && wordsRef.current > 0 ? ` · ${t('новый рекорд')}` : ''}
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-2)' }}>
                {t('Ориентир: на band 7 за минуту говорят 110–150 слов связно. Меньше 80 — беглость тянет балл вниз.')}
              </p>
              {text && (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--color-text)', padding: '12px 14px', borderRadius: 14, background: 'var(--color-bg-2)' }}>
                  {text}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={start} style={{
                  height: 42, padding: '0 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'var(--grad-purple)', color: '#fff', fontWeight: 750, fontSize: 14, fontFamily: 'inherit',
                }}>{t('Ещё раз')}</button>
                <button type="button" onClick={again} style={{
                  height: 42, padding: '0 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'var(--color-bg-3)', color: 'var(--color-text)', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                }}>{t('Новая тема')}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
