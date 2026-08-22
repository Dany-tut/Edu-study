import { useMemo, useState } from 'react'
import { ExternalLink, Headphones, BookOpen, Check, Archive, Play } from 'lucide-react'
import { Empty } from './TrainerShell'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import { byDay, dayLabel, outletById, type FeedItem, type Lane } from '../../data/feed'
import { FeedComments } from './FeedComments'

// ─────────────────────────────────────────────────────────────────────────────
// Витрина ленты: дни сверху вниз
//
// ПОЧЕМУ НЕ СЕТКА ПЛИТОК, КАК У СЦЕН И ТЕКСТОВ. Плитка отвечает на вопрос «что
// из этого выбрать» — она равна другим плиткам и ждёт сравнения. Лента на этот
// вопрос не отвечает вообще: её читают сверху, пока не кончится сегодняшнее.
// Поэтому строки, а не карточки в ряд, и разделители дней вместо заголовков
// разделов: дата — главный признак материала, всё остальное вторично.
//
// ЦВЕТНАЯ ПОЛОСКА СЛЕВА — ЭТО ПРАВО, А НЕ ЖАНР. Зелёная: настоящий текст
// целиком (свободная лицензия или общественное достояние). Синяя: чужой плеер.
// Серая: только заголовок и ссылка. От неё зависит, что произойдёт по кнопке,
// поэтому она и стоит первой слева, а не спрятана в подпись.
//
// А ВОТ У ПОСТОВ ПОЛОСКИ НЕТ. Твит и переписка рисуются как твит и переписка —
// они и так не похожи ни на что другое в ленте, а цветная метка на посте
// читается как «этот пост чем-то помечен». Постов в данных пока нет, но
// решение записано здесь, чтобы при первом же посте не начинать заново.
// ─────────────────────────────────────────────────────────────────────────────

const LANE_COLOR: Record<Lane, string> = {
  free: 'var(--color-green-fill)',
  embed: 'var(--color-blue-fill)',
  link: 'var(--color-text-4)',
}

/** Что означает дорожка — одной строкой, ученику. */
const LANE_NOTE: Record<Lane, string> = {
  free: 'Настоящий текст источника, целиком',
  embed: 'Ролик в плеере площадки',
  link: 'Наш текст о событии, оригинал по ссылке',
}

export function FeedList({ items, lang, done, accent, soft, onOpen }: {
  items: FeedItem[]
  lang: string
  done: (id: string) => boolean
  accent: string
  soft: string
  /** 'read' — читалка, 'listen' — тот же материал на слух. */
  onOpen: (id: string, how: 'read' | 'listen') => void
}) {
  const t = useT()
  const days = useMemo(() => byDay(items), [items])

  if (items.length === 0) {
    return <Empty text={t('Для этого языка ленты пока нет. Она собирается скриптом из свободных источников — см. scripts/buildFeed.mjs.')} />
  }

  // Лента целиком из архива — это надо сказать прямо, а не оставлять человека
  // гадать, почему «сегодня» датировано прошлым годом.
  const allArchive = items.every(x => outletById(x.outletId)?.status === 'archive')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {allArchive && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          padding: '12px 14px', borderRadius: 14,
          background: 'var(--color-bg-3)', color: 'var(--color-muted)', fontSize: 12.5, lineHeight: 1.5,
        }}>
          <Archive size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={proseWrap}>
            {bindShortWords(t('Пока это архив, а не свежая лента: живого источника со свободной лицензией на этом языке у нас ещё нет. Тексты настоящие, но старые.'))}
          </span>
        </div>
      )}

      {days.map(day => (
        <section key={day.date} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: 'var(--color-muted)', whiteSpace: 'nowrap',
            }}>
              {dayLabel(day.date)}
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </header>

          {day.items.map(item => (
            <FeedRow
              key={item.id}
              item={item}
              lang={lang}
              done={done(item.id)}
              accent={accent}
              soft={soft}
              onOpen={onOpen}
            />
          ))}
        </section>
      ))}
    </div>
  )
}

