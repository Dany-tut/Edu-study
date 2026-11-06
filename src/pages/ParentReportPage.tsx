// Страница отчётов для родителя по постоянной ссылке /#/r/<токен> — без входа.
// Только имя ребёнка, предмет, преподаватель и отправленные недели (функция
// parent_report). Данные отдаёт edge-функция parent-report, mode 'page'.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { weekLabel, type ReportStats } from '../lib/parentReports'
import EmptyState from '../components/EmptyState'
import { ChevronLeft, ChevronRight, FileText } from '../components/icons/appIcons'
import '../components/teacher/parentReports/parentReports.css'

type Week = { week_start: string; stats: Omit<ReportStats, 'child'>; strengths: string | null; focus: string | null }
type Page = { child: string; subject: string; teacher: string; weeks: Week[] }

const dayFmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' })

export default function ParentReportPage({ token }: { token: string }) {
  const [page, setPage] = useState<Page | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [index, setIndex] = useState(0)
  useEffect(() => {
    let alive = true
    void supabase.functions.invoke('parent-report', { body: { mode: 'page', token } }).then(({ data, error }) => {
      if (!alive) return
      if (data?.child) { setPage(data as Page); setState('ready'); return }
      const status = (error as { context?: { status?: number } } | null)?.context?.status
      setState(status === 404 ? 'missing' : 'error')
    })
    return () => { alive = false }
  }, [token])
  useEffect(() => { document.title = page ? `${page.child} · отчёты` : 'Отчёт · Искра' }, [page])

  const week = page?.weeks[index]
  const trend = useMemo(() => (page?.weeks ?? []).slice(0, 6).reverse().filter(w => w.stats.avg_pct != null), [page])

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', justifyContent: 'center', padding: '24px 16px 40px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {state === 'loading' && <p className="pr-sub" role="status" style={{ textAlign: 'center' }}>Загрузка…</p>}
        {state === 'missing' && <EmptyState icon={FileText} title="Ссылка не действует" text="Попросите преподавателя прислать новую ссылку." />}
        {state === 'error' && <EmptyState icon={FileText} title="Отчёт сейчас не открылся" text="Проверьте интернет и обновите страницу." />}
        {state === 'ready' && page && <>
          <header className="pr-who">
            <span className="pr-avatar lg" aria-hidden="true">{page.child.slice(0, 1).toUpperCase()}</span>
            <div><b style={{ fontSize: 20 }}>{page.child}</b><span className="pr-sub">{[page.subject, page.teacher].filter(Boolean).join(' · ')}</span></div>
          </header>
          {!week ? (
            <EmptyState icon={FileText} title="Первый отчёт придёт в воскресенье" text="Здесь будет итог каждой недели: уроки, домашние работы и пара слов от преподавателя." />
          ) : <>
            <div className="pr-week" style={{ justifyContent: 'center' }}>
              <button type="button" className="pr-round" style={{ width: 44, height: 44 }} aria-label="Предыдущая неделя" disabled={index >= page.weeks.length - 1} onClick={() => setIndex(i => i + 1)}><ChevronLeft size={16} /></button>
              <b style={{ minWidth: 160, textAlign: 'center', color: 'var(--color-text)' }}>{weekLabel(week.week_start)}</b>
              <button type="button" className="pr-round" style={{ width: 44, height: 44 }} aria-label="Следующая неделя" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ChevronRight size={16} /></button>
            </div>
            <div className="pr-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="pr-stats">
                <div className="pr-stat"><b>{week.stats.lessons_total ? `${week.stats.lessons_attended}/${week.stats.lessons_total}` : '—'}</b><span>уроков</span></div>
                <div className="pr-stat"><b>{week.stats.hw_done}</b><span>работ сдано</span></div>
                <div className="pr-stat"><b>{week.stats.avg_pct != null ? `${week.stats.avg_pct}%` : '—'}</b><span>средний балл</span></div>
              </div>
              {week.strengths && <div><div className="pr-label" style={{ marginBottom: 4 }}>Получается</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{week.strengths}</p></div>}
              {week.focus && <div><div className="pr-label" style={{ marginBottom: 4 }}>Работаем над</div><p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{week.focus}</p></div>}
              {week.stats.lessons.length > 0 && <div className="pr-lessons">
                <div className="pr-label" style={{ marginBottom: 4 }}>Уроки недели</div>
                {week.stats.lessons.map((l, i) => (
                  <div key={i} className="pr-lesson">
                    <span className="pr-lesson-date">{dayFmt(l.date)}</span>
                    <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{l.title ?? 'Урок'}</span>
                    <span className={`pr-chip ${l.present ? 'sent' : 'neutral'}`}>{l.present ? 'был' : 'не был'}</span>
                  </div>
                ))}
              </div>}
            </div>
            {trend.length > 1 && (
              <div className="pr-card" style={{ padding: 16 }}>
                <div className="pr-label" style={{ marginBottom: 10 }}>Средний балл по неделям</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 96 }} role="img" aria-label={trend.map(w => `${weekLabel(w.week_start)}: ${w.stats.avg_pct}%`).join(', ')}>
                  {trend.map(w => (
                    <div key={w.week_start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>{w.stats.avg_pct}%</span>
                      <div style={{ width: '100%', maxWidth: 36, height: `${Math.max(6, (w.stats.avg_pct ?? 0) * 0.6)}px`, borderRadius: 8, background: w === page.weeks[index] ? 'var(--grad-purple)' : 'var(--color-purple-soft)' }} />
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{w.week_start.slice(8, 10)}.{w.week_start.slice(5, 7)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>}
          <p className="pr-sub" style={{ textAlign: 'center', margin: 0 }}>Ссылка личная: отчёт видит только тот, у кого она есть.</p>
        </>}
      </div>
    </main>
  )
}
