import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Volume2 } from 'lucide-react'
import { buildLexicon, wordReading, type Segment } from '../lib/lexicon'
import { transcribe } from '../lib/translit'
import type { WordGloss } from '../data/wordGloss'
import { useT } from '../lib/i18n'
import { bindShortWords, isDenseScript, langWrap, proseWrap } from '../lib/typography'
import { hasTiers, tierLabel, tierNote, wordTier } from '../data/coreWords'
import { speak, type SpeechHandle } from '../lib/speech'
import { addCards, deckOwner } from '../data/reviewDeck'

// Текст, в котором переводится каждое слово.
//
// ГЛАВНОЕ ПРАВИЛО: посмотреть слово, НЕ УХОДЯ ИЗ ТЕКСТА. Как только за переводом
// надо открыть словарь (или даже просто уехать глазами вниз к списку слов),
// нить предложения теряется, и чтение превращается в расшифровку. Поэтому
// перевод всплывает прямо над словом и закрывается по любому следующему
// действию.
//
// НАВЕДЕНИЕ И КЛИК — РАЗНЫЕ ЖЕСТЫ. На мыши подсказка появляется по наведению
// (быстрее и не требует решения «стоит ли кликать»), но гаснет, как только
// курсор ушёл. Клик её ПРИКАЛЫВАЕТ: можно увести курсор, нажать «озвучить»,
// прочитать пометку. На телефоне наведения нет вовсе, там работает только тап —
// и он сразу прикалывает.
//
// СЛОВА БЕЗ ПЕРЕВОДА тоже кликабельны. Молчащее слово выглядит как поломка
// («почему тут не работает?»), а услышать произношение полезно и без перевода.

const HOVER_DELAY = 90

/**
 * Плашка «ядро» / «полезное» под переводом.
 *
 * Отдельным компонентом, потому что это же нужно карточкам, разговорнику и
 * разбору гнёзд: вес слова — свойство слова, а не текста, в котором оно стоит.
 */
export function TierChip({ term, lang, accent, style }: {
  term: string
  lang: string
  accent: string
  style?: React.CSSProperties
}) {
  const t = useT()
  if (!hasTiers(lang)) return null
  const tier = wordTier(term, lang)
  if (tier === 3) return null
  const core = tier === 1
  return (
    <div
      title={t(tierNote(tier))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7,
        padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
        background: core ? `${accent}22` : 'var(--color-bg-3)',
        color: core ? accent : 'var(--color-muted)',
        ...style,
      }}
    >
      {t(tierLabel(tier))}
    </div>
  )
}

/** Ширина карточки перевода. Уже — начинает переносить корейские пометки. */
const POP_W = 264

// ── Транскрипция под словом: почему такие странные числа ─────────────────────
//
// Колонка «слово + чтение» шириной в более широкую из двух строк, а кириллица
// шире хангыля почти всегда: 내일까지 — 57.5px, «нэильккаджи» — 66.8px. Значит,
// колонка раздвигается, и в строке появляются рваные промежутки: где чтение
// короткое — слова стоят вплотную, где длинное — разъезжаются на полтора
// пробела. Читается это как ошибка вёрстки, а не как разметка.
//
// Лечим тремя числами разом, потому что поодиночке ни одно не работает:
//   RUBY_SIZE   — чтение мельче обычного (0.52em против 0.6em): кириллица почти
//                 влезает под своё слово;
//   RUBY_BLEED  — остаток чтение вывешивает за края колонки (отрицательные поля
//                 в его собственных em), то есть в межсловный пробел;
//   RUBY_GUTTER — пробел на этот вынос заранее расширен, и одинаково для всех
//                 слов. Ключевое здесь — «одинаково»: строка становится чуть
//                 воздушнее, но ровной, а глазу мешала именно рваность.
// С этими значениями разброс промежутков в корейском диалоге — 1.2px вместо 11,
// и соседние транскрипции не слипаются (минимум 3.9px между ними).
const RUBY_SIZE = '0.52em'
const RUBY_BLEED = '-0.5em'
const RUBY_GUTTER = '0.3em'

