// Текст недельного отчёта родителю для Telegram (функция parent_report).
// Чистые функции: без сети и базы — их проверяет parentReport_test.ts.

export type ReportStats = {
  week_start?: string
  child?: string
  subject?: string
  lessons_total?: number
  lessons_attended?: number
  hw_done?: number
  hw_checked?: number
  hw_returned?: number
  avg_pct?: number | null
  prev_avg_pct?: number | null
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

/** «4–10 ноября» или «28 октября – 3 ноября». */
export function weekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(start.getTime() + 6 * 864e5)
  const sm = start.getUTCMonth(), em = end.getUTCMonth()
  return sm === em
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${MONTHS[em]}`
    : `${start.getUTCDate()} ${MONTHS[sm]} – ${end.getUTCDate()} ${MONTHS[em]}`
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Сообщение родителю (parse_mode HTML). */
export function reportMessage(stats: ReportStats, strengths: string | null, focus: string | null, teacher: string): string {
  const lines: string[] = []
  const child = escapeHtml(stats.child || 'Ученик')
  lines.push(`<b>${child} · неделя ${weekLabel(stats.week_start ?? '')}</b>`)
  const total = stats.lessons_total ?? 0
  lines.push(total > 0 ? `Уроки: ${stats.lessons_attended ?? 0} из ${total}` : 'Уроков на этой неделе не было')
  const done = stats.hw_done ?? 0
  const back = stats.hw_returned ?? 0
  lines.push(done || back
    ? `Домашние работы: сдано ${done}${back ? `, на доработке ${back}` : ''}`
    : 'Домашние работы: не сдавались')
  if (stats.avg_pct != null) {
    lines.push(`Средний балл: ${stats.avg_pct}%${stats.prev_avg_pct != null ? ` (было ${stats.prev_avg_pct}%)` : ''}`)
  }
  const s = strengths?.trim(), f = focus?.trim()
  if (s || f) lines.push('')
  if (s) lines.push(`<b>Получается:</b> ${escapeHtml(s)}`)
  if (f) lines.push(`<b>Работаем над:</b> ${escapeHtml(f)}`)
  lines.push('')
  const subject = stats.subject?.trim()
  lines.push(`<i>${escapeHtml(teacher)}${subject ? ` · ${escapeHtml(subject.toLowerCase())}` : ''}</i>`)
  return lines.join('\n')
}

/** Первое сообщение родителю после /start p_<код>. */
export function welcomeMessage(parent: string, child: string, teacher: string): string {
  return [
    `Здравствуйте, <b>${escapeHtml(parent)}</b>! ${escapeHtml(teacher)} подключил(а) вас к отчётам о <b>${escapeHtml(child)}</b>.`,
    '',
    'Каждое воскресенье в 18:00 пришлю короткий итог недели: уроки, домашние работы и пару слов от преподавателя.',
    '',
    'Отписаться: /stop',
  ].join('\n')
}

/** Код из «/start p_<код>»; null — это не родительское приглашение. */
export function parentStartCode(text: string): string | null {
  const m = /^\/start(?:@\w+)?\s+p_([a-z0-9]{10,32})\s*$/i.exec(text.trim())
  return m ? m[1].toLowerCase() : null
}

export function isStopCommand(text: string): boolean {
  return /^\/stop(?:@\w+)?\s*$/i.test(text.trim())
}
