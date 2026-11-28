// Режим «банк ФИПИ» в отборе заданий преподавателя: «База» Конструктора и
// банк в создании ДЗ. Отдельный маленький модуль — создание ДЗ не тянет весь
// чанк «Базы».
import { useEffect, useMemo } from 'react'
import OpticalText from '../OpticalText'
import MultiSelectField from '../MultiSelectField'
import { useT } from '../../lib/i18n'
import { useTaskBank } from '../../store/taskBankStore'
import { FIPI_THEMES, nfTheme, nfThemeId } from '../../data/fipiThemes'
import type { Task, Subject } from '../../data/taskBankData'

/** Поля отбора, которые читает режим ФИПИ (общие у «Базы» и создания ДЗ). */
export type FipiFilters = {
  subject: string; sections: string[]; topics: string[]; parts: string[]; lines: string[]; source: string
  bank?: '' | 'ege' | 'oge'
}

// ─── Банк ФИПИ на «Базе» ─────────────────────────────────────────────────────
// Тот же набор task_bank, что у детей в тренажёре: грузится порциями тем же
// loadFipiSet, отбор — разделы и темы Neo (payload.nf), часть, линия.
// Правка строки ФИПИ — правка тренажёра у всех учеников (см. TaskCreator).

/** Банк ФИПИ открыт: экзамен выбран и у предмета есть набор. */
export function fipiBankOf(f: FipiFilters): { subject: string; exam: 'ege' | 'oge'; key: string } | null {
  if (f.bank !== 'ege' && f.bank !== 'oge') return null
  if (!f.subject || !FIPI_THEMES[`${f.bank}_${f.subject}`]) return null
  return { subject: f.subject, exam: f.bank, key: `${f.bank}_${f.subject}` }
}

/** Задание проходит отбор банка ФИПИ; skip — поле, которое не проверяем (счётчики каскада). */
export function fipiMatch(t: Task, f: FipiFilters, skip?: 'sections' | 'topics' | 'parts' | 'lines'): boolean {
  const nf = nfTheme(nfThemeId(t))
  if (skip !== 'sections' && f.sections.length && !(nf && f.sections.includes(nf.section.name))) return false
  if (skip !== 'topics' && f.topics.length && !(nf && f.topics.includes(nf.theme.name))) return false
  if (skip !== 'parts' && f.parts.length && !f.parts.includes(String(t.part))) return false
  if (skip !== 'lines' && f.lines.length && !f.lines.includes(String(t.line))) return false
  return true
}

export function useFipiTasks(f: FipiFilters): Task[] {
  const tasks = useTaskBank(s => s.tasks)
  const loadFipiSet = useTaskBank(s => s.loadFipiSet)
  const fb = fipiBankOf(f)
  useEffect(() => { if (fb) void loadFipiSet(fb.subject as Subject, fb.exam) }, [fb?.key]) // eslint-disable-line react-hooks/exhaustive-deps
  return useMemo(() => fb ? tasks.filter(t => t.fipiId && t.subject === fb.subject && (t.exam ?? 'ege') === fb.exam) : [], [tasks, fb?.key]) // eslint-disable-line react-hooks/exhaustive-deps
}

/** Переключатель «Свои · ЕГЭ ФИПИ · ОГЭ ФИПИ» — только у предмета с банком ФИПИ. */
export function FipiBankSwitch({ filters, onChange, accent, accentBg }: {
  filters: FipiFilters; onChange: (f: Partial<FipiFilters>) => void; accent: string; accentBg: string
}) {
  const t = useT()
  if (!filters.subject || !(FIPI_THEMES[`ege_${filters.subject}`] || FIPI_THEMES[`oge_${filters.subject}`])) return null
  const cur = filters.bank ?? ''
  const opts: ['' | 'ege' | 'oge', string][] = [['', t('Свои')], ['ege', t('ЕГЭ')], ['oge', t('ОГЭ')]]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('Банк: свои или ФИПИ')}</div>
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.filter(([v]) => !v || FIPI_THEMES[`${v}_${filters.subject}`]).map(([v, label]) => {
        const on = cur === v
        return (
          <button data-hover="layer" key={v || 'own'} onClick={() => { if (!on) onChange({ bank: v, sections: [], topics: [], parts: [], lines: [], source: '' }) }}
            title={v ? t('Банк ФИПИ — те же задания, что у учеников в тренажёре') : t('Задания преподавателей')}
            style={{ flex: 1, minWidth: 0, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap',
              background: on ? accentBg : 'var(--color-bg-3)', color: on ? accent : 'var(--color-muted)' }}>
            <OpticalText as="iskra-button-label">{label}</OpticalText>
          </button>
        )
      })}
    </div>
    </div>
  )
}

export function FipiFilterFields({ filters, onChange, accent, accentBg }: {
  filters: FipiFilters; onChange: (f: Partial<FipiFilters>) => void; accent: string; accentBg: string
}) {
  const t = useT()
  const fb = fipiBankOf(filters)!
  const all = useFipiTasks(filters)
  const sections = FIPI_THEMES[fb.key] ?? []
  const count = (skip: 'sections' | 'topics' | 'parts' | 'lines', pred: (x: Task) => boolean) =>
    all.reduce((n, x) => n + (fipiMatch(x, filters, skip) && pred(x) ? 1 : 0), 0)
  const secOpts = sections.map(s => s.name)
  const topicSections = filters.sections.length ? sections.filter(s => filters.sections.includes(s.name)) : sections
  const topicOpts = topicSections.flatMap(s => s.themes.map(th => th.name))
  const groupOfTopic = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of sections) for (const th of s.themes) m.set(th.name, s.name)
    return m
  }, [sections])
  const lineOpts = useMemo(() => [...new Set(all.map(x => x.line))].sort((a, b) => a - b).map(String), [all])
  return (
    <>
      <MultiSelectField label={t('Раздел')} values={filters.sections} options={secOpts}
        countOf={v => count('sections', x => nfTheme(nfThemeId(x))?.section.name === v)}
        onChange={v => onChange({ sections: v, topics: filters.topics.filter(x => !v.length || v.includes(groupOfTopic.get(x) ?? '')) })} accent={accent} accentBg={accentBg} />
      <MultiSelectField label={t('Тема')} values={filters.topics} options={topicOpts}
        groupOf={v => groupOfTopic.get(v)} countOf={v => count('topics', x => nfTheme(nfThemeId(x))?.theme.name === v)}
        onChange={v => onChange({ topics: v })} accent={accent} accentBg={accentBg} />
      <div style={{ display: 'flex', gap: 6 }}>
        {(['1', '2'] as string[]).map(p => {
          const active = filters.parts.includes(p)
          const n = count('parts', x => String(x.part) === p)
          return (
            <button data-hover="layer" key={p} onClick={() => onChange({ parts: active ? filters.parts.filter(x => x !== p) : [...filters.parts, p] })}
              style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                background: active ? accentBg : 'var(--color-bg-3)', color: active ? accent : 'var(--color-muted)', opacity: n || active ? 1 : 0.5 }}>
              <OpticalText as="iskra-button-label">{`${p === '1' ? t('I часть') : t('II часть')} · ${n}`}</OpticalText>
            </button>
          )
        })}
      </div>
      <MultiSelectField label={t('Линия')} values={filters.lines} options={lineOpts}
        groupOf={v => { const x = all.find(y => String(y.line) === v); return x ? (x.part === 1 ? t('I часть') : t('II часть')) : undefined }}
        countOf={v => count('lines', x => String(x.line) === v)}
        onChange={v => onChange({ lines: v })} accent={accent} accentBg={accentBg} />
    </>
  )
}

