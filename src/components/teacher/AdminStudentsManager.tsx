import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Search, Pencil, X, ShieldAlert, KeyRound, User, ArrowRightLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Skeleton from '../Skeleton'
import GrowTextarea from '../GrowTextarea'
import TeacherSelect from './TeacherSelect'
import { useT } from '../../lib/i18n'

// Админский реестр учеников: кто к какому учителю привязан, перевод другому
// учителю / в другую группу, правка карточки и удаление. Владельца ученик не
// хранит сам — им владеет группа (groups.created_by), поэтому «переназначить»
// делает RPC admin_student_reassign (миграция 0053).

type StudentRow = {
  id: string
  name: string
  email: string | null
  phone: string | null
  telegram_link: string | null
  parent_contact: string | null
  comment: string | null
  group_id: string | null
  group_name: string | null
  subject: string | null
  is_individual: boolean
  owner_id: string | null
  owner_name: string
  person_id: string | null
  siblings: number
  has_account: boolean
  progress_rows: number
  last_visit: string | null
  created_at: string
}

type GroupOption = {
  id: string
  name: string
  subject: string | null
  is_individual: boolean
  owner_id: string | null
  owner_name: string
  students: number
}

type TeacherOption = { id: string; name: string; role: string }

const NO_OWNER = '__no_owner__'

