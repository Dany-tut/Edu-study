// ─────────────────────────────────────────────────────────────────────────────
// Полка учебников
//
// ПОЧЕМУ РИСОВАННАЯ ОБЛОЖКА, А НЕ СКАН. Настоящая обложка — чужая картинка с
// чужой лицензией и битой ссылкой через год. Книга узнаётся по цвету, знаку и
// названию, а не по фотографии; заодно полка выглядит ровно, чего с
// разномастными сканами не бывает никогда.
//
// КАК УСТРОЕНА ОБЛОЖКА. Пропорция книги (2:3), светлая полоса слева — переплёт,
// крупный знак по типу книги фоном (한 курс, 문 грамматика, 급 экзамен) и
// КОРОТКОЕ название. Короткое — не украшение: полное («세종한국어 (Sejong
// Korean)») на 108 пикселях рвалось посреди слова, и полка выглядела как
// вёрстка с ошибкой. Языкам без иероглифики знак не идёт, поэтому там фоном
// стоит иконка типа — см. KIND_ICON.
//
// ГЛАВНОЕ НА КАРТОЧКЕ — «КОГДА БРАТЬСЯ». Список книг без этого — та самая
// подборка из соцсетей, после которой человек берёт справочник грамматики,
// ещё не читая хангыль, и решает, что язык не для него. Поэтому строка «когда»
// стоит на карточке всегда и выделена, а не спрятана в описании.
//
// КНОПКА ОБЕЩАЕТ ТО, ЧТО БУДЕТ. Раньше у всех восьми книг стояла одна подпись
// «Официальная страница», за которой пряталось разное: бесплатный учебник
// целиком, витрина магазина, рабочий словарь. Теперь подпись берётся из типа
// доступа (Textbook.access), а там, где устойчивой ссылки на файл не бывает,
// под кнопкой написано, что искать на той странице.
// ─────────────────────────────────────────────────────────────────────────────

import { BookOpen, Download, ExternalLink, GraduationCap, Gift, Languages, MessageCircle, ScrollText, ShoppingBag } from 'lucide-react'
import { bookMark, bookShort, type Textbook, type TextbookAccess, type TextbookKind } from '../../data/textbooks'
import { useT } from '../../lib/i18n'
import { proseWrap, bindShortWords } from '../../lib/typography'
import { TileChip } from './TrainerShell'

/** Иконка типа — фоновый знак там, где иероглифического знака у языка нет. */
const KIND_ICON: Record<TextbookKind, typeof BookOpen> = {
  'курс': BookOpen,
  'грамматика': ScrollText,
  'экзамен': GraduationCap,
  'самоучитель': MessageCircle,
  'словарь': Languages,
}

/** Подпись и иконка кнопки — по типу доступа. */
const ACTION: Record<TextbookAccess, { label: string; Icon: typeof BookOpen }> = {
  free: { label: 'Скачать бесплатно', Icon: Download },
  shop: { label: 'Где купить', Icon: ShoppingBag },
  service: { label: 'Открыть', Icon: ExternalLink },
  page: { label: 'Официальная страница', Icon: ExternalLink },
}

/** Нарисованная обложка: цвет, знак, короткое название. */
function Cover({ book, lang }: { book: Textbook; lang: string }) {
  const t = useT()
  const mark = bookMark(book, lang)
  const Icon = KIND_ICON[book.kind]
  return (
    <div
      style={{
        position: 'relative', width: 112, minWidth: 112, height: 168,
        borderRadius: '3px 10px 10px 3px', overflow: 'hidden',
        background: book.cover.bg, color: book.cover.fg,
        // Светлая полоса слева и тень — тот самый «переплёт»: без них блок
        // читается как цветной прямоугольник, а не как книга.
        boxShadow: 'inset 7px 0 0 rgba(255,255,255,0.18), 0 8px 20px rgba(0,0,0,0.22)',
      }}
    >
      {/* Знак фоном, а не картинкой: он и есть «обложка». Наполовину за
          краем — так он читается как тиснение, а не как наклейка по центру.
          Иконка свисает меньше глифа: у неё нет запаса пустоты снизу, который
          есть у иероглифа, и на тех же -26 от неё осталась бы половина. */}
      {mark ? (
        <span aria-hidden style={{
          position: 'absolute', right: -8, bottom: -26, lineHeight: 1,
          fontSize: 92, fontWeight: 800, color: 'rgba(255,255,255,0.16)',
        }}>
          {mark}
        </span>
      ) : (
        <Icon
          aria-hidden
          size={80}
          strokeWidth={1.5}
          style={{ position: 'absolute', right: -10, bottom: -12, color: 'rgba(255,255,255,0.16)' }}
        />
      )}
      <div style={{
        position: 'relative', height: '100%', boxSizing: 'border-box',
        padding: '13px 12px 13px 18px', display: 'flex', flexDirection: 'column',
      }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', opacity: 0.72 }}>
          {t(book.kind)}
        </span>
        <span style={{ marginTop: 'auto', fontSize: 15, fontWeight: 800, lineHeight: 1.2 }}>
          {bookShort(book)}
        </span>
        <span style={{ fontSize: 10, opacity: 0.75, marginTop: 3, lineHeight: 1.35 }}>
          {book.publisher} · {book.level}
        </span>
      </div>
    </div>
  )
}

export function BookShelf({ books, lang, accent, soft }: {
  books: Textbook[]
  /** Код языка — по нему выбирается знак на обложке. */
  lang: string
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
          <Cover book={book} lang={lang} />
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
                  fontSize: 11.5, lineHeight: 1.4, color: 'var(--color-text-3)',
                  // Радиус — половина высоты ОДНОЙ строки (11.5×1.4 + 3+3 ≈ 22),
                  // а не 999: на узком экране подпись переносится, и полное
                  // скругление превращает её в кривой овал.
                  padding: '3px 9px', borderRadius: 11, background: 'var(--color-bg-3)',
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

            {book.url && (() => {
              // Страница издателя, а не файл: раздавать чужие учебники мы не
              // будем. Но подпись у кнопки честная — за ней либо бесплатный
              // учебник, либо магазин, и знать это надо ДО нажатия.
              const { label, Icon } = ACTION[book.access ?? 'page']
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignSelf: 'flex-start' }}>
                  <a
                    href={book.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 12.5, fontWeight: 700, color: accent, textDecoration: 'none',
                    }}
                  >
                    <Icon size={13} />
                    {/* «Открыть» само по себе не отвечает на вопрос «что
                        открыть»: у веб-сервиса подпись собирается из типа —
                        «Открыть словарь». */}
                    {book.access === 'service' ? `${t(label)} ${t(book.kind)}` : t(label)}
                  </a>
                  {book.urlNote && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.45, ...proseWrap }}>
                      {bindShortWords(t(book.urlNote))}
                    </span>
                  )}
                </div>
              )
            })()}
          </div>
        </article>
      ))}
    </div>
  )
}
