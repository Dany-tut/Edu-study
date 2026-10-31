import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Clock, ExternalLink, ListChecks, Loader2, Play, RotateCcw } from './icons/appIcons'
import { TESTLY_DONE_PREFIX, testlyAnswer, testlyDoneAt, testlyScoreOf, type TestlyRef, type TestlyScore } from '../data/taskTypes'
import {
  fetchTestlyStatus, needsStudentLogin, plural, startTestlyTest, testlyPoints, testlyReviewUrl, type TestlyAttempt,
} from '../lib/testlyModule'
import { playPop, vibrate } from '../lib/sound'
import { useT, useLang } from '../lib/i18n'
import { TestlyTile } from './TestlyMark'
import { testlyPresentation } from '../lib/testlyPresentation'

/*
 * Тест из Тестли в домашке ученика. Личная ссылка Тестли открывается внутри
 * карточки Искры, с сохранением ответов на стороне Тестли, — а сюда сам
 * приходит статус: начат («Продолжить тест»), сдан и балл «14 / 19» с разбором,
 * или часть ждёт проверки учителя. Статус спрашиваем при открытии, при
 * возвращении на вкладку и раз в пять секунд, пока тест открыт у ученика.
 *
 * Если Тестли недоступен (учитель отключил модуль, сеть) — запасной путь шага 1:
 * общая ссылка на тест и отметка «Я сдал тест».
 */
// Статус нужен сразу после отправки внутри iframe. Частый лёгкий опрос
// устраняет длинное окно, в котором Искра ещё считает тест начатым.
const POLL_MS = 5_000

