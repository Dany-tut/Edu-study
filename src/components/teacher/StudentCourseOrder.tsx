import { useEffect, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical } from 'lucide-react'
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
type Item = { id: string; title: string }

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
      // Позиции — из тех же строк, что читает кабинет.
      const { data: enr } = await supabase
        .from('course_enrollments')
        .select('course_id, position')
        .in('student_id', ids)
        .in('course_id', list.map(c => c.id))
      const posByCourse = new Map<string, number>()
      for (const e of (enr ?? []) as Array<{ course_id: string; position: number | null }>) {
        if (typeof e.position === 'number') posByCourse.set(e.course_id, e.position)
      }

      const built: Item[] = list.map(c => ({ id: c.id, title: c.title }))
      // Нерасставленные — после расставленных, в порядке создания (как в кабинете).
      built.sort((a, b) =>
        (posByCourse.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (posByCourse.get(b.id) ?? Number.MAX_SAFE_INTEGER))
      if (!cancelled) setItems(built)
    })().catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [studentId, groupId])

  // Пишем ВСЕ курсы списком, той же дверью, что и настройки ученика (RPC
  // set_course_order, миграция 0080): одна логика владения строкой — и порядок
  // не расходится между кабинетом ученика и панелью учителя.
  async function persist(next: Item[]) {
    setStatus('saving')
    const { error } = await supabase.rpc('set_course_order', {
      p_student: studentId,
      p_courses: next.map(it => it.id),
    })
    if (error) { console.error('[StudentCourseOrder] save failed', error); setStatus('error'); return }
    setStatus('saved')
    setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2000)
  }

  function onReorder(next: Item[]) {
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
        <Reorder.Group
          as="div"
          axis="y"
          values={items}
          onReorder={onReorder}
          style={{ display: 'flex', flexDirection: 'column', gap: 6, listStyle: 'none', padding: 0, margin: 0 }}
        >
          {items.map((it, i) => (
            <OrderRow key={it.id} item={it} index={i} />
          ))}
        </Reorder.Group>
      )}

      <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>
        {t('Этот порядок ученик видит везде: на треке, в «Курсах» и в домашках.')}
      </div>
    </section>
  )
}

// Тянуть можно только за ручку — тапы по строке и прокрутка панели остаются
// прокруткой (то же решение, что в окне «Виджеты» у ученика).
function OrderRow({ item, index }: { item: Item; index: number }) {
  const controls = useDragControls()
  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: '0 10px 24px rgba(0,0,0,0.18)' }}
      transition={{ type: 'spring', stiffness: 600, damping: 42 }}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 8px 7px 6px', borderRadius: 10,
        background: 'var(--color-bg)', border: '1px solid var(--color-border)',
        listStyle: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      }}
    >
      <span
        onPointerDown={e => controls.start(e)}
        style={{ display: 'flex', cursor: 'grab', touchAction: 'none', color: 'var(--color-text-3)', flexShrink: 0 }}
      >
        <GripVertical size={13} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', width: 12, flexShrink: 0 }}>{index + 1}</span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {item.title}
      </span>
    </Reorder.Item>
  )
}
