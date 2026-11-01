import { BookOpenCheck, Check } from '../../icons/appIcons'

// Keep missing weeks visible on the same 0–100 scale, with a break in the curve.
export function WeeklyTrend({ values }: { values: (number | null)[] }) {
  const x = (i: number) => 21 + i * 55
  const y = (value: number) => 55 - value * 0.35
  return (
    <svg viewBox="0 0 207 73" focusable="false" className="jo-week-chart">
      {[20, 38, 55].map(level => <path key={level} d={`M15 ${level}h177`} className="jo-chart-guide" />)}
      {values.map((value, i) => {
        const previous = values[i - 1]
        return <g key={i}>
          {value != null && previous != null && <>
            <path d={`M${x(i - 1)} 55 V${y(previous)} L${x(i)} ${y(value)} V55Z`} className="jo-chart-area" />
            <path d={`M${x(i - 1)} ${y(previous)} L${x(i)} ${y(value)}`} className="jo-chart-line" />
          </>}
        </g>
      })}
      {values.map((value, i) => <g key={i} textAnchor="middle">
        {value != null && i === values.length - 1 && <circle cx={x(i)} cy={y(value)} r="6.5" className="jo-chart-halo" />}
        {value != null && <circle cx={x(i)} cy={y(value)} r="3" className="jo-chart-dot" />}
        <text x={x(i)} y={value == null ? 44 : y(value) - 8} className="jo-chart-score">{value == null ? '—' : value + '%'}</text>
        <text x={x(i)} y="69" className="jo-chart-week">{i + 1} нед.</text>
      </g>)}
    </svg>
  )
}

export function GoalFlag() {
  return (
    <svg viewBox="0 0 142 85" fill="none" focusable="false">
      <g className="jo-flag-contours">
        <ellipse cx="89" cy="65" rx="47" ry="15" />
        <ellipse cx="89" cy="63" rx="33" ry="10.5" />
        <ellipse cx="89" cy="61" rx="18" ry="5.5" />
      </g>
      <path className="jo-flag-path" d="M6 68c14 1 15-15 29-13s12 15 28 10l26-5" />
      <circle cx="6" cy="68" r="2.7" fill="currentColor" />
      <path d="M89 60V10" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path className="jo-pennant-tail" d="M105 15c9 2 15 6 24 2l-6 9 5 7c-10 3-17-3-23-2Z" />
      <path className="jo-pennant" d="M89 11c7-5 13-4 22 0v18c-8-4-14-5-22 0Z" />
    </svg>
  )
}

export function TopicGauge({ mastered, total }: { mastered: number; total: number }) {
  return (
    <svg viewBox="0 0 64 64" focusable="false">
      <circle cx="32" cy="32" r="25" className="jo-gauge-track" fill="none" strokeWidth="4" />
      {mastered > 0 && total > 0 && <circle cx="32" cy="32" r="25" pathLength="100" fill="none"
        strokeWidth="4" stroke="currentColor" strokeLinecap="round" transform="rotate(-90 32 32)"
        strokeDasharray={`${100 * mastered / total} 100`} />}
      <BookOpenCheck x="19" y="19" width="26" height="26" strokeWidth={1.7} />
    </svg>
  )
}

export function DueDateSlip({ day }: {day: string}) {
  const month = new Intl.DateTimeFormat('ru', {month:'short', timeZone:'UTC'}).format(new Date(day))
  return <span className="jo-date-slip">
    <small>{month.replace(/\.$/, '')}</small><strong>{Number(day.slice(8))}</strong>
  </span>
}

export function WeekStamps({ weeks }: {weeks: (boolean | null)[]}) {
  return <ol className="jo-week-stamps" aria-label="Сдачи по неделям">
    {weeks.map((active, i) => {
      const state = active == null ? 'Неделя не учитывается' : active ? 'Была сдача' : 'Не было сдачи'
      return <li key={i} data-state={String(active)} aria-label={`Неделя ${i + 1}. ${state}`} title={`Неделя ${i + 1} · ${state}`}>
        <span>{active === true ? <Check size={12} /> : active === false ? '−' : '·'}</span>
        <small>{i + 1}</small>
      </li>
    })}
  </ol>
}
