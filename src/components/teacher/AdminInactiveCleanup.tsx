import { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import Segmented from '../Segmented'
import Skeleton from '../Skeleton'
import { CheckboxMark } from '../Checkbox'
import { Alert } from '../Alert'
import { confirmDialog } from '../ConfirmHost'
import { Eraser } from '../icons/appIcons'
import { supabase } from '../../lib/supabase'
import { useT, tn } from '../../lib/i18n'
import { btn } from '../../lib/pillStyles'

// «Пользователи → Все пользователи → Удалить неактивных».
//
// Сервер ничего не выбирает сам: он отдаёт кандидатов (admin_inactive_candidates),
// админ отмечает строки, и admin_delete_actors удаляет только отмеченное, ещё
// раз проверив, что человек всё так же неактивен.
//
// Галочки по умолчанию стоят только на следах удалённых аккаунтов — их
// удаление ничего живого не задевает. Учителя и ученики отмечаются руками:
// ученик, который ни разу не входил, часто ведётся только в журнале учителя, и
// «неактивен» для него не значит «не нужен».

type Kind = 'ghost' | 'teacher' | 'student'
type Candidate = {
  kind: Kind
  id: string
  name: string
  email: string | null
  detail: string | null
  last_seen: string | null
  events: number
}

const MONTHS = [1, 3, 6, 12] as const

function fmtDate(iso: string | null, never: string) {
  if (!iso) return never
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function AdminInactiveCleanup({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const t = useT()
  const [months, setMonths] = useState<(typeof MONTHS)[number]>(6)
  const [rows, setRows] = useState<Candidate[] | null>(null)
  const [loadErr, setLoadErr] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    setRows(null); setLoadErr(''); setResult(''); setErr('')
    supabase.rpc('admin_inactive_candidates', { p_months: months }).then(({ data, error }) => {
      if (!alive) return
      if (error) { setLoadErr(error.message); setRows([]); return }
      const list = (Array.isArray(data) ? data : []) as Candidate[]
      setRows(list)
      setPicked(new Set(list.filter(r => r.kind === 'ghost').map(r => r.id)))
    })
    return () => { alive = false }
  }, [months])

  const groups = useMemo(() => ({
    ghost: (rows ?? []).filter(r => r.kind === 'ghost'),
    teacher: (rows ?? []).filter(r => r.kind === 'teacher'),
    student: (rows ?? []).filter(r => r.kind === 'student'),
  }), [rows])

  const count = (k: Kind) => groups[k].filter(r => picked.has(r.id)).length
  const total = count('ghost') + count('teacher') + count('student')

  function toggle(id: string) {
    setPicked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  function toggleAll(k: Kind) {
    const all = groups[k].every(r => picked.has(r.id))
    setPicked(prev => {
      const n = new Set(prev)
      for (const r of groups[k]) { if (all) n.delete(r.id); else n.add(r.id) }
      return n
    })
  }

  async function run() {
    const people = count('teacher') + count('student')
    if (people > 0) {
      const ok = await confirmDialog({
        title: `${t('Удалить')} ${people} ${t('аккаунт(ов) безвозвратно?')}`,
        message: t('У учителей сотрутся группы, курсы и аккаунт; у учеников — ДЗ, оценки и посещаемость. Вернуть нельзя.'),
        confirmLabel: t('Удалить'), tone: 'danger',
      })
      if (!ok) return
    }
    setBusy(true); setErr('')
    const ids = (rows ?? []).filter(r => picked.has(r.id)).map(r => r.id)
    const { data, error } = await supabase.rpc('admin_delete_actors', { p_ids: ids, p_months: months })
    setBusy(false)
    if (error) { setErr(error.message); return }
    const r = (data ?? {}) as { ghosts?: number; students?: number; teachers?: number; skipped?: number }
    const parts = [
      r.ghosts ? `${t('следов')}: ${r.ghosts}` : '',
      r.teachers ? `${t('учителей')}: ${r.teachers}` : '',
      r.students ? `${t('учеников')}: ${r.students}` : '',
    ].filter(Boolean)
    setResult(`${t('Удалено')} — ${parts.join(', ') || '0'}${r.skipped ? ` · ${t('пропущено (успели зайти)')}: ${r.skipped}` : ''}`)
    setRows(prev => (prev ?? []).filter(x => !picked.has(x.id)))
    setPicked(new Set())
    onDone()
  }

  const section = (k: Kind, title: string, hint?: string) => {
    const list = groups[k]
    if (list.length === 0) return null
    const all = list.every(r => picked.has(r.id))
    return (
      <div style={{ marginTop: 16 }}>
        <button data-hover="layer"
          onClick={() => toggleAll(k)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
        >
          <CheckboxMark checked={all} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>{count(k)} / {list.length}</span>
        </button>
        {hint && <div style={{ fontSize: 12, color: 'var(--color-text-3)', margin: '0 0 8px 28px', lineHeight: 1.4 }}>{hint}</div>}
        {/* Следы удалённых аккаунтов поштучно не показываем: у них нет ни имени, ни почты. */}
        {k !== 'ghost' && (
          <div style={{ border: '1px solid var(--color-border-medium)', borderRadius: 12, overflow: 'hidden' }}>
            {list.map((r, i) => (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                className="hover-row"
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'var(--color-bg-2)', border: 'none', borderTop: i > 0 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              >
                <CheckboxMark checked={picked.has(r.id)} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{tn(r.name)}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>
                    {[r.email, r.detail].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtDate(r.last_seen, t('не входил(а)'))}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal
      onClose={onClose}
      title={t('Удалить неактивных')}
      subtitle={t('Кто не заходил дольше выбранного срока')}
      width={600}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button data-hover="layer" onClick={onClose} style={btn('M', 'secondary')}>{t('Закрыть')}</button>
          <button data-hover="layer" onClick={() => { void run() }} disabled={busy || total === 0} style={btn('M', 'danger', { opacity: busy || total === 0 ? 0.45 : 1, cursor: busy || total === 0 ? 'default' : 'pointer' })}>
            <Eraser size={16} strokeWidth={2} />
            {busy ? t('Удаляем…') : `${t('Удалить')} ${total}`}
          </button>
        </div>
      }
    >
      <Segmented
        variant="filter" value={String(months)} onChange={v => setMonths(Number(v) as typeof months)}
        items={MONTHS.map(m => ({ id: String(m), label: m === 12 ? t('Год') : `${m} ${t('мес')}` }))}
      />

      {result && <Alert tone="success" text={result} style={{ marginTop: 14 }} />}
      {err && <Alert tone="danger" text={err} style={{ marginTop: 14 }} />}
      {loadErr && <Alert tone="danger" text={loadErr} style={{ marginTop: 14 }} />}

      {rows === null && <div style={{ marginTop: 16 }}><Skeleton.List rows={4} /></div>}
      {rows !== null && !loadErr && rows.length === 0 && (
        <div style={{ padding: '28px 0 8px', textAlign: 'center', color: 'var(--color-text-3)', fontSize: 13 }}>{t('Удалять некого.')}</div>
      )}

      {section('ghost', `${t('Следы удалённых аккаунтов')} · ${groups.ghost.reduce((s, r) => s + Number(r.events), 0)} ${t('событий')}`, t('Строки «—» в таблице: аккаунта уже нет, остались только события в аналитике. Показываются при любом сроке.'))}
      {section('teacher', t('Учителя'), t('Удалятся аккаунт, группы с учениками, курсы и оплаты.'))}
      {groups.student.length > 0 && (
        <Alert
          tone="warning"
          text={t('«Не входил» не значит «не нужен»: многие ученики ведутся только в журнале учителя. Отмечайте тех, кого точно нет.')}
          style={{ marginTop: 16 }}
        />
      )}
      {section('student', t('Ученики'))}
    </Modal>
  )
}
