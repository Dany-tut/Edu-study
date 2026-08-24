import { useMemo } from 'react'
import { Empty } from './TrainerShell'
import { useT } from '../../lib/i18n'
import { byDay, dayLabel, type FeedItem } from '../../data/feed'
import { FeedPost } from './FeedPost'

// ─────────────────────────────────────────────────────────────────────────────
// Лента: всё происходит В ЛЕНТЕ
//
// ГЛАВНОЕ ПРАВИЛО ЭКРАНА — ОТСЮДА НИКУДА НЕ УВОДЯТ. Ни в читалку, ни в
// слушалку, ни на разбор с вопросами. Ленту листают: текст читается на месте,
// ролик играет на месте, перевод открывается на месте, комментарий пишется на
// месте. Любой переход превращает ленту в оглавление упражнений, а листать
// оглавление никто не будет.
//
// ПОЭТОМУ ЗДЕСЬ НЕТ ВОПРОСОВ И ТЕСТОВ. Они остались в «Текстах» и «Сценах», где
// человек приходит заниматься. В ленту заходят посмотреть, что нового, и
// проверка понимания мешает ровно тому, ради чего сюда заходят.
//
// САМ ПОСТ ЖИВЁТ В FeedPost — общий с лентой мобильной главной. Здесь остаётся
// только то, что своё у этого экрана: разделители-даты и пустое состояние.
// ─────────────────────────────────────────────────────────────────────────────

// ПРОСМОТРЕННОЕ СЧИТАЕТСЯ САМО. Кнопки «отметить прочитанным» здесь нет и быть
// не должно: она превращает ленту в список дел. Пост, побывший на экране,
// уходит в просмотренные молча (lib/feedRead) — ровно этим и живёт счётчик
// «новое» на главной и в навбаре.

export function FeedList({ items, lang, accent, subjectId }: {
  items: FeedItem[]
  lang: string
  accent: string
  /** Предмет — чтобы слово из текста уезжало в колоду повторения. */
  subjectId?: string
}) {
  const t = useT()
  const days = useMemo(() => byDay(items), [items])

  if (items.length === 0) {
    return <Empty text={t('Для этого языка ленты пока нет. Она собирается скриптом из свободных источников — см. scripts/buildFeed.mjs.')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 680 }}>
      {days.map(day => (
        <section key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Дата — единственный разделитель в ленте, как в мессенджере. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span style={{
              padding: '3px 12px', borderRadius: 999,
              background: 'var(--color-bg-3)', color: 'var(--color-muted)',
              fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              {dayLabel(day.date)}
            </span>
          </div>

          {day.items.map(item => (
            <FeedPost key={item.id} item={item} lang={lang} accent={accent} subjectId={subjectId} />
          ))}
        </section>
      ))}
    </div>
  )
}
