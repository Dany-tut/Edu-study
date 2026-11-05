import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { BookOpen, Users, X, Mail, Copy, Check, KeyRound, Trash2 } from '../icons/appIcons'
import { supabase } from '../../lib/supabase'
import { copyToClipboard } from '../../lib/clipboard'
import { TEACHER_TABS } from '../../lib/teacherAccess'
import { WIDGET_REGISTRY } from './widgets/registry'
import AccessConfigurator, { hiddenTabsFrom, hiddenWidgetsFrom, selectedTabsFrom, selectedWidgetsFrom, type CourseAssignment } from './AccessConfigurator'
import TeacherSaveButton from './TeacherSaveButton'
import { useT, useTc } from '../../lib/i18n'
import { authErrorRu } from '../../lib/authErrors'
import { Alert } from '../Alert'
import { btn } from '../../lib/pillStyles'

// Управление учителями в админке: приглашение по ссылке, приглашения в
// ожидании и редактор доступов. Живёт в «Пользователи → По учителям» — рядом с
// тарифом и активностью того же учителя, а не отдельным списком в «Обзоре».

/** Доступы учителя из admin_teacher_list. */
export type TeacherAccess = {
  id: string
  role: string
  hiddenTabs: string[]
  hiddenWidgets: string[]
  subjects: string[]
}

/** Учитель получил ссылку, но ещё не зарегистрировался (teacher_invites, consumed_at IS NULL). */
export type PendingInvite = {
  token: string
  email: string | null
  createdAt: string
  createdByName: string | null
}

// Курс/группа, которые уже есть у учителя (admin_teacher_content).
type TeacherContentRow = {
  kind: 'course' | 'group'
  id: string
  title: string
  via: 'owned' | 'shared'
  detail: number
}

/** Доступы всех учителей и неактивированные приглашения — одним запросом на экран. */
export async function fetchTeacherAdmin(): Promise<{ access: Record<string, TeacherAccess>; invites: PendingInvite[] }> {
  const [teachersRes, invitesRes] = await Promise.all([
    supabase.rpc('admin_teacher_list'),
    supabase.rpc('admin_pending_teacher_invites'),
  ])
  const access: Record<string, TeacherAccess> = {}
  for (const r of (Array.isArray(teachersRes.data) ? teachersRes.data : []) as any[]) {
    access[r.id] = {
      id: r.id,
      role: r.role ?? 'teacher',
      hiddenTabs: (r.hidden_tabs as string[] | null) ?? [],
      hiddenWidgets: (r.hidden_widgets as string[] | null) ?? [],
      subjects: (r.subjects as string[] | null) ?? [],
    }
  }
  const invites = (Array.isArray(invitesRes.data) ? invitesRes.data : []).map((r: any) => ({
    token: r.token as string,
    email: (r.email as string | null) ?? null,
    createdAt: r.created_at as string,
    createdByName: (r.created_by_name as string | null) ?? null,
  }))
  return { access, invites }
}

export function inviteLink(token: string) {
  return `${window.location.origin}${window.location.pathname}#/join-teacher?token=${token}`
}

