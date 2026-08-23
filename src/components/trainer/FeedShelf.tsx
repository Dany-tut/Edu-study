import { useMemo, useState } from 'react'
import { Languages, ChevronDown, Heart, MessageCircle } from 'lucide-react'
import { Empty } from './TrainerShell'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import { byDay, dayLabel, outletById, outletHandle, type FeedItem, type Outlet } from '../../data/feed'
import { FeedComments } from './FeedComments'
import { useFeedLikes } from '../../lib/feedLikes'
import { markRead, useSeen } from '../../lib/feedRead'
import GlossedText from '../GlossedText'
import AudioPlayer from '../AudioPlayer'

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
// И НЕТ СЛУЖЕБНЫХ ПОДПИСЕЙ. Ни цветных меток «дорожки», ни строки «источник ·
// что это такое», ни ссылки «оригинал» под каждым постом. Карточка — это пост:
// шапка автора, содержимое, обсуждение. Как в мессенджере.
//
// ШАПКА АВТОРА — НЕ ИСКЛЮЧЕНИЕ ИЗ ЭТОГО ПРАВИЛА, А ЕГО ПРОДОЛЖЕНИЕ. Пост без
// автора читается как объявление платформы: непонятно, чей это язык — диктора
// новостей, пресс-службы или нашего пересказа. Поэтому сверху стоит ровно то,
// что стоит в любой ленте: аватарка, имя канала и его ручка. Это подпись
// автора, а не служебная метка «дорожка · лицензия · оригинал», которых здесь
// по-прежнему нет.
//
// ЕДИНСТВЕННОЕ, ЧТО ОСТАЛОСЬ ОТ СЛУЖЕБНОГО, — крохотная строка внизу поста, и
// только у текстов под CC BY / CC BY-SA. Это не подпись «откуда» и не
// украшение: у этих лицензий указание авторства — УСЛОВИЕ, при котором текст
// вообще можно показывать. Убрать её можно только вместе с самим текстом.
// У роликов её нет (автор виден в плеере YouTube), у общественного достояния и
// у наших собственных текстов — тоже нет.
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
            <Post key={item.id} item={item} lang={lang} accent={accent} subjectId={subjectId} />
          ))}
        </section>
      ))}
    </div>
  )
}

