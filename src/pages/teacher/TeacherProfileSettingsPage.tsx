import { useState, useEffect } from 'react'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Save, User, Camera, X,
  Flower2, Cat, Rabbit, Bird, Fish, Bug, Rocket, Star, type LucideIcon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { TeacherBook } from '../../lib/teacherAvatarIcon'
import SubjectColorPicker, { type ColorSubject } from '../../components/SubjectColorPicker'
import { getSubject, registrySubjectPalette } from '../../lib/subjects'
import { loadTeacherSubjectColors, saveTeacherSubjectColors, type SubjectColorMap } from '../../lib/teacherSubjectColors'
import { useTeacher } from '../../store/teacherStore'
import { usePersistentState, readDraft, clearDrafts } from '../../lib/useDraft'
import { useT } from '../../lib/i18n'
import { authErrorRu } from '../../lib/authErrors'
import { getAuthUser } from '../../lib/owner'
import { AvatarPhotoFill, AvatarCropModal, pickImageFile } from '../../components/AvatarPhoto'
import { uploadAvatarPhoto, removeAvatarPhoto, saveTeacherAvatarPath } from '../../lib/avatarPhoto'
import { useTeacherAccess } from '../../lib/teacherAccess'
import TeacherSubjectsField from '../../components/teacher/TeacherSubjectsField'
import { Alert } from '../../components/Alert'
import TeacherModules from '../../components/teacher/TeacherModules'

// `scale` = optical-size correction so every glyph reads the same visual weight
// inside the circle (lucide icons have different natural fill — a Star looks
// smaller than a Flower at the same px). ~52% of the circle is the base.
type AvatarOption = { id: string; Icon: LucideIcon; gradient: string; glow: string; scale?: number }

const AVATARS: AvatarOption[] = [
  { id: 'teacher', Icon: TeacherBook, gradient: 'linear-gradient(135deg, hsl(228 78% 70%), hsl(248 64% 52%) 60%, hsl(262 60% 42%))', glow: 'hsl(244 70% 58% / 0.5)', scale: 1.08 },
  { id: 'flower', Icon: Flower2, gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))', glow: 'hsl(271 76% 65% / 0.45)', scale: 0.96 },
  { id: 'cat',    Icon: Cat,    gradient: 'linear-gradient(135deg, hsl(28 92% 68%), hsl(14 84% 56%))',    glow: 'hsl(21 88% 62% / 0.45)' },
  { id: 'rabbit', Icon: Rabbit, gradient: 'linear-gradient(135deg, hsl(330 88% 74%), hsl(345 76% 60%))', glow: 'hsl(337 82% 67% / 0.45)' },
  { id: 'bird',   Icon: Bird,   gradient: 'linear-gradient(135deg, hsl(205 92% 70%), hsl(220 80% 58%))', glow: 'hsl(212 86% 64% / 0.45)', scale: 1.04 },
  { id: 'fish',   Icon: Fish,   gradient: 'linear-gradient(135deg, hsl(180 72% 62%), hsl(196 78% 50%))', glow: 'hsl(188 74% 56% / 0.45)', scale: 1.06 },
  { id: 'bug',    Icon: Bug,    gradient: 'linear-gradient(135deg, hsl(2 82% 70%), hsl(354 74% 56%))',   glow: 'hsl(358 78% 63% / 0.45)' },
  { id: 'rocket', Icon: Rocket, gradient: 'linear-gradient(135deg, hsl(46 96% 66%), hsl(36 92% 54%))',   glow: 'hsl(41 94% 60% / 0.45)', scale: 1.04 },
  { id: 'star',   Icon: Star,   gradient: 'linear-gradient(135deg, hsl(264 82% 72%), hsl(278 70% 58%))', glow: 'hsl(271 76% 65% / 0.45)', scale: 1.1 },
]

