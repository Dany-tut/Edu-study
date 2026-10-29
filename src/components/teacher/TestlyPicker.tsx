// Список тестов из Тестли — одно место выбора теста для всего кабинета:
// вкладка «Из Тестли» в создании ДЗ (wide), кнопка «Из Тестли» под «Из
// тренажёра» в уроке курса и «Другой тест» в карточке задания (compact).
// Тесты живут в Тестли; сюда приходит только карточка (testly-bridge).
import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, ExternalLink, ListChecks, Loader2, Plus, Search } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { fetchTestlyTests, testlyMeta, testlyNewUrl, useTestlyModule, type TestlyTest } from '../../lib/testlyModule'
import type { TestlyRef } from '../../data/taskTypes'
import { cardChip } from '../../lib/pillStyles'
import { TestlyTile } from '../TestlyMark'

export const testlyRef = (x: TestlyTest): TestlyRef => ({
  id: x.id, title: x.title, questions: x.questions, points: x.points, minutes: x.minutes, manual: x.manual,
  ...(useTestlyModule.getState().teacherId ? { owner: useTestlyModule.getState().teacherId } : {}),
})

export default function TestlyPicker({ onPick, addedIds, compact = false }: {
  onPick: (test: TestlyTest) => void
  /** id тестов, уже стоящих в домашке, — у них «Добавлен» вместо «Добавить». */
  addedIds?: Set<string>
  /** Узкая колонка (палитра урока, карточка задания): строки вместо карточек. */
  compact?: boolean
}) {
  const t = useT()
  const [tests, setTests] = useState<TestlyTest[] | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    fetchTestlyTests().then(
      list => { if (alive) setTests(list) },
      e => { if (alive) setError(e instanceof Error ? e.message : String(e)) },
    )
    return () => { alive = false }
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (tests ?? []).filter(x => !q || x.title.toLowerCase().includes(q))
  }, [tests, query])

  const search = (
    <div style={{ position: 'relative', flex: 1 }}>
      <Search size={compact ? 12 : 14} style={{ position: 'absolute', left: compact ? 9 : 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('Найти тест в Тестли')}
        style={{
          width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none', color: 'var(--color-text)',
          ...(compact
            ? { fontSize: 11.5, padding: '6px 10px 6px 26px', borderRadius: 10, border: '1.5px solid var(--color-border-medium)', background: 'var(--color-bg-input)' }
            : { fontSize: 13, padding: '10px 14px 10px 36px', borderRadius: 12, border: '1px solid var(--color-border-glass)', background: 'rgba(var(--glass-rgb), 0.88)', boxShadow: 'var(--shadow-sm-page)' }),
        }}
      />
    </div>
  )

  const status = !tests && !error ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: compact ? '10px 0' : '40px 0', color: 'var(--color-text-3)', fontSize: compact ? 11.5 : 13 }}>
      <Loader2 size={compact ? 13 : 15} style={{ animation: 'spin 1s linear infinite' }} /> {t('Загружаем тесты из Тестли…')}
    </div>
  ) : error ? (
    <div style={{ padding: compact ? '8px 4px' : '32px 0', textAlign: 'center', color: 'var(--color-red-text)', fontSize: compact ? 11.5 : 13, lineHeight: 1.45 }}>{error}</div>
  ) : shown.length === 0 ? (
    <div style={{ padding: compact ? '8px 4px' : '40px 0', textAlign: 'center', color: 'var(--color-text-3)', fontSize: compact ? 11.5 : 13 }}>
      {tests!.length === 0 ? t('В вашем Тестли пока нет тестов') : t('Ничего не найдено')}
    </div>
  ) : null

  const badges = (x: TestlyTest) => (
    <>
      {x.manual && <span style={cardChip('var(--color-amber-text)', { flexShrink: 0 })}>{t('Проверка учителем')}</span>}
      {x.status === 'draft' && <span style={cardChip('var(--color-text-3)', { flexShrink: 0 })}>{t('Черновик')}</span>}
    </>
  )

  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {search}
        {status ?? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
            {shown.map(x => {
              const added = addedIds?.has(x.id)
              return (
                <button key={x.id} onClick={() => onPick(x)} disabled={added} style={{
                  display: 'flex', gap: 8, alignItems: 'center', textAlign: 'left', padding: '8px 10px', borderRadius: 9, border: 'none',
                  background: 'var(--color-bg-2)', cursor: added ? 'default' : 'pointer', fontFamily: 'inherit', opacity: added ? 0.6 : 1,
                }}>
                  <TestlyTile size={22} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.25 }}>{x.title}</span>
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>{testlyMeta(x)}</span>
                  </span>
                  {added
                    ? <Check size={12} style={{ flexShrink: 0, color: 'var(--color-green-text)' }} />
                    : <Plus size={12} style={{ flexShrink: 0, color: 'var(--color-green-text)' }} />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {search}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', fontSize: 12, color: 'var(--color-text-3)' }}>
        {tests && <span>{tests.length} {t('в вашем Тестли')}</span>}
        <a href={testlyNewUrl()} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
          <ExternalLink size={12} /> {t('Новый тест в Тестли')}
        </a>
      </div>
      {status ?? shown.map(x => {
        const added = addedIds?.has(x.id)
        return (
          <div key={x.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 18,
            background: 'rgba(var(--glass-rgb), 0.88)', border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-sm-page)',
          }}>
            <TestlyTile size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{x.title}</span>
                {badges(x)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--color-text-3)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={12} /> {testlyMeta({ ...x, minutes: null })}</span>
                {x.minutes ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Clock size={12} /> {x.minutes} {t('мин')}</span> : null}
              </div>
            </div>
            <button onClick={() => onPick(x)} disabled={added} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 11, border: 'none',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700, cursor: added ? 'default' : 'pointer', flexShrink: 0,
              background: added ? 'var(--color-green-soft)' : 'var(--color-purple-soft)',
              color: added ? 'var(--color-green-text)' : 'var(--color-control-accent)',
            }}>
              {added ? <Check size={13} strokeWidth={2.4} /> : <Plus size={13} strokeWidth={2.4} />}
              {added ? t('Добавлен') : t('Добавить')}
            </button>
          </div>
        )
      })}
    </div>
  )
}
