// Живой блок конспекта вместо картинки: разбор формулы, тренажёр или способы
// решения. Данные лежат внутри картинки (lib/excelLab/embed.ts); если они не
// читаются — показываем саму картинку, как раньше.

import { useMemo } from 'react'
import { readLab } from '../../lib/excelLab/embed'
import FormulaBreakdown from './FormulaBreakdown'
import ExcelTrainer from './ExcelTrainer'
import ExcelMethods from './ExcelMethods'

export default function ExcelLabFigure({ src, caption }: { src: string; caption?: string }) {
  const spec = useMemo(() => readLab(src), [src])
  const body = !spec ? <img src={src} alt="" style={{ display: 'block', width: '100%', borderRadius: 14, background: '#fff' }} />
    : spec.kind === 'formula' ? <FormulaBreakdown spec={spec} />
    : spec.kind === 'trainer' ? <ExcelTrainer spec={spec} selfCheck />
    : <ExcelMethods spec={spec} />
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: 16, borderRadius: 18, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-card, var(--color-surface))', minWidth: 0 }}>
      {caption && <figcaption style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', lineHeight: 1.4 }}>{caption}</figcaption>}
      {body}
    </figure>
  )
}