export default function AdminStudentsManager() {
  const t = useT()
  const [rows, setRows] = useState<StudentRow[]>([])
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [editing, setEditing] = useState<StudentRow | null>(null)
  const [confirmDel, setConfirmDel] = useState<StudentRow | null>(null)
  const [confirmMove, setConfirmMove] = useState<{ row: StudentRow; owner: string } | null>(null)
  const [notice, setNotice] = useState('')
  // Свёрнутые учителя. Держим именно РАЗВЁРНУТЫХ, а не свёрнутых: учителей
  // становится больше со временем, и новый должен приходить закрытым сам, без
  // нашего участия.
  const [openOwners, setOpenOwners] = useState<Set<string>>(new Set())
  const [forceAll, setForceAll] = useState(false)

  async function load() {
    setLoading(true)
    const [studentsRes, groupsRes, teachersRes] = await Promise.all([
      supabase.rpc('admin_students_list'),
      supabase.rpc('admin_group_options'),
      supabase.rpc('admin_teacher_list'),
    ])
    setRows(Array.isArray(studentsRes.data)
      ? (studentsRes.data as any[]).map(r => ({
          ...r,
          siblings: Number(r.siblings ?? 0),
          progress_rows: Number(r.progress_rows ?? 0),
        })) as StudentRow[]
      : [])
    setGroups(Array.isArray(groupsRes.data)
      ? (groupsRes.data as any[]).map(g => ({ ...g, students: Number(g.students ?? 0) })) as GroupOption[]
      : [])
    setTeachers(Array.isArray(teachersRes.data)
      ? (teachersRes.data as any[]).map(x => ({ id: x.id, name: x.name ?? '—', role: x.role ?? 'teacher' }))
      : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Перевод в личную группу другого учителя рвёт связь с групповым ДЗ старой
  // группы — такой случай спрашиваем отдельно, простой 1:1 переносим сразу.
  function askReassign(row: StudentRow, newOwner: string) {
    if (!newOwner || newOwner === (row.owner_id ?? '')) return
    const grp = groups.find(g => g.id === row.group_id)
    const simple = row.is_individual && (grp?.students ?? 1) <= 1
    if (simple) void doReassign(row, newOwner)
    else setConfirmMove({ row, owner: newOwner })
  }

  async function doReassign(row: StudentRow, newOwner: string) {
    setBusyId(row.id)
    setConfirmMove(null)
    const { data, error } = await supabase.rpc('admin_student_reassign', { p_student: row.id, p_owner: newOwner })
    const teacher = teachers.find(x => x.id === newOwner)?.name ?? ''
    if (error) setNotice(error.message)
    else if (data === 'new_group') setNotice(`${row.name} → ${teacher}: ${t('создана личная группа, групповое ДЗ старой группы не перенесено')}`)
    else if (data === 'group_moved') setNotice(`${row.name} → ${teacher}`)
    await load()
    setBusyId(null)
  }

  async function saveEdit(row: StudentRow, patch: Record<string, string>, groupId: string) {
    setBusyId(row.id)
    setEditing(null)
    const { error } = await supabase.rpc('admin_student_update', { p_id: row.id, p_patch: patch })
    if (error) setNotice(error.message)
    if (groupId && groupId !== row.group_id) {
      const { error: mErr } = await supabase.rpc('admin_student_move', { p_student: row.id, p_group: groupId })
      if (mErr) setNotice(mErr.message)
    }
    await load()
    setBusyId(null)
  }

  async function doDelete(row: StudentRow) {
    setBusyId(row.id)
    setConfirmDel(null)
    const { error } = await supabase.rpc('admin_student_delete', { p_id: row.id })
    if (error) setNotice(error.message)
    await load()
    setBusyId(null)
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(r => {
      if (ownerFilter && (ownerFilter === NO_OWNER ? r.owner_id : r.owner_id !== ownerFilter)) return false
      if (!q) return true
      return [r.name, r.group_name, r.owner_name, r.subject, r.email]
        .some(v => (v ?? '').toLowerCase().includes(q))
    })
  }, [rows, query, ownerFilter])

  // Группировка по учителю — «кому кто назначен» читается сразу.
  const byOwner = useMemo(() => {
    const map = new Map<string, { name: string; items: StudentRow[] }>()
    for (const r of shown) {
      const key = r.owner_id ?? NO_OWNER
      if (!map.has(key)) map.set(key, { name: r.owner_id ? r.owner_name : t('Без учителя'), items: [] })
      map.get(key)!.items.push(r)
    }
    return [...map.entries()]
  }, [shown, t])

  // Поиск раскрывает всё сам: искать по свёрнутым спискам — значит смотреть
  // на «Никого не нашлось» при живом совпадении внутри закрытой секции.
  const searching = query.trim().length > 0
  const expandAll = searching || forceAll
  const allOpen = expandAll || (byOwner.length > 0 && byOwner.every(([id]) => openOwners.has(id)))

  /**
   * Клик по шапке секции ЗАКРЫВАЕТ её, даже если только что нажали
   * «Развернуть все».
   *
   * `forceAll` был режимом ПОВЕРХ списка открытых: клик по шапке честно убирал
   * секцию из `openOwners`, но `open` брался из флага — и секция оставалась
   * раскрытой. На экране это «по тексту свернуть не могу, только кнопкой».
   * Поэтому «развернуть все» здесь же превращается в обычное состояние: все
   * секции открыты поимённо, кроме той, по которой кликнули.
   */
  const toggleOwner = (ownerId: string) => {
    if (forceAll) {
      setForceAll(false)
      setOpenOwners(new Set(byOwner.map(([id]) => id).filter(id => id !== ownerId)))
      return
    }
    setOpenOwners(prev => {
      const next = new Set(prev)
      next.has(ownerId) ? next.delete(ownerId) : next.add(ownerId)
      return next
    })
  }

  const teacherOptions = teachers.map(tc => ({
    value: tc.id,
    label: `${tc.name}${tc.role === 'admin' ? ` (${t('Босс')})` : ''}`,
  }))
  const orphans = rows.filter(r => !r.owner_id).length

  return (
    <div>
      {/* Search + owner filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('Поиск: имя, группа, учитель…')}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 11px 8px 32px',
              borderRadius: 11, border: '1px solid var(--color-border-medium)',
              background: 'var(--color-bg-input)', color: 'var(--color-text)',
              fontSize: 13, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>
        <div style={{ width: 190 }}>
          <TeacherSelect
            small
            placeholder={t('Все учителя')}
            value={ownerFilter}
            onChange={setOwnerFilter}
            options={[...teacherOptions, ...(orphans ? [{ value: NO_OWNER, label: t('Без учителя') }] : [])]}
          />
        </div>
        {byOwner.length > 1 && !searching && (
          <button
            onClick={() => { setForceAll(!allOpen); if (allOpen) setOpenOwners(new Set()) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ChevronRight size={13} strokeWidth={2} style={{ transform: allOpen ? 'rotate(90deg)' : 'none', transition: 'transform 140ms ease' }} />
            {/* Ширина кнопки — по САМОЙ ДЛИННОЙ подписи, а не по текущей.
                «Развернуть все» длиннее «Свернуть все», и на переключении ряд
                дёргался целиком: поиск в нём тянущийся (flex), и он ловил
                разницу шириной поля. Обе подписи лежат в одной клетке грида,
                лишняя — скрыта. */}
            <span style={{ display: 'grid' }}>
              {[t('Развернуть все'), t('Свернуть все')].map((label, i) => (
                <span
                  key={label}
                  aria-hidden={(i === 1) !== allOpen}
                  style={{ gridArea: '1 / 1', visibility: (i === 1) === allOpen ? 'visible' : 'hidden' }}
                >
                  {label}
                </span>
              ))}
            </span>
          </button>
        )}
        <button onClick={load} title={t('Обновить')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={13} strokeWidth={2} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {t('Обновить')}
        </button>
      </div>

      {notice && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
          borderRadius: 12, padding: '9px 12px', fontSize: 12.5, color: 'var(--color-text-2)',
        }}>
          <ArrowRightLeft size={14} strokeWidth={2} style={{ color: 'var(--color-purple)', flexShrink: 0, marginTop: 1 }} />
          <span style={{ flex: 1 }}>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', padding: 0 }}>
            <X size={13} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div style={{ padding: '24px 0' }}><Skeleton.List rows={5} /></div>
      ) : shown.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-3)', padding: '24px 0' }}>{t('Никого не нашлось.')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {byOwner.map(([ownerId, grp]) => {
            const open = expandAll || openOwners.has(ownerId)
            return (
            <div key={ownerId}>
              <button
                onClick={() => toggleOwner(ownerId)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  marginBottom: open ? 8 : 0, padding: '7px 8px',
                  background: 'transparent', border: 'none', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <ChevronRight
                  size={14}
                  style={{
                    color: 'var(--color-text-3)', flexShrink: 0,
                    transform: open ? 'rotate(90deg)' : 'none',
                    transition: 'transform 140ms ease',
                  }}
                />
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: ownerId === NO_OWNER ? '#D07020' : 'var(--color-text)',
                }}>{grp.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>
                  {grp.items.length} {t('учеников')}
                </span>
              </button>
              {open && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grp.items.map(row => (
                  <div key={row.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
                    borderRadius: 14, padding: '11px 13px',
                    opacity: busyId === row.id ? 0.5 : 1,
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--color-bg-3)', color: 'var(--color-text-3)',
                    }}>
                      <User size={15} strokeWidth={2} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row.name || '—'}
                        </span>
                        {row.has_account && <KeyRound size={11} strokeWidth={2.2} style={{ color: '#2E8F76', flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.is_individual ? t('1:1') : row.group_name || t('без группы')}
                        {row.subject ? ` · ${row.subject}` : ''}
                        {row.progress_rows ? ` · ${row.progress_rows} ${t('уроков в прогрессе')}` : ''}
                        {row.siblings ? ` · ${t('ещё карточек:')} ${row.siblings}` : ''}
                      </div>
                    </div>
                    <div style={{ width: 168, flexShrink: 0, pointerEvents: busyId === row.id ? 'none' : 'auto' }}>
                      <TeacherSelect
                        small
                        clearable={false}
                        placeholder={t('— без учителя —')}
                        value={row.owner_id ?? ''}
                        onChange={v => askReassign(row, v)}
                        options={teacherOptions}
                        triggerStyle={{
                          padding: '7px 10px', borderRadius: 9, fontWeight: 600,
                          background: 'var(--color-bg-3)',
                          border: `1px solid ${row.owner_id ? 'var(--color-border-medium)' : '#D07020'}`,
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setEditing(row)}
                      disabled={busyId === row.id}
                      title={t('Изменить')}
                      style={iconBtn('var(--color-text-3)')}
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setConfirmDel(row)}
                      disabled={busyId === row.id}
                      title={t('Удалить')}
                      style={iconBtn('#E04848')}
                    >
                      <X size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
              )}
            </div>
          )})}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 14, lineHeight: 1.5 }}>
        {t('Ученик принадлежит учителю через свою группу. Перевод 1:1-ученика переносит его группу целиком (ДЗ, журнал, расписание сохраняются); ученика из общей группы — в новую личную группу нового учителя.')}
      </div>

      {editing && (
        <EditStudentModal
          row={editing}
          groups={groups}
          onClose={() => setEditing(null)}
          onSave={(patch, groupId) => saveEdit(editing, patch, groupId)}
        />
      )}

      {/* Reassign confirm (общая группа → новая личная) */}
      <AnimatePresence>
        {confirmMove && createPortal(
          <Backdrop onClose={() => setConfirmMove(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ArrowRightLeft size={17} strokeWidth={2} style={{ color: 'var(--color-purple)' }} />
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{t('Передать ученика?')}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 18 }}>
              <b>{confirmMove.row.name}</b> {t('сейчас в общей группе')} «{confirmMove.row.group_name}». {t('Он переедет в новую личную группу учителя')} <b>{teachers.find(x => x.id === confirmMove.owner)?.name}</b> {t('— личный прогресс, журнал и расписание переедут вместе с ним, а групповое ДЗ старой группы останется у прежнего учителя.')}
            </div>
            <Actions
              cancel={t('Отмена')}
              confirm={t('Передать')}
              onCancel={() => setConfirmMove(null)}
              onConfirm={() => doReassign(confirmMove.row, confirmMove.owner)}
            />
          </Backdrop>,
          document.body
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDel && createPortal(
          <Backdrop onClose={() => setConfirmDel(null)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ShieldAlert size={18} strokeWidth={2} style={{ color: '#E04848' }} />
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{t('Удалить безвозвратно?')}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 18 }}>
              {t('Ученик')} <b>«{confirmDel.name}»</b> {t('и весь его прогресс, посещаемость, расписание и платежи будут удалены навсегда.')}
              {confirmDel.has_account && <> {t('Аккаунт входа останется в системе — сбросить его можно на карточке ученика у учителя.')}</>}
            </div>
            <Actions
              cancel={t('Отмена')}
              confirm={t('Удалить')}
              danger
              onCancel={() => setConfirmDel(null)}
              onConfirm={() => doDelete(confirmDel)}
            />
          </Backdrop>,
          document.body
        )}
      </AnimatePresence>
    </div>
  )
}

