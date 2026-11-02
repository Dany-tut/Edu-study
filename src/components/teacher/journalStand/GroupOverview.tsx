import { useMemo, useRef, useState, type ReactNode } from 'react'
import type { Student } from '../../../data/teacherMockData'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Lightbulb,
  Target,
  TrendingUp,
} from '../../icons/appIcons'
import { OverlayScrollArea } from '../OverlayScroll'
import TestlyMark from '../../TestlyMark'
import {
  daysBetween,
  groupOverview,
  periodLabel,
  showDate,
  studentOverview,
  workDay,
  type Overview,
  type RosterEntry,
} from './overviewStats'
import type { StudentWork } from './studentWorks'
import { useScrollEdges } from './useScrollEdges'
import { DueDateSlip, GoalFlag, TopicGauge, WeeklyTrend, WeekStamps } from './StudentReportArt'
import './groupOverview.css'

function quantity(n: number, one: string, few: string, many: string) {
  return (
    n +
    ' ' +
    (n % 100 >= 11 && n % 100 <= 14 ? many : n % 10 === 1 ? one : n % 10 >= 2 && n % 10 <= 4 ? few : many)
  )
}
const percent = (v: number | null) => (v === null ? '—' : v + '%')
const fraction = (a: number, b: number) => (b ? a + ' / ' + b : '—')
const signed = (n: number | null) =>
  n === null ? '—' : (n > 0 ? '+' : '') + String(n).replace('-', '−') + ' п. п.'
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
const REPORT_OBJECTS: Record<string, string> = {
  "Результат работ":"results", "Есть просрочка":"overdue", "Тема для разбора":"topic",
  "Вектор результата":"trend", "Цель ученика":"goal", "Освоение тем":"mastery",
  "Отставание":"lag", "Сдано в срок":"ontime", "Учебный ритм":"rhythm",
}

function Tile({
  label,
  icon,
  value,
  children,
  tone = '',
  graphic,
  graphicLabel,
}: {
  label: string
  icon: ReactNode
  value: ReactNode
  children: ReactNode
  tone?: string
  graphic?: ReactNode
  graphicLabel?: string
}) {
  return (
    <section className={'jo-tile jo-tile--3d ' + tone}>
      <h3>
        {icon}
        {label}
      </h3>
      <div className="jo-value">{value}</div>
      <span className="jo-object-floor" data-object={REPORT_OBJECTS[label]} aria-hidden="true" />
      <img className="jo-report-object" data-object={REPORT_OBJECTS[label]} src={`${['trend','goal','lag','ontime'].includes(REPORT_OBJECTS[label]) ? '/teacher-objects-v2-shadows/' : '/teacher-objects-v1/'}${REPORT_OBJECTS[label]}.png`} alt="" aria-hidden="true" width={200} height={200} decoding="async" draggable={false} />
      {graphic && <div className="jo-widget-graphic jo-report-data" aria-hidden={graphicLabel ? undefined : true}
        role={graphicLabel ? 'img' : undefined} aria-label={graphicLabel}>{graphic}</div>}
      <div className="jo-detail">{children}</div>
    </section>
  )
}

function DeadlineDial({ overdue, total }: { overdue: number; total: number }) {
  const share = total ? (100 * overdue) / total : 0
  return (
    <svg viewBox="0 0 92 92" focusable="false">
      <circle className="jo-dial-face" cx="46" cy="46" r="43" />
      <g fill="none" transform="rotate(-90 46 46)">
        <circle className="jo-dial-track" cx="46" cy="46" r="36" strokeWidth="5" />
        {overdue > 0 && <circle cx="46" cy="46" r="36" pathLength="100" stroke="currentColor"
          strokeWidth="5" strokeLinecap="round" strokeDasharray={`${share} 100`} />}
        <circle className="jo-dial-ticks" cx="46" cy="46" r="28" pathLength="120" strokeWidth="3" strokeDasharray="1 4" />
      </g>
      <text className="jo-dial-number" x="46" y="47" textAnchor="middle" dominantBaseline="central">
        {total ? percent(Math.round(share)) : '—'}
      </text>
    </svg>
  )
}

