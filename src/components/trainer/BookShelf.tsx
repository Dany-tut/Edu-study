// ─────────────────────────────────────────────────────────────────────────────
// Полка учебников
//
// ПОЧЕМУ КОРЕШОК, А НЕ ОБЛОЖКА. Настоящая обложка — чужая картинка с чужой
// лицензией и битой ссылкой через год. Книга на полке узнаётся по цвету и
// названию, а не по фотографии, поэтому корешок рисуется здесь же: цветной
// блок, название, автор. Заодно полка выглядит одинаково ровно, чего с
// разномастными сканами обложек не бывает никогда.
//
// ГЛАВНОЕ НА КАРТОЧКЕ — «КОГДА БРАТЬСЯ». Список книг без этого — та самая
// подборка из соцсетей, после которой человек берёт справочник грамматики,
// ещё не читая хангыль, и решает, что язык не для него. Поэтому строка «когда»
// стоит на карточке всегда и выделена, а не спрятана в описании.
// ─────────────────────────────────────────────────────────────────────────────

import { ExternalLink, Gift } from 'lucide-react'
import type { Textbook } from '../../data/textbooks'
import { useT } from '../../lib/i18n'
import { proseWrap, bindShortWords } from '../../lib/typography'
import { TileChip } from './TrainerShell'

/** Нарисованный корешок: цвет, название, автор. */
function Spine({ book }: { book: Textbook }) {
  return (
    <div
      aria-hidden
      style={{
        width: 78, minWidth: 78, height: 108, borderRadius: '4px 9px 9px 4px',
        background: book.cover.bg, color: book.cover.fg,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '10px 9px 9px 13px', overflow: 'hidden',
        // Тень и светлая полоса слева — тот самый «переплёт»: без них блок
        // читается как цветной прямоугольник, а не как книга.
        boxShadow: 'inset 5px 0 0 rgba(255,255,255,0.22), 0 6px 16px rgba(0,0,0,0.18)',
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.75 }}>
        {book.publisher}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.2 }}>
        {book.title.split(' ').slice(0, 4).join(' ')}
      </span>
    </div>
  )
}

export function BookShelf({ books, accent, soft }: {
  books: Textbook[]
  accent: string
  soft: string
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
      {books.map(book => (
        <article
          key={book.id}
          style={{
            display: 'flex', gap: 16, padding: 16, borderRadius: 18,
            background: 'rgba(var(--glass-rgb), 0.94)',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          <Spine book={book} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0, flex: 1 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{t(book.kind)}</TileChip>
              <TileChip>{book.level}</TileChip>
              {book.free && (
                <TileChip tone="accent" accent="var(--color-green-text)" soft="var(--color-green-soft)">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Gift size={10} /> {t('бесплатно')}
                  </span>
                </TileChip>
              )}
            </span>

            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 780, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {book.title}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              {[book.authors, book.publisher, `${t('объяснения:')} ${book.explainedIn}`].filter(Boolean).join(' · ')}
            </span>

            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
              {bindShortWords(t(book.about))}
            </p>

            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {book.parts.map((p, i) => (
                <li key={i} style={{
                  fontSize: 11.5, color: 'var(--color-text-3)',
                  padding: '3px 9px', borderRadius: 999, background: 'var(--color-bg-3)',
                }}>
                  {t(p)}
                </li>
              ))}
            </ul>

            {/* Строка «когда» — то, ради чего полка вообще существует. */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 3,
              padding: '10px 13px', borderRadius: 12, background: soft,
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: accent }}>
                {t('Когда браться')}
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text)', ...proseWrap }}>
                {bindShortWords(t(book.when))}
              </span>
            </div>

            {book.url && (
              // Официальная страница, а не файл: раздавать чужие учебники мы
              // не будем, а ссылка на издателя не протухает.
              <a
                href={book.url}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                  fontSize: 12.5, fontWeight: 700, color: accent, textDecoration: 'none',
                }}
              >
                {t('Официальная страница')} <ExternalLink size={12} />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
