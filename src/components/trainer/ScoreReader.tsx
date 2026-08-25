import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Play, Pause, Square, Languages, Type, Volume2, PanelRight, PanelBottom,
  Rows3, GalleryVerticalEnd, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react'
import GlossedText from '../GlossedText'
import MobileSheet from '../MobileSheet'
import VoicePicker from './VoicePicker'
import PlayerPill, { CueList } from './PlayerPill'
import { tactile } from '../../lib/feedback'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { buildLexicon, wordReading } from '../../lib/lexicon'
import { transcribe } from '../../lib/translit'
import { pairTranslation } from '../../lib/pairing'
import { speak, speechLines, type SpeechHandle } from '../../lib/speech'
import { useIsDesktop } from '../../lib/useIsDesktop'
import { TRAINER_STICK_FALLBACK, useTrainerPlayerSlot } from './TrainerShell'
import type { Gloss } from '../../data/readingLibrary'

// ─────────────────────────────────────────────────────────────────────────────
// Партитура текста — второй режим читалки рядом с обычной прозой.
//
// ЗАЧЕМ. В прозе текст лежит одним абзацем: перевод спрятан до конца проверки,
// транскрипции нет вовсе, а звук идёт отдельной кнопкой в рейле и с текстом
// никак не связан. Для языка с чужой письменностью этого мало — ученику нужны
// три вещи ОДНОВРЕМЕННО: как написано, как звучит, что значит. Здесь они стоят
// тремя синхронными дорожками, как строчки в нотной партитуре.
//
// ТРИ ПРАВИЛА, ИЗ КОТОРЫХ СОБРАН ЭКРАН
//
// 1. ТРАНСКРИПЦИЯ — ПОД СВОИМ СЛОВОМ, а не строкой под абзацем (это делает
//    GlossedText в режиме ruby). Отдельная строка транскрипции заставляет глаз
//    считать, какое слово какому соответствует, и на третьем слове чтение
//    разваливается.
//
// 2. ПЕРЕВОД — ПО СТРОКЕ И ПО АБЗАЦУ, НЕ ПО СЛОВУ. Пословный перевод корейского
//    или японского нечитаем из-за порядка слов; читаемая единица — реплика.
//    Поэтому перевод встаёт напротив своей строки — колонкой справа или прямо
//    под ней: сторону выбирает ученик тумблером наверху (колонка держит взгляд
//    на одной высоте, но сужает оригинал вдвое — на длинных строках это мешает).
//
// 3. ЗВУК ВЕДЁТ ГЛАЗ. Голос подсвечивает слово, до которого дочитал. Событие
//    boundary есть не у всех голосов, поэтому подсветка двухуровневая: строка
//    подсвечивается всегда (по onLine), слово — где браузер это умеет.
//
// 4. СЛОВО И ЕГО ПАРА ГОРЯТ ВМЕСТЕ. Перевод стоит строкой, но вопрос у ученика
//    пословный: «отзывать» из карточки надо ещё найти в русской строке, а
//    непонятное место перевода — сопоставить с английским словом. Поэтому клик
//    по слову — с ЛЮБОЙ стороны — зажигает и слово, и его пару напротив; пары
//    сводит lib/pairing.ts по огрублённой основе. Правило 2 это не отменяет:
//    перевод по-прежнему читается строкой, пара — ответ на заданный вопрос, а
//    не пословная разметка, которой бы строка запестрела.
//
// ЕДИНИЦА ЭКРАНА — РЕПЛИКА, А НЕ АБЗАЦ. Строки берём тем же speechLines(), что
// и озвучка: только так номер звучащей реплики совпадает со строкой на экране.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Кусок озвучки. line === null — кусок не звучит (ремарка без букв).
 *
 * Кусков в строке бывает несколько: длинный абзац озвучка режет по предложениям
 * и по пробелам (см. speechLines). На экране такой разрыв — не перенос строки, а
 * просто следующий кусок в той же строке: абзац, разорванный посреди
 * предложения, читается как ошибка вёрстки.
 */
interface Chunk { text: string; line: number | null }

/** Строка исходного текста — единица показа. */
interface Row { chunks: Chunk[] }

/** Блок «оригинал ↔ перевод»: одна строка диалога или целый абзац прозы. */
interface Unit { rows: Row[]; ru?: string }

/**
 * Выбранная пара: слово оригинала (в нижнем регистре) и фрагмент, в котором его
 * выбрали. Фрагмент нужен, чтобы пара горела только в своей строке: одно и то же
 * слово стоит в тексте пять раз, и подсветка всех пяти строк разом на вопрос
 * «где это здесь» не отвечает.
 *
 * from — с какой стороны выбрали. Нужен ровно для одного: снятие выбора
 * («ткнули мимо») приходит асинхронно из GlossedText, и без этого поля клик по
 * слову перевода гасил сам себя — карточка оригинала закрывалась ПОСЛЕ него и
 * стирала только что сделанный выбор.
 */
interface Pick { unit: number; term: string; from: 'orig' | 'ru' }

/**
 * Разложить текст и перевод на пары. Перевод сверяется по абзацам, а внутри
 * абзаца — по строкам: в диалоге это даёт реплику напротив реплики, в прозе —
 * абзац напротив абзаца.
 *
 * Если абзацы не сошлись (перевод писали свободнее оригинала), пар не строим
 * вовсе: перевод не своей строки хуже, чем перевод общим текстом под партитурой.
 */