// For a small group, one dot is one pupil with two checked works on this topic.
// Switch to a continuous share when the individual dots would be too small.
function TopicSheets({ focus }: { focus: ReturnType<typeof groupOverview>['focus'] }) {
  return (
    <svg viewBox="0 0 104 90" focusable="false">
      <rect className="jo-sheet-back" x="21" y="12" width="69" height="62" rx="9" transform="rotate(12 55 44)" />
      <rect className="jo-sheet-middle" x="17" y="13" width="69" height="62" rx="9" transform="rotate(4 51 44)" />
      <g transform="rotate(-8 48 50)">
        <rect className="jo-sheet-front" x="12" y="17" width="70" height="62" rx="9" />
        <path d="M22 28h18m5 0h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        {!focus ? (
          <path d="M23 42h38m-38 9h28m-28 9h33" fill="none" className="jo-sheet-lines" strokeWidth="3" strokeLinecap="round" />
        ) : focus.known <= 36 ? (
          Array.from({ length: focus.known }, (_, i) => (
            <circle key={i} cx={24 + (i % 6) * 9} cy={40 + Math.floor(i / 6) * 6}
              r="2.3" className={i < focus.weak ? 'jo-topic-hit' : 'jo-topic-rest'} />
          ))
        ) : (
          <>
            <text x="22" y="52" className="jo-sheet-number">{percent(Math.round(100 * focus.weak / focus.known))}</text>
            <rect className="jo-topic-rest" x="22" y="60" width="50" height="4" rx="2" />
            <rect className="jo-topic-hit" x="22" y="60" width={50 * focus.weak / focus.known} height="4" rx="2" />
          </>
        )}
      </g>
    </svg>
  )
}
type CardProps = {
  student: Student
  report: Overview
  today: string
  scopeLabel: string
  groupLabel?: string
  example?: boolean
  embedded?: boolean
}
function ReportSheet({
  student,
  report: r,
  today,
  scopeLabel,
  groupLabel,
  example,
  embedded = false,
  action,
}: CardProps & { action?: ReactNode }) {
  const debt = r.debts[0],
    focus = r.focus
  const contextGroup = !embedded && groupLabel?.trim().replace(/\s+/g, ' ').toLocaleLowerCase() !== student.name.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ? groupLabel : undefined
  const nextStep = focus
    ? 'Разобрать ошибки по теме «' + focus.title + '».'
    : debt
      ? 'Закрыть самую раннюю просроченную работу.'
      : r.graded.length
        ? 'Проверить закрепление темы на следующей работе.'
        : 'Начать с первой проверенной работы.'
  return (
    <article className="jo-sheet" aria-label={'Итоги ученика · ' + student.name}>
      <div className="jo-heading">
        {embedded ? <h2>Итоги ученика</h2> : (
          <div className="jo-person">
            <span className="cj-avatar">{initials(student.name)}</span>
            <div>
              <span className="jo-kicker">Итоги ученика</span>
              <h2>{student.name}</h2>
            </div>
          </div>
        )}
        {action}
      </div>
      <p className="jo-context">{[scopeLabel, contextGroup, periodLabel(today)].filter(Boolean).join(' · ')}</p>
      <p className="jo-orientation">
        {r.delta === null
          ? 'Для оценки динамики пока мало проверенных работ.'
          : r.delta > 0
            ? 'Средний результат вырос.'
            : r.delta < 0
              ? 'Средний результат снизился.'
              : 'Средний результат не изменился.'}
        {focus && ' Стоит вернуться к теме «' + focus.title + '».'}
      </p>
      <div className="jo-bento">
        <Tile
          label="Вектор результата"
          icon={<TrendingUp />}
          tone="jo-wide jo-vector"
          value={signed(r.delta)}
          graphic={r.graded.length > 0 && <WeeklyTrend values={r.weekly} />}
          graphicLabel={'Средний результат по неделям: ' + r.weekly.map(percent).join(', ')}
        >
          {r.delta !== null ? (
            <>
              <b>
                {percent(r.before)} → {percent(r.after)}
              </b>{' '}
              · средний результат.<br />
              Первые две недели — {quantity(r.beforeCount, 'работа', 'работы', 'работ')}, последние — {r.afterCount}.
            </>
          ) : (
            'Для сравнения нужно по две проверенные работы в каждой половине периода.'
          )}
        </Tile>
        <Tile
          label="Цель ученика"
          icon={<Target />}
          tone="jo-wide jo-goal"
          graphic={<GoalFlag />}
          value={student.desiredScore > 0 ? student.desiredScore + ' б.' : 'Не задана'}
        >
          {student.trialScore == null
            ? 'Пробник ещё не внесён.'
            : 'Последний пробник · ' +
              student.trialScore +
              '%. Для сравнения с целью нужен результат в баллах.'}
        </Tile>
        <Tile
          label="Освоение тем"
          icon={<BookOpenCheck />}
          tone="jo-mastery"
          graphic={r.topics.length > 0 && <TopicGauge mastered={r.mastered.length} total={r.topics.length} />}
          value={fraction(r.mastered.length, r.topics.length)}
        >
          {r.topics.length ? (
            <>
              {r.mastered.length
                ? 'Два зачёта подряд · ' + r.mastered.map((t) => t.title).join(', ')
                : 'Пока нет двух зачётов подряд по теме.'}
            </>
          ) : (
            'Нет двух проверенных работ по одной теме.'
          )}
        </Tile>
        <Tile
          label="Отставание"
          icon={<Clock />}
          tone={debt ? 'jo-delay' : 'jo-quiet'}
          graphic={debt?.slot.due && <DueDateSlip day={debt.slot.due} />}
          graphicLabel={debt?.slot.due ? 'Самая ранняя работа была до ' + showDate(debt.slot.due) : undefined}
          value={debt ? quantity(r.debts.length, 'работа', 'работы', 'работ') : r.hasDue ? 'Без долгов' : '—'}
        >
          {debt
            ? 'Самая долгая просрочка — ' +
              quantity(daysBetween(debt.slot.due!, today), 'день', 'дня', 'дней') +
              '.'
            : r.hasDue
              ? 'За период нет просроченных несданных работ.'
              : 'Нет работ с наступившим сроком.'}
        </Tile>
        <Tile label="Сдано в срок" icon={<CalendarCheck />} tone="jo-punctual" value={fraction(r.stats.timely, r.stats.due)}
          graphic={r.stats.due > 0 && (r.stats.due <= 12
            ? <div className="jo-timely-marks">
                {Array.from({ length: r.stats.due }, (_, index) => <i key={index} data-on={index < r.stats.timely || undefined} />)}
              </div>
            : <div className="jo-timely-rail"><i style={{ width: (100 * r.stats.timely / r.stats.due) + '%' }} /></div>)}>
          Первая сдача не позже срока.{r.stats.unknownDates && ' Сдачи без даты исключены.'}
        </Tile>
        <Tile label="Учебный ритм" icon={<Activity />} tone="jo-rhythm"
          value={<>{fraction(r.activeWeeks, r.weeks)}<WeekStamps weeks={r.rhythm} /></>}>
          Недель со сдачей из недель с заданиями.
          {r.marked
            ? ' Посещено ' + r.attended + ' из ' + r.marked + ' отмеченных занятий.'
            : ' Отметок посещаемости нет.'}
        </Tile>
        <section className="jo-follow">
          <div>
            <h3>
              <Target />
              Точка усиления
            </h3>
            <strong>{focus?.title ?? (r.topics.length ? 'Закрепление тем' : 'Недостаточно данных')}</strong>
            <p>
              {focus
                ? <><b className="jo-pair-scores">{focus.pair.map((w) => percent(w.score)).join(' и ')}</b> в двух последних работах.{' '}
                  {focus.pair[0].threshold === focus.pair[1].threshold
                    ? 'Порог зачёта — ' + percent(focus.pair[0].threshold) + '.'
                    : 'Обе ниже своего порога зачёта.'}</>
                : r.topics.length
                  ? 'Нет тем с двумя результатами подряд ниже порога.'
                  : 'Вывод появится после двух разных проверенных работ по теме.'}
            </p>
          </div>
          <span className="jo-follow-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
          <div>
            <h3>
              <Lightbulb />
              Следующий шаг
            </h3>
            <strong>{nextStep}</strong>
            <p>
              {debt
                ? 'Первой закрыть «' +
                  debt.slot.title +
                  '» · срок был ' +
                  showDate(debt.slot.due!).replace(/\.$/, '') +
                  '.'
                : 'Сверить результат после следующей проверки.'}
            </p>
          </div>
        </section>
      </div>
      <footer className="jo-foot">
        <span>
          Проверено работ · {r.graded.length}　 Средний результат · {percent(r.stats.average)}
        </span>
        {example && <span>Учебный пример</span>}
      </footer>
    </article>
  )
}

