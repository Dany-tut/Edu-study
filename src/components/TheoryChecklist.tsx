// ─────────────────────────────────────────────────────────────────────────────
// Чек-лист конспекта: «что должно остаться в руке к концу юнита».
//
// Разметку разбирает lib/theoryChecklist — здесь только показ и отметки. Сами
// отметки локальные и ничего не весят: см. комментарий в парсере о том, почему
// они не идут ни в прогресс, ни учителю.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo, useState } from 'react'
import Checkbox from './Checkbox'
import { tidyProse } from '../lib/typography'
import GlossedText from './GlossedText'
import type { TheoryChecklist as Parsed } from '../lib/theoryChecklist'

const keyOf = (scope: string) => `theory-checklist:${scope}`

function readMarks(scope: string): string[] {
  try {
    const raw = localStorage.getItem(keyOf(scope))
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

export default function TheoryChecklist({ scope, list, scale = 1, accent, lang, glossSubject }: {
  /** Ключ хранения — обычно id урока: отметки живут отдельно у каждого юнита. */
  scope: string
  list: Parsed
  scale?: number
  accent?: string
  /** Язык материала: пункт чек-листа разбирается по словам, как и конспект. */
  lang?: string
  /** Предмет для кнопки «В словарь». */
  glossSubject?: string
}) {
  // Отметки хранятся текстом пункта, а не его номером: список правится (в сиде
  // и учителем), и по номерам галочки молча переехали бы на соседние строки.
  const [marks, setMarks] = useState<string[]>(() => readMarks(scope))

  const toggle = useCallback((item: string, on: boolean) => {
    setMarks(prev => {
      const next = on ? [...new Set([...prev, item])] : prev.filter(m => m !== item)
      try { localStorage.setItem(keyOf(scope), JSON.stringify(next)) } catch { /* приватный режим — галочки просто не переживут перезагрузку */ }
      return next
    })
  }, [scope])

  const done = useMemo(() => list.items.filter(i => marks.includes(i)).length, [list.items, marks])

  return (
    <div
      style={{
        border: '1px solid var(--color-border-glass)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {(list.title || list.items.length > 0) && (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 14 * scale, fontWeight: 650, color: 'var(--color-text)' }}>
            {tidyProse(list.title || 'Чек-лист')}
          </span>
          {/* Счётчик подписан цветом текста, а не рамки: содержимое, нарисованное
              цветом рамки, в тёмной теме исчезает. */}
          <span style={{ fontSize: 12 * scale, color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
            {done} / {list.items.length}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.items.map(item => (
          <Checkbox
            key={item}
            checked={marks.includes(item)}
            onChange={on => toggle(item, on)}
            align="start"
            {...(accent ? { accent } : {})}
            labelStyle={{
              fontSize: 14 * scale,
              lineHeight: 1.5,
              color: 'var(--color-text)',
              fontWeight: 450,
            }}
          >
            {lang
              ? (
                <GlossedText
                  text={tidyProse(item)}
                  lang={lang}
                  // Подсветка слова строится конкатенацией (`${accent}22`),
                  // поэтому цвет здесь ТОЛЬКО литеральный: с var(--…) вышло бы
                  // «var(--color-accent)22» — то есть ничего.
                  accent={accent || '#786AD7'}
                  subject={glossSubject}
                  style={{ display: 'inline' }}
                />
              )
              : tidyProse(item)}
          </Checkbox>
        ))}
      </div>
    </div>
  )
}