function build(body: string, translation?: string): { units: Unit[]; loose?: string } {
  const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const ruBlocks = (translation ?? '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const aligned = ruBlocks.length > 0 && ruBlocks.length === blocks.length

  let line = 0
  const units: Unit[] = []

  for (let bi = 0; bi < blocks.length; bi++) {
    const lines = blocks[bi].split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const rows: Row[] = lines.map(l => {
      const chunks = speechLines(l)
      return { chunks: chunks.length ? chunks.map(text => ({ text, line: line++ })) : [{ text: l, line: null }] }
    })

    const ru = aligned ? ruBlocks[bi] : undefined
    const ruLines = ru ? ru.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []

    if (ru && ruLines.length > 1 && ruLines.length === lines.length) {
      lines.forEach((_, i) => units.push({ rows: [rows[i]], ru: ruLines[i] }))
    } else {
      units.push({ rows, ru })
    }
  }

  return { units, loose: translation && !aligned ? translation : undefined }
}

/** Есть ли для этого языка что писать под словами. */
export function hasReadings(body: string, lang: string, glossary: Gloss[] = []): boolean {
  return !!transcribe(body, lang) || glossary.some(g => !!wordReading(g.term, lang))
}

/**
 * Где останавливается прилипшая шапка плеера.
 *
 * Под прилипшей строкой управления скелета (trainer/TrainerShell.tsx): её
 * высоту скелет меряет и отдаёт переменной CSS, потому что она разная у режимов
 * и переносится на второй ряд на узком экране. Числом здесь стояло бы
 * «наехать на кнопки» при первом же переносе строки.
 * Скелета может и не быть (читалку зовут не только из тренажёра) — тогда
 * работает запасное значение: те же 8 px, что у рейла, плюс safe-area под
 * чёлку в standalone на телефоне.
 */
const STICK_TOP = TRAINER_STICK_FALLBACK

/**
 * Высота всякого управляющего элемента читалки: пилюль «Перевод» и
 * «Транскрипция», жёлобов «Потоком / По строке» и стороны перевода, кнопки
 * темпа и «Показать перевод».
 * Одно число, а не подобранные на глаз паддинги: у пилюли и жёлоба разный
 * состав (рамка против подложки с ползунком), и при одинаковых паддингах они
 * вставали в строку на разной высоте — строка управления выглядела рваной.
 */
const CTL_H = 30
/** Высота сегмента внутри рейки: 3 + 26 + 3 = CTL_H, вровень с кнопкой темпа. */
const SEG_H = CTL_H - 6

export default function ScoreReader({ body, translation, lang, glossary, accent, soft, highlight, subject, title }: {
  body: string
  translation?: string
  lang: string
  glossary: Gloss[]
  accent: string
  soft: string
  /** Слово, выбранное в словаре текста слева, — подсвечивается и здесь. */
  highlight?: string | null
  /** Предмет колоды: с ним у слова в подсказке появляется кнопка «В словарь». */
  subject?: string
  /** Название текста — подпись распрямившегося плеера и шапка его шторки. */
  title?: string
}) {
  const t = useT()
  const isDesktop = useIsDesktop()
  // Телефон — не «узкий десктоп»: там у плеера своё место (внизу, в ряду дока)
  // и свой состав кнопок, см. ниже.
  const narrow = !isDesktop

  const { units, loose } = useMemo(() => build(body, translation), [body, translation])
  // Реплики теми же кусками, какими их читает озвучка: по ним считается
  // прогресс, и с них же речь продолжается после паузы.
  const allLines = useMemo(() => speechLines(body), [body])
  const total = allLines.length
  const readings = useMemo(() => hasReadings(body, lang, glossary), [body, lang, glossary])

  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(false)
  // Перевод выключен по умолчанию — это и есть учебная нагрузка: сперва
  // пытаешься понять сам, и только потом сверяешься.
  const [showRu, setShowRu] = useState(false)
  const [showTr, setShowTr] = useState(true)
  // Где стоит перевод. Справа — по умолчанию: реплика и её перевод на одной
  // высоте, глаз ходит поперёк, а не вниз. Но колонка вдвое сужает оригинал, и
  // на длинных строках это хуже, чем перевод сразу под строкой, — поэтому
  // выбор оставлен ученику, а не зашит в ширину экрана.
  const [ruSide, setRuSide] = useState<'right' | 'bottom'>('right')
  // Строка за строкой: на экране один фрагмент, дальше — свайпом или кнопкой.
  // null — обычный поток. Держим индексом, а не флагом: выйдя из режима и
  // вернувшись, ученик оказывается там же, где остановился.
  const [step, setStep] = useState<number | null>(null)
  // Перевод текущего шага, раскрытый вручную. Сбрасывается на каждом переходе:
  // в этом режиме попытка понять самому — часть работы, и открытый перевод
  // следующего фрагмента отнимал бы её молча.
  const [peek, setPeek] = useState(false)
  // Выбранная пара «слово ↔ его место в переводе».
  const [pick, setPick] = useState<Pick | null>(null)
  // Другой текст — выбор ни к чему не относится: читалка при переходе не
  // размонтируется, и пара осталась бы висеть от прошлой сцены.
  useEffect(() => { setPick(null) }, [body])
  // Что звучит: номер реплики и позиция символа внутри неё.
  const [line, setLine] = useState<number | null>(null)
  const [char, setChar] = useState<number | null>(null)
  // Та же строка в ref: onEnd живёт в замыкании своего рендера и через
  // состояние увидел бы не ту реплику, на которой речь оборвали.
  const lineRef = useRef<number | null>(null)
  function markLine(v: number | null) { lineRef.current = v; setLine(v) }

  /**
   * Реплика, с которой продолжим, — метка паузы.
   *
   * ЗАЧЕМ. Кнопка работала как «стоп»: остановил, чтобы выписать слово, — и
   * текст начинался с начала. Переслушивать пять реплик ради шестой никто не
   * станет, поэтому оборванную речь помним и продолжаем с той же строки.
   *
   * Метку ставит ЛЮБОЙ обрыв, а не только нажатие паузы: клик по слову и по
   * соседней реплике тоже глушат общий проход — и тоже не должны стоить месту
   * в тексте. Дочитанный до конца текст метку снимает: продолжать нечего.
   */
  const [paused, setPaused] = useState<number | null>(null)

  // Реплика, которую слушают отдельно (номер её первого куска). Отдельная от
  // playing: строку слушают ПОВЕРХ чтения всего текста — клик по реплике
  // перебивает общий проход, и шапка должна вернуться в «играть».
  //
  // Дублируется в ref, и обработчик читает именно ref: два клика подряд успевают
  // прийти в один рендер, и обработчик со старым значением из замыкания принимал
  // второй клик по звучащей строке за первый — вместо остановки строка
  // начиналась заново.
  const [solo, setSoloState] = useState<number | null>(null)
  const soloRef = useRef<number | null>(null)
  function setSolo(v: number | null) { soloRef.current = v; setSoloState(v) }

  const voice = useRef<SpeechHandle | null>(null)
  useEffect(() => () => voice.current?.stop(), [])

  // Новый текст в той же читалке (при переходе к следующему она не
  // размонтируется): метка паузы от прошлого текста указывала бы на реплику,
  // которой здесь уже нет.
  useEffect(() => {
    voice.current?.stop()
    setPlaying(false)
    setSolo(null)
    setPaused(null)
    lineRef.current = null
    setLine(null)
    setChar(null)
  }, [body])

  /**
   * Шапка прилипла к верху экрана — значит текст под ней уже уехал.
   *
   * Считаем сравнением двух прямоугольников, а не IntersectionObserver с
   * rootMargin: смещение sticky в кабинете отсчитывается от содержимого панели
   * прокрутки (у неё 100 px верхнего отступа под плавающую шапку), и число в
   * rootMargin пришлось бы держать синхронно с чужой геометрией. Отъехала
   * шапка от верха карточки — прилипла, и никакой арифметики.
   */
  const cardRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = useState(false)
  const stuckRef = useRef(false)
  useEffect(() => {
    const on = () => {
      const card = cardRef.current
      const bar = barRef.current
      if (!card || !bar) return
      // 1 px разницы даёт рамка карточки, поэтому порог, а не строгий ноль.
      const next = bar.getBoundingClientRect().top - card.getBoundingClientRect().top > 2
      if (next !== stuckRef.current) { stuckRef.current = next; setStuck(next) }
    }
    on()
    // capture: страница кабинета листается во ВНУТРЕННЕЙ панели (.dashboard-main),
    // и её scroll до window не всплывает.
    window.addEventListener('scroll', on, true)
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on, true)
      window.removeEventListener('resize', on)
    }
  }, [])

  /**
   * Прочитать одну реплику.
   *
   * ЗАЧЕМ ОТДЕЛЬНАЯ КНОПКА У СТРОКИ. Слушать текст целиком имеет смысл один
   * раз; дальше спотыкаешься на одной строке и хочешь её переслушать — а
   * приходилось запускать всё сначала и ждать. Повторный клик по той же строке
   * останавливает: это и есть «переслушал, хватит».
   */
  function playRow(row: Row) {
    playChunks(row.chunks)
  }

  /** То же самое для целого фрагмента — им пользуется режим «строка за строкой». */
  function playUnit(u: Unit) {
    playChunks(u.rows.flatMap(r => r.chunks))
  }

  function playChunks(all: Chunk[]) {
    const chunks = all.filter(c => c.line !== null)
    if (!chunks.length) return
    const key = chunks[0].line
    if (soloRef.current === key) { voice.current?.stop(); return }
    // Гасим предыдущую речь ДО того, как выставить свои флаги: speak() внутри
    // сам зовёт onEnd прошлой речи, и делает это синхронно — тот сбрасывал бы
    // только что поставленный solo (см. play).
    voice.current?.stop()
    setSolo(key)
    setChar(null)
    voice.current = speak(chunks.map(c => c.text).join('\n'), {
      lang,
      rate: slow ? 0.8 : 1,
      gap: 240,
      // Внутри реплики номера кусков свои (0, 1, 2…), а подсветка живёт в
      // сквозных номерах текста — переводим одно в другое.
      onLine: i => { markLine(chunks[i]?.line ?? null); setChar(null) },
      onWord: (i, c) => { markLine(chunks[i]?.line ?? null); setChar(c) },
      // Метку паузы отдельная реплика не трогает: её слушают, не бросая общего
      // чтения, и вернуться оно должно туда же, где его перебили.
      onEnd: () => { setSolo(null); markLine(null); setChar(null) },
    })
  }

  /** Читать текст с реплики `from` (по умолчанию с начала). */
  function play(rate: number, from = 0) {
    // Сначала стоп, потом флаги. speak() отменяет предыдущую речь и синхронно
    // зовёт её onEnd — а тот снимает playing и ставит метку паузы. Если ставить
    // флаги до speak(), оба вызова попадают в один рендер и побеждает
    // последний: смена темпа на ходу возвращала кнопку в «играть», хотя голос
    // продолжал читать, а продолжение с паузы тут же вернуло бы метку.
    voice.current?.stop()
    const start = from > 0 && from < allLines.length ? from : 0
    setPlaying(true)
    setPaused(null)
    setSolo(null)
    // Подсветка встаёт на первую реплику сразу, не дожидаясь голоса: между
    // нажатием и первым словом синтезатор берёт до секунды, и текст, на эту
    // секунду потерявший метку, читался бы как сброс на начало.
    markLine(start)
    setChar(null)
    voice.current = speak(allLines.slice(start).join('\n'), {
      lang,
      rate,
      // Пауза между репликами: диалог без неё звучит сплошняком, и глаз не
      // успевает перейти на следующую строку.
      gap: 240,
      // Номера реплик внутри запуска свои (0, 1, 2…), а подсветка живёт в
      // сквозных номерах текста — переводим одно в другое.
      onLine: i => { markLine(start + i); setChar(null) },
      onWord: (i, c) => { markLine(start + i); setChar(c) },
      onEnd: done => {
        setPlaying(false)
        setChar(null)
        // Дочитали — метка не нужна; оборвали — помним, где стояли.
        if (done) { setPaused(null); markLine(null) }
        else setPaused(lineRef.current)
      },
    })
  }

  function toggle() {
    // Пауза, а не стоп: метку ставит onEnd, следующее нажатие продолжает с неё.
    if (playing) voice.current?.stop()
    else play(slow ? 0.8 : 1, paused ?? 0)
  }

  /** Смена темпа на ходу перезапускает чтение: менять его молча — обман.
   *  Перезапуск — с текущей реплики: темп меняют, чтобы переслушать это место,
   *  а не чтобы вернуться к началу текста. */
  function setRate(next: boolean) {
    setSlow(next)
    if (playing) play(next ? 0.8 : 1, lineRef.current ?? 0)
  }

  // Колонка справа возможна не всегда: на телефоне её некуда поставить, а
  // перевод, не разложившийся по строкам (loose), стоять напротив нечему.
  const canSide = isDesktop && units.some(u => u.ru)
  const stepping = step !== null
  // Индекс подрезаем на каждом рендере: читалка не размонтируется при переходе
  // к следующему тексту, и шаг 8 в тексте из трёх фрагментов иначе уронил бы
  // экран на units[8].
  const at = stepping ? Math.min(step, units.length - 1) : 0
  const twoCol = canSide && showRu && ruSide === 'right' && !stepping
  // Что подсвечено: звучащая реплика, а в тишине — та, на которой поставили
  // паузу. Иначе после паузы место в тексте приходится искать глазами заново.
  const mark = line ?? paused

  // ЗВУК ВЕДЁТ ГЛАЗ И ПО ПЕРЕВОДУ. Голос подсвечивает слово в оригинале, но
  // ученик читает справа: без ответной подсветки он либо теряет строку
  // перевода, либо перестаёт слушать. Поэтому звучащее слово переводится в тот
  // же ключ пары, которым связаны стороны (lib/pairing.ts), и загорается
  // напротив — той же логикой, что и клик по слову, только без клика.
  const lex = useMemo(() => buildLexicon(lang, glossary), [lang, glossary])
  const spoken = useMemo(() => {
    // Без позиции символа (тишина, пауза, голос без события boundary) слова
    // нет: подсветилось бы первое слово строки и висело бы там молча.
    if (mark === null || char === null) return null
    const text = allLines[mark]
    if (!text) return null
    // Слова с переводом в словаре — только у них есть пара напротив. Берём
    // последнее, начавшееся не позже озвученного символа: часть голосов отдаёт
    // позицию пробела перед словом (та же оговорка, что в GlossedText).
    let off = 0
    let best: string | null = null
    for (const seg of lex.segment(text)) {
      if (seg.gloss && off <= char) best = seg.text.trim().toLowerCase()
      off += seg.text.length
    }
    return best
  }, [lex, allLines, mark, char])
  /** Идёт ли звук по кнопке шапки. */
  const sounding = stepping ? solo !== null : playing

  // ─── Плеер телефона ────────────────────────────────────────────────────────
  //
  // На телефоне плеер уезжает ВНИЗ, в ряд дока, — ровно туда же, где он стоит в
  // аудировании (см. trainer/TrackPlayer.tsx). Причина та же: прилипшая шапка
  // держала над текстом два этажа управления (кнопка с бегунком и рейка
  // тумблеров), и на 800 px высоты это четверть экрана впустую — при том что
  // «играть» и «переслушать это место» нужны большому пальцу, а не глазу.
  // Строка плеера — общая с аудированием (trainer/PlayerPill.tsx), а вот
  // ЗВУК свой: голос партитуры ведёт по строкам с подсветкой слова, помнит
  // метку паузы и режим «по строке». Позвать сюда целиком TrackPlayer значило
  // бы два бегунка и две разные позиции в одной записи.
  const slot = useTrainerPlayerSlot()
  const dockPlayer = narrow && !!slot?.el
  useEffect(() => {
    if (!slot || !narrow) return
    slot.claim(true)
    return () => slot.claim(false)
  }, [slot, narrow])

  const [menu, setMenu] = useState(false)

  // Промотка идёт ПО РЕПЛИКАМ: у синтеза нет таймлайна (та же оговорка, что в
  // TrackPlayer), и единственная точка, куда можно встать, — начало реплики.
  // В режиме «по строке» шкала считает фрагменты: на экране один из них, и
  // вести бегунок по репликам целого текста было бы враньём.
  const seekMax = Math.max(0, (stepping ? units.length : total) - 1)
  const seekNow = stepping ? at : mark
  const [seekTo, setSeekTo] = useState<number | null>(null)
  // Та же величина в ref: щелчок на смене реплики нельзя ставить внутрь
  // обновления состояния (оно вызывается лишний раз в строгом режиме), а
  // сравнивать надо с тем, что уже под пальцем, а не с прошлым рендером.
  const seekToRef = useRef<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const seeking = useRef(false)

  function seekIndex(clientX: number): number {
    const el = trackRef.current
    if (!el || !seekMax) return 0
    const r = el.getBoundingClientRect()
    const f = r.width ? (clientX - r.left) / r.width : 0
    return Math.max(0, Math.min(seekMax, Math.round(f * seekMax)))
  }

  /** Отпустили бегунок: встать на реплику — и продолжить оттуда, если звучало. */
  function applySeek(to: number) {
    if (stepping) { goStep(to); return }
    if (playing) { play(slow ? 0.8 : 1, to); return }
    // В тишине это метка, а не запуск: ученик отмотал, чтобы перечитать место,
    // и включать ему голос без спроса — не то же самое, что промотать.
    voice.current?.stop()
    markLine(null)
    setChar(null)
    setPaused(to)
  }

  const seekPos = seekTo ?? seekNow
  const frac = seekMax ? Math.min(1, Math.max(0, ((seekPos ?? -1) + 1) / (seekMax + 1))) : 0
  const held = seekTo !== null
  /** Чем считает шкала: в потоке это реплики текста, в «по строке» — фрагменты. */
  const unitWord = stepping ? t('фрагмент') : t('реплика')
  /** Границы делений — под пальцем, как у плеера записи. Деления ровные:
   *  шкала считает СТРОКИ, а не время, и ширина по длительности была бы
   *  обещанием таймлайна, которого у синтеза нет. */
  const ticks = useMemo(
    () => Array.from({ length: seekMax }, (_, i) => (i + 1) / (seekMax + 1)),
    [seekMax],
  )
  /** Отрывки для списка в шторке — теми же единицами, какими идёт шкала. */
  const cues = useMemo(
    () => (stepping
      ? units.map(u => u.rows.map(r => r.chunks.map(c => c.text).join(' ')).join(' '))
      : allLines),
    [stepping, units, allLines],
  )
  /** Есть ли что показывать в рейке тумблеров: без неё шапки нет вовсе. */
  const showRail = !!translation || readings || units.length > 1

  /**
   * Перейти на фрагмент. Речь при этом глохнет: экран сменился, а голос,
   * дочитывающий предыдущий фрагмент, подсвечивал бы слова там, где их уже нет.
   */
  function goStep(next: number) {
    const to = Math.max(0, Math.min(units.length - 1, next))
    voice.current?.stop()
    setStep(to)
    setPeek(false)
    markLine(null)
    setChar(null)
  }

  /** Включить или выключить режим «строка за строкой». */
  function toggleStepping() {
    voice.current?.stop()
    markLine(null)
    setChar(null)
    setPeek(false)
    setStep(stepping ? null : 0)
  }
  /**
   * Выбрать пару или снять выбор (term === null).
   *
   * Снимаем только СВОЙ выбор: сообщение «ничего не выбрано» приходит с обеих
   * сторон, и клик по слову перевода приходил бы вместе с закрытием карточки
   * оригинала — то есть гасил бы сам себя (см. Pick.from).
   */
  function pickWord(unit: number, term: string | null, from: 'orig' | 'ru') {
    setPick(p => (term
      ? { unit, term: term.trim().toLowerCase(), from }
      : (p && p.unit === unit && p.from === from ? null : p)))
  }

  // Отступы длинной записью: колонки перекрывают их по одной стороне, а смесь
  // padding и paddingLeft в одном стиле React ругает и применяет непредсказуемо.
  const cell = { paddingTop: 9, paddingRight: 14, paddingBottom: 9, paddingLeft: 0 } as const
  const ruStyle = {
    fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap,
  } as const

  return (
    <>
    <div ref={cardRef} style={{
      borderRadius: 18, background: 'var(--color-bg-2)',
      border: '1px solid var(--color-border-soft)',
      // clip, а не hidden: hidden делает карточку панелью прокрутки, и sticky
      // внутри неё прилипает к тому, что никогда не едет, то есть не работает
      // вовсе. clip обрезает углы так же, но панелью прокрутки не становится.
      overflow: 'clip',
    }}>
      {/*
        ПЛЕЕР И ТУМБЛЕРЫ ЕДУТ ЗА ТЕКСТОМ.
        Управление читалкой нужно ровно там, где спотыкаешься, — на десятой
        строке, а не в начале текста. Раньше «стоп», темп и «Перевод» уезжали
        вверх вместе с шапкой: чтобы выключить голос или сверить строку,
        приходилось листать наверх, терять место и возвращаться.
        Прилипает вся шапка целиком, а не одна кнопка: «Перевод» и «Справа /
        Снизу» — такое же решение по ходу чтения, как «стоп».
        Что НЕ прилипает: подсказка под тумблерами (её читают один раз) и
        кнопки листания фрагментов — они и так стоят внизу одноэкранной
        карточки режима «строка за строкой».
      */}
      {(showRail || !dockPlayer) && (
      <div
        ref={barRef}
        style={{
          position: 'sticky', top: STICK_TOP, zIndex: 3,
          // Фон обязателен и непрозрачен: под шапкой едет текст, и полупрозрачная
          // подложка превращала бы строки в кашу ровно там, где нужны кнопки.
          background: 'var(--color-bg-2)',
          boxShadow: stuck ? '0 14px 22px -18px rgba(0,0,0,0.55)' : 'none',
          transition: 'box-shadow 180ms ease',
        }}
      >
        {/* Плеер — шапкой над текстом: он ведёт по строкам, а не просто читает.
            На телефоне этой строки здесь нет вовсе: плеер стоит внизу, в ряду
            дока (см. «Плеер телефона» выше). */}
        {!dockPlayer && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          // Прилипшая шапка ужимается: две полные строки управления съедают
          // четверть экрана телефона именно тогда, когда экрана меньше всего.
          padding: stuck ? '7px 16px' : '11px 16px',
          borderBottom: '1px solid var(--color-border-soft)',
          transition: 'padding 160ms ease',
        }}>
          {/* В режиме «строка за строкой» шапка читает ТЕКУЩИЙ фрагмент, а не
              текст целиком: экран показывает один фрагмент, и голос, ушедший на
              три экрана вперёд, подсвечивал бы то, чего не видно. */}
          <button
            onClick={() => (stepping ? playUnit(units[at]) : toggle())}
            aria-label={sounding
              ? (stepping ? t('Стоп') : t('Пауза'))
              : (!stepping && paused !== null ? t('Продолжить') : t('Слушать'))}
            title={sounding
              ? (stepping ? t('Стоп') : t('Пауза'))
              : (!stepping && paused !== null ? t('Продолжить') : t('Слушать'))}
            style={{
              width: 32, height: 32, flexShrink: 0, borderRadius: '50%', border: 'none',
              cursor: 'pointer', display: 'grid', placeItems: 'center',
              background: accent, color: '#fff',
            }}
          >
            {/* Пауза, а не «стоп»: следующее нажатие продолжит с той же
                реплики. В режиме «строка за строкой» продолжать нечего —
                фрагмент и так один экран, там честнее «стоп». */}
            {sounding
              ? (stepping ? <Square size={13} fill="#fff" /> : <Pause size={13} fill="#fff" />)
              : <Play size={14} fill="#fff" style={{ marginLeft: 2 }} />}
          </button>

          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-border-soft)' }}>
            <div style={{
              width: stepping
                ? `${Math.round(((at + 1) / units.length) * 100)}%`
                : `${mark === null || !total ? 0 : Math.round(((mark + 1) / total) * 100)}%`,
              height: 4, borderRadius: 2, background: accent, transition: 'width 220ms ease',
            }} />
          </div>

          {stepping && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
              {at + 1} / {units.length}
            </span>
          )}

          <button
            onClick={() => setRate(!slow)}
            style={{
              height: CTL_H, padding: '0 10px', borderRadius: 999, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700,
              // Ширина не пляшет между 0.75× и 1.0×: цифры разной ширины
              // сдвигали бы край шапки при каждом нажатии.
              minWidth: 48, border: 'none',
              background: slow ? soft : 'var(--color-bg-input)',
              color: slow ? accent : 'var(--color-text-2)',
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            {slow ? '0.75×' : '1.0×'}
          </button>
        </div>
        )}

        {/*
          СТРОКА УПРАВЛЕНИЯ — ОДИН ПРЕДМЕТ, А НЕ ЧЕТЫРЕ.
          Раньше здесь стояли рядом жёлоб с ползунком, две пилюли в рамке и ещё
          один жёлоб: четыре разные подложки на четыре решения об одном и том же
          тексте. Глаз читал их как несвязанные кнопки и каждый раз заново искал,
          где тут что. Теперь подложка одна — рейка, — а внутри неё сегменты
          одного размера, разделённые волосяными чертами по смыслу:
            «как читаем» | «что показываем» | «где перевод».
          Рамок нет ни у кого: состояние показывает заливка, и включение больше
          не добавляет элементу лишний пиксель по краю.
        */}
        {showRail && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            padding: stuck ? '6px 16px' : '10px 16px',
            borderBottom: '1px solid var(--color-border-soft)',
            transition: 'padding 160ms ease',
          }}>
            {/* НА ТЕЛЕФОНЕ РЕЙКА — ВО ВСЮ ШИРИНУ, А НЕ ПО СОДЕРЖИМОМУ.
                Четыре сегмента с подписями не помещались в 358 px: рейка
                вылезала за карточку, и «Транскрипция» обрезалась по букве «Т»
                — кнопка, о которой нельзя догадаться, что она кнопка. Теперь
                «как читаем» делит между собой всю свободную ширину, а «что
                показываем» ужимается до значков: у них есть включённое
                состояние заливкой, и подпись им нужна ровно один раз. */}
            <div style={{
              display: narrow ? 'flex' : 'inline-flex', alignItems: 'center', gap: 2,
              flex: narrow ? 1 : undefined, minWidth: 0,
              padding: 3, borderRadius: 999, background: 'var(--color-bg-input)',
            }}>
              {/* Поток или по одному фрагменту. Это не украшение для телефона:
                  поток отвечает на вопрос «о чём тут вообще», а «строка за
                  строкой» — на «разобрать вот это место», и второе на узком
                  экране невозможно, пока текст едет мимо.
                  Заливка сплошная, а не мягкая: из двух положений выбрано одно,
                  и это другой род решения, чем «показать перевод». */}
              {units.length > 1 && (
                <>
                  <Seg
                    icon={Rows3} label={t('Потоком')} on={!stepping} solid grow={narrow}
                    accent={accent} soft={soft}
                    onClick={() => { if (stepping) toggleStepping() }}
                  />
                  <Seg
                    icon={GalleryVerticalEnd} label={t('По строке')} on={stepping} solid grow={narrow}
                    accent={accent} soft={soft}
                    onClick={() => { if (!stepping) toggleStepping() }}
                  />
                </>
              )}
              {units.length > 1 && (translation || readings) && <SegSep />}
              {translation && (
                <Seg
                  icon={Languages} label={t('Перевод')} on={showRu} iconOnly={narrow}
                  accent={accent} soft={soft}
                  onClick={() => setShowRu(v => !v)}
                />
              )}
              {readings && (
                <Seg
                  icon={Type} label={t('Транскрипция')} on={showTr} iconOnly={narrow}
                  accent={accent} soft={soft}
                  onClick={() => setShowTr(v => !v)}
                />
              )}
              {/* Сторона — только когда перевод включён: пустой выбор «где его
                  показывать» рядом с выключенным переводом ничего не объясняет.
                  Стоит в конце рейки, а не вплотную к «Переводу», хотя настраивает
                  именно его: появляясь в середине, он расталкивал соседние
                  сегменты вбок, и включение перевода читалось как прыжок строки. */}
              {translation && showRu && canSide && !stepping && (
                <>
                  <SegSep />
                  <Seg
                    icon={PanelRight} label={t('Перевод справа')} iconOnly
                    on={ruSide === 'right'} solid accent={accent} soft={soft}
                    onClick={() => setRuSide('right')}
                  />
                  <Seg
                    icon={PanelBottom} label={t('Перевод снизу')} iconOnly
                    on={ruSide === 'bottom'} solid accent={accent} soft={soft}
                    onClick={() => setRuSide('bottom')}
                  />
                </>
              )}
            </div>

            {/* Подсказку читают один раз, в начале. В прилипшей шапке она первой
                переносится на вторую строку и растит её — а объясняет то, что к
                середине текста уже известно. */}
            {!stuck && !narrow && (
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--color-text-3)' }}>
                {stepping
                  ? t('Листай свайпом или кнопками внизу')
                  : t('Слово — перевод и озвучка, динамик слева — вся реплика')}
              </span>
            )}
          </div>
        )}
      </div>
      )}

      {stepping ? (
        <StepCard
          unit={units[at]}
          index={at}
          count={units.length}
          onGo={goStep}
          cell={cell}
          ruStyle={ruStyle}
          lang={lang}
          glossary={glossary}
          accent={accent}
          soft={soft}
          highlight={highlight}
          subject={subject}
          ruby={showTr && readings}
          line={mark}
          char={char}
          spoken={spoken}
          solo={solo}
          onPlayRow={playRow}
          pick={pick}
          onPick={pickWord}
          // Перевод в этом режиме открывается на один фрагмент, если общий
          // тумблер выключен: смысл экрана — сперва понять самому.
          showRu={showRu || peek}
          canPeek={!showRu && !peek && !!units[at].ru}
          onPeek={() => setPeek(true)}
        />
      ) : (
      <div style={{ padding: '14px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: twoCol ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr',
        }}>
          {units.map((u, ui) => (
            <FragmentRow
              key={ui}
              unit={u}
              index={ui}
              twoCol={twoCol}
              showRu={showRu}
              cell={cell}
              ruStyle={ruStyle}
              lang={lang}
              glossary={glossary}
              accent={accent}
              soft={soft}
              highlight={highlight}
              subject={subject}
              ruby={showTr && readings}
              line={mark}
              char={char}
              spoken={spoken}
              solo={solo}
              onPlayRow={playRow}
              pick={pick}
              onPick={pickWord}
            />
          ))}
        </div>

        {/* Перевод, который не разложился по строкам, — общим текстом. */}
        {showRu && loose && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              {t('Перевод текста')}
            </div>
            <div style={{ ...ruStyle, whiteSpace: 'pre-wrap' }}>{loose}</div>
          </div>
        )}
      </div>
      )}
    </div>

    {/* ПЛЕЕР ТЕЛЕФОНА — В РЯДУ ДОКА, у большого пальца. Строка ровно та же,
        что у плеера записи, и физически та же самая (PlayerPill): плеер здесь
        и плеер в простом тексте — один предмет в одном месте экрана, и
        списанная разметка их уже однажды развела. Своё тут только СОДЕРЖИМОЕ
        шкалы: голос партитуры идёт по строкам с подсветкой, помнит метку
        паузы и режим «по строке». Всё остальное (темп, голос, список) — в
        шторке: строка плеера это три мишени, и таблетка темпа рядом с
        бегунком отнимала бы у него ширину, то есть точность промотки. */}
    {dockPlayer && slot?.el && createPortal(
      <PlayerPill
        inline
        accent={accent}
        icon={sounding
          ? (stepping ? <Square size={15} fill="currentColor" /> : <Pause size={17} fill="currentColor" />)
          : <Play size={17} fill="currentColor" style={{ marginLeft: 2 }} />}
        playLabel={sounding
          ? (stepping ? t('Стоп') : t('Пауза'))
          : (!stepping && paused !== null ? t('Продолжить') : t('Слушать'))}
        onPlay={() => (stepping ? playUnit(units[at]) : toggle())}
        trackRef={trackRef}
        slider={{
          onPointerDown: e => {
            e.currentTarget.setPointerCapture(e.pointerId)
            seeking.current = true
            const i = seekIndex(e.clientX)
            seekToRef.current = i
            setSeekTo(i)
          },
          onPointerMove: e => {
            if (!seeking.current) return
            const i = seekIndex(e.clientX)
            if (i === seekToRef.current) return
            // Щелчок на каждой новой реплике: шкала дискретная, и без отдачи
            // не понять, встал бегунок на следующую строку или ещё нет.
            seekToRef.current = i
            tactile()
            setSeekTo(i)
          },
          onPointerUp: e => {
            if (!seeking.current) return
            seeking.current = false
            const i = seekIndex(e.clientX)
            seekToRef.current = null
            setSeekTo(null)
            applySeek(i)
          },
          onPointerCancel: () => { seeking.current = false; seekToRef.current = null; setSeekTo(null) },
          onLostPointerCapture: () => { seeking.current = false; seekToRef.current = null; setSeekTo(null) },
          label: t('Промотка чтения'),
          min: 1,
          max: seekMax + 1,
          now: (seekPos ?? 0) + 1,
        }}
        frac={frac}
        held={held}
        ticks={ticks}
        hint={held ? `${unitWord} ${(seekPos ?? 0) + 1} ${t('из')} ${seekMax + 1}` : null}
        lead={title}
        tail={`${unitWord} ${(seekPos ?? 0) + 1} ${t('из')} ${seekMax + 1}`}
        counter={`${(seekPos ?? 0) + 1}/${seekMax + 1}`}
        onMenu={() => setMenu(true)}
        menuLabel={t('Настройки чтения')}
      />,
      slot.el,
    )}

    {dockPlayer && (
      <MobileSheet open={menu} onClose={() => setMenu(false)} title={title ?? t('Чтение вслух')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 7 }}>{t('Скорость')}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[false, true].map(v => (
                <button
                  key={String(v)}
                  onClick={() => setRate(v)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12.5, fontWeight: slow === v ? 700 : 600,
                    border: slow === v ? `1px solid ${accent}` : '1px solid var(--color-border-soft)',
                    background: slow === v ? soft : 'var(--color-bg-2)',
                    color: slow === v ? accent : 'var(--color-text-2)',
                  }}
                >
                  {v ? `${t('Медленно')} · 0.75×` : `${t('Обычно')} · 1.0×`}
                </button>
              ))}
            </div>
          </div>

          {/* Список отрывков — как у плеера записи. Бегунок отвечает на
              «чуть назад», список — на «мне нужно вон то место»: вслепую
              искать реплику по дискретной шкале дороже, чем прочитать её
              первые слова. В «по строке» это фрагменты экрана, в потоке —
              реплики текста, то есть ровно то, что считает шкала рядом. */}
          {cues.length > 1 && (
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 7 }}>{t('Отрывок')}</div>
              <CueList
                items={cues}
                active={seekNow}
                playing={sounding}
                accent={accent}
                soft={soft}
                onPick={i => {
                  setMenu(false)
                  // Выбрали строку — её и читаем: список для того и открыли,
                  // а метку паузы ставит бегунок, у него это другой жест.
                  if (stepping) goStep(i)
                  else play(slow ? 0.8 : 1, i)
                }}
              />
            </div>
          )}

          {/* Голос — здесь же: мысль «не тот диктор» приходит в момент
              прослушивания, а из строки плеера кнопку убрали ради бегунка. */}
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginBottom: 7 }}>{t('Голос')}</div>
            <VoicePicker lang={lang} accent={accent} soft={soft} />
          </div>
        </div>
      </MobileSheet>
    )}
    </>
  )
}

