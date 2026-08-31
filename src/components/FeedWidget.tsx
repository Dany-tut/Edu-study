import { Rows3, ArrowRight } from 'lucide-react'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useTheme } from '../store/themeStore'
import { getSubject, resolveSubjectPalette } from '../lib/subjects'
import { dayLabel, materialsWord } from '../data/feed'
import { outletById } from '../data/feed/outlets'
import { useFeedGlance } from '../lib/feedRead'
import { queueTrainerLink, trainerHash } from '../lib/trainerLink'
import { pickTrainerSubject } from '../lib/trainerSubject'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Лента на главной: единственное место платформы, где сегодня не то же, что вчера
//
// ЗАЧЕМ. Лента собирается сама каждое утро (cron → scripts/buildFeed.mjs), и до
// сих пор узнать об этом можно было, только пройдя тренажёр → язык → «Чтение» →
// «Лента». Три клика до того, ради чего вообще возвращаются каждый день.
// Виджет — вход с первого экрана: три заголовка и число нового.
//
// ПОЧЕМУ ЗАГОЛОВКИ, А НЕ ОДНА КНОПКА. Кнопка «открыть ленту» — это то же
// оглавление, только короче: по ней не видно, стоит ли открывать. Заголовок
// сегодняшнего ролика виден, и решение принимается по нему, а не по обещанию.
//
// ПОЧЕМУ НЕПРОЧИТАННОЕ СВЕРХУ. Виджет живёт в ряду фиксированной высоты, в него
// помещается два-три материала. Показывать в них вчерашнее, когда есть
// сегодняшнее, значит врать самим числом рядом с заголовком.
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedWidget({ columns }: { columns: number }) {
  const t = useT()
  const { dark } = useTheme()
  const subjects = useStudentData(s => s.subjects)
  const activeSubjectId = useDashboard(s => s.activeSubjectId)
  const setActivePage = useDashboard(s => s.setActivePage)

  const active = subjects.find(s => s.id === activeSubjectId) ?? subjects[0]
  const def = getSubject(active?.subject)
  const palette = resolveSubjectPalette(def?.id ?? active?.subject ?? '', dark)

  const { lang, items, unread } = useFeedGlance()
  const wide = columns >= 2
  const rows = wide ? 3 : 2

  // Языка нет, ленты для него нет или чанк ещё едет — виджет молчит, но со
  // своего места не уходит: карусель считает страницы по списку виджетов.
  if (!lang || items.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Rows3 size={16} style={{ color: palette.accent }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Лента')}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5, margin: 0 }}>
          {t('Свежие ролики и заметки на языке курса — каждый день. Появится, когда выбран языковой курс.')}
        </p>
      </div>
    )
  }

  // Непрочитанное сверху, дальше — свежее из уже виденного, чтобы виджет не
  // пустел в день, когда сборка ничего не привезла.
  const shown = [...unread, ...items.filter(x => !unread.includes(x))].slice(0, rows)

  function open() {
    if (!lang) return
    queueTrainerLink({ lang, screen: 'feed' })
    if (def?.id) pickTrainerSubject(def.id)
    setActivePage('trainer')
  }

  return (
    <div style={{
      width: '100%', height: '100%', padding: wide ? '18px 24px' : '14px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
      minHeight: 0, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
        <Rows3 size={15} style={{ color: palette.accent }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{t('Лента')}</span>
        {unread.length > 0 ? (
          <span style={{
            padding: '2px 8px', borderRadius: 999,
            background: `${palette.accent}24`, color: palette.text,
            fontSize: 11, fontWeight: 750, whiteSpace: 'nowrap',
          }}>
            {unread.length} {t(materialsWord(unread.length))}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('всё просмотрено')}</span>
        )}
        <a
          href={trainerHash({ lang, screen: 'feed' })}
          onClick={e => { e.preventDefault(); open() }}
          style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11.5, fontWeight: 700, color: palette.text, textDecoration: 'none',
          }}
        >
          {t('Открыть')} <ArrowRight size={13} />
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 auto', minHeight: 0 }}>
        {shown.map(item => {
          const outlet = outletById(item.outletId)
          const fresh = unread.includes(item)
          return (
            <a
              key={item.id}
              href={trainerHash({ lang, screen: 'feed' })}
              onClick={e => { e.preventDefault(); open() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                padding: '6px 9px', borderRadius: 11, textDecoration: 'none',
                background: fresh ? `${palette.accent}16` : 'transparent',
              }}
            >
              {/* Знак источника — тот же кружок, что в шапке поста: по нему
                  видно, чей это материал, без второй строки с подписью. */}
              <span aria-hidden style={{
                flexShrink: 0, width: 20, height: 20, borderRadius: 999,
                background: outlet?.tint ?? palette.accent, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: (outlet?.mark.length ?? 1) > 2 ? 7.5 : 9,
                fontWeight: 800, lineHeight: 1,
              }}>
                {outlet?.mark ?? '·'}
              </span>
              <span style={{
                flex: '1 1 auto', minWidth: 0,
                fontSize: 12.5, fontWeight: fresh ? 700 : 600,
                color: fresh ? 'var(--color-text)' : 'var(--color-text-2)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.title}
              </span>
              <span style={{ flexShrink: 0, fontSize: 10.5, color: 'var(--color-text-4)', whiteSpace: 'nowrap' }}>
                {dayLabel(item.date)}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
