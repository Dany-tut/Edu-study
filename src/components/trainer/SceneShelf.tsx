import { BookOpen, Tv, Quote, ExternalLink, AlertTriangle, Lock } from 'lucide-react'
import { Tile, TileGrid, TileChip, TileMeter, Empty } from './TrainerShell'
import { useT } from '../../lib/i18n'
import { bindShortWords, proseWrap } from '../../lib/typography'
import { originLabel, scenesWord, workLine, type Scene, type Work } from '../../data/scenes'

// ─────────────────────────────────────────────────────────────────────────────
// Витрина сцен: полки → произведение → его сцены
//
// ПОЧЕМУ ВИТРИНА, А НЕ ПЛОСКИЙ СПИСОК. Учебный текст выбирают фильтром: «A2,
// работа, три минуты». Отрывок из книги так не выбирают — сначала решают, ЧТО
// читать, и только потом какой кусок. Плоский список из тридцати сцен пятнадцати
// авторов отвечает на второй вопрос, не задав первого.
//
// ДВА ЭКРАНА, А НЕ ТРИ. Полка не открывается отдельно: её заголовок просто
// разделяет сетку произведений. Третий уровень вложенности («полки → полка →
// книга → сцена») на четырёх полках означал бы клик ради клика.
// ─────────────────────────────────────────────────────────────────────────────

/** Сколько сцен произведения пройдено — по общим результатам тренажёра. */
export function workProgress(scenes: Scene[], done: (id: string) => boolean) {
  const total = scenes.length
  const passed = scenes.filter(s => done(s.id)).length
  return { total, passed, percent: total ? Math.round((passed / total) * 100) : 0 }
}

// ─── Сетка произведений ──────────────────────────────────────────────────────

