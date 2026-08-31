import { BookOpen, Tv, Clapperboard, Quote, ExternalLink, AlertTriangle, Lock, Check, Captions, Ear, Lightbulb, PlayCircle } from 'lucide-react'
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

/**
 * Уровень произведения — диапазон уровней его сцен: «A1 · A2» → «A1–A2».
 *
 * Уровня у произведения нет и быть не может (см. фильтр «Уровень» в строке), но
 * плашка на карточке отвечает не «какой это уровень», а «потяну ли я это» — и
 * без неё витрина сцен была единственной в тренажёре, где первая плашка не
 * уровень. Порядок — по таксономии языка, а не по алфавиту: «중급» и «고급»
 * алфавитом встают наоборот.
 */
export function workLevel(levels: string[], order: string[]): string | null {
  const uniq = [...new Set(levels)]
  if (uniq.length === 0) return null
  const rank = (v: string) => { const i = order.indexOf(v); return i < 0 ? order.length : i }
  const sorted = uniq.sort((a, b) => rank(a) - rank(b))
  const [lo, hi] = [sorted[0], sorted[sorted.length - 1]]
  if (lo === hi) return lo
  // «TOPIK 2급–TOPIK 3급» — плашка вдвое шире карточки. Общее у соседних
  // ступеней выносится за скобки: остаётся «TOPIK 2–3급». Для CEFR общего
  // ничего нет, и диапазон честно печатается целиком («A2–B1»).
  let head = 0
  while (head < lo.length && head < hi.length && lo[head] === hi[head]) head++
  let tail = 0
  while (
    tail < lo.length - head && tail < hi.length - head
    && lo[lo.length - 1 - tail] === hi[hi.length - 1 - tail]
  ) tail++
  const mid = (v: string) => v.slice(head, v.length - tail)
  return `${lo.slice(0, head)}${mid(lo)}–${mid(hi)}${lo.slice(lo.length - tail)}`
}

