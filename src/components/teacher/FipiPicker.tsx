// Пикер «ЕГЭ / ОГЭ · Каталог ФИПИ» для Конструктора курса — рядом с «Из
// тренажёра / Из Тестли». Сегмент ЕГЭ|ОГЭ → предмет (из предмета курса, можно
// переопределить) → список линий КИМ (номер + баллы + тип) → добавить готовое
// типизированное задание с меткой examTag. Линии/баллы — каталог ФИПИ-2026
// (data/examPresets.ts). По согласованным концептам (4 платформы × 2 темы):
// ПК/iPad — колонка редактора, ряды с фейдом.
import { useMemo, useState } from 'react'
import { GraduationCap, ChevronDown, ChevronUp, Search } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import { FIELD } from '../../lib/fieldStyle'
import ScrollFade from '../ScrollFade'
import Segmented from '../Segmented'
import TeacherSelect from './TeacherSelect'
import { TaskTypeRow } from './TaskTypeRow'
import { taskTypeDef } from '../../data/taskTypes'
import { EXAM_CATALOGS, examSubjects, catalogFor, type ExamCode, type ExamCatalog, type ExamLine, type ExamSubtype } from '../../data/examPresets'

export function FipiToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useT()
  const Chevron = open ? ChevronDown : ChevronUp
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      padding: '9px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 13, fontWeight: 600, color: 'var(--color-purple-text)',
      background: open ? 'var(--color-accent-soft)' : 'transparent',
      border: '1.5px dashed var(--color-border-strong)',
    }}>
      <GraduationCap size={14} /> {open ? t('Скрыть ФИПИ') : t('ЕГЭ / ОГЭ · ФИПИ')}
      <Chevron size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />
    </button>
  )
}

export default function FipiPicker({ open, courseSubject, onAdd }: {
  open: boolean
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

  if (!open) return null

  return (
    <ScrollFade maxHeight="100%" fadeHeight={16} style={{ flex: 1, minHeight: 0 }} overlayScrollbar>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="fipi-exam-switch" style={{ alignSelf: 'flex-start' }}>
          <Segmented<ExamCode>
            variant="filter"
            value={exam}
            items={[
              { id: 'ege', label: t('ЕГЭ') },
              { id: 'oge', label: t('ОГЭ') },
            ]}
            onChange={nextExam => {
              if (nextExam === exam) return
              const subjects = examSubjects(nextExam)
              setExam(nextExam)
              setSubject(courseSubject && subjects.includes(courseSubject) ? courseSubject : subjects[0])
              setQuery('')
            }}
          />
        </div>

        {/* Предмет — из предмета курса, можно переопределить */}
        <TeacherSelect
          value={catalog.subject}
          options={examSubjects(exam)}
          placeholder={t('Предмет')}
          clearable={false}
          search={false}
          onChange={value => { setSubject(value); setQuery('') }}
          triggerStyle={FIELD}
        />

        {/* Поиск по номеру/теме */}
        <label style={{ ...FIELD, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 36 }}>
          <Search size={14} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Номер задания или тема')}
            style={{ border: 0, background: 'transparent', outline: 'none', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 0 }} />
        </label>

        <div key={catalog.subject + exam} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 5, overflowWrap: 'anywhere' }}>
          {lines.map(line => {
            const subtype = line.subtypes[0]
            const kinds = [...new Set(line.subtypes.map(item => t(taskTypeDef(item.type).label)))]
            return (
              <TaskTypeRow key={line.number} type={subtype.type}
                onClick={() => onAdd(subtype, line, catalog)}
                preset={{
                  number: line.number, title: line.title, hint: kinds.join(' · '), score: `${line.points} ${t('б.')}`,
                  preview: { subject: catalog.subject, prompt: subtype.prompt, hint: subtype.hint, source: { url: catalog.source, year: catalog.year } },
                }} />
            )
          })}
          {lines.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: 12, textAlign: 'center' }}>{t('Ничего не найдено')}</div>}
        </div>
      </div>
    </ScrollFade>
  )
}