const iconBtn = (color: string): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: 9, flexShrink: 0, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)', color,
})

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: 420, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto', background: 'var(--color-bg)', border: '1px solid var(--color-border-medium)', borderRadius: 18, padding: 22 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function Actions({ cancel, confirm, danger, onCancel, onConfirm }: {
  cancel: string; confirm: string; danger?: boolean; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{cancel}</button>
      <button onClick={onConfirm} style={{ padding: '8px 16px', borderRadius: 11, border: 'none', background: danger ? '#E04848' : 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{confirm}</button>
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '9px 11px',
  borderRadius: 11, border: '1px solid var(--color-border-medium)',
  background: 'var(--color-bg-input)', color: 'var(--color-text)',
  fontSize: 13, outline: 'none', fontFamily: 'inherit',
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 5 }}>{label}</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} />
    </label>
  )
}

function EditStudentModal({ row, groups, onClose, onSave }: {
  row: StudentRow
  groups: GroupOption[]
  onClose: () => void
  onSave: (patch: Record<string, string>, groupId: string) => void
}) {
  const t = useT()
  const [name, setName] = useState(row.name ?? '')
  const [email, setEmail] = useState(row.email ?? '')
  const [phone, setPhone] = useState(row.phone ?? '')
  const [telegram, setTelegram] = useState(row.telegram_link ?? '')
  const [parent, setParent] = useState(row.parent_contact ?? '')
  const [comment, setComment] = useState(row.comment ?? '')
  const [groupId, setGroupId] = useState(row.group_id ?? '')

  const groupOptions = groups.map(g => ({
    value: g.id,
    label: `${g.owner_name} · ${g.name}${g.is_individual ? ` (${t('1:1')})` : ''}`,
  }))

  return createPortal(
    <Backdrop onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{t('Карточка ученика')}</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 2 }}>{row.owner_name}</div>
        </div>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 9, border: 'none', background: 'var(--color-bg-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-3)' }}>
          <X size={13} />
        </button>
      </div>

      <Field label={t('Имя')} value={name} onChange={setName} />
      <Field label={t('Email (логин)')} value={email} onChange={setEmail} placeholder="student@example.com" />
      <Field label={t('Телефон')} value={phone} onChange={setPhone} />
      <Field label={t('Telegram')} value={telegram} onChange={setTelegram} />
      <Field label={t('Контакт родителя')} value={parent} onChange={setParent} />

      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 5 }}>{t('Комментарий')}</span>
        <GrowTextarea value={comment} onChange={setComment} minHeight={60} style={fieldStyle} />
      </label>

      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)', display: 'block', marginBottom: 5 }}>{t('Группа (и вместе с ней — учитель)')}</span>
        <TeacherSelect
          clearable={false}
          placeholder={t('— без группы —')}
          value={groupId}
          onChange={setGroupId}
          options={groupOptions}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 11, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-3)', color: 'var(--color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t('Отмена')}</button>
        <button
          onClick={() => onSave({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            telegram_link: telegram.trim(),
            parent_contact: parent.trim(),
            comment: comment.trim(),
          }, groupId)}
          style={{ padding: '8px 16px', borderRadius: 11, border: 'none', background: 'var(--grad-purple)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >{t('Сохранить')}</button>
      </div>
    </Backdrop>,
    document.body
  )
}