export default function TestlyTask({ test, value, disabled, onChange, onReopen }: {
  test: TestlyRef | undefined
  value: string | undefined
  disabled?: boolean
  onChange: (value: string) => void
  onReopen?: () => void
}) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const [attempt, setAttempt] = useState<TestlyAttempt | null>(null)
  const [offline, setOffline] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [opening, setOpening] = useState(false)
  const [opened, setOpened] = useState(false)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const embedSrc = embedUrl ? (() => {
    const url = new URL(embedUrl)
    url.searchParams.set('embed', 'iskra')
    return url.href
  })() : null

  // Свежие value/onChange без перезапуска опроса: колбэки домашки новые на каждый рендер.
  const requestSeq = useRef(0)
  const live = useRef({ value, onChange, disabled, onReopen })
  live.current = { value, onChange, disabled, onReopen }

  const refresh = useCallback(async () => {
    if (!test?.id) return
    const request = ++requestSeq.current
    try {
      const a = await fetchTestlyStatus(test.id, test.owner)
      if (request !== requestSeq.current) return
      setAttempt(a); setOffline(false); setSessionError('')
      const { value: v, onChange: change } = live.current
      if (a.state === 'started' && (testlyDoneAt(v) !== null || live.current.disabled)) {
        setEmbedUrl(null); setOpened(false)
        live.current.onReopen?.()
        return
      }
      if (a.state === 'submitted') {
        setEmbedUrl(null)
        const fetchedScore: TestlyScore | null = a.got != null && a.max != null
          ? { got: a.got, max: a.max, pending: !!a.pending, ...(a.review ? { review: a.review } : {}) }
          : null
        // Ответы Testly могут на короткое время прийти без итоговых баллов
        // (например, пока пересчитывается оценка). Не затираем уже сохранённый балл.
        const next = testlyAnswer(a.submittedAt ?? testlyDoneAt(v) ?? new Date().toISOString(), fetchedScore ?? (testlyScoreOf(v) ? { ...testlyScoreOf(v)!, pending: !!a.pending } : null))
        if (next !== v) change(next)
      }
    } catch (error) {
      if (request === requestSeq.current) {
        setSessionError(needsStudentLogin(error) ? (error as Error).message : '')
        setOffline(true)
      }
    }
  }, [test?.id, test?.owner])

  useEffect(() => {
    void refresh()
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { requestSeq.current++; window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [refresh])

  // Пока тест начат (или итог ждёт проверки учителя) — переспрашиваем сами.
  const waiting = !!test?.id
  useEffect(() => {
    if (!waiting || sessionError) return
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, POLL_MS)
    return () => window.clearInterval(id)
  }, [waiting, refresh, sessionError])

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
    setOpening(true)
    try {
      const url = await startTestlyTest(test.id, test.owner)
      setEmbedUrl(url)
      setOpened(true)
      setOffline(false); setSessionError('')
    } catch (error) {
      setSessionError(needsStudentLogin(error) ? (error as Error).message : '')
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

  const { doneAt, score, started, pending, progress, percent } = testlyPresentation(attempt, value)
  const statusLabel = sessionError ? t('Требуется вход') : offline ? t('Нет связи')
    : doneAt !== null ? pending ? t('На проверке') : t('Тест сдан')
    : started ? t('В процессе') : t('Не начат')

  const btn = (bg: string, fg: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none',
    fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', background: bg, color: fg,
  } as const)
  const side = (text: string) => (
    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>{text}</span>
  )

  const note = sessionError || (offline
    ? t('Не удалось обновить статус. Последние полученные данные сохранены; Искра проверит статус ещё раз автоматически.')
    : doneAt !== null
      ? pending
        ? t('Итоговый балл придёт сам, когда преподаватель проверит вторую часть в Тестли.')
        : score ? t('Баллы и результат — из Тестли.') : t('Результат покажет преподаватель.')
      : t('Ответы сохраняются в Тестли на каждом шаге. Балл появится здесь после сдачи.'))

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-input)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-soft)', fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TestlyTile size={18} /> {t('Тестли')}</span>
          <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-2)' }}>
            {doneAt !== null && !pending && !offline ? <Check size={14} /> : <Clock size={14} />} {statusLabel}
          </span>
        </div>
        <div style={{ padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: 'var(--color-text-3)' }} /> {test.questions} {t(plural(test.questions, 'вопрос', 'вопроса', 'вопросов'))}</span>
            {test.minutes ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={14} style={{ color: 'var(--color-text-3)' }} /> {test.minutes} {t('мин')}</span> : null}
          </div>
          {doneAt !== null && score && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, width: '100%' }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{pending ? t('Баллы автопроверки') : t('Набрано баллов')}</p>
                <p style={{ color: 'var(--color-text)', fontSize: 'clamp(22px, 5vw, 30px)', overflowWrap: 'anywhere', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>
                  {testlyPoints(score.got, score.max)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{pending ? t('Предварительный результат') : t('Результат')}</p>
                <p style={{ color: 'var(--color-text)', fontSize: 'clamp(22px, 5vw, 30px)', overflowWrap: 'anywhere', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1.3 }}>{percent}%</p>
              </div>
            </div>
          )}
          {doneAt !== null && pending && <p style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{t('Вторую часть проверяет преподаватель')}</p>}
          {progress && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--color-text-2)' }}>
                <span>{t('Ответов')} {progress.answered} {t('из')} {progress.total}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t('Заполнено')} {progress.percent}%</span>
              </div>
              <div role="progressbar" aria-label={t('Ответы в тесте')} aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.answered}
                style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-3)', overflow: 'hidden' }}>
                <div style={{ width: `${progress.percent}%`, height: '100%', borderRadius: 'inherit', background: 'var(--color-accent)' }} />
              </div>
            </div>
          )}
          {!progress && (started || doneAt !== null) && (
            <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Заполненность пока недоступна.')}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {sessionError && <a href={`#/login?next=${encodeURIComponent(window.location.hash)}`} style={{ ...btn('var(--color-purple-soft)', 'var(--color-purple-text)'), textDecoration: 'none' }}>{t('Войти учеником')}</a>}
            {doneAt === null && !disabled && !embedUrl && !sessionError && (
              <button type="button" onClick={() => void start()} disabled={opening} style={btn('var(--color-purple-soft)', 'var(--color-purple-text)')}>
                {opening ? <Loader2 size={14} /> : <Play size={14} />}
                {opening ? t('Открываем тест…') : started || opened ? t('Продолжить тест') : t('Начать тест')}
              </button>
            )}
            {doneAt !== null && score?.review && !pending && (
              <a href={testlyReviewUrl(score.review)} target="_blank" rel="noopener noreferrer" style={{
                ...btn('var(--color-purple-soft)', 'var(--color-purple-text)'), textDecoration: 'none', cursor: 'pointer',
              }}>{t('Открыть разбор')} <ExternalLink size={14} /></a>
            )}
            {offline && <button type="button" onClick={() => void refresh()} style={{ ...btn('var(--color-bg-3)', 'var(--color-text)'), cursor: 'pointer' }}><RotateCcw size={14} />{t('Обновить статус')}</button>}
            {started && attempt?.startedAt && side(`${t('Начат в')} ${fmt(attempt.startedAt, false)}`)}
            {doneAt && side(`${t('Сдан')} ${fmt(doneAt)}`)}
            {offline && opened && !embedUrl && doneAt === null && (
              <button type="button" onClick={mark} disabled={disabled} style={btn('var(--btn-green-bg)', '#fff')}><Check size={14} /> {t('Я сдал тест')}</button>
            )}
          </div>
        </div>
      </div>
      {embedUrl && (
        <section style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, border: '1px solid var(--color-border-medium)', background: '#fff' }}>
          <iframe
            title={t('Тест Тестли')}
            src={embedSrc ?? undefined}
            scrolling="no"
            allow="fullscreen; clipboard-read; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            style={{ display: 'block', width: '100%', height: 760, border: 0, background: '#fff' }}
          />
        </section>
      )}
      <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{note}</span>
    </div>
  )
}
