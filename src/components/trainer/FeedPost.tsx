import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import { outletById, outletHandle, type FeedItem, type Outlet } from '../../data/feed'
import { FeedComments } from './FeedComments'
import { useFeedLikes } from '../../lib/feedLikes'
import { markRead, useSeen } from '../../lib/feedRead'
import { buildLexicon } from '../../lib/lexicon'
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

  // Нижняя строка поста — две разные обязанности, а не одна.
  //
  //  1. АТРИБУЦИЯ ПО ЛИЦЕНЗИИ. CC BY и CC BY-SA требуют назвать автора; у
  //     общественного достояния такого условия нет.
  //  2. ЧЕЙ ЭТО ТЕКСТ. Пересказ подписан «Наука» — по названию не видно, что
  //     это МЫ пересказали NASA, а не NASA написал. Молчать тут нельзя: ученик
  //     решит, что читает первоисточник, и наша неточность станет чужой
  //     ошибкой. Поэтому у своего текста строка стоит всегда.
  //
  // Условие у второй половины — `byline`, а не один `textOrigin`: у роликов
  // автолента тоже ставит 'ours' (заголовок наш), но исходного материала там
  // нет, и строка «Плеер YouTube» под каждым видео была бы просто шумом.
  const mustCredit = /CC BY/i.test(outlet?.license ?? '')
    || (item.textOrigin === 'ours' && !!item.byline)

  // Длинный текст сворачивается, а не уезжает на другой экран: «Ещё»
  // разворачивает его прямо здесь. Порог по числу знаков, а не по строкам:
  // реальные строки известны только после отрисовки, и считать их ради
  // кнопки «ещё» пришлось бы измерением на каждый ресайз.
  // ── Уровень пересказа ───────────────────────────────────────────────────────
  //
  // У материала с `levels` тело зависит от выбранной ступени, и дальше ВЕСЬ пост
  // работает с локальным `body`, а не с `item.body`: озвучка, словарь и «Ещё»
  // не должны знать, что уровней несколько.
  //
  // Сразу показывается ПЕРВЫЙ, самый простой. Не «уровень ученика»: уровень
  // курса и уровень чтения — разные вещи (читать всегда легче, чем говорить), а
  // упереться в стену на первой же строке — вернейший способ закрыть ленту.
  // Поднять ступень — один тап, и он виден.
  const [tier, setTier] = useState(0)
  const step = item.levels?.[Math.min(tier, item.levels.length - 1)]
  const body = step?.body ?? item.body

  // ── Перевод показывается ВМЕСТО оригинала ─────────────────────────────────
  //
  // Раньше он раскрывался ПОД текстом, и это было хуже, чем кажется: читать
  // приходилось, прыгая глазами между двумя абзацами, а на телефоне русский
  // текст вообще уезжал за нижний край — жмёшь «перевод» и не видишь перевода.
  // Теперь пост целиком переключает язык, как «Перевести пост» в X: заголовок,
  // тело и обрезка «Ещё» — всё считается по показываемому тексту.
  //
  // ЗАГОЛОВОК ПЕРЕВОДИТСЯ ВМЕСТЕ С ТЕЛОМ. У ролика тела нет вовсе, и без
  // перевода заголовка кнопка на нём не делала бы ровно ничего.
  const full = item.translation || item.titleTranslation
    ? { title: item.titleTranslation ?? item.title, body: item.translation ?? '' }
    : null
  const ru = translated && !!full

  const shownTitle = ru ? full!.title : item.title
  const text = ru ? full!.body : body

  const long = text.length > 420
  const shown = long && !expanded ? text.slice(0, 380).trimEnd() + '…' : text

  const toggleTranslate = () => { setTranslated(v => !v); touched() }

  // ── Перевод там, где перевода нет ───────────────────────────────────────────
  //
  // У автоматической части ленты поля `translation` нет и не будет: машинного
  // перевода в проекте нет, а выдавать его за свой — врать. Но кнопка «перевод»
  // нужна на КАЖДОМ посте: её отсутствие читается не как «перевода нет», а как
  // «тут что-то сломалось», и человек ищет её глазами на каждом посте заново.
  //
  // Поэтому кнопка стоит всегда, а показывает то, что у нас честно есть:
  // пословный разбор. Это тот же словарь, что открывается тапом по слову, —
  // только весь список сразу, для тех, кому проще пробежать глазами, чем
  // тыкать в каждое незнакомое слово.
  //
  // Считается ЛЕНИВО. buildLexicon строит Map на несколько тысяч записей, и
  // делать это для сорока постов ленты, из которых откроют один, — работа в
  // стол.
  const words = useMemo(() => {
    if (!translated || full) return null
    const lex = buildLexicon(lang, item.glossary)
    const seen = new Set<string>()
    const out: { text: string; ru: string }[] = []
    for (const seg of lex.segment(body || item.title)) {
      if (!seg.word || !seg.gloss) continue
      const k = seg.gloss.term.trim().toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ text: seg.text, ru: seg.gloss.ru })
    }
    return out
  }, [translated, full, item.glossary, body, item.title, lang])

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
        {ru ? (
          // Переведённый заголовок — обычный текст: разбирать по словам в нём
          // нечего, он уже по-русски.
          <span style={{
            display: 'block', fontSize: 16.5, fontWeight: 700, lineHeight: 1.35,
            color: 'var(--color-text)', ...proseWrap,
          }}>
            {bindShortWords(shownTitle)}
          </span>
        ) : (
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
        )}
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
      {body && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* СТУПЕНИ СТОЯТ НАД ТЕКСТОМ, а не в строке действий внизу: решение
              «мне тяжело» принимают на первой строке, а не дочитав до конца.
              Смена ступени сбрасывает «Ещё» — иначе на простом уровне текст
              оказывался бы развёрнут, а на сложном обрезан по той же метке. */}
          {!ru && item.levels && item.levels.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {item.levels.map((l, i) => (
                <button
                  key={l.level}
                  onClick={() => { setTier(i); setExpanded(false); touched() }}
                  style={{
                    padding: '3px 10px', borderRadius: 999, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 11.5, fontWeight: 750,
                    border: `1px solid ${i === tier ? accent : 'var(--color-border)'}`,
                    background: i === tier ? `${accent}1A` : 'transparent',
                    color: i === tier ? accent : 'var(--color-muted)',
                  }}
                >
                  {l.level}
                </button>
              ))}
            </div>
          )}
          {ru ? (
            <div style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--color-text)', ...proseWrap }}>
              {shown.split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: i ? '8px 0 0' : 0 }}>{bindShortWords(para)}</p>
              ))}
            </div>
          ) : (
            <GlossedText
              text={shown}
              lang={lang}
              extra={item.glossary.map(g => ({ term: g.term, ru: g.ru }))}
              accent={accent}
              subject={subjectId}
              style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--color-text)' }}
            />
          )}

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

          {/* Выключатель перевода — текстовой ссылкой у самого текста, как
              «Перевести пост» в X: перевод это свойство текста, и его место
              рядом с текстом, а не только в общей строке действий. Подпись
              называет то, что произойдёт по нажатию, — на переведённом посте
              это «оригинал», потому что русский уже перед глазами. */}
          {full && (
            <button
              onClick={toggleTranslate}
              style={{
                alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', fontSize: 13, fontWeight: 650, color: accent,
              }}
            >
              {ru ? t('Показать оригинал') : t('Показать перевод')}
            </button>
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
            <HeartGlyph filled={liked} accent={accent} />
          </IconBtn>
        )}
        <IconBtn
          on={thread}
          accent={accent}
          title={t('Комментарии')}
          onClick={() => { setThread(v => !v); touched() }}
          count={replies}
        >
          <ReplyGlyph filled={thread} accent={accent} />
        </IconBtn>

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* ОЗВУЧКА ЕСТЬ У ЛЮБОГО ПОСТА — читаем заголовок, когда текста нет.
              Автоматическая часть ленты (data/feed/autoKo.ts) — это ролики с
              пустым body: у них озвучивать было нечего, и правый край строки
              оставался голым. Но заголовок у них на изучаемом языке и ровно
              такой же материал для слуха, что и абзац заметки. */}
          <AudioPlayer
            ttsText={body || item.title}
            lang={lang}
            variant="bare"
            picker={false}
            accent={accent}
          />
          {/* Кнопка перевода — на КАЖДОМ посте (см. `words` выше). У поста с
              переводом она открывает перевод, у остальных — пословный разбор. */}
          <IconBtn
            on={translated}
            accent={accent}
            title={item.translation ? t('Перевод') : t('Перевод по словам')}
            onClick={toggleTranslate}
          >
            <TranslateGlyph />
          </IconBtn>
        </span>
      </div>

      {/* Пословный разбор. Стоит ПОД строкой действий, а не внутри текста:
          у ролика тела нет вовсе, а кнопка есть и у него — разбирается
          заголовок. */}
      {words && (
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: 'var(--color-bg-3)', ...proseWrap,
        }}>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-4)', lineHeight: 1.45, marginBottom: words.length ? 8 : 0 }}>
            {bindShortWords(words.length
              ? t('Перевода целиком у этого поста нет — вот слова из него. Любое слово в тексте открывается и тапом.')
              : t('Перевода целиком у этого поста нет, а слов, знакомых словарю, здесь не нашлось.'))}
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {words.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>{w.text}</span>
                <span style={{ color: 'var(--color-text-2)', ...proseWrap }}>{bindShortWords(w.ru)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

// ─────────────────────────────────────────────────────────────────────────────
// ЗНАЧКИ СТРОКИ ДЕЙСТВИЙ — СВОИ, А НЕ ИЗ НАБОРА
//
// Библиотечные значки нарисованы под интерфейс вообще: одинаковая жёсткая
// сетка, острые сочленения, одна и та же толщина у сердца и у буквы. В ленте
// они стоят вплотную друг к другу и на просвет читаются как забор из палочек.
//
// Здесь три знака одного семейства: общий кегль, скруглённые концы, одна
// толщина линии и — главное — ЗАЛИВКА КАК СОСТОЯНИЕ. Нажатое сердце и
// открытый тред залиты акцентом целиком, а не подкрашены контуром: тонкий
// цветной контур на тёмной теме почти неотличим от серого (см. память про
// «невидимое в тёмной теме»), заливка видна с первого взгляда.
//
// `vectorEffect` держит толщину линии постоянной: значок иногда едет вместе с
// кнопкой (нажатие ужимает её), и без него штрих ужимался бы вместе с ним.
// ─────────────────────────────────────────────────────────────────────────────

const SIZE = 19

function Glyph({ children, filled, accent }: {
  children: React.ReactNode
  filled?: boolean
  accent?: string
}) {
  return (
    <svg
      width={SIZE} height={SIZE} viewBox="0 0 24 24"
      fill={filled && accent ? accent : 'none'}
      stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      {children}
    </svg>
  )
}

/** Сердце: одна замкнутая кривая — потому и заливается ровно. */
function HeartGlyph({ filled, accent }: { filled: boolean; accent: string }) {
  return (
    <Glyph filled={filled} accent={accent}>
      <path d="M12 20.1c-.42 0-.82-.15-1.13-.42C6.28 15.85 3.6 13.28 3.6 10.15A4.55 4.55 0 0 1 8.1 5.55c1.6 0 2.95.83 3.9 2.15.95-1.32 2.3-2.15 3.9-2.15a4.55 4.55 0 0 1 4.5 4.6c0 3.13-2.68 5.7-7.27 9.53-.31.27-.71.42-1.13.42Z" />
    </Glyph>
  )
}

/** Облако реплики с хвостом влево-вниз — как в мессенджере, а не кружок. */
function ReplyGlyph({ filled, accent }: { filled: boolean; accent: string }) {
  return (
    <Glyph filled={filled} accent={accent}>
      <path d="M12 4.9c4.42 0 8 2.94 8 6.57s-3.58 6.57-8 6.57c-.87 0-1.71-.11-2.5-.32l-3.83 1.6a.4.4 0 0 1-.54-.48l.83-2.83C4.68 14.85 4 13.28 4 11.47 4 7.84 7.58 4.9 12 4.9Z" />
    </Glyph>
  )
}

/**
 * Перевод: латинская «A» и китайский знак 文 — два письма рядом.
 *
 * Готовый значок «Languages» рисует стопку палочек, в которой на 17 пикселях
 * не разобрать ни буквы, ни иероглифа. Здесь оба знака нарисованы штрихами
 * той же толщины, что сердце: на просвет видно ровно то, что значок обещает, —
 * перевод с одного письма на другое.
 */
function TranslateGlyph() {
  return (
    <Glyph>
      {/* A */}
      <path d="M3.4 14.6 6.6 6.4l3.2 8.2" />
      <path d="M4.5 12.1h4.2" />
      {/* 文 */}
      <path d="M16.4 5.6v1" />
      <path d="M13.2 8.8h6.6" />
      <path d="M18 8.8c-.5 3.4-2 5.9-4.6 8" />
      <path d="M15.7 12.3c1.1 2.4 2.6 4.3 4.6 5.6" />
    </Glyph>
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
  // Подсветка кружком под пальцем/курсором — та же, что во всех лентах: она
  // говорит, что нажимается ЗНАЧОК, а не строка целиком, и заодно даёт цель
  // размером с палец там, где сам знак 19 пикселей. Держим состоянием, а не
  // :hover: инлайновые стили псевдоклассов не знают.
  const [hot, setHot] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        color: on ? accent : 'var(--color-muted)',
        fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        lineHeight: '19px',
        transition: 'color .15s ease',
      }}
    >
      <span style={{
        position: 'relative', width: 30, height: 30, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginLeft: -5.5,
      }}>
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0, borderRadius: 999,
            background: 'currentColor',
            opacity: hot ? 0.12 : 0,
            transform: hot ? 'scale(1)' : 'scale(0.75)',
            transition: 'opacity .15s ease, transform .15s ease',
          }}
        />
        <span style={{ position: 'relative', display: 'flex' }}>{children}</span>
      </span>
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
