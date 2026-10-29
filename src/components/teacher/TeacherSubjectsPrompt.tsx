import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import TeacherSaveButton from './TeacherSaveButton'
import TeacherSubjectsField from './TeacherSubjectsField'
import { useTeacherAccess } from '../../lib/teacherAccess'
import { useT } from '../../lib/i18n'
import { Alert } from '../Alert'

// Разовое окно «Какие предметы вы ведёте?» для учителей, зарегистрированных до
// того, как регистрация стала спрашивать предметы. Висит, пока набор пуст;
// «Позже» прячет его до следующего захода (sessionStorage), а не навсегда —
// без предметов кабинет показывает весь реестр, и это надо однажды решить.

const LATER_KEY = 'teacher.subjectsPrompt.later'

function laterThisSession(): boolean {
  try { return sessionStorage.getItem(LATER_KEY) === '1' } catch { return false }
}

export default function TeacherSubjectsPrompt() {
  const t = useT()
  const loaded = useTeacherAccess(s => s.loaded)
  const isTeacher = useTeacherAccess(s => s.isTeacher)
  const current = useTeacherAccess(s => s.subjects)
  const saveSubjects = useTeacherAccess(s => s.saveSubjects)
  const [later, setLater] = useState(laterThisSession)
  const [picked, setPicked] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  if (!loaded || !isTeacher || current.length > 0 || later) return null
  const isPhone = typeof window !== 'undefined' && window.innerWidth < 640

  function postpone() {
    try { sessionStorage.setItem(LATER_KEY, '1') } catch { /* приватный режим — спросим ещё раз */ }
    setLater(true)
  }

  async function save() {
    if (!picked.length) return
    setSaving(true); setError(false)
    const ok = await saveSubjects(picked)
    setSaving(false)
    if (!ok) setError(true)
  }

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1200 }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            pointerEvents: 'auto', width: 440, maxWidth: '100%',
            background: 'var(--color-bg-2)', borderRadius: 22, padding: 24,
            border: '1px solid var(--color-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>{t('Какие предметы вы ведёте?')}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2, marginBottom: 18, lineHeight: 1.3 }}>
            {t('Остальные уберём из списков в Конструкторе, тренажёре, ДЗ и группах. Поменять можно в профиле.')}
          </div>

          <TeacherSubjectsField value={picked} onChange={setPicked} look="profile" />

          {error && (
            <Alert tone="danger" text={t('Не удалось сохранить предметы. Попробуйте ещё раз.')} style={{ marginTop: 10 }} />
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 20, flexDirection: isPhone ? 'column-reverse' : 'row' }}>
            <button
              onClick={postpone}
              style={{ padding: '9px 16px', borderRadius: 999, border: 'none', background: 'transparent', color: 'var(--color-text-3)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: isPhone ? '100%' : undefined }}
            >
              {t('Позже')}
            </button>
            <TeacherSaveButton label={t('Сохранить')} savingLabel={t('Сохраняем…')} onClick={save} disabled={!picked.length} saving={saving} fullWidth={isPhone} />
          </div>
        </motion.div>
      </div>
    </>,
    document.body,
  )
}