export function WorkGrid({ groups, scenesOf, done, accent, soft, onOpen }: {
  /** Полки с произведениями — уже отфильтрованные и в нужном порядке. */
  groups: { title: string; hint: string; works: Work[] }[]
  scenesOf: (workId: string) => Scene[]
  done: (sceneId: string) => boolean
  accent: string
  soft: string
  onOpen: (workId: string) => void
}) {
  const t = useT()

  if (groups.length === 0) {
    return <Empty text={t('Под выбранные фильтры ничего не подошло. Сбрось один из них.')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {groups.map(g => (
        <section key={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <header>
            <h2 style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)', margin: 0 }}>
              {t(g.title)}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: '3px 0 0', lineHeight: 1.5 }}>
              {t(g.hint)}
            </p>
          </header>

          <TileGrid min={248}>
            {g.works.map(w => {
              const scenes = scenesOf(w.id)
              const p = workProgress(scenes, done)
              return (
                <Tile key={w.id} accent={accent} onClick={() => onOpen(w.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <TileChip tone="accent" accent={accent} soft={soft}>
                      {w.medium === 'series' ? <Tv size={11} /> : <BookOpen size={11} />}
                      {' '}{w.medium === 'series' ? t('сериал') : t('книга')}
                    </TileChip>
                    {/* Возраст показываем только там, где он что-то значит:
                        плашка «12+» на каждой карточке — визуальный шум. */}
                    {w.age !== '12+' && <TileChip tone="mute">{w.age}</TileChip>}
                    {w.bucket === 'pd' && <TileChip tone="mute">{t('оригинал')}</TileChip>}
                  </span>

                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                      {w.title}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>{workLine(w)}</span>
                  </span>

                  <TileMeter value={p.percent} />
                  <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
                    <span>{p.total} {t(scenesWord(p.total))}</span>
                    {p.passed > 0 && (
                      <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>
                        {p.passed} / {p.total}
                      </span>
                    )}
                  </span>
                </Tile>
              )
            })}
          </TileGrid>
        </section>
      ))}
    </div>
  )
}

// ─── Карточка произведения и его сцены ───────────────────────────────────────

export function WorkPage({ work, scenes, done, accent, soft, onOpenScene, hideSpoilers }: {
  work: Work
  /** Сцены произведения — уже отсортированные по order. */
  scenes: Scene[]
  done: (sceneId: string) => boolean
  accent: string
  soft: string
  onOpenScene: (sceneId: string) => void
  /** Прятать сцены, раскрывающие сюжет. Ученик включает это в рейле. */
  hideSpoilers: boolean
}) {
  const t = useT()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Шапка: о чём это. Без неё список сцен — просто список отрывков. */}
      <div style={{
        padding: '18px 20px', borderRadius: 18,
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.25 }}>
            {work.title}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-3)', marginTop: 3 }}>
            {work.origTitle !== work.title && <span>{work.origTitle} · </span>}
            {workLine(work)}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--color-text-2)', ...proseWrap }}>
          {bindShortWords(work.blurb)}
        </p>

        {/* Цитата — законна и для современных вещей, и часто она единственное,
            что мы вправе показать из самого произведения. */}
        {work.quote && (
          <blockquote style={{
            margin: 0, padding: '11px 14px', borderRadius: 12,
            borderLeft: `3px solid ${accent}`, background: soft,
            display: 'flex', gap: 9,
          }}>
            <Quote size={14} style={{ color: accent, flexShrink: 0, marginTop: 3 }} />
            <span>
              <span style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--color-text)', lineHeight: 1.55 }}>
                {work.quote.text}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 4 }}>
                {work.quote.attribution}
              </span>
            </span>
          </blockquote>
        )}

        {/* Предупреждение о самом тексте: дореформенная орфография, диалект,
            архаика. Показывается ДО чтения — после него оно бесполезно. */}
        {work.source?.caveat && (
          <div style={{
            display: 'flex', gap: 9, padding: '10px 13px', borderRadius: 12,
            background: 'var(--color-amber-soft)',
            border: '1px solid var(--color-amber-border)',
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--color-text-2)', ...proseWrap }}>
              {bindShortWords(work.source.caveat)}
            </span>
          </div>
        )}

        {/* Откуда текст. Для общественного достояния это обязательная строка:
            без переводчика и ссылки право на публикацию не проверить. */}
        {work.source && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.55 }}>
            {t('Источник')}: {work.source.corpus}
            {work.source.translator && <> · {t('перевод')}: {work.source.translator}
              {work.source.translatedIn ? `, ${work.source.translatedIn}` : ''}</>}
            {' '}
            <a href={work.source.url} target="_blank" rel="noreferrer"
              style={{ color: accent, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {t('оригинал')} <ExternalLink size={10} style={{ verticalAlign: -1 }} />
            </a>
          </div>
        )}

        {work.bucket === 'inspired' && (
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.55, ...proseWrap }}>
            {bindShortWords(t('Произведение современное, поэтому его текст мы не публикуем. Сцены ниже написаны нами: они дают тему, регистр и лексику книги, но это не текст автора.'))}
          </div>
        )}
      </div>

      {/* Сцены */}
      {scenes.length === 0 ? (
        <Empty text={t('Сцены для этого произведения ещё не написаны.')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scenes.map(s => {
            const hidden = hideSpoilers && s.spoiler > 1
            return (
              <SceneRow
                key={s.id}
                scene={s}
                passed={done(s.id)}
                hidden={hidden}
                accent={accent}
                soft={soft}
                onOpen={() => onOpenScene(s.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Строка сцены.
 *
 * Показывает «что вокруг» ДО открытия, а не внутри: именно по этому абзацу
 * решают, читать ли. Спрятанная спойлерная сцена остаётся в списке серой
 * заглушкой — иначе непонятно, почему между второй и четвёртой сценой дырка.
 */
function SceneRow({ scene, passed, hidden, accent, soft, onOpen }: {
  scene: Scene
  passed: boolean
  hidden: boolean
  accent: string
  soft: string
  onOpen: () => void
}) {
  const t = useT()

  if (hidden) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 16,
        border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
        fontSize: 13, color: 'var(--color-muted)',
      }}>
        <Lock size={14} style={{ flexShrink: 0 }} />
        {t('Сцена раскрывает сюжет. Выключи «Прятать спойлеры» в колонке слева, чтобы открыть её.')}
      </div>
    )
  }

  return (
    <button
      onClick={onOpen}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, width: '100%',
        padding: '15px 17px', borderRadius: 16, textAlign: 'left', cursor: 'pointer',
        fontFamily: 'inherit', background: 'var(--color-bg-2)',
        border: `1px solid ${passed ? 'var(--color-green-border)' : 'var(--color-border-soft)'}`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <TileChip tone="accent" accent={accent} soft={soft}>{scene.level}</TileChip>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          {scene.where} · {scene.minutes} {t('мин')} · {t(originLabel(scene))}
        </span>
        {passed && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--color-green-text)' }}>
            {t('пройдено')}
          </span>
        )}
      </span>

      <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
        {scene.title}
      </span>

      <span style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
        {bindShortWords(scene.setup)}
      </span>
    </button>
  )
}