export default function TeacherProfileSettingsPage() {
  const t = useT()
  const setActivePage = useTeacher(s => s.setActivePage)

  // Snapshot before usePersistentState mirrors initial values into storage —
  // an existing draft must win over the async profile load below.
  const [hadDraft] = useState(() => ({
    name: readDraft('profile.name') !== null,
    avatarId: readDraft('profile.avatarId') !== null,
  }))
  // Draft-backed: survives a page reload; cleared on successful save.
  const [name,     setName]     = usePersistentState('profile.name', '')
  const [avatarId, setAvatarId] = usePersistentState('profile.avatarId', 'flower')
  const [email,    setEmail]    = useState('')
  // Фото сохраняется сразу, без кнопки «Сохранить»: файл уже в хранилище.
  const [avatarPath, setAvatarPath] = useState<string | null>(null)
  const [cropFile,   setCropFile]   = useState<File | null>(null)
  const [role,     setRole]     = useState<'admin' | 'teacher'>('teacher')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    getAuthUser().then(u => {
      if (!u) return
      if (!hadDraft.name) setName(u.user_metadata?.name ?? u.email?.split('@')[0] ?? '')
      setEmail(u.email ?? '')
      setRole(u.app_metadata?.role === 'admin' ? 'admin' : 'teacher')
      if (!hadDraft.avatarId) setAvatarId(u.user_metadata?.avatarId ?? 'flower')
      setAvatarPath(u.user_metadata?.avatarPath ?? null)
    })
  }, [])

  // ── Цвета предметов ────────────────────────────────────────────────────────
  // База учителя: этим цветом его предмет виден и ему, и всем его ученикам —
  // пока ученик не выберет свой в собственных настройках (тот бьёт этот).
  const [subjectColors, setSubjectColors] = useState<SubjectColorMap>({})
  const [colorSubjects, setColorSubjects] = useState<ColorSubject[]>([])
  const [colorSaved, setColorSaved] = useState(false)

  useEffect(() => {
    loadTeacherSubjectColors().then(setSubjectColors)
    // Предметы берём из того, что у учителя реально есть — курсы и группы.
    // Показывать все двенадцать было бы списком настроек ни для чего.
    ;(async () => {
      const [courses, groups] = await Promise.all([
        supabase.from('courses').select('subject'),
        supabase.from('groups').select('subject'),
      ])
      const tags = [...(courses.data ?? []), ...(groups.data ?? [])].map(r => (r as { subject: string | null }).subject)
      const seen = new Map<string, ColorSubject>()
      tags.forEach(tag => {
        const def = getSubject(tag ?? undefined)
        if (def && !seen.has(def.id)) seen.set(def.id, { id: def.id, name: def.name, icon: def.icon })
      })
      setColorSubjects([...seen.values()])
    })()
  }, [])

  async function changeSubjectColor(subjectId: string, hex: string | null) {
    const next = { ...subjectColors }
    if (hex) next[subjectId] = hex
    else delete next[subjectId]
    setSubjectColors(next)
    const ok = await saveTeacherSubjectColors(next)
    if (ok) { setColorSaved(true); setTimeout(() => setColorSaved(false), 2000) }
  }

  // ── Мои предметы ───────────────────────────────────────────────────────────
  // Сохраняются сразу, как цвета: по ним сужаются списки предметов по всему
  // кабинету. У админа строки в profiles нет — он видит всё, поля нет.
  const mySubjects = useTeacherAccess(s => s.subjects)
  const saveSubjects = useTeacherAccess(s => s.saveSubjects)
  const [subjectsNote, setSubjectsNote] = useState<'saved' | 'error' | null>(null)

  async function changeSubjects(next: string[]) {
    const ok = await saveSubjects(next)
    setSubjectsNote(ok ? 'saved' : 'error')
    if (ok) setTimeout(() => setSubjectsNote(n => (n === 'saved' ? null : n)), 2000)
  }

  const selectedAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0]
  const AvatarIcon = selectedAvatar.Icon

  async function savePhoto(blob: Blob) {
    const path = await uploadAvatarPhoto(blob)
    await saveTeacherAvatarPath(path)
    const old = avatarPath
    setAvatarPath(path)
    setCropFile(null)
    removeAvatarPhoto(old)
  }

  async function removePhoto() {
    const old = avatarPath
    if (!old) return
    setAvatarPath(null)
    try {
      await saveTeacherAvatarPath(null)
      removeAvatarPhoto(old)
    } catch {
      setAvatarPath(old)
      setError(t('Не удалось убрать фото. Попробуйте ещё раз.'))
    }
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setError('')
    const { error: err } = await supabase.auth.updateUser({
      data: { name: name.trim(), avatarId },
    })
    setSaving(false)
    if (err) { setError(t(authErrorRu(err, 'Не удалось сохранить профиль. Попробуйте ещё раз.'))); return }
    clearDrafts('profile.')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const photoBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 10,
    border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)',
    color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 12,
    border: '1px solid var(--color-border-medium)',
    background: 'var(--color-bg-3)', color: 'var(--color-text)',
    fontSize: 14, outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setActivePage('home')}
            style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--color-bg-3)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-3)', flexShrink: 0 }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
          </motion.button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>{t('Настройки профиля')}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>{t('Имя, аватар и данные аккаунта')}</div>
          </div>
        </div>

        {/* Avatar preview + picker */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <motion.div
            key={avatarPath ?? avatarId}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 460, damping: 22 }}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              position: 'relative', overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 22px ${selectedAvatar.glow}`,
              marginBottom: 12,
            }}
          >
            {/* Gradient on an overshooting layer so its square corners are clipped
                by the circular container (kills GPU corner-bleed on transforms). */}
            <div style={{ position: 'absolute', inset: -2, background: selectedAvatar.gradient }} />
            <AvatarIcon size={Math.round(40 * (selectedAvatar.scale ?? 1))} strokeWidth={1.8} style={{ color: '#fff', position: 'relative' }} />
            <AvatarPhotoFill path={avatarPath} />
          </motion.div>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 12 }}>
            {role === 'admin' ? t('Администратор') : t('Учитель')}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => pickImageFile(setCropFile)}
              style={photoBtnStyle}
            >
              <Camera size={14} strokeWidth={2} />
              <span style={{ position: 'relative', top: '-0.12em' }}>{avatarPath ? t('Сменить фото') : t('Загрузить фото')}</span>
            </motion.button>
            {avatarPath && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={removePhoto}
                style={photoBtnStyle}
              >
                <X size={14} strokeWidth={2} />
                <span style={{ position: 'relative', top: '-0.12em' }}>{t('Убрать фото')}</span>
              </motion.button>
            )}
          </div>

          {/* Avatar grid — same recipe as the student sidebar picker */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${AVATARS.length}, 1fr)`, gap: 12, width: '100%' }}>
            {AVATARS.map(opt => {
              const Ic = opt.Icon
              const isSelected = !avatarPath && avatarId === opt.id
              return (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setAvatarId(opt.id); removePhoto() }}
                  aria-label={opt.id}
                  style={{
                    width: 52, height: 52, justifySelf: 'center',
                    borderRadius: '50%', overflow: 'hidden',
                    background: opt.gradient,
                    cursor: 'pointer', padding: 0, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                    boxShadow: isSelected
                      ? 'inset 0 0 0 1px rgba(255,255,255,0.4), 0 0 0 2px var(--color-bg-2), 0 0 0 4px var(--color-accent)'
                      : 'inset 0 0 0 1px rgba(255,255,255,0.4)',
                  }}
                >
                  <Ic size={Math.round(24 * (opt.scale ?? 1))} strokeWidth={2} />
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder={t('Имя')}
            style={inputStyle}
          />

          {role !== 'admin' && (
            <div>
              <TeacherSubjectsField value={mySubjects} onChange={changeSubjects} look="profile" />
              <div style={{ fontSize: 11, marginTop: 5, color: subjectsNote === 'error' ? 'var(--color-red-text)' : subjectsNote === 'saved' ? 'var(--color-green-text)' : 'var(--color-text-3)' }}>
                {subjectsNote === 'error'
                  ? t('Не удалось сохранить предметы. Попробуйте ещё раз.')
                  : subjectsNote === 'saved'
                    ? t('Сохранено')
                    : t('Остальные предметы уберём из списков в Конструкторе, тренажёре, ДЗ и группах')}
              </div>
            </div>
          )}

          <div>
            <div style={{ position: 'relative' }}>
              <input value={email} readOnly placeholder="Email" style={{ ...inputStyle, color: 'var(--color-text-3)', cursor: 'not-allowed' }} />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--color-text-3)', background: 'var(--color-bg-3)', padding: '2px 6px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                {t('только чтение')}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 5 }}>{t('Для смены email обратитесь в поддержку')}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)' }}>
            <User size={16} strokeWidth={2} style={{ color: 'var(--color-text-3)' }} />
            <span style={{ fontSize: 14, color: 'var(--color-text-3)' }}>{role === 'admin' ? t('Администратор') : t('Учитель')}</span>
          </div>

          {error && (
            <Alert tone="danger" text={error} />
          )}

          <TeacherSaveButton
            label={t('Сохранить')} savingLabel={t('Сохраняем…')}
            saving={saving} saved={saved} disabled={!name.trim()}
            onClick={handleSave} icon={<Save size={16} strokeWidth={2.5} />} fullWidth
          />
        </div>

        {/* Модули — подключаемые продукты (Тестли): кнопки «Из Тестли» в ДЗ и уроках. */}
        <TeacherModules />

        {/* Цвета предметов — сохраняются сразу по выбору, отдельно от имени:
            менять цвет и жать «Сохранить» внизу формы — лишний шаг. */}
        {colorSubjects.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>{t('Цвета предметов')}</div>
              {colorSaved && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-green-text)' }}>{t('Сохранено')}</div>}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-text-3)', marginBottom: 12 }}>
              {t('Этим цветом предмет видите вы и ваши ученики. Ученик может выбрать свой — у вас останется этот.')}
            </div>
            <SubjectColorPicker
              subjects={colorSubjects}
              value={subjectColors}
              baseColor={id => registrySubjectPalette(id, false).accent}
              onChange={changeSubjectColor}
              resetLabel={t('Как в приложении')}
            />
          </div>
        )}

      </div>
      {cropFile && (
        <AvatarCropModal file={cropFile} onCancel={() => setCropFile(null)} onSave={savePhoto} />
      )}
    </div>
  )
}
