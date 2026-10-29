import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Clock, ExternalLink, ListChecks, Loader2, Play } from 'lucide-react'
import { TESTLY_DONE_PREFIX, testlyAnswer, testlyDoneAt, testlyScoreOf, type TestlyRef, type TestlyScore } from '../data/taskTypes'
import {
  fetchTestlyStatus, plural, startTestlyTest, testlyPlayUrl, testlyPoints, testlyReviewUrl, type TestlyAttempt,
} from '../lib/testlyModule'
import { playPop, vibrate } from '../lib/sound'
import { useT, useLang } from '../lib/i18n'
import { TestlyTile } from './TestlyMark'

/*
 * Тест из Тестли в домашке ученика. Тест проходится на сайте Тестли по личной
 * ссылке ученика — на весь экран, с сохранением на каждом шаге, — а сюда сам
 * приходит статус: начат («Продолжить тест»), сдан и балл «14 / 19» с разбором,
 * или часть ждёт проверки учителя. Статус спрашиваем при открытии, при
 * возвращении на вкладку и раз в 20 секунд, пока тест открыт у ученика.
 *
 * Если Тестли недоступен (учитель отключил модуль, сеть) — запасной путь шага 1:
 * общая ссылка на тест и отметка «Я сдал тест».
 */
const POLL_MS = 20_000

