// Тело карточки «Тест из Тестли» у учителя — одно для создания ДЗ и урока курса.
// Править тут нечего: вопросы живут в Тестли. Можно открыть тест там или
// поменять на другой из своего списка.
import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { testlyEditUrl, testlyMeta } from '../../lib/testlyModule'
import type { TestlyRef } from '../../data/taskTypes'
import { TestlyTile } from '../TestlyMark'
import TestlyPicker, { testlyRef } from './TestlyPicker'
import { btn } from '../../lib/pillStyles'

export default function TestlyTaskEditor({ value, onChange }: {
  value: TestlyRef | undefined
  onChange: (next: TestlyRef) => void
}) {
  const t = useT()
  const [picking, setPicking] = useState(!value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {value && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px', borderRadius: 14,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <TestlyTile size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{value.title}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
              {testlyMeta(value)} · {value.manual ? t('часть проверяете вы в Тестли') : t('проверка автоматически')}
            </div>
          </div>
          <a href={testlyEditUrl(value.id)} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, flexShrink: 0,
            background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)',
            color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            <ExternalLink size={13} /> {t('Открыть в Тестли')}
          </a>
          <button onClick={() => setPicking(p => !p)} style={{ ...btn('S', 'secondary'), flexShrink: 0 }}>
            {picking ? t('Скрыть') : t('Другой тест')}
          </button>
        </div>
      )}
      {picking && (
        <TestlyPicker compact addedIds={value ? new Set([value.id]) : undefined}
          onPick={x => { onChange(testlyRef(x)); setPicking(false) }} />
      )}
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-3)' }}>
        {t('Ученик откроет тест на весь экран и вернётся в домашку. Пока засчитывается сдача теста, баллы в журнал придут позже.')}
      </div>
    </div>
  )
}
