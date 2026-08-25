import { useState } from 'react'
import { Languages, ChevronDown, Heart, MessageCircle } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import { outletById, outletHandle, type FeedItem, type Outlet } from '../../data/feed'
import { FeedComments } from './FeedComments'
import { useFeedLikes } from '../../lib/feedLikes'
import { markRead, useSeen } from '../../lib/feedRead'
import GlossedText from '../GlossedText'
import AudioPlayer from '../AudioPlayer'

// ─────────────────────────────────────────────────────────────────────────────
// Пост ленты — один на всю платформу
//
// Он живёт и в ленте тренажёра, и на мобильной главной, и везде он — НАСТОЯЩИЙ
// пост, а не анонс: ролик играет на месте, перевод раскрывается на месте,
// сердце ставится тапом, тред разворачивается ниже. Тап по телу поста ничего
// не делает и никуда не ведёт — кликабельны только конкретные элементы.
//
// ДВА ОФОРМЛЕНИЯ ОДНОГО ПОСТА. `card` — карточка с рамкой, как в тренажёре,
// где посты идут под шапками-датами. `flat` — пост во всю ширину через
// волосяной разделитель, как X/Threads на телефоне: на мобильной главной
// лента продолжает журнальную колонку, и рамки превратили бы её в стопку
// коробок. У flat нет разделителей-дат, поэтому время поста стоит в шапке
// автора (`when`), как в любой соцсети.
// ─────────────────────────────────────────────────────────────────────────────

export function FeedPost({ item, lang, accent, subjectId, variant = 'card', when }: {
  item: FeedItem
  lang: string
  accent: string
  /** Предмет — чтобы слово из текста уезжало в колоду повторения. */
  subjectId?: string
  variant?: 'card' | 'flat'
  /** Время в шапке автора — для мест без разделителей-дат (flat). */
  when?: string
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

  const toggleTranslate = () => { setTranslated(v => !v); touched() }

  return (
    <article ref={seenRef} style={variant === 'card' ? {
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 18,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    } : {
      padding: '14px 0',
      borderTop: '1px solid var(--color-border-soft)',
      display: 'flex', flexDirection: 'column', gap: 11,
    }}>
      {/* ── Кто это написал ─────────────────────────────────────────────── */}
      {outlet && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar outlet={outlet} small={variant === 'flat'} />
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
            {when && (
              <span style={{ fontSize: 12.5, color: 'var(--color-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                · {when}
              </span>
            )}
          </a>
        </header>
      )}

      {/* ── Заголовок разбирается по словам, как и текст ────────────────────
          У автоматической части ленты (data/feed/autoKo.ts) заголовок —
          ЕДИНСТВЕННЫЙ текст: body там пуст, есть только ролик. Пока заголовок
          рисовался обычным <h3>, эти посты были для языка мертвы — ни одного
          слова не тронуть, при том что написаны они на изучаемом языке.
          Целого перевода у них нет и взяться ему неоткуда (машинного перевода
          в проекте нет — см. шапку autoKo.ts), а вот перевод ПО СЛОВУ есть
          всегда: он собран в data/wordGloss.ts и работает тем же тапом, что в
          абзаце заметки. Слово отсюда так же уезжает в колоду повторения. */}
      <h3 style={{ margin: 0 }}>
        <GlossedText
          text={item.title}
          lang={lang}
          extra={item.glossary.map(g => ({ term: g.term, ru: g.ru }))}
          accent={accent}
          subject={subjectId}
          style={{
            fontSize: 16.5, fontWeight: 700, lineHeight: 1.35,
            color: 'var(--color-text)', ...proseWrap,
          }}
        />
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

          {/* «Показать перевод» — текстовая ссылка под постом, как Translate
              post в X: перевод — свойство текста, и его выключатель стоит у
              текста, а не в общей строке действий поста. */}
          {item.translation && (
            <button
              onClick={toggleTranslate}
              style={{
                alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', fontSize: 13, fontWeight: 650, color: accent,
              }}
            >
              {translated ? t('Скрыть перевод') : t('Показать перевод')}
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
          Ни разделительной черты, ни подписей. Слева — что сделать с постом
          (сердце, реплики), как в любой ленте; справа — что сделать с
          материалом (послушать, перевести). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* ОЗВУЧКА ЕСТЬ У ЛЮБОГО ПОСТА — читаем заголовок, когда текста нет.
              Автоматическая часть ленты (data/feed/autoKo.ts) — это ролики с
              пустым body: у них озвучивать было нечего, и правый край строки
              оставался голым. Но заголовок у них на изучаемом языке и ровно
              такой же материал для слуха, что и абзац заметки. */}
          <AudioPlayer
            ttsText={item.body || item.title}
            lang={lang}
            variant="bare"
            picker={false}
            accent={accent}
          />
          {item.translation && (
            <IconBtn on={translated} accent={accent} title={t('Перевод')} onClick={toggleTranslate}>
              <Languages size={17} />
            </IconBtn>
          )}
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
function Avatar({ outlet, small }: { outlet: Outlet; small?: boolean }) {
  const size = small ? 34 : 38
  return (
    <span
      aria-hidden
      style={{
        flexShrink: 0, width: size, height: size, borderRadius: 999,
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

/**
 * Иконка-действие в строке поста: с числом, если есть что показывать.
 *
 * МЕСТО ПОД ЧИСЛО ЗАНЯТО ВСЕГДА — ИНАЧЕ СТРОКА ПРЫГАЕТ.
 * Раньше число рисовалось только при count > 0, и первый лайк (0 → 1) вносил
 * в строку новый элемент вместе с промежутком: соседние иконки уезжали вправо
 * прямо под пальцем, то есть пост дёргался ровно в ответ на тап. Теперь слот
 * стоит у любой считающей кнопки и пустым — ширина одна и та же до и после.
 * `tabular-nums` держит её и дальше: у моноширинных цифр 1 и 8 равны.
 *
 * `lineHeight` в размер иконки — вторая половина того же прыжка, вертикальная:
 * строка текста без него выше значка, и появление числа растило всю строку
 * действий, сдвигая вниз комментарии и следующий пост.
 */
function IconBtn({ children, on, accent, title, count, onClick }: {
  children: React.ReactNode
  on?: boolean
  accent: string
  title: string
  /** Задан — кнопка считающая, и слот под число резервируется даже при нуле. */
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
        lineHeight: '17px',
      }}
    >
      {children}
      {count !== undefined && (
        // Ширина слота — 1ch, а не «на глаз»: при tabular-nums выше ch равен
        // ширине цифры ровно, и пустой слот совпадает с однозначным числом до
        // пикселя. Круглые 7px оставляли хвост в 1.4px — незаметный глазом, но
        // это ровно тот же скачок, только помельче.
        <span style={{ minWidth: '1ch', textAlign: 'left' }}>
          {count > 0 ? count : ''}
        </span>
      )}
    </button>
  )
}