export default function TestlyTask({ test, value, disabled, onChange }: {
  test: TestlyRef | undefined
  value: string | undefined
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const [attempt, setAttempt] = useState<TestlyAttempt | null>(null)
  const [offline, setOffline] = useState(false)
  const [opening, setOpening] = useState(false)
  const [opened, setOpened] = useState(false)
  // Свежие value/onChange без перезапуска опроса: колбэки домашки новые на каждый рендер.
  const live = useRef({ value, onChange, disabled })
  live.current = { value, onChange, disabled }

  const refresh = useCallback(async () => {
    if (!test?.id) return
    try {
      const a = await fetchTestlyStatus(test.id, test.owner)
      setAttempt(a); setOffline(false)
      const { value: v, onChange: change, disabled: off } = live.current
      if (a.state === 'submitted' && !off) {
        const score: TestlyScore | null = a.got != null && a.max != null
          ? { got: a.got, max: a.max, pending: !!a.pending, ...(a.review ? { review: a.review } : {}) }
          : null
        const next = testlyAnswer(a.submittedAt ?? new Date().toISOString(), score)
        if (next !== v) change(next)
      }
    } catch {
      setOffline(true)
    }
  }, [test?.id, test?.owner])

  useEffect(() => {
    void refresh()
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [refresh])

  // Пока тест начат (или итог ждёт проверки учителя) — переспрашиваем сами.
  const waiting = attempt?.state === 'started' || (attempt?.state === 'submitted' && !!attempt.pending) || opened
  useEffect(() => {
    if (!waiting) return
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, POLL_MS)
    return () => window.clearInterval(id)
  }, [waiting, refresh])

  if (!test?.id) {
    return (
      <div style={{ fontSize: 13.5, color: 'var(--color-muted)' }}>
        {t('Тест не выбран — покажите задание преподавателю.')}
      </div>
    )
  }

  const fmt = (iso: string, withDay = true) => new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU',
    withDay ? { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' })

  const start = async () => {
    if (disabled || opening) return
    if (offline) { setOpened(true); window.open(testlyPlayUrl(test.id), '_blank', 'noopener'); return }
    // Окно открываем сразу по клику: после await Safari его заблокирует.
    const w = window.open('', '_blank')
    setOpening(true)
    try {
      const url = await startTestlyTest(test.id, test.owner)
      if (w) { w.opener = null; w.location.href = url } else window.location.href = url
      setOpened(true)
    } catch {
      w?.close()
      setOffline(true)
    } finally {
      setOpening(false)
    }
  }
  const mark = () => {
    if (disabled || testlyDoneAt(value) !== null) return
    playPop()
    vibrate(10)
    onChange(TESTLY_DONE_PREFIX + new Date().toISOString())
  }

  const doneAt = attempt?.state === 'submitted' ? (attempt.submittedAt ?? '') : testlyDoneAt(value)
  const score: TestlyScore | null = attempt?.state === 'submitted'
    ? (attempt.got != null && attempt.max != null ? { got: attempt.got, max: attempt.max, pending: !!attempt.pending, review: attempt.review } : null)
    : testlyScoreOf(value)
  const started = doneAt === null && attempt?.state === 'started'

  const btn = (bg: string, fg: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none',
    fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', background: bg, color: fg,
  } as const)
  const side = (text: string) => (
    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>{text}</span>
  )

  let body
  if (doneAt !== null) {
    const pending = !!score?.pending
    body = (
      <div className="flex items-center" style={{ gap: 12, flexWrap: 'wrap' }}>
        <span style={{
          ...btn(pending ? 'var(--color-yellow-soft)' : 'var(--color-green-soft)', pending ? 'var(--color-yellow-text)' : 'var(--color-green-text)'),
          cursor: 'default', fontVariantNumeric: 'tabular-nums',
        }}>
          {!pending && <Check size={14} />}
          {score
            ? pending
              ? `${testlyPoints(score.got, score.max)} · ${t('автопроверка')}`
              : `${testlyPoints(score.got, score.max)} ${t(plural(Math.round(score.max), 'балл', 'балла', 'баллов'))}`
            : t('Тест сдан')}
        </span>
        {pending
          ? side(t('Вторую часть проверяет преподаватель'))
          : doneAt ? side(`${t('Сдан')} ${fmt(doneAt)}`) : null}
        {score?.review && !pending && (
          <a href={testlyReviewUrl(score.review)} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)',
            color: 'var(--color-accent)', fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            {t('Открыть разбор')} <ExternalLink size={13} />
          </a>
        )}
      </div>
    )
  } else {
    body = (
      <>
        {!started && (
          <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            {t('Тест откроется на весь экран. Ответы сохраняются на каждом шаге — если закроете, продолжите с того же места.')}
          </span>
        )}
        <div className="flex items-center" style={{ gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => void start()} disabled={disabled || opening} style={btn('var(--color-purple-soft)', 'var(--color-purple-text)')}>
            {opening ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={14} />}
            {started || opened ? t('Продолжить тест') : t('Начать тест')}
          </button>
          {started && attempt?.startedAt && side(
            `${t('Начат в')} ${fmt(attempt.startedAt, false)}${attempt.total ? ` · ${t('ответов')} ${attempt.answered ?? 0} ${t('из')} ${attempt.total}` : ''}`,
          )}
          {/* Запасной путь: Тестли не ответил — сдачу отмечает сам ученик, как на шаге 1. */}
          {offline && opened && (
            <button onClick={mark} disabled={disabled} style={btn('var(--btn-green-bg)', '#fff')}>
              <Check size={14} /> {t('Я сдал тест')}
            </button>
          )}
        </div>
      </>
    )
  }

  const note = doneAt !== null
    ? score?.pending
      ? t('Итоговый балл придёт сам, когда преподаватель проверит вторую часть в Тестли.')
      : score ? (score.review ? t('Баллы и разбор — из Тестли.') : t('Баллы — из Тестли.')) : t('Результат покажет преподаватель.')
    : offline
      ? t('Тестли сейчас не отвечает. Когда сдадите тест, вернитесь сюда и отметьте сдачу.')
      : t('Балл придёт сюда сам, как только вы сдадите тест в Тестли.')

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-input)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          borderBottom: '1px solid var(--color-border-soft)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)',
        }}>
          <TestlyTile size={16} /> {t('Тестли')}
        </div>
        <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: 'var(--color-text-3)' }} /> {test.questions} {t(plural(test.questions, 'вопрос', 'вопроса', 'вопросов'))}</span>
            {test.minutes ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={14} style={{ color: 'var(--color-text-3)' }} /> {test.minutes} {t('мин')}</span> : null}
          </div>
          {body}
        </div>
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{note}</span>
    </div>
  )
}
