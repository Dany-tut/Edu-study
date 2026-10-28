// Панель «Разбор ИИ» рядом с работой ученика (экран проверки и очередь на телефоне).
//
// Модель предлагает по каждому элементу критерия «есть / частично / нет» с
// дословной цитатой из работы, код считает балл по правилу атласа. Учитель
// «Утверждает» (балл как есть) или «Изменяет» отметки — балл пересчитывается
// тем же kimScore. Предварительный балл ученик не видит (RLS hw_grades), а
// оценка 1–5 со стикером живёт отдельно и ставится как раньше.
//
// Рубильник app_flags.ai_hw_grade выключен — панели нет вовсе.

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, RotateCw } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { getSubject } from '../../lib/subjects'
import { confirmDialog } from '../ConfirmHost'
import TeacherSelect from './TeacherSelect'
import {
  useHwGradeEnabled, useHwGrades, requestHwGrade, decideHwGrade, kimItem, gradableKimItems, rescore, gradePoints,
  type HwGrade, type KimRef, type KimVerdict,
} from '../../lib/hwGrade'
import type { KimItem } from '../../../supabase/functions/_shared/kimScore'

const EXAM_NAMES: Record<string, string> = { ege: 'ЕГЭ', oge: 'ОГЭ' }

/** 'ege_chemistry' → «ЕГЭ · Химия». Предмет — из общего реестра предметов. */
function examLabel(code: string): string {
  const [exam, ...rest] = code.split('_')
  const subj = rest.join('_')
  return [EXAM_NAMES[exam] ?? exam.toUpperCase(), getSubject(subj)?.name ?? subj].filter(Boolean).join(' · ')
}

const VERDICT_UI: Record<KimVerdict, { label: string; color: string; bg: string }> = {
  yes: { label: 'Есть', color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
  partial: { label: 'Частично', color: 'var(--color-peach-text)', bg: 'var(--color-peach-soft)' },
  no: { label: 'Нет', color: 'var(--color-muted)', bg: 'var(--color-bg-2)' },
}

const STATUS_UI: Record<HwGrade['status'], { label: string; color: string; bg: string }> = {
  suggested: { label: 'Предварительно', color: 'var(--color-peach-text)', bg: 'var(--color-peach-soft)' },
  confirmed: { label: 'Утверждено', color: 'var(--color-green-text)', bg: 'var(--color-green-soft)' },
  changed: { label: 'Изменено учителем', color: 'var(--color-purple-text)', bg: 'var(--color-purple-soft)' },
}

const card: React.CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.88)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  borderRadius: 20,
  boxShadow: 'var(--shadow-sm-page)',
}

const chip = (c: { color: string; bg: string }): React.CSSProperties => ({
  fontSize: 11, fontWeight: 700, color: c.color, background: c.bg, padding: '3px 9px', borderRadius: 8, whiteSpace: 'nowrap',
})

const quoteBox: React.CSSProperties = {
  background: 'var(--color-bg-2)', borderRadius: 10, padding: '8px 10px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.35,
  color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
}

const btn = (primary: boolean): React.CSSProperties => ({
  flex: 1, minHeight: 44, borderRadius: 14, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  border: primary ? 'none' : '1px solid var(--color-border-medium)',
  background: primary ? 'var(--color-accent)' : 'var(--color-bg-2)',
  color: primary ? '#fff' : 'var(--color-text)',
})

