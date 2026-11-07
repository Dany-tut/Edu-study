import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronRight, RefreshCw } from '../icons/appIcons'
import Modal from '../Modal'
import FadeText from '../FadeText'
import { useStudentData } from '../../store/studentDataStore'
import { getStudentSession } from '../../lib/studentSession'
import { useT, useLang } from '../../lib/i18n'
import { useStudentTz } from '../../lib/studentTz'
import { diaryDay, diaryWorkLabel, type StudentDiaryEntry } from '../../lib/studentDiary'
import { buildStudentWorkJournal, studentJournalSummary, type StudentJournalWork, type WorkJournalState } from '../../lib/studentWorkJournal'
import { useStudentJournalHistory } from '../../lib/useStudentJournalHistory'
import { useScrollFades } from '../../lib/useScrollFades'
import { EMOJI_STEPS } from '../homeworkSteps'
import './studentWorkJournal.css'

type Filter = 'all' | 'improve' | 'passed' | 'pending'
const STATE_LABEL: Record<WorkJournalState, string> = {
  passed: 'Зачтено', low: 'Ниже порога', pending: 'На проверке', returned: 'На доработку',
  draft: 'Попытка в работе', ungraded: 'Пока без результата',
}

function WorkState({ work }: { work: StudentJournalWork }) {
  const t = useT()
  return <span className={`swj-state swj-state-${work.state}`}>{t(STATE_LABEL[work.state])}</span>
}

function JournalDetails({ work, historyError, historyPending, onClose, onOpen }: {
  work: StudentJournalWork; historyError: boolean; historyPending: boolean
  onClose: () => void; onOpen: () => void
}) {
  const t = useT(), lang = useLang(s => s.lang), tz = useStudentTz(s => s.tz)
  const content = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = content.current?.closest<HTMLElement>('[role="dialog"]')
    if (!dialog) return
    const returnFocus = document.activeElement as HTMLElement | null
    dialog.setAttribute('aria-labelledby', titleId)
    const controls = () => [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input,select,textarea')]
      .filter(node => node.getClientRects().length > 0)
    controls()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = controls(), first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    dialog.addEventListener('keydown', trap)
    return () => { dialog.removeEventListener('keydown', trap); if (returnFocus?.isConnected) returnFocus.focus() }
  }, [titleId])
  const result = work.hard ? undefined : work.entry.lesson.result
  const assessment = result?.selfAssessment ? EMOJI_STEPS[result.selfAssessment.value] : null
  const currentCommentInHistory = work.attempts.some(a => a.review_comment?.trim() === work.comment)
  const formatTime = (date: string) => {
    const value = new Date(date)
    return Number.isFinite(value.getTime())
      ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz }).format(value)
      : t('Дата не указана')
  }
  return <Modal title={<span id={titleId}>{work.entry.lesson.title}</span>}
    subtitle={`${diaryWorkLabel(work.entry)}${work.hard ? ` · ${t('Развёрнутые задания')}` : ''}`}
    width={720} onClose={onClose}
    footer={<button data-hover="layer" type="button" className="swj-open-work" onClick={onOpen}>
      {t('Открыть работу')}<ChevronRight size={16} />
    </button>}>
    <div ref={content} className="swj-details">
      <div className="swj-detail-summary">
        <div><span className="swj-muted">{t('Лучший результат')}</span>
          <strong>{work.score === null ? '—' : `${work.score}%`}</strong></div>
        <div><span className="swj-muted">{t('Порог зачёта')}</span><strong>{work.passingScore}%</strong></div>
        <WorkState work={work} />
      </div>
      {work.state === 'draft' && work.score !== null ? <p className="swj-explanation">
        {t('Новая попытка в работе. Предыдущий результат сохранён в истории.')}
      </p> : null}
      {work.state === 'pending' ? <p className="swj-explanation">
        {t('Текущая попытка ожидает проверки. Её балл не входит в средний результат.')}
      </p> : null}
      {work.comment && !currentCommentInHistory ? <section className="swj-comment">
        <h3>{t('Комментарий преподавателя')}</h3><p>{work.comment}</p>
      </section> : null}
      {assessment ? <section className="swj-assessment"><span className="swj-muted">{t('Твоя самооценка')}</span>
        <p><span aria-hidden="true">{assessment.emoji}</span> {t(assessment.label)}</p></section> : null}
      <section className="swj-history" aria-busy={historyPending}>
        <h3>{t('История попыток')}</h3>
        {historyError ? <p className="swj-explanation" role="status">{t('История попыток временно недоступна. Загруженные результаты сохранены.')}</p> : null}
        {historyPending ? <p className="swj-explanation" role="status">{t('Обновляем историю попыток…')}</p> : null}
        <ol>{work.attempts.map(attempt => <li key={attempt.id}>
          <div className="swj-attempt-head"><div><strong>{t('Попытка')} {attempt.number}</strong>
            <time dateTime={attempt.submitted_at}>{formatTime(attempt.submitted_at)}</time></div>
            <div><strong>{attempt.status === 'completed' && attempt.score !== null ? `${attempt.score}%` : '—'}</strong>
              <span>{t(attempt.status === 'returned' ? 'На доработку' : attempt.status === 'completed' ? 'Проверено' : 'На проверке')}</span></div>
          </div>
          {attempt.review_comment?.trim() ? <div className="swj-comment"><span>{t('Комментарий преподавателя')} · {t('Попытка')} {attempt.number}</span>
            <p>{attempt.review_comment}</p></div> : null}
        </li>)}</ol>
        {!work.attempts.length && !historyPending && !historyError ? <p className="swj-explanation">
          {t(work.score !== null ? 'Результат сохранён до появления истории попыток.' : 'Работа ещё не сдавалась.')}
        </p> : null}
        {!work.comment && !work.attempts.some(a => a.review_comment?.trim()) && !historyPending && !historyError
          ? <p className="swj-explanation">{t('Комментария преподавателя пока нет.')}</p> : null}
      </section>
    </div>
  </Modal>
}

