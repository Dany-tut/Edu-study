import { useState } from 'react'
import { Check, Clock, ListChecks, Play } from 'lucide-react'
import { TESTLY_DONE_PREFIX, testlyDoneAt, type TestlyRef } from '../data/taskTypes'
import { plural, testlyPlayUrl } from '../lib/testlyModule'
import { playPop, vibrate } from '../lib/sound'
import { useT, useLang } from '../lib/i18n'
import { TestlyTile } from './TestlyMark'

/*
 * Тест из Тестли в домашке ученика. Тест проходится на сайте Тестли — на весь
 * экран, с сохранением на каждом шаге — и ученик возвращается сюда.
 *
 * ШАГ 1: результат из Тестли сюда ещё не приходит, поэтому сдачу отмечает сам
 * ученик («Я сдал тест»), как у внешнего упражнения. Балл придёт на шаге 2 —
 * через личное приглашение в Тестли на каждого ученика.
 */
export default function TestlyTask({ test, value, disabled, onChange }: {
  test: TestlyRef | undefined
  value: string | undefined
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const [opened, setOpened] = useState(false)
  const doneAt = testlyDoneAt(value)

  if (!test?.id) {
    return (
      <div style={{ fontSize: 13.5, color: 'var(--color-muted)' }}>
        {t('Тест не выбран — покажите задание преподавателю.')}
      </div>
    )
  }

  const start = () => {
    setOpened(true)
    window.open(testlyPlayUrl(test.id), '_blank', 'noopener')
  }
  const mark = () => {
    if (disabled || doneAt !== null) return
    playPop()
    vibrate(10)
    onChange(TESTLY_DONE_PREFIX + new Date().toISOString())
  }
  const when = doneAt
    ? new Date(doneAt).toLocaleString(lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : ''

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
          {doneAt !== null ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12,
              fontSize: 14, fontWeight: 700, background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
            }}>
              <Check size={14} /> {t('Тест сдан')}{when ? ` · ${when}` : ''}
            </span>
          ) : (
            <>
              <span style={{ fontSize: 13.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                {t('Тест откроется на весь экран. Ответы сохраняются на каждом шаге — если закроете, продолжите с того же места.')}
              </span>
              <div className="flex" style={{ gap: 10, flexWrap: 'wrap' }}>
                <button onClick={start} disabled={disabled} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
                  background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)',
                }}>
                  <Play size={14} /> {opened ? t('Открыть тест ещё раз') : t('Начать тест')}
                </button>
                {opened && (
                  <button onClick={mark} disabled={disabled} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, border: 'none',
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
                    background: 'var(--btn-green-bg)', color: '#fff',
                  }}>
                    <Check size={14} /> {t('Я сдал тест')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
        {doneAt !== null
          ? t('Баллы увидит преподаватель в Тестли.')
          : t('Когда сдадите тест в Тестли, вернитесь сюда и отметьте сдачу.')}
      </span>
    </div>
  )
}