export default function HwAiReview({ progressId, taskKey, compact = false }: {
  progressId: string
  taskKey: string
  /** Телефон: без внешней карточки и с ужатыми отступами. */
  compact?: boolean
}) {
  const t = useT()
  const enabled = useHwGradeEnabled()
  const { grades, reload } = useHwGrades(enabled ? progressId : null)
  // Последний разбор этого задания (новое решение ученика → новая строка).
  const grade = grades.find(g => g.task_key === taskKey) ?? null

  const [item, setItem] = useState<KimItem | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needKim, setNeedKim] = useState(false)
  const [kimOptions, setKimOptions] = useState<{ value: string; label: string }[]>([])
  const [kimPick, setKimPick] = useState('')
  const [editing, setEditing] = useState(false)
  const [verdicts, setVerdicts] = useState<Record<string, KimVerdict>>({})
  const [note, setNote] = useState('')

  useEffect(() => {
    setEditing(false); setError(null); setNeedKim(false)
  }, [progressId, taskKey])

  useEffect(() => {
    if (!grade) { setItem(null); return }
    let alive = true
    void kimItem({ exam: grade.kim_exam, year: grade.kim_year, n: grade.kim_n }).then(i => { if (alive) setItem(i) })
    return () => { alive = false }
  }, [grade?.kim_exam, grade?.kim_year, grade?.kim_n])

  useEffect(() => {
    if (!needKim || kimOptions.length) return
    void gradableKimItems().then(list => setKimOptions(list.map(i => ({
      value: `${i.exam}:${i.year}:${i.n}`,
      label: `${examLabel(i.exam)} ${i.year} · №${i.n} · ${t('макс.')} ${i.max_points}`,
    }))))
  }, [needKim, kimOptions.length, t])

  const editPoints = useMemo(
    () => (grade && item ? rescore(item, grade, verdicts) : null),
    [grade, item, verdicts],
  )

  if (!enabled) return null

  async function run(opts: { kim?: KimRef; force?: boolean } = {}) {
    setBusy(true); setError(null)
    const r = await requestHwGrade(progressId, taskKey, opts)
    setBusy(false)
    if (!r.ok) {
      if (r.need === 'kim') setNeedKim(true)
      setError(r.error)
      return
    }
    setNeedKim(false); setEditing(false)
    await reload()
  }

  function startEdit() {
    if (!grade) return
    const base: Record<string, KimVerdict> = {}
    for (const e of grade.ai_elements) base[e.id] = e.verdict
    for (const m of grade.teacher_marks ?? []) base[m.id] = m.verdict
    setVerdicts(base); setNote(grade.teacher_note ?? ''); setEditing(true)
  }

  async function confirm() {
    if (!grade || grade.ai_points == null) return
    setBusy(true)
    const ok = await decideHwGrade(grade.id, { status: 'confirmed', points: grade.ai_points, marks: null, note: null })
    setBusy(false)
    if (!ok) { setError(t('Не удалось сохранить — проверьте связь и попробуйте ещё раз.')); return }
    await reload()
  }

  async function saveEdit() {
    if (!grade || editPoints == null) return
    const marks = grade.ai_elements.filter(e => verdicts[e.id] && verdicts[e.id] !== e.verdict).map(e => ({ id: e.id, verdict: verdicts[e.id] }))
    // Ничего не поменял — это то же «Утвердить».
    const status = marks.length || editPoints !== grade.ai_points ? 'changed' : 'confirmed'
    setBusy(true)
    const ok = await decideHwGrade(grade.id, { status, points: editPoints, marks: marks.length ? marks : null, note })
    setBusy(false)
    if (!ok) { setError(t('Не удалось сохранить — проверьте связь и попробуйте ещё раз.')); return }
    setEditing(false)
    await reload()
  }

  async function regrade() {
    if (!await confirmDialog({ title: t('Разобрать заново? Текущий разбор и ваше решение по нему заменятся.') })) return
    await run({ force: true, kim: grade ? { exam: grade.kim_exam, year: grade.kim_year, n: grade.kim_n } : undefined })
  }

  const wrap: React.CSSProperties = compact
    ? { border: '1px solid var(--color-border-soft)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }
    : { ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Sparkles size={15} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: compact ? 13 : 15, fontWeight: 750, color: 'var(--color-text)' }}>
        {t('Разбор ИИ')}{editing ? ` · ${t('правка')}` : ''}
      </div>
      {grade && !editing && <span style={chip(STATUS_UI[grade.status])}>{t(STATUS_UI[grade.status].label)}</span>}
    </div>
  )

  // ── Разбора ещё нет ──
  if (!grade) {
    return (
      <div style={wrap}>
        {header}
        <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
          {t('Модель отметит каждый элемент критерия с цитатой из работы и посчитает балл по правилу экзамена. Имя ученика ей не передаётся.')}
        </div>
        {needKim && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{t('Номер задания в КИМ')}</div>
            <TeacherSelect value={kimPick} options={kimOptions} onChange={setKimPick} placeholder={t('Выберите номер')} clearable={false} />
          </div>
        )}
        {error && <div role="alert" style={{ fontSize: 12, color: 'var(--color-peach-text)', lineHeight: 1.4 }}>{error}</div>}
        <button
          disabled={busy || (needKim && !kimPick)}
          onClick={() => {
            if (needKim && kimPick) {
              const [exam, year, n] = kimPick.split(':')
              void run({ kim: { exam, year: Number(year), n: Number(n) } })
            } else void run()
          }}
          style={{ ...btn(true), flex: 'none', opacity: busy || (needKim && !kimPick) ? 0.6 : 1, cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? t('Модель читает работу…') : t('Разобрать работу')}
        </button>
      </div>
    )
  }

  const shown = editing ? editPoints : gradePoints(grade)
  const sumRule = item?.rule?.kind === 'sum'

  return (
    <div style={wrap}>
      {header}
      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: compact ? -4 : -8 }}>
        {examLabel(grade.kim_exam)} {grade.kim_year} · №{grade.kim_n} · {t('максимум')} {grade.max_points}
      </div>

      {grade.ai_elements.map(e => {
        const v = editing ? (verdicts[e.id] ?? e.verdict) : (grade.teacher_marks?.find(m => m.id === e.id)?.verdict ?? e.verdict)
        const changed = v !== e.verdict
        const counted = v === 'yes' && (!!e.quote || changed)
        // «Есть» без цитаты не засчитан — зелёным его не красим, чтобы не врать.
        const ui = v === 'yes' && !counted ? { ...VERDICT_UI.no, label: 'Есть, без цитаты' } : VERDICT_UI[v]
        return (
          <div key={e.id} style={{
            border: `1px solid ${changed ? 'var(--color-purple-text)' : v === 'partial' ? 'var(--color-peach-soft)' : 'var(--color-border-soft)'}`,
            borderRadius: 14, padding: compact ? 10 : 12, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-purple-text)', background: 'var(--color-purple-soft)', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>{e.id}</span>
              <div style={{ flex: 1, fontSize: 13, lineHeight: 1.3, color: 'var(--color-text)' }}>
                {e.label && <b>{e.label}: </b>}{e.text}
              </div>
              {!editing && (
                <span style={chip(ui)}>{t(ui.label)}{sumRule ? ` · ${counted ? '+1' : '0'}` : ''}</span>
              )}
            </div>
            {e.quote
              ? <div style={quoteBox}>«{e.quote}»</div>
              : <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{t('Цитаты нет — элемент не засчитан')}</div>}
            {e.why && !editing && <div style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.35 }}>{e.why}</div>}
            {v === 'partial' && !editing && (
              <div style={{ fontSize: 11, color: 'var(--color-peach-text)' }}>{t('Частично не засчитывается — решаете вы.')}</div>
            )}
            {editing && (
              <div role="radiogroup" aria-label={e.id} style={{ display: 'flex', gap: 4, background: 'var(--color-bg-2)', borderRadius: 11, padding: 3 }}>
                {(['yes', 'partial', 'no'] as KimVerdict[]).map(opt => {
                  const on = v === opt
                  return (
                    <button
                      key={opt} role="radio" aria-checked={on}
                      onClick={() => setVerdicts(p => ({ ...p, [e.id]: opt }))}
                      style={{
                        flex: 1, minHeight: 34, borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 12, fontWeight: 700,
                        background: on ? VERDICT_UI[opt].bg : 'transparent',
                        color: on ? VERDICT_UI[opt].color : 'var(--color-text)',
                        boxShadow: on ? 'inset 0 0 0 1px currentColor' : 'none',
                      }}
                    >{t(VERDICT_UI[opt].label)}</button>
                  )
                })}
              </div>
            )}
            {editing && changed && (
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-purple-text)' }}>
                {t('ИИ')}: {t(VERDICT_UI[e.verdict].label).toLowerCase()} → {t('вы')}: {t(ui.label).toLowerCase()}
              </div>
            )}
          </div>
        )
      })}

      {grade.ai_deductions.filter(d => d.found && d.quote).map(d => (
        <div key={d.id} style={{ fontSize: 12, color: 'var(--color-peach-text)', lineHeight: 1.35 }}>
          −{item?.deductions.find(x => x.id === d.id)?.points ?? 1}: {item?.deductions.find(x => x.id === d.id)?.text} — «{d.quote}»
        </div>
      ))}

      {[...(item?.gates ?? []).map(g => g.from).filter(Boolean) as string[], ...(item?.teacher_notes ?? [])].map((n, i) => (
        <div key={i} style={{ fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.35 }}>{t('По атласу')}: {n}</div>
      ))}
      {grade.ai_warnings.map((w, i) => (
        <div key={`w${i}`} style={{ fontSize: 11, color: 'var(--color-peach-text)', lineHeight: 1.35 }}>⚠︎ {w}</div>
      ))}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderTop: '1px solid var(--color-border-soft)', paddingTop: 12 }}>
        <div style={{ fontSize: compact ? 24 : 30, fontWeight: 800, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
          {shown ?? '—'} / {grade.max_points}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.3 }}>
          {editing && editPoints !== grade.ai_points
            ? `${t('пересчитано по правилу атласа · у ИИ было')} ${grade.ai_points ?? '—'}`
            : grade.status === 'suggested'
              ? t('первичный балл — посчитан по правилу атласа, не моделью')
              : grade.status === 'changed' ? `${t('у ИИ было')} ${grade.ai_points ?? '—'}` : t('первичный балл утверждён')}
        </div>
      </div>

      {editing && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--color-muted)' }}>
          {t('Почему изменили (необязательно, видно только вам)')}
          <input
            value={note} onChange={e => setNote(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid var(--color-border-medium)', background: 'var(--color-bg-2)', color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }}
          />
        </label>
      )}
      {!editing && grade.teacher_note && (
        <div style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.35 }}>{t('Ваша заметка')}: {grade.teacher_note}</div>
      )}

      {error && <div role="alert" style={{ fontSize: 12, color: 'var(--color-peach-text)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        {editing ? (
          <>
            <button disabled={busy || editPoints == null} onClick={() => void saveEdit()} style={{ ...btn(true), opacity: busy ? 0.6 : 1 }}>
              {t('Сохранить')} {editPoints ?? '—'}/{grade.max_points}
            </button>
            <button disabled={busy} onClick={() => setEditing(false)} style={btn(false)}>{t('Отмена')}</button>
          </>
        ) : (
          <>
            {grade.status === 'suggested' && (
              <button disabled={busy || grade.ai_points == null} onClick={() => void confirm()} style={{ ...btn(true), opacity: busy ? 0.6 : 1 }}>
                {t('Утвердить')} {grade.ai_points ?? '—'}/{grade.max_points}
              </button>
            )}
            <button disabled={busy || !item} onClick={startEdit} style={btn(false)}>{t('Изменить')}</button>
          </>
        )}
      </div>

      {!editing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-muted)', flexWrap: 'wrap' }}>
          <span>
            {grade.ai_model ?? '—'}
            {grade.ai_at ? ` · ${new Date(grade.ai_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}
            {' · '}{t('имя ученика модели не передаётся')}
          </span>
          <button onClick={() => void regrade()} disabled={busy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: 'var(--color-accent)' }}>
            <RotateCw size={11} /> {busy ? t('Модель читает работу…') : t('Разобрать заново')}
          </button>
        </div>
      )}
    </div>
  )
}
