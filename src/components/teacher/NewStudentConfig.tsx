import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { WIDGET_META } from '../../data/widgets'
import { fetchTeacherCourses, configureNewStudent, type TeacherCourseOption } from '../../lib/useGroups'
import TeacherSelect from './TeacherSelect'
import { useT } from '../../lib/i18n'

// Config step shown between "student created" and the invite link: pick which
// dashboard widgets the student sees (teacher-enforced hard-hide) and optionally
// assign an existing published course. Both are optional — "Продолжить" applies
// whatever is set and reveals the link.
export default function NewStudentConfig({
  studentId, groupId, onDone,
}: {
  studentId: string
  groupId: string | null
  onDone: () => void
}) {
  const t = useT()
  // Widgets are shown-by-default; the set holds ids the teacher chose to hide.
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [courseId, setCourseId] = useState<string>('')
  const [courses, setCourses] = useState<TeacherCourseOption[]>([])
  const [saving, setSaving] = useState(false)
  // Fades hint that the list continues past the fixed footer / above the header.
  const scrollRef = useRef<HTMLDivElement>(null)
  const [fadeTop, setFadeTop] = useState(false)
  const [fadeBottom, setFadeBottom] = useState(false)

  useEffect(() => { fetchTeacherCourses().then(setCourses) }, [])

  function syncFades() {
    const el = scrollRef.current
    if (!el) return
    setFadeTop(el.scrollTop > 4)
    setFadeBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }
  // Courses arrive async and grow the content — re-measure after every render pass.
  useEffect(syncFades)

  const allHidden = hidden.size === WIDGET_META.length
  const toggleAll = () =>
    setHidden(allHidden ? new Set() : new Set(WIDGET_META.map(w => w.id)))

  const toggle = (id: number) => setHidden(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  async function apply() {
    setSaving(true)
    await configureNewStudent(studentId, {
      hiddenWidgets: [...hidden],
      courseId: courseId || null,
      groupId,
    })
    setSaving(false)
    onDone()
  }

  const courseOptions = [
    { value: '', label: t('Без курса') },
    ...courses.map(c => ({ value: c.id, label: c.title })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Scroll area — runs under the fixed footer, edges faded while scrollable */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        <div
          ref={scrollRef}
          onScroll={syncFades}
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}
        >
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
        {t('Настройте, что увидит ученик. Можно оставить по умолчанию.')}
      </p>

      {/* Widgets */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)' }}>{t('ВИДЖЕТЫ')}</span>
          <button
            type="button"
            onClick={toggleAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
              border: '1.5px solid var(--color-border-medium)',
              background: 'transparent', color: 'var(--color-muted)',
              fontSize: 12, fontWeight: 700,
            }}
          >
            {allHidden ? <Eye size={13} /> : <EyeOff size={13} />}
            {allHidden ? t('Показать все') : t('Скрыть все')}
          </button>
        </div>
        {WIDGET_META.map(w => {
          const isHidden = hidden.has(w.id)
          return (
            <button
              key={w.id}
              onClick={() => toggle(w.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 12px', borderRadius: 12, cursor: 'pointer',
                border: '1.5px solid var(--color-border-medium)',
                background: 'var(--color-bg-4)',
                opacity: isHidden ? 0.55 : 1,
                textAlign: 'left',
              }}
            >
              <span style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: w.soft, color: w.color,
              }}>
                <w.Icon size={16} />
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{w.label}</span>
              <span style={{ display: 'flex', color: isHidden ? 'var(--color-muted)' : 'var(--color-accent)' }}>
                {isHidden ? <EyeOff size={17} /> : <Eye size={17} />}
              </span>
            </button>
          )
        })}
      </div>

      {/* Course (optional) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)' }}>{t('КУРС (НЕОБЯЗАТЕЛЬНО)')}</span>
        <TeacherSelect
          value={courseId}
          onChange={setCourseId}
          placeholder={t('Без курса')}
          options={courseOptions}
        />
      </div>
        </div>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 28, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, var(--color-bg-input), transparent)',
          opacity: fadeTop ? 1 : 0, transition: 'opacity 0.18s',
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, pointerEvents: 'none',
          background: 'linear-gradient(to top, var(--color-bg-input), transparent)',
          opacity: fadeBottom ? 1 : 0, transition: 'opacity 0.18s',
        }} />
      </div>

      <button
        onClick={apply}
        disabled={saving}
        style={{
          flexShrink: 0, marginTop: 16,
          width: '100%', padding: '12px 0',
          background: 'var(--color-purple)', color: '#fff', fontWeight: 700, fontSize: 15,
          border: 'none', borderRadius: 14, cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? t('Сохранение...') : t('Продолжить')}
      </button>
    </div>
  )
}