export function WorkGrid({ groups, scenesOf, done, accent, soft, onOpen, levelOrder = [] }: {
  /** Полки с произведениями — уже отфильтрованные и в нужном порядке. */
  groups: { title: string; hint: string; works: Work[] }[]
  scenesOf: (workId: string) => Scene[]
  done: (sceneId: string) => boolean
  accent: string
  soft: string
  onOpen: (workId: string) => void
  /** Порядок уровней языка — по нему складывается диапазон на плашке. */
  levelOrder?: string[]
}) {
  const t = useT()

  // Произведение без единой сцены — плитка в никуда: она честно пишет «0 сцен»,
  // но всё равно открывается, и за ней пустой экран. Так бывает у вещи, которая
  // заведена в реестре раньше, чем к ней написан текст (реестр имеет на это
  // право — он же и подписывает полку). Поэтому сторож стоит на витрине, а не в
  // данных: показываем только то, что можно открыть.
  //
  // НО СНАЧАЛА НАДО ОТЛИЧИТЬ «сцен нет» ОТ «сцены ещё едут». Тексты приезжают
  // отдельным чанком, и до его загрузки scenesOf пуст для ВСЕХ произведений —
  // отфильтровав по нему сразу, витрина на пол-секунды показала бы «Под
  // выбранные фильтры ничего не подошло» вместо своих тридцати карточек.
  // Признак загрузки — хоть одна сцена хоть у кого-нибудь.
  const loaded = groups.some(g => g.works.some(w => scenesOf(w.id).length > 0))
  const shown = loaded
    ? groups
        .map(g => ({ ...g, works: g.works.filter(w => scenesOf(w.id).length > 0) }))
        .filter(g => g.works.length > 0)
    : groups

  if (shown.length === 0) {
    return <Empty text={t('Под выбранные фильтры ничего не подошло. Сбрось один из них.')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {shown.map(g => (
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
              const lv = workLevel(scenes.map(x => x.level), levelOrder)
              return (
                <Tile key={w.id} accent={accent} onClick={() => onOpen(w.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    {/* Уровень первым и акцентом — ряд плашек один на весь
                        тренажёр: уровень, потом метки серым. */}
                    {lv && <TileChip tone="accent" accent={accent} soft={soft}>{lv}</TileChip>}
                    <TileChip tone="mute">
                      {/* inline-flex, а не значок с пробелом: в обычной строке
                          плашка ужималась по ширине и переносила подпись под
                          иконку, превращая её в двухэтажную. */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {w.medium === 'series' ? <Tv size={11} />
                          : w.medium === 'film' ? <Clapperboard size={11} />
                          : <BookOpen size={11} />}
                        {w.medium === 'series' ? t('сериал')
                          : w.medium === 'film' ? t('фильм')
                          : t('книга')}
                      </span>
                    </TileChip>
                    {/* Возраст показываем только там, где он что-то значит:
                        плашка «12+» на каждой карточке — визуальный шум. */}
                    {w.age !== '12+' && <TileChip tone="mute">{w.age}</TileChip>}
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

/**
 * Строка блока «в оригинале»: значок, подпись, текст.
 *
 * Подпись слева, а не в начале предложения: три строки читаются как таблица —
 * «субтитры / что трудно / как смотреть», — и по ним видно, чего не хватает,
 * не вчитываясь.
 */
function OriginalRow({ Icon, label, accent, children }: {
  Icon: typeof Captions
  label: string
  accent: string
  children: string
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <Icon size={13} style={{ color: accent, flexShrink: 0, marginTop: 3 }} />
      <span style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
        <b style={{ color: 'var(--color-text-3)', fontWeight: 700 }}>{t(label)}. </b>
        {bindShortWords(t(children))}
      </span>
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
        {/* Flex, а не строка текста: ссылка со значком — единый блок, иначе
            стрелка отрывается от слова и уезжает на следующую строку. */}
        {work.source && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 8px',
            fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.55,
          }}>
            <span>
              {t('Источник')}: {work.source.corpus}
              {work.source.translator && <> · {t('перевод')}: {work.source.translator}
                {work.source.translatedIn ? `, ${work.source.translatedIn}` : ''}</>}
            </span>
            <a
              href={work.source.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                color: accent, textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              {t('оригинал')} <ExternalLink size={10} />
            </a>
          </div>
        )}

        {/* СМОТРЕТЬ И ЧИТАТЬ ЦЕЛИКОМ.
            Стоит здесь, а не отдельной витриной «что посмотреть»: та показывала
            бы те же двадцать карточек во втором месте. Человек уже открыл
            страницу вещи — здесь и место ответу на единственный вопрос, ради
            которого он сюда шёл: потяну ли я это целиком. */}
        {work.inOriginal && (
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: soft, border: `1px solid ${accent}33`,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {work.medium === 'book'
                ? <BookOpen size={14} style={{ color: accent, flexShrink: 0 }} />
                : <PlayCircle size={14} style={{ color: accent, flexShrink: 0 }} />}
              <span style={{ fontSize: 13.5, fontWeight: 780, color: 'var(--color-text)' }}>
                {work.medium === 'book' ? t('Читать в оригинале') : t('Смотреть в оригинале')}
              </span>
              {/* Уровень — единственное, что человек ищет глазами, поэтому он
                  плашкой, а не строкой в тексте. */}
              <TileChip tone="accent" accent={accent} soft="var(--color-bg-2)">
                {t('с')} {work.inOriginal.from}
              </TileChip>
              {work.platform && <TileChip tone="mute">{work.platform}</TileChip>}
            </div>

            <OriginalRow Icon={Captions} label={work.medium === 'book' ? 'Где текст' : 'Субтитры'} accent={accent}>
              {work.inOriginal.subs}
            </OriginalRow>
            <OriginalRow Icon={Ear} label="Что трудно" accent={accent}>
              {work.inOriginal.hard}
            </OriginalRow>
            {work.inOriginal.how && (
              <OriginalRow Icon={Lightbulb} label={work.medium === 'book' ? 'Как читать' : 'Как смотреть'} accent={accent}>
                {work.inOriginal.how}
              </OriginalRow>
            )}
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
        {passed && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
            padding: '2px 8px 2px 6px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
            background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
          }}>
            <Check size={12} strokeWidth={3} />
            {t('пройдено')}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
          {scene.where} · {scene.minutes} {t('мин')} · {t(originLabel(scene))}
        </span>
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