function FeedRow({ item, lang, done, accent, soft, onOpen }: {
  item: FeedItem
  lang: string
  done: boolean
  accent: string
  soft: string
  onOpen: (id: string, how: 'read' | 'listen') => void
}) {
  const t = useT()
  const [hover, setHover] = useState(false)
  const outlet = outletById(item.outletId)
  const video = item.embed?.kind === 'youtube' ? item.embed.id : null

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 9,
        padding: '14px 16px 14px 19px',
        borderRadius: 16,
        background: 'var(--color-surface)',
        border: `1px solid ${hover ? accent : 'var(--color-border)'}`,
        transition: 'border-color .15s',
      }}
    >
      {/* Дорожка. Ширина 3px и во всю высоту — метка, а не украшение. */}
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: LANE_COLOR[item.lane],
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 750, color: 'var(--color-text-2)' }}>
          {outlet?.name ?? item.outletId}
        </span>
        <span style={{ color: 'var(--color-text-4)', fontSize: 12 }}>·</span>
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>
          {t(LANE_NOTE[item.lane])}
        </span>

        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {done && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, fontWeight: 800, color: 'var(--color-green-fill)',
            }}>
              <Check size={12} />{t('прочитано')}
            </span>
          )}
          <Chip>{item.level}</Chip>
          <Chip>{item.minutes} {t('мин')}</Chip>
        </span>
      </div>

      <h3 style={{
        margin: 0, fontSize: 16, fontWeight: 650, lineHeight: 1.35,
        color: 'var(--color-text)', ...proseWrap,
      }}>
        {bindShortWords(item.title)}
      </h3>

      {/* Серая дорожка обязана объясниться до клика, а не после: человек
          должен знать, что откроет наш текст о событии, а не статью источника. */}
      {item.lane === 'link' && (
        <div style={{
          padding: '9px 12px', borderRadius: 12, background: 'var(--color-bg-3)',
          fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.5, ...proseWrap,
        }}>
          {bindShortWords(t('Читать будете наш текст об этом событии, написанный под уровень: факты события свободны, чужие формулировки — нет. Оригинал — по ссылке.'))}
        </div>
      )}

      {/* Кадр ролика тянется у самого YouTube — той же ссылкой, которой
          пользуется его плеер. Своей копии обложки мы не держим: это уже было
          бы хранением чужого материала, а не встраиванием. */}
      {video && (
        <button
          onClick={() => onOpen(item.id, 'listen')}
          style={{
            position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '16 / 9',
            border: 'none', padding: 0, borderRadius: 12, overflow: 'hidden',
            cursor: 'pointer', background: 'var(--color-bg-3)',
          }}
        >
          <img
            src={`https://i.ytimg.com/vi/${video}/mqdefault.jpg`}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <span style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.28)', color: '#fff',
          }}>
            <Play size={26} fill="#fff" />
          </span>
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {/* У материала в плеере читать нечего: кнопка «Читать» на нём открыла
            бы пустую читалку. Поэтому набор кнопок зависит от дорожки. */}
        {item.lane === 'embed' ? (
          <Btn accent={accent} onClick={() => onOpen(item.id, 'listen')}>
            <Play size={13} />{t('Смотреть')} · {item.questions.length} {t('вопр.')}
          </Btn>
        ) : (
          <>
            <Btn accent={accent} onClick={() => onOpen(item.id, 'read')}>
              <BookOpen size={13} />{t('Читать')}
            </Btn>
            {/*
              Слушать — ТОТ ЖЕ материал, озвученный синтезом. Второго комплекта
              данных для этого не нужно: у заметки уже есть текст, словарь и
              вопросы, а «показать расшифровку только после ответов» — забота
              читалки-слушалки, а не ленты.
            */}
            <Btn onClick={() => onOpen(item.id, 'listen')}>
              <Headphones size={13} />{t('Слушать')}
            </Btn>
          </>
        )}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, color: 'var(--color-muted)', textDecoration: 'none',
            marginLeft: 'auto',
          }}
        >
          {t('Оригинал')}<ExternalLink size={12} />
        </a>
      </div>

      {/* Обсуждение — прямо в ленте, а не на отдельном экране: реплику пишут
          сразу после того, как прочли, и уводить за этим со страницы значит не
          получить реплику вовсе. */}
      <FeedComments itemId={item.id} lang={lang} accent={accent} />

      {/* Лицензия и автор стоят на карточке, а не только в читалке: у CC BY-SA
          атрибуция — условие показа, и оно должно выполняться везде, где виден
          текст, включая витрину с заголовком. */}
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', lineHeight: 1.45 }}>
        {[item.credit, item.byline].filter(Boolean).join(' · ')}
      </div>

      {hover && (
        <span style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: soft, opacity: 0.12,
        }} />
      )}
    </article>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
      background: 'var(--color-bg-3)', color: 'var(--color-muted)', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function Btn({ children, accent, onClick }: {
  children: React.ReactNode
  accent?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 999,
        fontSize: 12.5, fontWeight: 650, cursor: 'pointer',
        background: accent ?? 'transparent',
        color: accent ? '#fff' : 'var(--color-text-2)',
        border: accent ? 'none' : '1px solid var(--color-border-strong)',
      }}
    >
      {children}
    </button>
  )
}
