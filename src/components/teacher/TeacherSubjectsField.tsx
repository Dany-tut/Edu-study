import MultiSelectField from '../MultiSelectField'
import { SUBJECT_NAMES, getSubject, subjectNamesFromStored, subjectsToStored } from '../../lib/subjects'
import { useT } from '../../lib/i18n'

// «Предметы, которые вы ведёте» — одно поле для регистрации, профиля и
// разового окна. Печатаешь — подсказывает реестр; чего в реестре нет, можно
// добавить своим предметом. Наружу и внутрь — формат profiles.subjects
// (id реестра + свои строкой), имена живут только в самом поле.

export type SubjectsFieldLook = 'auth' | 'profile'

const LOOKS = {
  // Как .auth-input в JoinTeacherPage (рамка 1.5px, фон surface).
  auth: { padding: '7px 14px', borderRadius: 12, background: 'var(--color-surface)', restBorder: 'var(--color-border)', borderWidth: 1.5, fontSize: 14, minHeight: 42 },
  // Как inputStyle в TeacherProfileSettingsPage.
  profile: { padding: '7px 14px', borderRadius: 12, background: 'var(--color-bg-3)', restBorder: 'var(--color-border-medium)', fontSize: 14, minHeight: 43 },
} as const

export default function TeacherSubjectsField({ value, onChange, look }: {
  value: string[]
  onChange: (stored: string[]) => void
  look: SubjectsFieldLook
}) {
  const t = useT()
  return (
    <MultiSelectField
      label={t('Предметы, которые вы ведёте')}
      options={SUBJECT_NAMES}
      values={subjectNamesFromStored(value)}
      // Свой предмет пишется как название: «экономика» → «Экономика».
      onChange={names => onChange(subjectsToStored(names.map(n => getSubject(n) ? n : n.charAt(0).toUpperCase() + n.slice(1))))}
      creatable
      createLabel="Добавить свой предмет"
      field={LOOKS[look]}
    />
  )
}