/** Список «Приглашения · не активированы»: ссылку можно скопировать снова или отозвать. */
export function PendingInvites({ invites, onRevoked }: { invites: PendingInvite[]; onRevoked: (token: string) => void }) {
  const t = useT()
  if (invites.length === 0) return null
  async function revoke(token: string) {
    await supabase.rpc('admin_revoke_teacher_invite', { p_token: token })
    onRevoked(token)
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>
        {t('Приглашения · не активированы')}
      </div>
      <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 14, overflow: 'hidden' }}>
        {invites.map((inv, i) => (
          <div key={inv.token} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderTop: i > 0 ? '1px solid var(--color-border)' : undefined }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)', flexShrink: 0 }}>
              <Mail size={16} strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {inv.email || t('Без email')}
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-peach-text)', background: 'var(--color-peach-soft)', borderRadius: 6, padding: '1px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />{t('не активировано')}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                {t('Создано')} {new Date(inv.createdAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                {' · '}
                {inv.createdByName
                  ? <>{t('автор')}: <span style={{ color: 'var(--color-text-2)', fontWeight: 600 }}>{inv.createdByName}</span></>
                  : <span title={t('Приглашение создано не из админки или аккаунт автора удалён')}>{t('автор неизвестен')}</span>}
              </div>
            </div>
            <button onClick={() => { void copyToClipboard(inviteLink(inv.token)) }} title={t('Скопировать ссылку')} style={{ ...btn('S', 'secondary'), flexShrink: 0 }}>
              <Copy size={14} strokeWidth={2} />{t('Ссылка')}
            </button>
            <button
              onClick={() => { void revoke(inv.token) }}
              title={t('Отозвать приглашение')}
              style={{ ...btn('S', 'secondary', { width: 32, padding: 0, color: 'var(--color-red-text)' }), flexShrink: 0 }}
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InviteModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [selectedTabs, setSelectedTabs] = useState<string[]>(TEACHER_TABS.map(t => t.id))
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(WIDGET_REGISTRY.map(w => w.type))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]) // empty = all subjects
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])

  async function createInvite() {
    setCreating(true); setError('')
    const { data, error: err } = await supabase.rpc('admin_create_teacher_invite', {
      p_email: email.trim() || null,
      p_hidden_tabs: hiddenTabsFrom(selectedTabs),
      p_hidden_widgets: hiddenWidgetsFrom(selectedWidgets),
      p_course_assignments: courseAssignments,
      p_group_ids: groupIds,
      p_subjects: selectedSubjects,
    })
    setCreating(false)
    if (err || !data) { setError(t(authErrorRu(err, 'Не удалось создать приглашение'))); return }
    setLink(inviteLink(data as string))
  }

  function copyLink() {
    void copyToClipboard(link).then(ok => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900, backdropFilter: 'blur(4px)' }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 901, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: 20 }}>
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        style={{
          pointerEvents: 'auto',
          width: 560, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto',
          background: 'var(--color-bg-2)',
          backdropFilter: 'var(--blur-solid)',
          WebkitBackdropFilter: 'var(--blur-solid)',
          border: '1px solid var(--color-border-medium)',
          borderRadius: 24, padding: 24,
          boxShadow: 'var(--shadow-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t('Пригласить учителя')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{t('Выберите доступ и контент — они «запекутся» в ссылку')}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
            <X size={14} />
          </button>
        </div>

        {link ? (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={20} strokeWidth={2.5} style={{ color: 'var(--color-green-text)' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Приглашение готово')}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Отправьте ссылку учителю — доступ применится при регистрации.')}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', borderRadius: 12, padding: '10px 12px', wordBreak: 'break-all', marginBottom: 12 }}>{link}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={copyLink} style={{ height: 40, flex: 1, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
                {copied ? t('Скопировано!') : t('Скопировать ссылку')}
              </button>
              <button onClick={onClose} style={btn('M', 'secondary')}>{t('Готово')}</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 6 }}>{t('Email учителя (необязательно, подставится в форму)')}</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="teacher@example.com"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 12, border: '1px solid var(--color-border-medium)',
                    background: 'var(--color-bg-3)', color: 'var(--color-text)',
                    fontSize: 14, outline: 'none',
                  }}
                />
              </div>
            </div>

            <AccessConfigurator
              selectedTabs={selectedTabs} onTabsChange={setSelectedTabs}
              selectedWidgets={selectedWidgets} onWidgetsChange={setSelectedWidgets}
              courseAssignments={courseAssignments} onCoursesChange={setCourseAssignments}
              groupIds={groupIds} onGroupsChange={setGroupIds}
              subjects={selectedSubjects} onSubjectsChange={setSelectedSubjects}
            />

            {error && <Alert tone="danger" text={error} style={{ marginTop: 12 }} />}

            <button
              onClick={createInvite}
              disabled={creating}
              style={{ height: 48,
                width: '100%', padding: '0 22px', borderRadius: 14, border: 'none', marginTop: 18,
                background: 'var(--grad-purple)', color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: creating ? 'wait' : 'pointer',
              }}
            >
              {creating ? t('Создаём…') : t('Создать пригласительную ссылку')}
            </button>
          </>
        )}
      </motion.div>
      </div>
    </>,
    document.body
  )
}

