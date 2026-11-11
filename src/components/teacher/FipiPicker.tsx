// Пикер «ЕГЭ / ОГЭ · Каталог ФИПИ» для Конструктора курса — рядом с «Из
// тренажёра / Из Тестли». Сегмент ЕГЭ|ОГЭ → предмет (из предмета курса, можно
// переопределить) → список линий КИМ (номер + баллы + тип) → добавить готовое
// типизированное задание с меткой examTag. Линии/баллы — каталог ФИПИ-2026
// (data/examPresets.ts). По согласованным концептам (4 платформы × 2 темы):
// ПК/iPad — колонка редактора; сегмент-«фильтр» белой плашкой, ряды с фейдом.
import { useMemo, useState } from 'react'
import { GraduationCap, ChevronDown, Search } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { FIELD } from '../../lib/fieldStyle'
import { textFadeLines } from '../../lib/textFades'
import { taskTypeDef } from '../../data/taskTypes'
import { EXAM_CATALOGS, examSubjects, catalogFor, type ExamCode, type ExamCatalog, type ExamLine, type ExamSubtype } from '../../data/examPresets'

export default function FipiPicker({ open, onToggle, courseSubject, onAdd }: {
  open: boolean
  onToggle: () => void
  /** Предмет курса — подставляется по умолчанию. */
  courseSubject?: string
  onAdd: (subtype: ExamSubtype, line: ExamLine, catalog: ExamCatalog) => void
}) {
  const t = useT()
  const [exam, setExam] = useState<ExamCode>('ege')
  const [subject, setSubject] = useState<string>(() => courseSubject ?? examSubjects('ege')[0])
  const [query, setQuery] = useState('')

  const catalog = useMemo(() => catalogFor(exam, subject) ?? EXAM_CATALOGS.find(c => c.exam === exam)!, [exam, subject])
  const lines = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ru')
    return catalog.lines.filter(l => `${l.number} ${l.title} ${l.subtypes.map(s => s.title).join(' ')}`.toLocaleLowerCase('ru').includes(q))
  }, [catalog, query])

  const dashedBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '9px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 13, fontWeight: 600, color: 'var(--color-purple-text)',
    background: open ? 'var(--color-accent-soft)' : 'transparent',
    border: '1.5px dashed var(--color-border-strong)',
  }

  return (
    <div>
      <button type="button" onClick={onToggle} style={dashedBtn} aria-expanded={open}>
        <GraduationCap size={14} /> {open ? t('Скрыть ФИПИ') : t('ЕГЭ / ОГЭ · ФИПИ')}
        <ChevronDown size={14} style={{ marginLeft: 'auto', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Сегмент ЕГЭ | ОГЭ — роль «фильтр»: белая плашка активного */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, background: 'var(--color-bg-3)', borderRadius: 11, padding: 3 }}>
            {(['ege', 'oge'] as ExamCode[]).map(k => (
              <button key={k} type="button"
                onClick={() => { setExam(k); setSubject(courseSubject && examSubjects(k).includes(courseSubject) ? courseSubject : examSubjects(k)[0]); setQuery('') }}
                style={{
                  height: 32, border: 0, borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600,
                  background: exam === k ? 'var(--color-bg-2)' : 'transparent',
                  color: exam === k ? 'var(--color-text)' : 'var(--color-muted)',
                  boxShadow: exam === k ? 'var(--shadow-pill)' : undefined,
                }}>
                {k === 'ege' ? t('ЕГЭ') : t('ОГЭ')}
              </button>
            ))}
          </div>

          {/* Предмет — из предмета курса, можно переопределить */}
          <select value={catalog.subject} onChange={e => { setSubject(e.target.value); setQuery('') }} style={{ ...FIELD, cursor: 'pointer' }} aria-label={t('Предмет')}>
            {examSubjects(exam).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Поиск по номеру/теме */}
          <label style={{ ...FIELD, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 36 }}>
            <Search size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Номер задания или тема')}
              style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', width: '100%' }} />
          </label>

          {/* Список линий — фейд у края (правило прокрутки) */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260,
            overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 90%, transparent)',
            maskImage: 'linear-gradient(to bottom, #000 90%, transparent)',
          }} className="no-scrollbar">
            {lines.map(l => {
              const kinds = [...new Set(l.subtypes.map(s => taskTypeDef(s.type).label))]
              return (
                <button key={l.number} type="button" data-hover="layer"
                  onClick={() => onAdd(l.subtypes[0], l, catalog)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', width: '100%',
                    padding: '7px 9px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
                  }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12, fontVariantNumeric: 'tabular-nums', background: 'var(--color-bg-3)', color: 'var(--color-purple-text)' }}>{l.number}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, lineHeight: 1.25 }}>{l.title}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--color-muted)', marginTop: 2, ...textFadeLines(1) }}>{kinds.join(' · ')}</span>
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{l.points} {t('б.')}</span>
                </button>
              )
            })}
            {lines.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: 12, textAlign: 'center' }}>{t('Ничего не найдено')}</div>}
          </div>

          <a href={catalog.source} target="_blank" rel="noreferrer" style={{ fontSize: 10.5, color: 'var(--color-muted)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            {t('Источник: ФИПИ · спецификация и демоверсия')} {catalog.year}
          </a>
        </div>
      )}
    </div>
  )
}