export default function GlossedText({ text, lang, extra = [], accent, highlight, ruby, spokenChar, subject, onPick, style }: {
  text: string
  /** Код языка: en, ko, ja, pt-BR — им же озвучиваем. */
  lang: string
  /** Глоссарий текста: его значения важнее словарных. */
  extra?: WordGloss[]
  accent: string
  /**
   * Транскрипция ПОД КАЖДЫМ СЛОВОМ — режим «партитуры» (см. ScoreReader).
   * Именно под своим словом, а не строкой под абзацем: строка транскрипции
   * отдельно от строки текста заставляет глаз каждый раз считать, какое слово
   * какому соответствует, и на третьем слове чтение разваливается.
   */
  ruby?: boolean
  /**
   * Позиция символа, до которого дочитал голос: слово, внутри которого он
   * стоит, подсвечивается (караоке). null — тишина.
   */
  spokenChar?: number | null
  /**
   * Слово, выбранное СНАРУЖИ — в словаре текста рядом с читалкой. Все его
   * вхождения заливаются, первое подкручивается в вид.
   *
   * Зачем: список слов сбоку сам по себе бесполезен — слово надо увидеть в
   * предложении, иначе непонятно, в какой форме и с чем оно стоит. Искать его
   * глазами по абзацу — ровно та работа, которую машина делает лучше.
   */
  highlight?: string | null
  /**
   * Предмет для кнопки «В словарь»: слово из текста уезжает карточкой в колоду
   * повторения (data/reviewDeck.ts). Без предмета кнопки нет — и это не
   * придирка: колода одна на человека, а экраны предметные, и карточка без
   * предмета не покажется НИГДЕ (dueCards фильтрует по нему).
   *
   * ЗАЧЕМ КНОПКА ЗДЕСЬ. Слово выписывают ровно в ту секунду, когда об него
   * споткнулись. Всё, что требует уйти со страницы — вкладка «Карточки»,
   * тетрадь, заметки, — на деле означает «не выпишу»; а «все слова текста
   * разом» берёт и те двадцать, которые ученик и так знает.
   */
  subject?: string
  /**
   * Слово, выбранное КЛИКОМ, — наружу. Читалка по нему подсвечивает пару этого
   * слова в строке перевода (см. lib/pairing.ts), и наоборот: выбранное в
   * переводе слово приезжает обратно через highlight.
   *
   * Наведение сюда не считается. Пара — ответ на вопрос «где это в переводе», а
   * не подсказка под курсором: мигать ею на каждом слове, мимо которого проехала
   * мышь, значит превратить строку перевода в рябь.
   */
  onPick?: (word: string | null) => void
  style?: React.CSSProperties
}) {
  const t = useT()
  const lex = useMemo(() => buildLexicon(lang, extra), [lang, extra])
  const segments = useMemo(() => lex.segment(text), [lex, text])

  // Начало каждого куска в строке. По нему караоке находит звучащее слово:
  // браузер сообщает позицию символа, а не номер слова.
  const offsets = useMemo(() => {
    let at = 0
    return segments.map(s => { const start = at; at += s.text.length; return start })
  }, [segments])

  // Разбивка под транскрипцию: КОЛОНКА — ЭТО СЛОВО ЦЕЛИКОМ, до пробела.
  //
  // Почему не по кускам словаря. Для хангыля и кандзи единица разбора — один
  // знак (в lib/lexicon.ts так и написано: откусывать больше нечего), поэтому
  // «죄송한데» разложено на четыре куска. Если писать чтение под каждым, вместо
  // «чвесонханде» получится «чве сон хан де» — четыре бессмысленных слога, да
  // ещё и раздвигающих слово вчетверо. Значит, чтение считаем по слову, а
  // кликабельными кусочками внутри него слово быть не перестаёт.
  //
  // Заодно это чинит знаки препинания: колонка шире своего слова (кириллица
  // длиннее хангыля), и отдельно стоящая точка отъезжала от него на эту
  // разницу — «될까요 ?».
  const rubyUnits = useMemo(() => {
    if (!ruby) return null
    type Item = { seg: number } | { text: string }
    type Unit = { kind: 'col'; items: Item[]; text: string } | { kind: 'space'; text: string }
    const out: Unit[] = []
    let col: { kind: 'col'; items: Item[]; text: string } | null = null
    const flush = () => { if (col) { out.push(col); col = null } }
    // В японском пробелов нет, и «колонка до пробела» склеивала ВСЮ реплику в
    // одну колонку с nowrap: строка переставала переноситься и уезжала поверх
    // соседней колонки перевода. Значит, границу колонки там задаёт не пробел.
    const dense = isDenseScript(lang)
    const add = (item: Item, text: string) => {
      if (!col) col = { kind: 'col', items: [], text: '' }
      col.items.push(item)
      col.text += text
    }
    // Где кончается колонка в плотном письме. Две приметы, обе про начало
    // СЛЕДУЮЩЕГО слова: словарное совпадение (границу нашёл словарь) и кандзи
    // после каны — знаменательное слово почти всегда начинается иероглифом, а
    // кана после него это окончание и частицы, они остаются при своём слове.
    // Плюс знак препинания: он замыкает колонку, но сам строку не начинает.
    const KANJI = /[\u4E00-\u9FFF\u3400-\u4DBF\u3005\u3006]/
    const KANA = /[\u3041-\u309F\u30A0-\u30FF]/
    const CLOSER = /[、。，．！？…」』）】〉]$/
    const breaks = (text: string, dict: boolean) => {
      if (!col) return false
      if (CLOSER.test(col.text)) return true
      return dict || (KANJI.test(text[0]) && KANA.test(col.text[col.text.length - 1]))
    }

    segments.forEach((seg, i) => {
      if (seg.word) {
        if (dense && breaks(seg.text, !!seg.gloss)) flush()
        add({ seg: i }, seg.text)
        return
      }
      // Пробелы рвут колонку, всё остальное липнет к соседнему слову.
      for (const chunk of seg.text.match(/\s+|\S+/g) ?? []) {
        if (/^\s/.test(chunk)) { flush(); out.push({ kind: 'space', text: chunk }) }
        else {
          if (dense && breaks(chunk, false)) flush()
          add({ text: chunk }, chunk)
        }
      }
    })
    flush()
    return out
  }, [segments, ruby, lang])

  // Последнее слово, начавшееся не позже озвученного символа. Именно последнее,
  // а не «в чей диапазон попали»: часть голосов отдаёт позицию пробела перед
  // словом или середину предыдущего, и поиск по диапазону в эти моменты гасил
  // бы подсветку совсем.
  const spokenIndex = useMemo(() => {
    if (spokenChar == null) return -1
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].word && offsets[i] <= spokenChar) return i
    }
    return -1
  }, [segments, offsets, spokenChar])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const timer = useRef<number | null>(null)
  // Слово, к которому привязана открытая карточка: по нему её переставляют,
  // когда размеры уже известны (см. эффект ниже).
  const activeEl = useRef<HTMLElement | null>(null)
  // active — что показываем, pinned — показываем ли после ухода курсора.
  const [active, setActive] = useState<{ i: number; seg: Segment } | null>(null)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; w: number; above: boolean } | null>(null)

  // Выбранное снаружи слово в виде, пригодном для сверки с кусками текста.
  //
  // Точного совпадения мало: словарь текста пишет инфинитив с частицей («to
  // forsake»), а в тексте стоит форма («forsaking»). Морфологии у нас нет и не
  // будет (см. lib/lexicon.ts), поэтому для латиницы сверяем ещё и по началу
  // слова: отсекаем «to» и конечное -e и требуем совпадения хотя бы пяти букв —
  // короткие слова так ловят чужое («on» внутри «only»), длинные почти нет.
  const hl = useMemo(() => {
    const term = highlight?.trim().toLowerCase() ?? ''
    if (!term) return null
    const bare = term.replace(/^to\s+/, '')
    const stem = /^[\p{L}'’-]+$/u.test(bare) && bare.length >= 5 ? bare.replace(/e$/, '') : ''
    return { term, bare, stem }
  }, [highlight])

  const isHit = (seg: Segment) => {
    if (!hl || !seg.word) return false
    const s = seg.text.trim().toLowerCase()
    if (s === hl.term || s === hl.bare) return true
    if (seg.gloss && seg.gloss.term.trim().toLowerCase() === hl.term) return true
    return !!hl.stem && s.startsWith(hl.stem)
  }

  // Первое вхождение — якорь прокрутки.
  const firstHit = useRef<HTMLElement | null>(null)
  const firstHitIndex = useMemo(
    () => (hl ? segments.findIndex(isHit) : -1),
    [hl, segments],
  )

  useEffect(() => {
    const el = firstHit.current
    if (!hl || !el) return
    const r = el.getBoundingClientRect()
    // Крутим, только если слово вне вида: дёргать страницу, когда искомое и так
    // на экране, — потеря места, а не помощь.
    if (r.top < 80 || r.bottom > window.innerHeight - 80) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [hl])

  // На тач-устройстве наведение эмулируется и «залипает» — там только тап.
  const canHover = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches,
    [],
  )

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Закрытие: клик мимо или Esc. Скролл карточку не закрывает — она едет за
  // словом (см. эффект пересчёта ниже).
  //
  // «Мимо» — это всё, кроме самой карточки и слова, которое её открыло: тыкать
  // повторно в то же слово, чтобы убрать подсказку, — лишний прицел, гасить
  // должно любое место страницы. Слово-хозяин исключено, иначе mousedown закрыл
  // бы карточку раньше, чем сработал его же click, и она бы тут же открылась
  // заново (переключение «клик по слову = закрыть» перестало бы работать).
  useEffect(() => {
    if (!active) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (popRef.current?.contains(target)) return
      if (activeEl.current?.contains(target)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  // Пересчёт после открытия. Первый замер делается в обработчике клика, и если
  // абзац в этот момент ещё не разложен по строкам (не догрузился шрифт для
  // корейского или японского), координаты получаются от промежуточной вёрстки —
  // карточка уезжает на сотни пикселей. Поэтому меряем ещё раз, когда размеры
  // уже настоящие, и при каждом изменении ширины.
  useEffect(() => {
    if (!active) return
    const again = () => { if (activeEl.current) place(activeEl.current) }
    const t1 = window.setTimeout(again, 0)
    const t2 = window.setTimeout(again, 160)
    window.addEventListener('resize', again)
    // Карточка стоит по координатам окна, поэтому за словом её надо вести
    // руками: на скролл — пересчёт, а не закрытие. Слушатель на фазе перехвата,
    // потому что крутится обычно не окно, а коробка внутри страницы (оборот
    // карточки, колонка урока), и её события до window не всплывают.
    window.addEventListener('scroll', again, true)
    const ro = new ResizeObserver(again)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', again)
      window.removeEventListener('scroll', again, true)
      ro.disconnect()
    }
  }, [active])

  // Выбор наружу — одним местом на все пути закрытия (клик мимо, Esc, уход
  // курсора, слово уехало под край): каждый из них меняет active, и эффект
  // ловит их все разом.
  useEffect(() => {
    onPick?.(active && pinned ? active.seg.text : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, pinned])

  function close() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    activeEl.current = null
    setActive(null)
    setPinned(false)
    setPos(null)
  }

  /** Координаты карточки в окне: она нарисована в портале, поверх страницы. */
  function place(el: HTMLElement) {
    const r = el.getBoundingClientRect()
    // Слово уехало под край своей коробки — карточке не над чем стоять.
    if (!inSight(el, r)) { close(); return }
    // Над словом, если под ним меньше 190px до низа окна.
    const above = window.innerHeight - r.bottom < 190
    const width = Math.min(POP_W, window.innerWidth - 16)
    // Карточка стоит ПО ЦЕНТРУ слова, а упирается в края ЭКРАНА, а не колонки
    // текста. Ограничение по колонке выглядело сдвигом: у слова в начале строки
    // карточку прижимало к левому краю абзаца, хотя рядом было пусто.
    const centre = r.left + r.width / 2
    const x = Math.max(8, Math.min(centre - width / 2, window.innerWidth - width - 8))
    setPos({ x, y: above ? r.top : r.bottom, w: width, above })
  }

  function open(i: number, seg: Segment, el: HTMLElement, pin: boolean) {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    activeEl.current = el
    setActive({ i, seg })
    setPinned(pin)
    place(el)
  }

  // Речь этого текста глохнет вместе с ним: без этого слово продолжало
  // звучать уже на следующем экране. Гасим по ручке, а не глобально: на экране
  // таких текстов несколько, и уход одного не должен затыкать соседа.
  const voiceRef = useRef<SpeechHandle | null>(null)
  useEffect(() => () => voiceRef.current?.stop(), [])

  // Чуть медленнее обычного: слово в подсказке слушают, чтобы расслышать
  // состав, а не чтобы понять фразу.
  function say(word: string) {
    voiceRef.current = speak(word, { lang, rate: 0.85 })
  }

  // ── Слово в колоду ──────────────────────────────────────────────────────────
  //
  // Состояние по лицу карточки, а не по номеру куска: одно и то же слово стоит
  // в тексте несколько раз, и «уже добавлено» должно быть видно у каждого
  // вхождения. Живёт до ухода с экрана — постоянное «что уже в колоде» знает
  // сама колода, а спрашивать её на каждое наведение курсора значило бы слать
  // запрос на каждое слово текста.
  const [saved, setSaved] = useState<Record<string, 'saving' | 'added' | 'known' | 'fail'>>({})

  /**
   * Лицо и оборот будущей карточки. null — карточки не выйдет.
   *
   * Без перевода карточка нерешаема (её оборот пуст), поэтому у слов, которых
   * нет в словаре, кнопки не будет: обещать «добавлю» и положить пустую
   * карточку хуже, чем промолчать.
   *
   * Лицо — СЛОВАРНАЯ форма (covers → cover): карточка со словоформой учит
   * форму, а не слово. Оборот — перевод и, если есть, чтение: ровно то же, что
   * кладут в колоду слова урока (см. lib/reviewCapture.ts).
   */
  function cardOf(seg: Segment): { prompt: string; answer: string } | null {
    const g = seg.gloss
    if (!g?.ru) return null
    const prompt = (g.base ?? g.term ?? seg.text).trim()
    if (!prompt) return null
    const reading = g.reading || transcribe(prompt, lang) || ''
    return { prompt, answer: reading ? `${g.ru} — ${reading}` : g.ru }
  }

  async function collect(seg: Segment) {
    const card = cardOf(seg)
    if (!card || !subject) return
    const k = card.prompt.toLowerCase()
    if (saved[k] === 'saving' || saved[k] === 'added' || saved[k] === 'known') return
    setSaved(s => ({ ...s, [k]: 'saving' }))
    try {
      const n = await addCards(deckOwner(), [{
        subject, source: 'manual', prompt: card.prompt, answer: card.answer,
      }])
      // Ноль добавленных — слово уже лежит в колоде. Это не ошибка, и сказать
      // об этом честнее, чем нарисовать галочку «добавил».
      setSaved(s => ({ ...s, [k]: n > 0 ? 'added' : 'known' }))
    } catch (e) {
      console.error('GlossedText collect:', e)
      setSaved(s => ({ ...s, [k]: 'fail' }))
    }
  }

  /** Слово: кликабельный кусок текста со всеми его состояниями. */
  function chipFor(seg: Segment, i: number) {
    const on = active?.i === i
    const hit = isHit(seg)
    const said = i === spokenIndex
    return (
          <span
            key={i}
            role="button"
            tabIndex={-1}
            ref={i === firstHitIndex ? (el => { firstHit.current = el }) : undefined}
            onClick={e => {
              if (on && pinned) close()
              else open(i, seg, e.currentTarget, true)
            }}
            onMouseEnter={e => {
              if (!canHover || pinned) return
              const el = e.currentTarget
              if (timer.current) clearTimeout(timer.current)
              timer.current = window.setTimeout(() => open(i, seg, el, false), HOVER_DELAY)
            }}
            onMouseLeave={() => {
              if (!canHover || pinned) return
              if (timer.current) { clearTimeout(timer.current); timer.current = null }
              setActive(a => (a?.i === i ? null : a))
            }}
            style={{
              cursor: 'pointer',
              borderRadius: 4,
              // Воздух по бокам заливки: вплотную к буквам она читается как
              // тесная коробка. Отрицательный отступ той же величины держит
              // текст на месте — иначе строка дёргалась бы на каждой подсветке.
              paddingLeft: 3, paddingRight: 3, marginLeft: -3, marginRight: -3,
              // Слово, разорванное переносом, тоже держит скругление и отступ.
              WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone',
              // Известное слово помечено пунктиром — видно, что в тексте есть
              // опора. Сплошная подсветка на каждом слове превратила бы абзац в
              // рябь, поэтому фон только у активного и у выбранного в словаре.
              //
              // Выбранное снаружи слово держится ярче наведения: наведение —
              // мимолётное состояние под курсором, а тут ученик специально
              // спросил «где оно в тексте», и ответ должен быть виден с одного
              // взгляда, в том числе когда таких вхождений несколько.
              borderBottom: hit
                ? `1px solid ${accent}`
                : seg.gloss ? `1px dotted ${accent}80` : '1px dotted transparent',
              // Звучащее слово держится ярче наведения и слабее выбранного в
              // словаре: караоке идёт само по себе и не должно спорить с тем,
              // что ученик спросил руками.
              background: hit ? `${accent}3d` : said ? `${accent}33` : on ? `${accent}22` : 'transparent',
              boxShadow: hit || said || on
                ? `0 0 0 2px ${hit ? `${accent}3d` : said ? `${accent}33` : `${accent}22`}`
                : 'none',
              transition: 'background 140ms ease',
            }}
          >
            {seg.text}
          </span>
    )
  }

  // Что показывает кнопка «В словарь» для открытого слова.
  const activeCard = active ? cardOf(active.seg) : null
  const savedState = activeCard ? saved[activeCard.prompt.toLowerCase()] : undefined
  const inDeck = savedState === 'added' || savedState === 'known'
  const collectLabel = savedState === 'saving' ? t('Добавляю…')
    : savedState === 'added' ? t('В словаре')
    : savedState === 'known' ? t('Уже в словаре')
    : savedState === 'fail' ? t('Не вышло — ещё раз')
    : t('В словарь')

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative', whiteSpace: 'pre-wrap', ...langWrap(lang),
        // Расширенный пробел — плата за вынос транскрипции (см. RUBY_GUTTER).
        ...(rubyUnits ? { wordSpacing: RUBY_GUTTER } : null),
        ...style,
      }}
    >
      {rubyUnits
        // Слово и его чтение — одна колонка: перенос строки уносит их вместе, и
        // транскрипция не может оторваться от своего слова.
        ? rubyUnits.map((u, k) => u.kind === 'space'
          ? <span key={k}>{u.text}</span>
          : (
            <span key={k} style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
              // Внутри колонки пробел обычный: расширен только межсловный.
              verticalAlign: 'top', wordSpacing: 'normal',
            }}>
              <span style={{ whiteSpace: 'nowrap' }}>
                {u.items.map((it, j) => ('seg' in it
                  ? chipFor(segments[it.seg], it.seg)
                  : <span key={`p${j}`}>{it.text}</span>))}
              </span>
              <span style={{
                fontSize: RUBY_SIZE, lineHeight: 1.4, color: 'var(--color-text-3)',
                whiteSpace: 'nowrap', letterSpacing: 0.1,
                // Чтение шире слова вывешивается в пробел, а не раздвигает
                // колонку: ширину строки задаёт текст, а не его разметка.
                marginInline: RUBY_BLEED,
              }}>
                {wordReading(u.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''), lang)}
              </span>
            </span>
          ))
        : segments.map((seg, i) => (seg.word ? chipFor(seg, i) : <span key={i}>{seg.text}</span>))}

      {active && pos && createPortal(
        <div
          ref={popRef}
          style={{
            // 4000 — этаж выпадающих списков, вынесенных в портал: выше модалок
            // (2000–3000), потому что текст со словами бывает и внутри них.
            position: 'fixed', left: pos.x, top: pos.y, width: pos.w, zIndex: 4000,
            transform: pos.above ? 'translateY(-100%) translateY(-8px)' : 'translateY(8px)',
            // Тот же радиус, что у карточек текста и вопросов: подсказка —
            // такой же блок интерфейса, а не всплывашка из другой системы.
            padding: '11px 13px 10px', borderRadius: 18,
            // Матовое стекло, как у остальных всплывающих слоёв: сквозь него
            // видно, над каким местом текста карточка стоит, но читаемость
            // держит размытие, а не глухая заливка.
            background: 'rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: 'var(--shadow-lg)', whiteSpace: 'normal',
            pointerEvents: pinned ? 'auto' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
                {active.seg.text}
              </div>
              {/* Как это звучит. Написанное в словаре чтение важнее
                  посчитанного: там оно выверено человеком. */}
              {(active.seg.gloss?.reading || transcribe(active.seg.text, lang)) && (
                <div style={{ fontSize: 12.5, color: accent, marginTop: 2, opacity: 0.9 }}>
                  {active.seg.gloss?.reading || transcribe(active.seg.text, lang)}
                </div>
              )}
            </div>
            <button
              onClick={() => say(active.seg.text)}
              title={t('Произнести')}
              aria-label={t('Произнести')}
              style={{
                width: 28, height: 28, flexShrink: 0, borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                background: `${accent}22`, color: accent, pointerEvents: 'auto',
              }}
            >
              <Volume2 size={14} />
            </button>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-2)', marginTop: 6, ...proseWrap }}>
            {active.seg.gloss
              ? bindShortWords(active.seg.gloss.ru)
              : <span style={{ color: 'var(--color-text-3)' }}>{bindShortWords(t('Этого слова нет в словаре — но послушать можно.'))}</span>}
          </div>
          {/* Вес слова: стоит ли учить его сейчас. Показывается только у ядра и
              полезного — плашка «редкое» на каждом втором слове превратила бы
              подсказку в шум, а молчание здесь читается правильно (см.
              data/coreWords.ts). */}
          <TierChip term={active.seg.text} lang={lang} accent={accent} />
          {active.seg.gloss?.note && (
            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text-3)', marginTop: 5, ...proseWrap }}>
              {bindShortWords(active.seg.gloss.note)}
            </div>
          )}
          {/* Слово в колоду повторения — из той же карточки, где его прочитали.
              Кнопка последней строкой: сперва ответ на вопрос «что это значит»,
              и только потом решение «беру себе». */}
          {subject && activeCard && (
            <button
              onClick={() => collect(active.seg)}
              disabled={savedState === 'saving' || inDeck}
              title={inDeck ? undefined : `${t('Лицом карточки станет')} «${activeCard.prompt}»`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                width: '100%', marginTop: 9, padding: '7px 10px', borderRadius: 12,
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                cursor: savedState === 'saving' || inDeck ? 'default' : 'pointer',
                border: `1px solid ${inDeck ? 'var(--color-border-soft)' : `${accent}66`}`,
                background: 'transparent',
                color: inDeck ? 'var(--color-muted)' : accent,
                // Карточка не ловит курсор, пока её не прикололи кликом (иначе
                // она перехватывала бы наведение на текст под собой), поэтому
                // кнопки внутри включают приём событий сами — как «произнести».
                pointerEvents: 'auto',
              }}
            >
              {inDeck ? <Check size={13} /> : <Plus size={13} />}
              {collectLabel}
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

/**
 * Видно ли слово: не ушло ли оно под край окна или прокручиваемой коробки.
 *
 * Нужно потому, что карточка нарисована в body по координатам окна и никакой
 * overflow её больше не режет — а значит, и не прячет, когда само слово уже
 * уехало из вида. Подсказка, висящая над чужим местом, читается как поломка,
 * поэтому границы предков проверяем сами.
 */
function inSight(el: HTMLElement, r: DOMRect) {
  let left = 0, top = 0, right = window.innerWidth, bottom = window.innerHeight
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p)
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
    const pr = p.getBoundingClientRect()
    left = Math.max(left, pr.left)
    top = Math.max(top, pr.top)
    right = Math.min(right, pr.right)
    bottom = Math.min(bottom, pr.bottom)
  }
  // Хватает половины строки: слово, наполовину заехавшее под край, ещё читается
  // как то самое, по которому нажали.
  return r.right > left && r.left < right
    && r.bottom - r.height / 2 > top && r.top + r.height / 2 < bottom
}
