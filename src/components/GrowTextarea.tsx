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
 * Живёт отдельным файлом, потому что нужен и трём редакторам заданий (курс,
 * «Создать ДЗ», конструктор тренажёра), и полям ответа в домашке у ученика:
 * там ответ точно так же не должен уезжать во внутренний скролл.
 */
export const TASK_TEXT_LH = 1.55

/**
 * Оптический центр текста в поле. У системного шрифта (SF) место под выносные
 * снизу больше, чем сверху, и при симметричных паддингах буквы сидят на ~0.12em
 * ниже середины поля (замер: 13px → 1.6px, 12px → 1.3px; от межстрочного не
 * зависит). Поэтому сверху паддинг меньше на 0.12em, снизу больше на столько же —
 * высота поля та же, текст по центру. В кнопках с иконкой так нельзя: сдвинется и
 * иконка, — там поднимается только подпись (`TEXT_LIFT` как `top` у span).
 */
export const TEXT_LIFT_EM = 0.12
export const TEXT_LIFT: React.CSSProperties = { position: 'relative', top: `-${TEXT_LIFT_EM}em` }

const px = (v: string | number | undefined) =>
  typeof v === 'number' ? v : typeof v === 'string' && /^-?\d*\.?\d+px$/.test(v.trim()) ? parseFloat(v) : null

/** Переписывает вертикальные паддинги стиля по правилу выше; не-px значения не трогает. */
export function liftTextPadding(style: React.CSSProperties): React.CSSProperties {
  let top = px(style.paddingTop as string | number | undefined)
  let bottom = px(style.paddingBottom as string | number | undefined)
  let left: string | number | undefined, right: string | number | undefined
  if (style.padding !== undefined) {
    const parts = String(typeof style.padding === 'number' ? `${style.padding}px` : style.padding).trim().split(/\s+/)
    top ??= px(parts[0]); bottom ??= px(parts[2] ?? parts[0])
    right = parts[1] ?? parts[0]; left = parts[3] ?? right
  }
  if (top === null || bottom === null) return style
  const { padding: _p, ...rest } = style
  return {
    ...rest,
    ...(left !== undefined ? { paddingLeft: left, paddingRight: right } : {}),
    paddingTop: `calc(${top}px - ${TEXT_LIFT_EM}em)`,
    paddingBottom: `calc(${bottom}px + ${TEXT_LIFT_EM}em)`,
  }
}

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
      style={liftTextPadding({ resize: 'none', overflow: 'hidden', lineHeight: TASK_TEXT_LH, ...style })}
      {...rest}
    />
  )
}