function Post({ item, lang, accent, subjectId }: {
  item: FeedItem
  lang: string
  accent: string
  subjectId?: string
}) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [translated, setTranslated] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [thread, setThread] = useState(false)
  const [replies, setReplies] = useState(0)
  const { count: likes, liked, toggle: like, canLike } = useFeedLikes(item.id)
  const seenRef = useSeen(lang, item.id)

  // Явное действие с материалом — просмотр без всякого таймера: включил ролик,
  // развернул текст, открыл перевод или обсуждение.
  const touched = () => markRead(lang, item.id)

  const video = item.embed?.kind === 'youtube' ? item.embed.id : null
  const outlet = outletById(item.outletId)

  // Строка авторства показывается, только когда её требует лицензия. CC BY и
  // CC BY-SA — требуют; общественное достояние и наш собственный текст — нет.
  const mustCredit = /CC BY/i.test(outlet?.license ?? '')

  // Длинный текст сворачивается, а не уезжает на другой экран: «Ещё»
  // разворачивает его прямо здесь. Порог по числу знаков, а не по строкам:
  // реальные строки известны только после отрисовки, и считать их ради
  // кнопки «ещё» пришлось бы измерением на каждый ресайз.
  const long = item.body.length > 420
  const shown = long && !expanded ? item.body.slice(0, 380).trimEnd() + '…' : item.body

  return (
    <article ref={seenRef} style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 18,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* ── Кто это написал ─────────────────────────────────────────────── */}
      {outlet && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar outlet={outlet} />
          <a
            href={outlet.home}
            target="_blank"
            rel="noreferrer noopener"
            style={{
              display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 0,
              textDecoration: 'none',
            }}
          >
            <span style={{
              fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {outlet.name}
            </span>
            <span style={{
              fontSize: 12.5, color: 'var(--color-muted)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {outletHandle(outlet)}
            </span>
          </a>
        </header>
      )}

      <h3 style={{
        margin: 0, fontSize: 16.5, fontWeight: 700, lineHeight: 1.35,
        color: 'var(--color-text)', ...proseWrap,
      }}>
        {bindShortWords(item.title)}
      </h3>

      {/* ── Ролик играет прямо в посте ──────────────────────────────────────
          До клика — кадр с YouTube, после — его же плеер на этом же месте.
          Не iframe заранее (десять постов — десять чужих плееров в памяти) и
          не переход на другой экран (это лента). */}
      {video && (
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '16 / 9',
          borderRadius: 14, overflow: 'hidden', background: '#000',
        }}>
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          ) : (
            <button
              onClick={() => { setPlaying(true); touched() }}
              aria-label={t('Смотреть')}
              style={{
                position: 'absolute', inset: 0, padding: 0, border: 'none',
                cursor: 'pointer', background: 'none',
              }}
            >
              <img
                src={`https://i.ytimg.com/vi/${video}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <span style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  width: 58, height: 58, borderRadius: 999,
                  background: 'rgba(0,0,0,0.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {/* Треугольник рисуем сами: иконка в кружке такого размера
                      выглядит наклейкой, а не кнопкой плеера. */}
                  <span style={{
                    width: 0, height: 0, marginLeft: 4,
                    borderTop: '11px solid transparent',
                    borderBottom: '11px solid transparent',
                    borderLeft: '18px solid #fff',
                  }} />
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* ── Текст читается здесь, слово переводится по клику ──────────────── */}
      {item.body && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GlossedText
            text={shown}
            lang={lang}
            extra={item.glossary.map(g => ({ term: g.term, ru: g.ru }))}
            accent={accent}
            subject={subjectId}
            style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--color-text)' }}
          />

          {long && !expanded && (
            <button
              onClick={() => { setExpanded(true); touched() }}
              style={{
                alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', fontSize: 13, fontWeight: 650, color: accent,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              {t('Ещё')}<ChevronDown size={14} />
            </button>
          )}

          {translated && item.translation && (
            <div style={{
              padding: '10px 12px', borderRadius: 12,
              background: 'var(--color-bg-3)',
              fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap,
            }}>
              {item.translation.split('\n\n').map((p, i) => (
                <p key={i} style={{ margin: i ? '8px 0 0' : 0 }}>{bindShortWords(p)}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Одна строка действий, всё иконками ──────────────────────────────
          Ни разделительной черты, ни подписей: под постом в ленте подпись
          «Обсудить» читается как заголовок раздела, а не как кнопка. Слева —
          что сделать с материалом (послушать, перевести), справа — что сделать
          с постом (сердце, реплики), как в любой ленте. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {item.body && (
          <AudioPlayer
            ttsText={item.body}
            lang={lang}
            compact
            picker={false}
            accent={accent}
          />
        )}
        {item.translation && (
          <IconBtn
            on={translated}
            accent={accent}
            title={t('Перевод')}
            onClick={() => { setTranslated(v => !v); touched() }}
          >
            <Languages size={17} />
          </IconBtn>
        )}

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {canLike && (
            <IconBtn on={liked} accent={accent} title={t('Нравится')} onClick={() => void like()} count={likes}>
              {/* Закрашенное сердце вместо цветного контура: на тёмной теме
                  тонкий контур в акцентном цвете почти не отличается от
                  серого, а заливка видна сразу. */}
              <Heart size={17} fill={liked ? accent : 'none'} />
            </IconBtn>
          )}
          <IconBtn
            on={thread}
            accent={accent}
            title={t('Комментарии')}
            onClick={() => { setThread(v => !v); touched() }}
            count={replies}
          >
            <MessageCircle size={17} />
          </IconBtn>
        </span>
      </div>

      <FeedComments
        itemId={item.id}
        lang={lang}
        accent={accent}
        open={thread}
        onCount={setReplies}
      />

      {mustCredit && (
        <div style={{ fontSize: 10.5, color: 'var(--color-text-4)', lineHeight: 1.4 }}>
          {/* Имя источника теперь в шапке — здесь остаётся то, чего в шапке
              нет: автор текста и лицензия. */}
          {[item.byline, (outlet?.license ?? '').split('—')[0].trim()]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}
    </article>
  )
}

/**
 * Аватарка источника. Рисуется знаком из реестра, а не картинкой с чужого
 * сайта: логотип телеканала — его товарный знак, а десять постов в ленте — это
 * десять запросов к чужому хосту ради кружка 40×40.
 */
function Avatar({ outlet }: { outlet: Outlet }) {
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: 999,
        background: outlet.tint, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Знак бывает и в три буквы (SBS), и в один иероглиф (위): кегль
        // подбираем по длине, иначе трёхбуквенный вылезает из кружка.
        fontSize: outlet.mark.length > 2 ? 12.5 : outlet.mark.length > 1 ? 14.5 : 17,
        fontWeight: 800, letterSpacing: outlet.mark.length > 1 ? -0.2 : 0,
        lineHeight: 1,
      }}
    >
      {outlet.mark}
    </span>
  )
}

/** Иконка-действие в строке поста: с числом, если есть что показывать. */
function IconBtn({ children, on, accent, title, count, onClick }: {
  children: React.ReactNode
  on?: boolean
  accent: string
  title: string
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: on ? accent : 'var(--color-muted)',
        fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
      }}
    >
      {children}
      {!!count && count > 0 && <span>{count}</span>}
    </button>
  )
}