/**
 * Режим «строка за строкой»: на экране один фрагмент.
 *
 * ЗАЧЕМ ОН НУЖЕН ИМЕННО НА ТЕЛЕФОНЕ. В потоке абзац корейской прозы занимает
 * почти два экрана, и его перевод оказывается там, где начала абзаца уже не
 * видно, — пара «оригинал ↔ перевод» рассыпается. Здесь фрагмент и перевод
 * заведомо на одном экране, а вся остальная страница не отвлекает.
 *
 * ПЕРЕВОД ЗАКРЫТ ПО УМОЛЧАНИЮ и открывается кнопкой на один фрагмент. Это и
 * есть учебная нагрузка: сперва попытка понять, потом сверка. Если общий
 * тумблер «Перевод» включён, ученик уже сказал, что хочет видеть перевод
 * всегда, — тогда кнопки нет.
 */
function StepCard({ unit, index, count, onGo, cell, ruStyle, lang, glossary, accent, soft, highlight, subject, ruby, line, char, spoken, solo, onPlayRow, pick, onPick, showRu, canPeek, onPeek }: {
  unit: Unit
  index: number
  count: number
  onGo: (to: number) => void
  cell: React.CSSProperties
  ruStyle: React.CSSProperties
  lang: string
  glossary: Gloss[]
  accent: string
  soft: string
  highlight?: string | null
  subject?: string
  ruby: boolean
  line: number | null
  char: number | null
  /** Звучащее сейчас слово — ключ пары, по которому горит перевод напротив. */
  spoken: string | null
  solo: number | null
  onPlayRow: (row: Row) => void
  pick: Pick | null
  onPick: (unit: number, term: string | null, from: 'orig' | 'ru') => void
  showRu: boolean
  canPeek: boolean
  onPeek: () => void
}) {
  const t = useT()
  // Свайп ведём руками, без библиотеки: нужен один жест, и тот в одну ось.
  // Порог в 50px и требование, чтобы горизонталь была явно больше вертикали, —
  // чтобы обычная прокрутка страницы не листала фрагменты.
  const touch = useRef<{ x: number; y: number } | null>(null)

  // Фрагмент подкручивается в вид, если его не видно целиком.
  //
  // Зачем: карточка стоит под врезкой «что вокруг», и на телефоне включённый
  // режим оказывается ниже экрана — ученик видит переключатель и пустоту. Плюс
  // фрагменты разной высоты: после длинного следующий начинается за нижним
  // краем. Крутим ТОЛЬКО когда надо, иначе экран дёргается на каждом шаге.
  //
  // behavior оставлен рывком: плавная прокрутка в этой оболочке иногда молча не
  // доезжает, а рывок работает везде.
  const cardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    // 110 — прилипшая шапка плеера плюс воздух; ниже неё карточка «под шапкой».
    if (r.top >= 110 && r.bottom <= window.innerHeight) return
    el.scrollIntoView({ block: 'center' })
  }, [index])

  return (
    <div
      ref={cardRef}
      onTouchStart={e => {
        const p = e.touches[0]
        touch.current = { x: p.clientX, y: p.clientY }
      }}
      onTouchEnd={e => {
        const from = touch.current
        touch.current = null
        if (!from) return
        const p = e.changedTouches[0]
        const dx = p.clientX - from.x
        const dy = p.clientY - from.y
        if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return
        onGo(dx < 0 ? index + 1 : index - 1)
      }}
      style={{ padding: '16px 16px 14px' }}
    >
      <FragmentRow
        unit={unit}
        index={index}
        twoCol={false}
        showRu={showRu}
        cell={{ ...cell, paddingTop: 0, paddingRight: 0 }}
        ruStyle={ruStyle}
        lang={lang}
        glossary={glossary}
        accent={accent}
        soft={soft}
        highlight={highlight}
        subject={subject}
        ruby={ruby}
        line={line}
        char={char}
        spoken={spoken}
        solo={solo}
        onPlayRow={onPlayRow}
        pick={pick}
        onPick={onPick}
      />

      {canPeek && (
        <button
          onClick={onPeek}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginLeft: 28, height: CTL_H, padding: '0 14px',
            borderRadius: 999, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            // Тем же языком, что рейка сверху: заливка вместо рамки.
            border: 'none', background: soft, color: accent,
          }}
        >
          <Eye size={14} /> {t('Показать перевод')}
        </button>
      )}

      <div style={{
        display: 'flex', gap: 8, marginTop: 16,
        paddingTop: 12, borderTop: '1px solid var(--color-border-soft)',
      }}>
        <NavButton onClick={() => onGo(index - 1)} disabled={index === 0} accent={accent} soft={soft}>
          <ChevronLeft size={15} /> {t('Назад')}
        </NavButton>
        <NavButton onClick={() => onGo(index + 1)} disabled={index === count - 1} accent={accent} soft={soft} primary>
          {t('Дальше')} <ChevronRight size={15} />
        </NavButton>
      </div>
    </div>
  )
}

