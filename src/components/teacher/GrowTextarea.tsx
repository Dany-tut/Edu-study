import React, { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Поле, которое обнимает текст: высота = содержимому, внутреннего скролла нет.
 *
 * Смысловые поля задания (условие, эталонный ответ, текст для чтения) стартуют
 * с трёх строк и дальше растут. В одну строку конец длинной формулировки уезжал
 * из виду, а фиксированная высота с внутренним скроллом прятала его ещё
 * надёжнее: чтобы перечитать условие, приходилось скроллить внутри поля.
 * Мелкие поля-перечисления (варианты, шаги, слова-обманки) стартуют с одной
 * строки, но растут так же — три строки под слово из шести букв ни к чему.
 *
 * Живёт отдельным файлом, потому что нужен трём редакторам заданий сразу:
 * курс, «Создать ДЗ» и конструктор тренажёра.
 */
export const TASK_TEXT_LH = 1.55

/** Высота под `rows` строк: сам текст + вертикальные паддинги + рамка. */
export function growMinHeight(rows: number, fontSize: number, padY: number, border = 1.5) {
  return Math.round(rows * fontSize * TASK_TEXT_LH) + padY * 2 + Math.round(border * 2)
}

export default function GrowTextarea({
  value, onChange, minHeight = 0, style, ...rest
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (v: string) => void
  minHeight?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const fit = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`
  }

  useLayoutEffect(fit, [value, minHeight])

  // Пересчёт на смену ширины (панель тянется). ResizeObserver сравнивает именно
  // ширину — иначе собственный set height зациклит наблюдателя.
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === w) return
      w = el.clientWidth
      fit()
    })
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ resize: 'none', overflow: 'hidden', lineHeight: TASK_TEXT_LH, ...style }}
      {...rest}
    />
  )
}