export default function StudentWorkJournal({ entries, pending, onOpen }: {
  entries: StudentDiaryEntry[]; pending: boolean; onOpen: (entry: StudentDiaryEntry, hard?: boolean) => void
}) {
  const t = useT(), lang = useLang(s => s.lang)
  const progress = useStudentData(s => s.progress), scopeIds = useStudentData(s => s.scopeStudentIds)
  const owner = getStudentSession()?.id ?? null
  const ids = scopeIds.length ? scopeIds : owner ? [owner] : []
  const history = useStudentJournalHistory(owner, ids, progress)
  const works = useMemo(() => buildStudentWorkJournal(entries, progress, history.attempts, owner), [entries, progress, history.attempts, owner])
  const summary = useMemo(() => studentJournalSummary(works), [works])
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  useEffect(() => { setFilter('all'); setSelectedKey(null) }, [owner])
  const filtersRef = useRef<HTMLDivElement>(null)
  useScrollFades(filtersRef, true, ':scope > *')
  const filtered = works.filter(w => filter === 'all' || filter === 'improve' && w.score !== null && w.score < w.passingScore
    || filter === 'passed' && w.score !== null && w.score >= w.passingScore || filter === 'pending' && w.state === 'pending')
  const pageKey = JSON.stringify([owner, filter, entries.map(e => e.id)])
  const [page, setPage] = useState({ key: '', count: 5 })
  const visibleCount = page.key === pageKey ? page.count : 5
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visible.length < filtered.length
  const moreRef = useRef<HTMLDivElement>(null)
  // Дочитали до конца — подкладываем следующие 5 (как в ленте «Задания»).
  useEffect(() => {
    const node = moreRef.current
    if (!hasMore || !node || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([hit]) => {
      if (hit?.isIntersecting) setPage({ key: pageKey, count: visibleCount + 5 })
    }, { rootMargin: '0px 0px 120px 0px' })
    io.observe(node)
    return () => io.disconnect()
  }, [hasMore, pageKey, visibleCount])
  const selected = works.find(w => w.key === selectedKey)
  const formatDate = (entry: StudentDiaryEntry) => {
    const day = diaryDay(entry.lesson.scheduledDate) ?? entry.due
    return day ? new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`)) : '—'
  }
  const busy = pending || history.pending
  const noDataYet = pending && !works.length
  const metrics = [
    { label: 'Средний результат', value: noDataYet || summary.average === null ? '—' : `${summary.average}%`,
      detail: `${t('Работ с итогом:')} ${summary.graded}`, image: '/teacher-objects-v2-shadows/results.png' },
    { label: 'Зачтено', value: noDataYet ? '—' : `${summary.passed}`, unit: `${t('из')} ${summary.total}`,
      detail: `${t('Ещё без результата:')} ${summary.ungraded}`, image: '/widget-objects-v2-shadows/ui/awards.png' },
    { label: 'Можно улучшить', value: noDataYet ? '—' : `${summary.improve}`,
      detail: t('Результат ниже порога зачёта'), image: '/widget-objects-v2-shadows/ui/stats.png' },
  ]
  return <section className="student-work-journal" aria-label={t('Журнал работ')} aria-busy={busy}>
    <div className="swj-metrics">{metrics.map(metric => <section className="swj-metric" key={metric.label} aria-label={t(metric.label)}>
      <div className="swj-metric-copy"><h2>{t(metric.label)}</h2>
        <p className="swj-metric-value">{metric.value}{metric.unit ? <span>{metric.unit}</span> : null}</p>
        <p className="swj-metric-description">{noDataYet ? t('Загружаем задания…') : metric.detail}</p>
      </div>
      <img src={metric.image} alt="" aria-hidden="true" className="swj-metric-art" width={152} height={142} decoding="async" />
    </section>)}</div>
    {history.error ? <div className="swj-history-warning" role="status">
      <span>{t('Не удалось обновить историю попыток. Текущие результаты доступны.')}</span>
      <button type="button" className="ds-secondary" onClick={history.reload}><RefreshCw size={15} />{t('Повторить')}</button>
    </div> : null}
    <div ref={filtersRef} className="swj-filters no-scrollbar" role="group" aria-label={t('Фильтр журнала работ')}>
      {([
        ['all', 'Все работы', summary.total], ['improve', 'Ниже порога', summary.improve],
        ['passed', 'Зачтено', summary.passed], ['pending', 'На проверке', works.filter(w => w.state === 'pending').length],
      ] as const).map(([id, label, count]) => <button data-hover="layer" type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
        {t(label)}<span>{count}</span>
      </button>)}
    </div>
    <div className="swj-table-surface" data-more-below={hasMore || undefined}>
      <table className="swj-table"><caption className="sr-only">{t('Все работы, результаты и проверки')}</caption>
        <thead><tr><th className="swj-date-column" scope="col">{t('Дата')}</th><th scope="col">{t('Работа')}</th>
          <th scope="col">{t('Результат')}</th><th className="swj-attempts-column" scope="col">{t('Попытки')}</th><th scope="col">{t('Состояние')}</th>
        </tr></thead>
        <tbody>{visible.map(work => <tr key={work.key}>
          <td className="swj-date-column swj-muted">{formatDate(work.entry)}</td>
          <td><button type="button" className="swj-work-title" onClick={() => setSelectedKey(work.key)} aria-haspopup="dialog">
            <FadeText>{work.entry.lesson.title}</FadeText>
            <span className="swj-work-meta"><FadeText>{work.entry.course.name}</FadeText></span>
            <span className="swj-work-meta">{work.hard ? t('Развёрнутые задания') : diaryWorkLabel(work.entry)}
              <span className="swj-mobile-date"> · {formatDate(work.entry)}</span>
              {work.comment || work.attempts.some(a => a.review_comment?.trim()) ? ` · ${t('Есть комментарий')}` : ''}</span>
          </button></td>
          <td><span className="swj-result">{work.score ?? '—'}{work.score !== null ? <><small> / 100</small><small className="swj-result-percent">%</small></> : null}</span>
            {work.score !== null && (work.state === 'draft' || work.state === 'pending') ? <span className="swj-work-meta">{t('Предыдущий итог')}</span> : null}</td>
          <td className="swj-attempts-column">{work.attemptCount ?? '—'}</td>
          <td><button data-hover="row" type="button" className="swj-state-button" onClick={() => setSelectedKey(work.key)}
            aria-label={`${t(STATE_LABEL[work.state])} · ${t('История попыток')} · ${work.entry.lesson.title}`} aria-haspopup="dialog"><WorkState work={work} /><ChevronRight size={15} /></button></td>
        </tr>)}</tbody>
      </table>
      {!visible.length ? <div className="swj-empty" role="status"><p>{t(pending ? 'Загружаем задания…' : works.length ? 'По этим фильтрам работ нет' : 'Пока нет назначенных работ')}</p></div> : null}
    </div>
    {/* Без счётчика и кнопки: низ таблицы гаснет, следующая порция подгружается сама. */}
    {hasMore ? <div ref={moreRef} className="swj-load-sentinel" aria-hidden="true" /> : null}
    <p className="swj-footnote">{t('Средний результат — по одному лучшему завершённому итогу каждой работы. Несданные работы не считаются нулём.')}</p>
    {busy && !noDataYet ? <p className="swj-footnote" role="status">{t('Обновляем результаты и историю…')}</p> : null}
    {selected ? <JournalDetails key={selected.key} work={selected} historyError={history.error} historyPending={history.pending}
      onClose={() => setSelectedKey(null)} onOpen={() => { setSelectedKey(null); onOpen(selected.entry, selected.hard) }} /> : null}
  </section>
}