function NavButton({ onClick, disabled, accent, soft, primary, children }: {
  onClick: () => void
  disabled: boolean
  accent: string
  soft: string
  primary?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        padding: '11px 14px', borderRadius: 14,
        // Свайп по карточке проходит и по кнопкам: без этого жест «дальше»
        // оставлял за собой выделенное синим слово на кнопке.
        userSelect: 'none', WebkitUserSelect: 'none',
        cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
        fontSize: 13.5, fontWeight: 700,
        border: primary ? 'none' : `1px solid ${disabled ? 'var(--color-border-soft)' : 'var(--color-border-medium)'}`,
        background: primary ? (disabled ? 'var(--color-border-soft)' : accent) : (disabled ? 'transparent' : soft),
        color: primary ? '#fff' : (disabled ? 'var(--color-text-3)' : accent),
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

/**
 * СЕГМЕНТ РЕЙКИ УПРАВЛЕНИЯ.
 * Один размер на все решения читалки: «как читаем», «что показываем», «где
 * перевод» — это соседние переключатели в одной строке, и разный вес у них
 * означал бы разную важность, которой нет.
 * Рамки нет ни в одном состоянии: рамка добавляет предмету пиксель по краю при
 * включении, и строка дышала при каждом нажатии. Состояние — только заливка.
 *   solid — выбор один из нескольких (сплошная заливка: выбрано ровно одно);
 *   иначе — самостоятельный тумблер (мягкая заливка: включён сам по себе).
 * Насыщенность шрифта постоянна: на 500↔700 сегмент менял бы ширину под пальцем.
 */
function Seg({ icon: Icon, label, on, solid, iconOnly, grow, accent, soft, onClick }: {
  icon: typeof PanelRight
  label: string
  on: boolean
  solid?: boolean
  iconOnly?: boolean
  /** Делит с соседями всю ширину рейки — так собрана рейка телефона. */
  grow?: boolean
  accent: string
  soft: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        height: SEG_H, padding: iconOnly ? '0 10px' : '0 12px',
        ...(grow ? { flex: 1, minWidth: 0 } : null),
        borderRadius: 999, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
        background: on ? (solid ? accent : soft) : 'transparent',
        color: on ? (solid ? '#fff' : accent) : 'var(--color-text-3)',
        transition: 'background 160ms ease, color 160ms ease',
      }}
      onMouseEnter={e => { if (!on) e.currentTarget.style.color = 'var(--color-text-2)' }}
      onMouseLeave={e => { if (!on) e.currentTarget.style.color = 'var(--color-text-3)' }}
    >
      <Icon size={13} style={{ flexShrink: 0 }} /> {iconOnly ? null : label}
    </button>
  )
}

