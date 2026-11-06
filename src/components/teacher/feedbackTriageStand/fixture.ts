import type { FeedbackDigest, FeedbackItem, FeedbackKind, FeedbackTopic } from '../../../lib/feedbackTriage'

// Различимые данные: у каждой темы свой тип, экран, счётчик (1, 2, 4, 12) и
// длина названия — чтобы было видно, что карточка показывает своё.
const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString()

const topic = (id: string, kind: FeedbackKind, screen: string, title: string, status: 'open' | 'closed' = 'open', summary: string | null = null): FeedbackTopic =>
  ({ id, kind, screen, title, summary, status, source: 'model', created_at: day(30), updated_at: day(1) })

export const FIXTURE_TOPICS: FeedbackTopic[] = [
  topic('t-journal', 'bug', 'Журнал', 'Журнал не сохраняет оценки после перезагрузки страницы', 'open', 'Оценки пропадают, если закрыть вкладку сразу после ввода.'),
  topic('t-login', 'access', 'Вход', 'Ученик не может войти по ссылке-приглашению'),
  topic('t-pay', 'payment', 'Тариф', 'Списание без продления тарифа'),
  topic('t-wish', 'wish', 'Тренажёр', 'Тёмная тема в тренажёре карточек и отдельный режим повторения перед контрольной с таймером и подсказками'),
  topic('t-old', 'question', 'Курсы', 'Как открыть курс ученику', 'closed'),
]

let n = 0
const item = (topicId: string | null, kind: FeedbackKind | null, screen: string | null, body: string, ageDays: number,
  extra: Partial<FeedbackItem> = {}): FeedbackItem => ({
  id: `i-${++n}`, source: n % 3 === 0 ? 'telegram' : 'form', feedback_id: n % 3 === 0 ? null : `f-${n}`, tg_thread_id: n % 3 === 0 ? 'tg-1' : null,
  author_label: n % 3 === 0 ? '@petya_school' : n % 2 ? 'Анна Сергеевна Кузнецова-Ветрова' : 'Миша',
  section: n % 3 === 0 ? null : screen, body, created_at: day(ageDays), last_at: day(ageDays),
  kind, screen, topic_id: topicId, kind_by: kind ? 'model' : null, topic_by: topicId ? 'model' : null,
  triage_state: 'done', triage_error: null, ...extra,
})

export const FIXTURE_ITEMS: FeedbackItem[] = [
  ...Array.from({ length: 12 }, (_, i) => item('t-journal', 'bug', 'Журнал', i === 0
    ? 'Поставила оценки за контрольную всей группе, обновила страницу — половина пропала.\nЭто уже третий раз за неделю, на телефоне и на ноутбуке.\nПробовала другой браузер — то же самое.\nСкрин прикладываю.\nПожалуйста, посмотрите срочно, завтра родительское собрание.\nЕщё строка, чтобы текст точно не поместился.\nИ ещё одна.'
    : `Оценки не сохранились (${i + 1})`, i < 5 ? i : 10 + i)),
  ...Array.from({ length: 4 }, (_, i) => item('t-login', 'access', 'Вход', `Ссылка пишет «приглашение недействительно» (${i + 1})`, i + 1)),
  item('t-pay', 'payment', 'Тариф', 'Списали 990 ₽, а тариф так и остался «Пробный»', 2),
  item('t-pay', 'payment', 'Тариф', 'Двойное списание за месяц', 20, { kind_by: 'admin' }),
  item('t-wish', 'wish', 'Тренажёр', 'Хочу тёмную тему в карточках', 3),
  item('t-old', 'question', 'Курсы', 'Где кнопка «открыть курс»?', 40),
  item(null, null, null, 'Сколько стоит групповой тариф на 10 учеников?', 0, { triage_state: 'pending', kind_by: null }),
  item(null, null, null, 'не грузится', 1, { triage_state: 'failed', triage_error: 'модель пропустила обращение', kind_by: null }),
]

export const FIXTURE_DIGESTS: FeedbackDigest[] = [
  {
    id: 'd1', created_at: day(0), period_days: 7, model: 'claude-sonnet-4-5',
    stats: { sentry: { configured: true, issues: [] } },
    body: `За неделю 11 обращений — вдвое больше, чем неделей раньше (5).

## Что болит чаще всего
1. **Журнал не сохраняет оценки** — ошибка, Журнал: 5 за неделю (+3). «половина пропала после обновления»
   Связано: \`TypeError: grades is undefined\` — 37 раз, [задача в Sentry](https://iskra-b9.sentry.io/issues/1/)
2. **Ученик не может войти по ссылке** — доступ, Вход: 4. «приглашение недействительно»
3. **Списание без продления** — оплата, Тариф: 1.

## Ошибки без жалоб
- \`ChunkLoadError\` на #/teacher/courses — 12 раз.

## Что сделать на этой неделе
- Починить сохранение журнала до родительских собраний.
- Проверить срок жизни ссылок-приглашений.`,
  },
  {
    id: 'd0', created_at: day(7), period_days: 7, model: 'none', stats: { sentry: { configured: false } },
    body: 'За 7 дн. обращений не было.',
  },
]