export function StudentOverviewCard({
  onWork,
  onProfile,
  ...props
}: CardProps & { onWork?: (w: StudentWork) => void; onProfile?: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [sharing, setSharing] = useState(false)
  const actions = (
    <button
      className="cj-button jo-shot"
      onClick={() => {
        setSharing(true)
        dialog.current?.showModal()
      }}
    >
      <Camera size={15} />
      Вид для скрина
    </button>
  )
  return (
    <>
      <ReportSheet {...props} action={actions} />
      <div className="jo-evidence">
        <details>
          <summary>
            <span className="jo-evidence-icon" aria-hidden="true"><BarChart3 size={17} /></span>
            <span>Из чего сложился результат</span>
            <span className="jo-evidence-count">{props.report.items.length}<span className="sr-only"> работ</span></span>
            <span className="jo-evidence-toggle" aria-hidden="true"><ChevronRight size={16} /></span>
          </summary>
          {props.report.items.length ? (
            props.report.items.map((w) => (
              <div className="jo-proof" key={w.slot.ref}>
                <div>
                  {onWork ? (
                    <button className="js-work-link" onClick={() => onWork(w)}>
                      {w.slot.title}
                      <ChevronRight size={13} />
                    </button>
                  ) : (
                    <b>{w.slot.title}</b>
                  )}
                  <small>{showDate(workDay(w))}</small>
                </div>
                <span className="js-source">
                  {w.source.includes('Тестли') && <TestlyMark size={13} />} {w.source}
                </span>
                <strong>{w.score !== null ? percent(w.score) : w.status}</strong>
              </div>
            ))
          ) : (
            <p>За этот период работ нет.</p>
          )}
        </details>
        {onProfile && (
          <button className="js-work-link jo-profile-link" onClick={onProfile}>
            Профиль из групп <ArrowRight size={14} />
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className="course-journal jo-share"
        aria-label={'Вид для скрина · ' + props.student.name}
        onClose={() => setSharing(false)}
      >
        {sharing && (
          <>
            <div className="jo-share-tools">
              <button autoFocus className="cj-button" onClick={() => dialog.current?.close()}>
                <ArrowLeft size={15} />
                Вернуться
              </button>
            </div>
            <OverlayScrollArea className="jo-share-scroll" style={{flex:1}} showScrollbar={false}>
            <div className="jo-share-paper">
              <div className="jo-brand">✳ Искра</div>
              <ReportSheet {...props} embedded={false} />
            </div>
            </OverlayScrollArea>
          </>
        )}
      </dialog>
    </>
  )
}

type Props = {
  entries: RosterEntry[]
  studentId: string
  search: string
  today: string
  scopeLabel: string
  groupLabel: string
  studentGroupLabel?: string
  example?: boolean
  onStudent: (id: string) => void
  onWork: (work: StudentWork) => void
  onProfile: () => void
}
const perPage = 10
export default function GroupOverview({
  entries,
  studentId,
  search,
  today,
  scopeLabel,
  groupLabel,
  studentGroupLabel,
  example,
  onStudent,
  onWork,
  onProfile,
}: Props) {
  const rows = useMemo(
    () => entries.map((e) => ({ student: e.student, report: studentOverview(e.works, today) })),
    [entries, today],
  )
  const group = useMemo(() => groupOverview(rows.map((r) => r.report)), [rows])
  const [debtOnly, setDebtOnly] = useState(false),
    [page, setPage] = useState(0)
  const shown = rows.filter(
    ({ student, report }) =>
      (!debtOnly || report.debts.length > 0) &&
      student.name.toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')),
  )
  const currentPage = Math.min(page, Math.max(0, Math.ceil(shown.length / perPage) - 1))
  const chosen = rows.find((row) => row.student.id === studentId)
  const { viewport, scroller } = useScrollEdges(Boolean(chosen))
  const back = () => {
    const id = studentId
    onStudent('')
    requestAnimationFrame(() =>
      viewport.current
        ?.querySelector<HTMLButtonElement>('[data-person="' + CSS.escape(id) + '"]')
        ?.focus({ preventScroll: true }),
    )
  }
  const heading = groupLabel === 'Все ученики' ? 'Обзор учеников' : 'Обзор группы'
  const focus = group.focus
  return (
    <OverlayScrollArea
      key={chosen?.student.id ?? 'roster'}
      style={{ flex: '1 1 auto' }}
      className="jo-scroll"
    >
      {chosen ? (
        <div className="jo-contents">
          <button className="cj-button jo-back" onClick={back}>
            <ArrowLeft size={14} />К сводке
          </button>
          <StudentOverviewCard
            {...chosen}
            groupLabel={studentGroupLabel}
            today={today}
            scopeLabel={scopeLabel}
            example={example}
            onWork={onWork}
            onProfile={onProfile}
          />
        </div>
      ) : (
        <div className="jo-contents">
          <header className="jo-heading">
            <div>
              <span className="jo-kicker">{heading}</span>
              <h2>Итоги за четыре недели</h2>
            </div>
            <span className="jo-context">{periodLabel(today)}</span>
          </header>
          <div className="jo-class-grid">
            <Tile
              label="Результат работ"
              icon={<BarChart3 />}
              tone="jo-lilac jo-hero"
              value={percent(group.average)}
            >
              Проверено работ · {group.checked}
              <br />
              {group.sources.join(' и ') || 'Нет проверенных работ'}
            </Tile>
            <Tile
              label="Есть просрочка"
              icon={<Clock />}
              tone="jo-overdue-widget"
              graphic={<DeadlineDial overdue={group.debtors} total={rows.length} />}
              value={
                <>
                  {rows.length ? group.debtors : '—'} {rows.length > 0 && <small>из {rows.length}</small>}
                </>
              }
            >
              {rows.length ? 'Учеников с несданной работой после срока' : 'В этом составе пока нет учеников.'}
            </Tile>
            <Tile
              label="Тема для разбора"
              icon={<Target />}
              tone="jo-topic-widget"
              graphic={<TopicSheets focus={focus} />}
              value={focus?.title ?? (group.knownTopics ? 'Без повторных трудностей' : 'Мало данных')}
            >
              {focus
                ? <>У <b>{focus.weak} из {focus.known}</b> учеников две последние работы ниже порога.</>
                : group.knownTopics
                  ? 'Нет двух работ подряд ниже порога по одной теме.'
                  : 'Для вывода нужны две проверенные работы по одной теме.'}
            </Tile>
          </div>
          <div className="jo-list-head">
            <h3>
              Ученики <small>· {rows.length}</small>
            </h3>
            <div>
              <small>Без оценок · {group.ungraded}</small>
              <button
                className="cj-button jo-debt-filter"
                aria-pressed={debtOnly}
                onClick={() => {
                  setDebtOnly((v) => !v)
                  setPage(0)
                }}
              >
                <CircleAlert size={14} />С просрочкой · {group.debtors}
              </button>
            </div>
          </div>
          <div className="jo-table-frame" ref={viewport}>
            <div className="jo-table-scroll" ref={scroller}>
              <table className="jo-table">
                <thead>
                  <tr>
                    {['Ученик', 'Результат', 'Вектор', 'Освоено тем', 'Просрочено', 'В срок'].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown
                    .slice(currentPage * perPage, (currentPage + 1) * perPage)
                    .map(({ student, report: r }) => (
                      <tr key={student.id} onClick={() => onStudent(student.id)}>
                        <th scope="row">
                          <button className="js-name" aria-label={student.name} data-person={student.id}>
                            <span className="cj-avatar" aria-hidden>
                              {initials(student.name)}
                            </span>
                            <span>{student.name}</span>
                          </button>
                        </th>
                        <td>{percent(r.stats.average)}</td>
                        <td>
                          <span
                            className="jo-chip"
                            data-tone={r.delta === null || !r.delta ? 'plain' : r.delta > 0 ? 'up' : 'warn'}
                          >
                            {signed(r.delta)}
                          </span>
                        </td>
                        <td>{fraction(r.mastered.length, r.topics.length)}</td>
                        <td>
                          {r.debts.length ? (
                            <span className="jo-chip" data-tone="warn">
                              {r.debts.length} · до {daysBetween(r.debts[0].slot.due!, today)} дн.
                            </span>
                          ) : r.hasDue ? (
                            '0'
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>{fraction(r.stats.timely, r.stats.due)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          {!shown.length && (
            <p className="js-empty" role="status">
              {!rows.length
                ? 'В этом составе пока нет учеников.'
                : search
                  ? 'По вашему запросу никого нет.'
                  : 'Учеников с просрочкой нет.'}
            </p>
          )}
          <div className="jo-pagination">
            <span aria-live="polite">
              {shown.length
                ? currentPage * perPage +
                  1 +
                  '–' +
                  Math.min(shown.length, (currentPage + 1) * perPage) +
                  ' из ' +
                  shown.length
                : '0 учеников'}
            </span>
            <div>
              <button
                className="cj-icon-button"
                aria-label="Предыдущие ученики"
                disabled={!currentPage}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="cj-icon-button"
                aria-label="Следующие ученики"
                disabled={(currentPage + 1) * perPage >= shown.length}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <p className="jo-note">
            Вектор сравнивает две недели с предыдущими двумя. Тема освоена, когда две последние проверенные
            работы по ней зачтены. Работы относятся к периоду по сроку, а без срока — по дате урока или сдачи.
          </p>
        </div>
      )}
    </OverlayScrollArea>
  )
}
