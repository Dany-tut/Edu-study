import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'

// Порядок курсов ОДНОГО ученика — из настроек ученика.
//
// Курсы у ученика шли в порядке создания, и переставить это было нечем: курс,
// собранный позже, но идущий по программе первым, оказывался последним чипом в
// «Курсах», последней дорожкой на треке и последним в домашках. Здесь учитель
// расставляет их руками, а порядок хранится по паре «ученик × курс»
// (course_enrollments.position) — рядом с уровнем доступа.
//
// Порядок один на все экраны ученика: кабинет читает массив subjects как есть
// (сортировка — orderCourses в src/lib/db.ts), поэтому трек, «Курсы», домашки,
// переключатель предметов и телефон показывают одно и то же.

type Row = { id: string; groupId: string }
type CourseRow = {
  id: string
  title: string
  student_ids: string[] | null
  group_ids: string[] | null
}
type Item = { id: string; title: string; owner: string; mode: 'full' | 'custom' | 'by_date' }

export default function StudentCourseOrder({ studentId, groupId }: { studentId: string; groupId: string | null }) {
  const t = useT()
  const [items, setItems] = useState<Item[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setStatus('idle')
    ;(async () => {
      // Охват человека: у ученика 1:1 на каждый предмет своя карточка-строка, и
      // курсы разложены по ним. Порядок человек видит общий — значит и собирать
      // его надо по всем строкам сразу.
      const rows: Row[] = []
      const { data: scope } = await supabase.rpc('person_student_rows', { p_student: studentId })
      for (const r of (scope ?? []) as Array<{ id: string; group_id: string | null }>) {
        rows.push({ id: r.id, groupId: r.group_id ?? '' })
      }
      if (!rows.some(r => r.id === studentId)) rows.push({ id: studentId, groupId: groupId ?? '' })

      const ids = [...new Set(rows.map(r => r.id))].filter(Boolean)
      const gids = [...new Set(rows.map(r => r.groupId).concat(groupId ?? ''))].filter(Boolean)
      const orParts = [
        ...ids.map(id => `student_ids.cs.{${id}}`),
        ...gids.map(g => `group_ids.cs.{${g}}`),
      ]
      if (orParts.length === 0) { if (!cancelled) setItems([]); return }

      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, student_ids, group_ids')
        .eq('status', 'published')
        .or(orParts.join(','))
        .order('created_at', { ascending: true })
      const list = (courses ?? []) as CourseRow[]

      // Уровень доступа и позиция — из тех же строк, что читает кабинет.
      const { data: enr } = await supabase
        .from('course_enrollments')
        .select('course_id, student_id, access_mode, position')
        .in('student_id', ids)
        .in('course_id', list.map(c => c.id))
      const enrByCourse = new Map<string, { student_id: string; access_mode: Item['mode']; position: number | null }>()
      for (const e of (enr ?? []) as Array<{ course_id: string; student_id: string; access_mode: Item['mode']; position: number | null }>) {
        enrByCourse.set(e.course_id, e)
      }

      // Чья строка «владеет» курсом — та же, куда пишет прогресс: сначала прямое
      // назначение, иначе строка внутри назначенной группы.
      const ownerFor = (c: CourseRow) =>
        rows.find(r => (c.student_ids ?? []).includes(r.id))?.id
        ?? rows.find(r => r.groupId && (c.group_ids ?? []).includes(r.groupId))?.id
        ?? studentId

      const built: Item[] = list.map(c => {
        const e = enrByCourse.get(c.id)
        return { id: c.id, title: c.title, owner: e?.student_id ?? ownerFor(c), mode: e?.access_mode ?? 'custom' }
      })
      // Нерасставленные — после расставленных, в порядке создания (как в кабинете).
      built.sort((a, b) => {
        const pa = enrByCourse.get(a.id)?.position
        const pb = enrByCourse.get(b.id)?.position
        return (typeof pa === 'number' ? pa : Number.MAX_SAFE_INTEGER) - (typeof pb === 'number' ? pb : Number.MAX_SAFE_INTEGER)
      })
      if (!cancelled) setItems(built)
    })().catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [studentId, groupId])

  async function persist(next: Item[]) {
    setStatus('saving')
    // Пишем ВСЕ строки, а не только сдвинутые: позиция имеет смысл только целым
    // списком, а полупроставленный порядок читался бы как «часть курсов не
    // расставлена» и разъезжался бы с тем, что учитель видит здесь.
    const payload = next.map((it, i) => ({
      course_id: it.id,
      student_id: it.owner,
      access_mode: it.mode,
      position: i,
    }))
    const { error } = await supabase
      .from('course_enrollments')
      .upsert(payload, { onConflict: 'course_id,student_id' })
    if (error) { console.error('[StudentCourseOrder] save failed', error); setStatus('error'); return }
    setStatus('saved')
    setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2000)
  }

  function move(from: number, dir: -1 | 1) {
    if (!items) return
    const to = from + dir
    if (to < 0 || to >= items.length) return
    const next = [...items]
    ;[next[from], next[to]] = [next[to], next[from]]
    setItems(next)
    void persist(next)
  }

  if (items !== null && items.length < 2) return null

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {t('Порядок курсов')}
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, color: status === 'error' ? 'var(--color-red-text)' : 'var(--color-text-3)' }}>
          {status === 'saving' ? t('Сохраняем…') : status === 'saved' ? t('Сохранено') : status === 'error' ? t('Не сохранилось') : ''}
        </span>
      </div>

      {items === null ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Загрузка…')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            <div
              key={it.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 8px 7px 6px', borderRadius: 10,
                background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              }}
            >
              <GripVertical size={13} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', width: 12, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {it.title}
              </span>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <ArrowBtn icon={<ChevronUp size={13} />} title={t('Выше')} disabled={i === 0} onClick={() => move(i, -1)} />
                <ArrowBtn icon={<ChevronDown size={13} />} title={t('Ниже')} disabled={i === items.length - 1} onClick={() => move(i, 1)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
        {t('Этот порядок ученик видит везде: на треке, в «Курсах» и в домашках.')}
      </div>
    </section>
  )
}

function ArrowBtn({ icon, title, disabled, onClick }: { icon: React.ReactNode; title: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 22, height: 22, borderRadius: 7, border: '1px solid var(--color-border)',
        background: 'transparent', color: 'var(--color-text-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
        transition: 'color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.color = 'var(--color-accent)'; e.currentTarget.style.borderColor = 'var(--color-accent)' } }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-3)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      {icon}
    </button>
  )
}