/** Волосяная черта между смысловыми частями рейки. */
function SegSep() {
  return (
    <span
      aria-hidden
      style={{
        width: 1, height: 16, margin: '0 5px', flexShrink: 0,
        background: 'var(--color-border-medium)', opacity: 0.7,
      }}
    />
  )
}

/** Строка партитуры: оригинал и, если включён, его перевод. */
function FragmentRow({ unit, index, twoCol, showRu, cell, ruStyle, lang, glossary, accent, soft, highlight, subject, ruby, line, char, spoken, solo, onPlayRow, pick, onPick }: {
  unit: Unit
  /** Номер фрагмента: им пара привязана к своей строке (см. Pick). */
  index: number
  twoCol: boolean
  showRu: boolean
  cell: React.CSSProperties
  ruStyle: React.CSSProperties
  lang: string
  glossary: Gloss[]
  accent: string
  soft: string
  highlight?: string | null
  subject?: string
  ruby: boolean
  line: number | null
  char: number | null
  /** Звучащее сейчас слово — ключ пары, по которому горит перевод напротив. */
  spoken: string | null
  /** Реплика, которую слушают отдельно, — её кнопка стоит в положении «стоп». */
  solo: number | null
  onPlayRow: (row: Row) => void
  pick: Pick | null
  onPick: (unit: number, term: string | null, from: 'orig' | 'ru') => void
}) {
  const t = useT()
  // Выбранное слово этой строки. Пара горит на обеих сторонах одним и тем же
  // ключом: в оригинале его разбирает GlossedText, в переводе — TranslationText.
  const picked = pick && pick.unit === index ? pick.term : null
  // Звучит ли что-то в ЭТОМ фрагменте: перевод подсвечивается только у своей
  // реплики — залитые разом все строки перевода не отвечают на вопрос «где мы».
  const liveUnit = line !== null && unit.rows.some(r => r.chunks.some(c => c.line === line))
  const orig = (
    <div style={{
      ...cell,
      ...(twoCol ? { borderRight: '1px solid var(--color-border-soft)', paddingRight: 18 } : null),
    }}>
      {unit.rows.map((r, ri) => {
        const first = r.chunks.find(c => c.line !== null)?.line ?? null
        const alone = first !== null && first === solo
        return (
        <div
          key={ri}
          // Кнопка реплики стоит в жёлобе слева, а не в потоке текста: в потоке
          // она попадала бы между слов и мешала бы их нажимать.
          style={{
            display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', columnGap: 6,
            // Межстрочный интервал больше обычного: под строкой стоит ещё строка
            // транскрипции, и на 1.85 они слипаются.
            fontSize: 16.5, lineHeight: ruby ? 2.1 : 1.6, color: 'var(--color-text)',
          }}
        >
          {first === null ? <span /> : (
            <button
              onClick={() => onPlayRow(r)}
              title={alone ? t('Хватит') : t('Послушать реплику')}
              aria-label={alone ? t('Хватит') : t('Послушать реплику')}
              style={{
                // Не hover-only: на телефоне наведения нет, и кнопка, видимая
                // только под курсором, там просто не существует. Поэтому она
                // всегда на месте, но приглушена, пока её не трогают.
                width: 20, height: 20, borderRadius: '50%', border: 'none', padding: 0,
                marginTop: ruby ? 8 : 6, cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                background: alone ? accent : 'transparent',
                color: alone ? '#fff' : accent,
                opacity: alone ? 1 : 0.32,
                transition: 'opacity 160ms ease, background 160ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = alone ? '1' : '0.32' }}
            >
              {alone ? <Square size={9} fill="#fff" /> : <Volume2 size={13} />}
            </button>
          )}
          <div>
          {r.chunks.map((c, ci) => {
            const live = c.line !== null && c.line === line
            return (
              <span
                key={ci}
                style={{
                  borderRadius: 8,
                  // Воздух по бокам заливки — падингом БЕЗ отрицательного
                  // отступа: отступом заливка наезжала на кнопку реплики в
                  // жёлобе слева. Падинг стоит всегда, а не только у звучащего
                  // куска, поэтому строка от подсветки не дёргается.
                  paddingLeft: 7, paddingRight: 7,
                  // Перенос строки не должен резать заливку: по умолчанию
                  // (slice) у второй половины нет ни скругления, ни отступа —
                  // ровно тот срез, что видно на длинных репликах.
                  WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone',
                  background: live ? soft : 'transparent',
                  boxShadow: live ? `0 0 0 4px ${soft}` : 'none',
                  transition: 'background 200ms ease',
                }}
              >
                {ci > 0 && ' '}
                <GlossedText
                  text={c.text}
                  lang={lang}
                  extra={glossary}
                  accent={accent}
                  // Выбор пары бьёт слово из словаря слева: подсветка одна на
                  // двоих, и последнее, о чём спросили, важнее.
                  highlight={picked ?? highlight}
                  subject={subject}
                  onPick={term => onPick(index, term, 'orig')}
                  ruby={ruby}
                  spokenChar={live ? char : null}
                  // Куски одной строки идут в поток, а не блоками: разрыв
                  // посреди предложения читается как ошибка вёрстки.
                  style={{ display: 'inline' }}
                />
              </span>
            )
          })}
          </div>
        </div>
        )
      })}
    </div>
  )

  if (!showRu || !unit.ru) {
    return twoCol ? <>{orig}<div style={cell} /></> : orig
  }

  return (
    <>
      {orig}
      <div style={{
        ...cell,
        // Под строкой перевод встаёт вровень с оригиналом, а не с кнопкой
        // реплики: 22px жёлоба + 6px зазора (см. сетку строки выше).
        ...(twoCol ? { paddingLeft: 18, paddingRight: 0 } : { paddingTop: 0, paddingLeft: 28 }),
      }}>
        <TranslationText
          ru={unit.ru}
          source={unit.rows.flatMap(r => r.chunks.map(c => c.text)).join('\n')}
          lang={lang}
          glossary={glossary}
          accent={accent}
          picked={picked}
          // Слово горит напротив, только пока звучит эта реплика: подсветка —
          // указатель голоса, и оставшись после него, она врала бы.
          spoken={liveUnit ? spoken : null}
          onPick={term => onPick(index, term, 'ru')}
          style={{
            ...ruStyle,
            // Та же заливка, что у звучащей строки оригинала: строка и её
            // перевод — одна вещь, и гореть должны одинаково.
            borderRadius: 8,
            // Тот же воздух по бокам, что у оригинала (см. строку выше).
            paddingLeft: 10, paddingRight: 10, marginLeft: -10, marginRight: -10,
            background: liveUnit ? soft : 'transparent',
            boxShadow: liveUnit ? `0 0 0 4px ${soft}` : 'none',
            transition: 'background 200ms ease',
          }}
        />
      </div>
    </>
  )
}

/**
 * Перевод, в котором слово можно нажать.
 *
 * ЧТО НАЖИМАЕТСЯ. Только слова, у которых пара нашлась (см. lib/pairing.ts), —
 * они и помечены пунктиром, как знакомые слова в оригинале. Кликабельная строка
 * целиком врала бы: половина слов ответила бы «ничего», а это читается как
 * поломка, а не как «пары нет».
 *
 * ЧЕГО ЗДЕСЬ НЕТ — карточки. Русское слово ученику объяснять нечем и незачем:
 * весь вопрос к переводу — «каким словом это сказано в оригинале», и ответ на
 * него уже виден в загоревшейся строке напротив.
 */
function TranslationText({ ru, source, lang, glossary, accent, picked, spoken, onPick, style }: {
  ru: string
  /** Оригинал этого же фрагмента — по нему и сводятся пары. */
  source: string
  lang: string
  glossary: Gloss[]
  accent: string
  picked: string | null
  /** Слово, которое голос читает прямо сейчас (тот же ключ пары, что у picked). */
  spoken: string | null
  onPick: (term: string | null) => void
  style: React.CSSProperties
}) {
  const t = useT()
  const tokens = useMemo(
    () => pairTranslation(source, ru, lang, glossary),
    [source, ru, lang, glossary],
  )
  return (
    <div style={style}>
      {tokens.map((tk, i) => {
        if (!tk.pair) return <span key={i}>{tk.text}</span>
        const on = tk.pair === picked
        // Голос ведёт мягче выбора: выбранное слово — ответ на вопрос ученика и
        // держится, пока его не сняли, а звучащее живёт полсекунды и гаснет.
        // Одинаковая заливка в бегущей строке читалась бы как мигание клика.
        const now = !on && tk.pair === spoken
        return (
          <span
            key={i}
            role="button"
            tabIndex={-1}
            title={t('Где это в оригинале')}
            onClick={() => onPick(on ? null : tk.pair ?? null)}
            style={{
              cursor: 'pointer', borderRadius: 4,
              // Заливка слова тоже не должна лежать вплотную к буквам, а
              // перенос — резать её на половине без скругления.
              paddingLeft: 3, paddingRight: 3, marginLeft: -3, marginRight: -3,
              WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone',
              // Те же три состояния и те же прозрачности, что у слова в
              // оригинале (GlossedText): пара — одна вещь, лежащая по двум
              // сторонам, и выглядеть с разных сторон по-разному не должна.
              borderBottom: `1px dotted ${accent}80`,
              background: on ? `${accent}3d` : now ? `${accent}26` : 'transparent',
              boxShadow: on ? `0 0 0 2px ${accent}3d` : now ? `0 0 0 2px ${accent}26` : 'none',
              transition: 'background 140ms ease',
            }}
          >
            {tk.text}
          </span>
        )
      })}
    </div>
  )
}
