// ─────────────────────────────────────────────────────────────────────────────
// «Верно / Неверно / Не указано» (trueFalse) — пачка утверждений к одному тексту
//
// ЗАЧЕМ ТРЕТЬЯ КНОПКА. Она и есть весь тип. Две кнопки проверяют догадку: из
// «Anna drives a car» половина учеников угадает по одному знакомому слову.
// Третья заставляет спросить себя «а сказано ли это вообще» — и отделить
// прочитанное от того, что ученик знает про жизнь.
//
// ПОЧЕМУ ПАЧКОЙ, А НЕ ТРЕМЯ ВОПРОСАМИ. Три отдельных «Один ответ» заставляют
// перечитывать текст с нуля трижды и печатают варианты «Верно/Неверно/Не
// указано» три раза подряд. Здесь текст один, утверждения под ним, и работа
// идёт так же, как в экзаменационной тетради.
//
// Ответ уходит одной строкой-JSON «номер утверждения → вердикт»: хранилище
// домашки держит на задание ровно одну строку (тот же приём у дрилла, пропусков
// по банку и кроссворда).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { answerMap, type TfStatement, type TfVerdict } from '../data/taskTypes'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

/** Подписи кнопок. «Не указано» — полностью: сокращение здесь читается хуже. */
const CAPTION: Record<TfVerdict, string> = {
  T: 'Верно',
  F: 'Неверно',
  NG: 'Не указано',
}
const ORDER: TfVerdict[] = ['T', 'F', 'NG']

export default function TrueFalseSolver({ rows, value, disabled, showVerdict, onChange }: {
  rows: TfStatement[]
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const [answerNow, emit] = useOwnString(value, onChange)
  const given = useMemo(() => answerMap(answerNow), [answerNow])

  const pick = (i: number, v: TfVerdict) => {
    if (disabled) return
    playPop()
    vibrate(8)
    emit(prev => JSON.stringify({ ...answerMap(prev), [String(i)]: v }))
  }

  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {rows.map((row, i) => {
        const chosen = given[String(i)] as TfVerdict | undefined
        const ok = showVerdict ? chosen === row.verdict : null
        return (
          <div
            key={i}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8,
              padding: '11px 13px', borderRadius: 14,
              border: `1px solid ${
                ok === null ? 'var(--color-border-soft)' : ok ? '#6EE7A0' : '#F48B91'
              }`,
              background: ok === null
                ? 'var(--color-bg-input)'
                : ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
            }}
          >
            <div style={{ fontSize: 15, lineHeight: 1.5, color: 'var(--color-text)' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-text-4)', marginRight: 7 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              {row.text}
            </div>

            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {ORDER.map(v => {
                const on = chosen === v
                // После сдачи верный вердикт подсвечен всегда — в том числе
                // когда ученик его не выбрал: иначе ошибка остаётся без ответа.
                const truth = showVerdict && v === row.verdict
                return (
                  <button
                    key={v}
                    onClick={() => pick(i, v)}
                    disabled={disabled}
                    style={{
                      padding: '7px 13px', borderRadius: 10, fontFamily: 'inherit',
                      fontSize: 13.5, fontWeight: 650, cursor: disabled ? 'default' : 'pointer',
                      border: `1.5px solid ${
                        truth ? '#3FAE6E'
                          : on ? (showVerdict ? '#E2646B' : 'var(--color-accent)')
                          : 'var(--color-border-soft)'
                      }`,
                      background: truth
                        ? 'var(--color-green-soft)'
                        : on ? (showVerdict ? 'var(--color-red-soft)' : 'var(--color-purple-soft)')
                        : 'rgba(var(--glass-rgb), 0.96)',
                      color: truth
                        ? 'var(--color-green-text)'
                        : on ? (showVerdict ? 'var(--color-red-text)' : 'var(--color-text)')
                        : 'var(--color-text-2)',
                      opacity: disabled && !on && !truth ? 0.6 : 1,
                    }}
                  >
                    {t(CAPTION[v])}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
