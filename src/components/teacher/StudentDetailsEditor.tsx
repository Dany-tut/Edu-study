import { useId, useState, type FormEvent } from 'react'
import type { Student } from '../../data/teacherMockData'
import { useT } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'
import { saveStudentFields } from '../../lib/useGroups'
import { Alert } from '../Alert'
import FloatField from '../FloatField'
import Modal from '../Modal'
import './studentDetailsEditor.css'

const fields = [
  { key: 'name', label: 'Имя и фамилия', maxLength: 120 },
  { key: 'schoolClass', label: 'Класс', maxLength: 32 },
  { key: 'phone', label: 'Телефон', maxLength: 60 },
  { key: 'telegramLink', label: 'Telegram или VK', maxLength: 240 },
  { key: 'parentContact', label: 'Контакт родителя', maxLength: 240 },
  { key: 'comment', label: 'Заметка', maxLength: 2000 },
] as const

type Details = Record<(typeof fields)[number]['key'], string>

export default function StudentDetailsEditor({ student, onClose }: {
  student: Student
  onClose: () => void
}) {
  const t = useT()
  const formId = useId()
  const [draft, setDraft] = useState<Details>(() => ({
    name: student.name, schoolClass: student.schoolClass ?? '', phone: student.phone,
    telegramLink: student.telegramLink ?? '', parentContact: student.parentContact ?? '',
    comment: student.comment ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !draft.name.trim()) return
    const patch: Partial<Details> = {}
    for (const { key } of fields) {
      if (draft[key].trim() !== (student[key] ?? '').trim()) patch[key] = draft[key].trim()
    }
    setSaving(true)
    setError(false)
    try {
      const result = await saveStudentFields(student.id, patch)
      if (result.error) throw result.error
      onClose()
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const close = () => { if (!saving) onClose() }
  return <Modal title={t('Редактировать ученика')} onClose={close} width={560}
    footer={<div className="student-details-actions">
      <button data-hover="layer" type="button" disabled={saving} onClick={close} style={btn('M', 'quiet')}>{t('Отмена')}</button>
      <button data-hover="layer" type="submit" form={formId} disabled={saving || !draft.name.trim()} style={btn('M', 'primary')}>{t(saving ? 'Сохранение…' : 'Сохранить')}</button>
    </div>}>
    <form id={formId} onSubmit={save} className="student-details-fields">
      {fields.map(({ key, label, maxLength }) => {
        const props = {
          label: t(label), value: draft[key], maxLength, disabled: saving,
          onChange: (value: string) => setDraft(prev => ({ ...prev, [key]: value })),
        }
        return key === 'comment'
          ? <FloatField key={key} {...props} multiline rows={1} />
          : <FloatField key={key} {...props} required={key === 'name'} type={key === 'phone' ? 'tel' : 'text'} />
      })}
      {error && <div className="student-details-error" role="alert"><Alert tone="danger" text={t('Не удалось сохранить данные ученика. Попробуйте ещё раз.')} /></div>}
    </form>
  </Modal>
}
