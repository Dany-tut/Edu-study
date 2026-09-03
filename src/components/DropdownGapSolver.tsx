// ─────────────────────────────────────────────────────────────────────────────
// «Пропуски со списками» (dropdownGap) — узнавание формы в контексте
//
// ЧЕМ ЭТО НЕ СОСЕДНИЕ ТИПЫ. У «вписать ответ» опоры нет вовсе, у «пропусков по
// банку слов» банк общий на всю пачку строк. Здесь свой короткий список стоит
// ПРЯМО В МЕСТЕ ПРОПУСКА: ответ виден, но выбрать его можно, только прочитав
// соседей по строке. Это ступень между выбором из четырёх и пустым полем —
// та самая, которой в курсе не было.
//
// ПОЧЕМУ НЕ НАТИВНЫЙ <select>. Во-первых, у нас все органы управления свои
// (нативный список игнорирует тему и рисуется системой поверх страницы).
// Во-вторых, на телефоне нативный список открывается колесом на пол-экрана и
// закрывает собой предложение — то самое, ради чтения которого задание и
// сделано.
//
// Ответ — строка-JSON «номер пропуска → индекс выбранного варианта».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { answerMap, gapTextParts, type GapChoice } from '../data/taskTypes'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

export default function DropdownGapSolver({ text, gaps, value, disabled, showVerdict, onChange }: {
  /** Предложение целиком, места пропусков отмечены «____». */
  text: string
  gaps: GapChoice[]
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const [answerNow, emit] = useOwnString(value, onChange)
  const given = useMemo(() => answerMap(answerNow), [answerNow])
  const [open, setOpen] = useState<number | null>(null)
  const hostRef = useRef<HTMLDivElement | null>(null)

  // Тап мимо списка закрывает его. Слушаем на документе: список рисуется внутри
  // строки, и «мимо» — это чаще всего сам текст задания.
  useEffect(() => {
    if (open === null) return
    const away = (e: MouseEvent | TouchEvent) => {
      if (!hostRef.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('touchstart', away)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('touchstart', away)
    }
  }, [open])

  const parts = gapTextParts(text)
  const choose = (gi: number, oi: number) => {
    playPop()
    vibrate(8)
    emit(prev => JSON.stringify({ ...answerMap(prev), [String(gi)]: String(oi) }))
    setOpen(null)
  }

  /** Слой внутри пустой таблетки: и призраки вариантов, и само «Выбрать». */
  const pillContent: React.CSSProperties = {
    gridArea: '1 / 1', display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
  }

  return (
    <div ref={hostRef} style={{ fontSize: 16, lineHeight: 2.2, color: 'var(--color-text)' }}>
      {parts.map((chunk, i) => {
        const gap = gaps[i]
        const picked = given[String(i)]
        const pickedIdx = picked === undefined ? -1 : Number(picked)
        const chosenText = gap && pickedIdx >= 0 ? gap.options[pickedIdx] : undefined
        const ok = showVerdict && gap ? pickedIdx === gap.correct : null

        return (
          <span key={i}>
            {chunk}
            {/* Пропусков ровно на один меньше, чем кусков: последний кусок —
                хвост предложения, и списка за ним нет. */}
            {gap && (
              <span style={{ position: 'relative', display: 'inline-block', margin: '0 3px' }}>
                <button
                  onClick={() => !disabled && setOpen(open === i ? null : i)}
                  disabled={disabled}
                  aria-label={chosenText ?? t('Выбрать')}
                  style={{
                    // Таблетка обнимает свой вариант, как и все поля ответа в
                    // заданиях. Заданной ширины тут не было смысла держать:
                    // содержимое прижималось влево, и весь запас уходил в одну
                    // дыру справа от шеврона — короткий вариант («goes») висел
                    // в таблетке боком.
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 10,
                    fontFamily: 'inherit', fontSize: 15, fontWeight: 650, lineHeight: 1.5,
                    cursor: disabled ? 'default' : 'pointer', verticalAlign: 'middle',
                    border: `1.5px solid ${
                      ok === null
                        ? (open === i ? 'var(--color-accent)' : chosenText ? 'rgba(var(--accent-rgb), 0.4)' : 'var(--color-border-strong)')
                        : ok ? '#6EE7A0' : '#F48B91'
                    }`,
                    background: ok === null
                      ? (chosenText ? 'rgba(var(--glass-rgb), 0.96)' : 'transparent')
                      : ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
                    color: chosenText ? 'var(--color-text)' : 'var(--color-text-4)',
                  }}
                >
                  {/* ПУСТОЙ ПРОПУСК ШИРИНОЙ В САМЫЙ ДЛИННЫЙ ВАРИАНТ, ВЫБРАННЫЙ
                      — В СВОЁ СЛОВО. Пока не выбрано, под «Выбрать» лежат
                      невидимые призраки всех вариантов: ширину задаёт самый
                      широкий из них, и таблетка не дёргает строку в момент
                      выбора — слово встаёт в уже готовое место. После выбора
                      призраки уходят, и пропуск обнимает ровно то, что в нём
                      написано. Мерим настоящим рендером, а не длиной строки:
                      в пропорциональном шрифте «lll» уже́ «WW». */}
                  {chosenText ? (
                    <>
                      {chosenText}
                      <ChevronDown size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                    </>
                  ) : (
                    <span style={{ display: 'grid', alignItems: 'center', justifyItems: 'center' }}>
                      {gap.options.map((option, oi) => (
                        <span
                          key={oi}
                          aria-hidden
                          style={{ ...pillContent, visibility: 'hidden', pointerEvents: 'none' }}
                        >
                          {option}
                          <ChevronDown size={13} style={{ flexShrink: 0 }} />
                        </span>
                      ))}
                      {/* В пустом пропуске стоит многоточие, а не слово
                          «Выбрать»: слово шире любого из вариантов и распирало
                          бы таблетку сверх самого длинного из них — то есть
                          ровно то, от чего ширина по призракам и спасает.
                          Что это список, говорит шеврон; для экранного диктора
                          подпись осталась в aria-label кнопки. */}
                      <span style={{ ...pillContent, opacity: 0.75 }}>
                        …
                        <ChevronDown size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                      </span>
                    </span>
                  )}
                </button>

                {/* Эталон дописывается рядом, а не вместо ответа: ученик должен
                    видеть, ЧТО он выбрал, — иначе разбирать нечего. */}
                {ok === false && (
                  <span style={{ marginLeft: 6, fontSize: 14, fontWeight: 700, color: 'var(--color-green-text)' }}>
                    {gap.options[gap.correct]}
                  </span>
                )}

                {open === i && !disabled && (
                  <span style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
                    minWidth: 132, padding: 4, borderRadius: 12,
                    display: 'flex', flexDirection: 'column', gap: 2,
                    background: 'rgba(var(--glass-rgb), 0.98)',
                    border: '1px solid var(--color-border-strong)',
                    boxShadow: 'var(--shadow-lg)',
                  }}>
                    {gap.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => choose(i, oi)}
                        style={{
                          padding: '7px 10px', borderRadius: 9, border: 'none', textAlign: 'left',
                          fontFamily: 'inherit', fontSize: 14.5, fontWeight: 600, cursor: 'pointer',
                          background: oi === pickedIdx ? 'var(--color-purple-soft)' : 'transparent',
                          color: 'var(--color-text)',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </span>
                )}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