export function AccessEditor({ teacher, onSaved }: { teacher: TeacherAccess; onSaved: (hiddenTabs: string[], hiddenWidgets: string[], subjects: string[]) => void }) {
  const t = useT()
  const { tc } = useTc()
  const [selectedTabs, setSelectedTabs] = useState<string[]>(selectedTabsFrom(teacher.hiddenTabs))
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(selectedWidgetsFrom(teacher.hiddenWidgets))
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(teacher.subjects) // empty = all
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [groupIds, setGroupIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  // Password reset (admin-only): teachers pick their own password on sign-up and
  // it's an unreadable Auth hash — this issues a NEW one, shown once to relay.
  const [pwLoading, setPwLoading] = useState(false)
  const [pwValue, setPwValue] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwCopied, setPwCopied] = useState(false)
  // What the teacher ALREADY has (read-only) — owned/shared courses + owned groups.
  const [current, setCurrent] = useState<TeacherContentRow[] | null>(null)

  useEffect(() => {
    let alive = true
    supabase.rpc('admin_teacher_content', { p_teacher: teacher.id }).then(({ data }) => {
      if (!alive) return
      setCurrent(Array.isArray(data) ? (data as TeacherContentRow[]) : [])
    })
    return () => { alive = false }
  }, [teacher.id])

  async function resetPassword() {
    setPwLoading(true); setPwError(''); setPwValue('')
    const { data, error: err } = await supabase.functions.invoke('reset-teacher-password', {
      body: { teacherId: teacher.id },
    })
    setPwLoading(false)
    if (err || !data?.password) {
      const msg = (data as { error?: string } | null)?.error || t(authErrorRu(err, 'Не удалось сбросить пароль'))
      setPwError(msg); return
    }
    setPwValue(data.password as string)
  }

  async function save() {
    setSaving(true)
    setError('')
    // 1. Access deny-lists (complement of the selected sections/widgets).
    const hiddenTabs = hiddenTabsFrom(selectedTabs)
    const hiddenWidgets = hiddenWidgetsFrom(selectedWidgets)
    const { error: err } = await supabase.rpc('admin_set_teacher_access', {
      p_teacher: teacher.id,
      p_hidden_tabs: hiddenTabs,
      p_hidden_widgets: hiddenWidgets,
    })
    if (err) { setSaving(false); setError(t(authErrorRu(err))); return }

    // 1b. Subject scope (empty = all).
    const { error: sErr } = await supabase.rpc('admin_set_teacher_subjects', {
      p_teacher: teacher.id,
      p_subjects: selectedSubjects,
    })
    if (sErr) { setSaving(false); setError(t(authErrorRu(sErr))); return }

    // 2. Provision selected content to this teacher (incremental — cleared after).
    try {
      for (const a of courseAssignments) {
        if (a.mode === 'copy') {
          const { error: e } = await supabase.rpc('admin_duplicate_course', { p_course_id: a.course_id, p_new_owner: teacher.id })
          if (e) throw e
        } else {
          const { error: e } = await supabase.from('course_shares').upsert({ course_id: a.course_id, teacher_id: teacher.id })
          if (e) throw e
        }
      }
      for (const gid of groupIds) {
        const { error: e } = await supabase.rpc('admin_reassign_content', { p_kind: 'group', p_id: gid, p_new_owner: teacher.id })
        if (e) throw e
      }
    } catch (e: any) {
      setSaving(false); setError(t('Доступы сохранены, но контент выдать не удалось:') + ' ' + t(authErrorRu(e))); return
    }

    setSaving(false)
    setCourseAssignments([]); setGroupIds([])
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
    onSaved(hiddenTabs, hiddenWidgets, selectedSubjects)
  }

  return (
    <div style={{ padding: '4px 18px 18px' }}>
      {/* Read-only: what the teacher ALREADY has. The picker below is "give more". */}
      {current && current.length > 0 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 12, background: 'var(--color-bg-3)', border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('Уже у учителя')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {current.map(r => (
              <span key={`${r.kind}-${r.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 8, padding: '4px 10px' }}>
                {r.kind === 'course' ? <BookOpen size={12} strokeWidth={2} /> : <Users size={12} strokeWidth={2} />}
                {tc(r.title)}
                <span style={{ color: 'var(--color-text-3)', fontWeight: 500 }}>
                  · {r.kind === 'course' ? `${r.detail} ${t('ур.')}` : `${r.detail} ${t('уч.')}`}{r.via === 'shared' ? ' · share' : ''}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 14, lineHeight: 1.5 }}>
        {t('Отметьте разделы/виджеты, которые учитель')} <b>{t('видит')}</b>{t(', и курсы/группы, которые ему')} <b>{t('выдать')}</b>{t('. Курсы/группы применяются при сохранении.')}
      </div>

      <AccessConfigurator
        selectedTabs={selectedTabs} onTabsChange={setSelectedTabs}
        selectedWidgets={selectedWidgets} onWidgetsChange={setSelectedWidgets}
        courseAssignments={courseAssignments} onCoursesChange={setCourseAssignments}
        groupIds={groupIds} onGroupsChange={setGroupIds}
        subjects={selectedSubjects} onSubjectsChange={setSelectedSubjects}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
        <TeacherSaveButton
          label={t('Сохранить')} savingLabel={t('Сохраняем…')} savedLabel={t('Сохранено')}
          saving={saving} saved={saved} onClick={save}
        />
        {error && <span style={{ fontSize: 11, color: 'var(--color-red-text)' }}>{error}</span>}
      </div>

      {/* Password reset — teachers have no readable password (self-chosen Auth
          hash); admin can issue a new one and relay it. */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={resetPassword}
            disabled={pwLoading}
            style={btn('S', 'secondary')}
          >
            <KeyRound size={14} strokeWidth={2} />
            {pwLoading ? t('Сбрасываем…') : t('Сбросить пароль')}
          </button>
          {pwValue && (
            <div
              onClick={() => { void copyToClipboard(pwValue).then(ok => { if (ok) { setPwCopied(true); setTimeout(() => setPwCopied(false), 1500) } }) }}
              title={t('Скопировать')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '8px 12px', borderRadius: 10,
                background: 'var(--color-purple-soft)', border: '1px solid rgba(155,109,255,0.3)',
              }}
            >
              <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-purple)', letterSpacing: 0.4 }}>{pwValue}</code>
              {pwCopied ? <Check size={14} strokeWidth={2.5} style={{ color: 'var(--color-purple)' }} /> : <Copy size={14} style={{ color: 'var(--color-purple)' }} />}
            </div>
          )}
          {pwError && <span style={{ fontSize: 11, color: 'var(--color-red-text)' }}>{pwError}</span>}
        </div>
        {pwValue && (
          <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 8, lineHeight: 1.5 }}>
            {t('Новый пароль показан один раз — скопируйте и передайте учителю. Он войдёт с ним и сможет сменить его сам.')}
          </div>
        )}
      </div>
    </div>
  )
}
