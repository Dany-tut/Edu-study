import MultiSelectField from '../MultiSelectField'
import { SubjectMark } from '../icons/SubjectMark'
import { useTeacherAccess } from '../../lib/teacherAccess'
import { useT } from '../../lib/i18n'
import { normalizeStudentSubjects, studentSubjectsOptions } from '../../lib/studentSubject'
import { PLATFORM } from '../../lib/platform'
import { FIELD_LABEL_INSET } from '../../lib/fieldStyle'
import './studentSubjectsField.css'

/** Shared creation field for PC, iPhone, iPad (both layouts) and Android. */
export default function StudentSubjectsField({ value, onChange, disabled = false }: {
  value: string[]
  onChange: (subjects: string[]) => void
  disabled?: boolean
}) {
  const t = useT()
  const teacherSubjects = useTeacherAccess(s => s.subjects)
  const touch = PLATFORM !== 'pc'
  return <div className="student-subjects-field" inert={disabled || undefined}>
    <div className="student-subjects-label" style={{ paddingInline: FIELD_LABEL_INSET }}><span>{t('Предметы')}</span><span>{value.length}</span></div>
    <MultiSelectField clearable={false} label={t('Выберите предметы')}
      options={studentSubjectsOptions(teacherSubjects, value)} values={value}
      onChange={names => onChange(normalizeStudentSubjects(names))}
      optionIcon={subject => <SubjectMark subject={subject} size={16} />}
      creatable createLabel="Добавить свой предмет" createHint="Добавить свой предмет" createPlaceholder="Впишите название предмета"
      field={{ padding: '7px 12px', borderRadius: 12, background: 'var(--color-bg-4)', restBorder: 'var(--color-border-medium)', borderWidth: 1.5, fontSize: touch ? 16 : 14, minHeight: touch ? 48 : 40 }} />
  </div>
}
