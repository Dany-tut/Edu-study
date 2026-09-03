// ─────────────────────────────────────────────────────────────────────────────
// «Обведите букву» — письмо как отдельный канал памяти
//
// ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО. Узнавать букву глазами и уметь её написать — два
// разных умения, и второе само из первого не вырастает. Курс, где хангыль
// только выбирают из вариантов, выпускает человека, который читает вывеску, но
// не может записать своё имя. Рука запоминает форму быстрее глаза и держит её
// дольше — этим и пользуемся.
//
// ПОЧЕМУ НЕ «НАРИСУЙ КАК ХОЧЕШЬ» И НЕ РАСПОЗНАВАНИЕ. Свободный холст пришлось
// бы оценивать распознаванием, а оно скажет «похоже» и на букве, написанной
// задом наперёд. Порядок черт в хангыле не украшение: он определяет, как буква
// выглядит в скорописи и как её вообще читают. Поэтому здесь ведут по
// пунктиру, черта за чертой, и «неправильно» — это не кривая линия, а
// начатая не с той точки.
//
// КАК УСТРОЕНА ПРОВЕРКА. Черта — ломаная из точек (data/hangul.ts), сгущённая
// до шага в пару единиц: по частым точкам видно, что палец действительно прошёл
// линию, а не срезал угол. Идём по ним по порядку и засчитываем те, к которым
// палец подошёл ближе TOLERANCE. Дошёл до конца — черта фиксируется и
// подсвечивается следующая; снял руку раньше — написанное остаётся, и дописать
// можно со второго захода, от кружка на кончике. Стереть всё — только «Заново».
//
// ЧЕРНИЛА ЛОЖАТСЯ ПО ЛИНИИ, А НЕ ПО ПАЛЬЦУ. Сначала рисовался сырой путь
// указателя — и первое же ведение показало, чем это плохо: рука дрогнула, и в
// квадрате осталась синяя клякса поперёк буквы. Здесь учат писать ㄱ, а не
// рисовать что вздумается, и кривизна руки — не то, что задание должно
// фиксировать. Поэтому чернила наливаются по самой черте ровно на столько,
// сколько пройдено: линия идёт за пальцем, но выйти за букву ею нельзя.
// Отошёл дальше допуска — заливка просто замирает, и видно, что надо вернуться.
//
// СОБЫТИЯ СЛУШАЕМ У ОКНА, А НЕ У SVG. Мышь, зажатая на картинке, для браузера
// выглядит как протяжка выделения: он честно отдаёт pointercancel, обводка
// обрывается на середине, а внизу подсвечивается кусок подписи. Поэтому на
// pointerdown гасим действие по умолчанию, а move/up ловим на window — тогда
// ведение переживает и выход за края квадрата, и капризы захвата указателя.
//
// ПОЧЕМУ ТОЧКИ, А НЕ SVG-ПУТЬ. Расстояние до ломаной считается арифметикой и
// одинаково работает на мыши и на пальце. Путь пришлось бы сэмплировать через
// getPointAtLength, то есть держать в DOM скрытый <path> и опрашивать его на
// каждое движение.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { CHAMO, strokePath, type Point, type Stroke } from '../data/hangul'
import { playPop, vibrate } from '../lib/sound'
import { okChime } from '../lib/feedback'
import { useT } from '../lib/i18n'
import AudioPlayer from './AudioPlayer'

/** Толщина черты в единицах квадрата: ею же рисуется и подложка, и чернила. */
const INK_WIDTH = 9

/** Радиус шарика на кончике пера: заметно шире черты, чтобы читался пером. */
const NIB_R = 6.5

/** Насколько далеко от линии можно вести палец (в единицах квадрата 0..100). */
const TOLERANCE = 16

/** Начать (или продолжить) черту можно, попав в этот радиус вокруг кружка. */
const START_TOLERANCE = 24

/**
 * Сколько точек сгущения смотрим вперёд за один шаг указателя.
 *
 * Окно не даёт «телепортироваться»: перепрыгнул середину черты — ближайшая
 * точка ищется только в пределах окна, и заливка дальше не пойдёт.
 */
const LOOKAHEAD = 14

/**
 * Наконечник стрелки-подсказки.
 *
 * Остриё смотрит вправо, вокруг нуля: наконечник ставят в нужную точку и
 * поворачивают по ходу черты. Углы скруглены, а пятка вогнута — острый
 * треугольник среди черт с круглыми торцами читался осколком и спорил с формой
 * самой буквы.
 */
const ARROW_HEAD = 'M 3.4 -1.3 Q 5.4 0 3.4 1.3 L -2.4 4.4 Q -3.9 5 -3.3 3.5 Q -2.1 0 -3.3 -3.5 Q -3.9 -5 -2.4 -4.4 Z'

/** Шаг сгущения черты. Мельче — дороже, крупнее — можно срезать угол. */
const STEP = 2.5

/** Черта, разбитая на частые точки: по ним и считается ход пальца. */
function densify(s: Stroke): Point[] {
  const pts = s.closed ? [...s.pts, s.pts[0]] : s.pts
  if (pts.length < 2) return [...pts]
  const out: Point[] = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / STEP))
    for (let k = 1; k <= steps; k++) out.push([ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps])
  }
  return out
}

export default function ChamoTrace({ chamo, value, disabled, onChange }: {
  /** Буква, которую обводят. */
  chamo: string
  /** 'done', когда все черты пройдены. */
  value: string | undefined
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const letter = CHAMO[chamo]
  const svgRef = useRef<SVGSVGElement | null>(null)
  /** Сколько черт уже пройдено целиком. Единственное, что влияет на картинку. */
  const [strokeIndex, setStrokeIndex] = useState(0)
  /** Ведём прямо сейчас: пока true, движение и отпускание слушает окно. */
  const [drawing, setDrawing] = useState(false)
  /**
   * Сколько точек сгущения текущей черты уже пройдено: по ним буква наливается,
   * и из них же считается, откуда продолжать. Отпускание НЕ обнуляет — руку
   * можно снять посреди длинной черты и дописать со второго захода.
   *
   * Считаем именно точки, а не долю: доля `taken / длина` промахивается на шаг
   * (первая точка — это ноль пройденного пути, а не один шаг из N), и чернила
   * от этого уезжают вперёд пальца. Долю для заливки считает `ink` — по
   * настоящей длине черты.
   */
  const [takenCount, setTakenCount] = useState(0)
  /** Толчок стартовой точке, когда начали не с неё: анимация проигрывается заново. */
  const [nudge, setNudge] = useState(0)
  /**
   * Ход текущей черты живёт в ref, а не в state, и это принципиально: события
   * pointermove приходят пачкой, а состояние обновляется только между
   * перерисовками. Через state каждое следующее движение читало бы значение,
   * устаревшее на всю пачку, — палец идёт по линии, а счётчик стоит на первой
   * точке, и черта не засчитывается никогда.
   */
  const taken = useRef(0)
  /** До какой точки уже отдавали отклик вибрацией. */
  const buzzed = useRef(0)
  const done = value === 'done'

  const strokes = letter?.strokes ?? []

  // Готовое задание, открытое заново (возврат к заданию, F5), показывает букву
  // целиком: переобводить её, чтобы вернуть себе уже полученный балл, незачем.
  useEffect(() => {
    if (done) setStrokeIndex(strokes.length)
  }, [done, strokes.length])

  const current = strokes[strokeIndex]
  const dense = useMemo(() => strokes.map(densify), [strokes])
  const denseCurrent = dense[strokeIndex]

  /** Экранные координаты → квадрат буквы 0..100. */
  const toLocal = (clientX: number, clientY: number): Point | null => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    return [((clientX - box.left) / box.width) * 100, ((clientY - box.top) / box.height) * 100]
  }

  /**
   * Откуда продолжать и куда вести.
   *
   * Пока черта не начата, это её первая точка; когда руку сняли посреди —
   * кончик написанного. Направление берём не у соседней точки сгущения, а на
   * несколько шагов вперёд: у соседней на скруглении дрожит угол, и стрелка
   * вертелась бы вместо того, чтобы показывать «вниз» или «влево».
   */
  const takenIdx = denseCurrent ? Math.min(denseCurrent.length - 1, Math.max(0, takenCount - 1)) : 0
  const resumeAt: Point = denseCurrent ? denseCurrent[takenIdx] : [50, 50]
  const aheadAt: Point = denseCurrent ? denseCurrent[Math.min(denseCurrent.length - 1, takenIdx + 8)] : resumeAt
  const heading = (Math.atan2(aheadAt[1] - resumeAt[1], aheadAt[0] - resumeAt[0]) * 180) / Math.PI

  /**
   * ПОДСКАЗКА-СТРЕЛКА ВДОЛЬ ВСЕЙ ОСТАВШЕЙСЯ ЧЕРТЫ, А НЕ ГАЛОЧКА У КРУЖКА.
   *
   * Один наконечник рядом со стартом отвечает только на вопрос «в какую сторону
   * трогаться». У ㄱ, ㄹ, ㅌ этого мало: черта поворачивает, и с первого шага не
   * видно, что дальше линия уйдёт вниз. Поэтому здесь рисуется весь путь пальца
   * тонкой линией по самой черте — от того места, где руку сняли, до конца, — а
   * наконечник стоит там, где черту нужно закончить.
   *
   * Хвост укорочен на пару точек сгущения: иначе наконечник вылезал бы за
   * скруглённый торец подложки и черта выглядела бы длиннее, чем она есть.
   */
  const guide = useMemo(() => {
    if (!denseCurrent || takenIdx >= denseCurrent.length - 3) return null
    const rest = denseCurrent.slice(takenIdx)
    const tip = rest[rest.length - 1]
    const body = rest.slice(0, Math.max(2, rest.length - 2))
    const back = rest[Math.max(0, rest.length - 6)]
    // Ближний наконечник — в паре сантиметров от кружка, по ходу черты.
    // Дальний стоит там, где черта кончается, и у ㅇ это ровно та же точка, где
    // она началась: у замкнутой буквы конец приходится под стартовый кружок, и
    // вопрос «в какую сторону трогаться» оставался без ответа.
    const leadIdx = Math.min(rest.length - 1, 7)
    const lead = rest[leadIdx]
    return {
      d: `M ${body.map(([x, y]) => `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`).join(' L ')}`,
      tip,
      angle: (Math.atan2(tip[1] - back[1], tip[0] - back[0]) * 180) / Math.PI,
      lead,
      leadAngle: (Math.atan2(lead[1] - rest[0][1], lead[0] - rest[0][0]) * 180) / Math.PI,
      // У короткого остатка ближний и дальний наконечники слиплись бы в один.
      showLead: rest.length > 16,
    }
  }, [denseCurrent, takenIdx])

  /**
   * ЧЕРНИЛА КОНЧАЮТСЯ РОВНО ПОД ПАЛЬЦЕМ, А НЕ НА ПОЛТОЛЩИНЫ ДАЛЬШЕ.
   *
   * Линия «бежала быстрее пальца» по двум причинам сразу, и обе — про рисование,
   * а не про сверку. Во-первых, доля считалась по числу точек сгущения
   * (`taken / длина`), а pathLength=1 меряет долю ПУТИ: у скруглённых черт
   * (Q-кривые в strokePath) это разные шкалы, да и первая точка — ноль
   * пройденного, а не один шаг из N. Во-вторых, у штриха круглый торец: он
   * выступает вперёд на половину толщины, то есть на 4.5 из 100 — при квадрате
   * в 300px это заметные ~14px впереди руки.
   *
   * Поэтому доля берётся по накопленной длине ломаной, а из неё вычитается
   * радиус торца: видимый край чернил приходится ровно на пройденную точку.
   */
  const cum = useMemo(() => {
    if (!denseCurrent) return null
    const out = [0]
    for (let i = 1; i < denseCurrent.length; i++) {
      out.push(out[i - 1] + Math.hypot(
        denseCurrent[i][0] - denseCurrent[i - 1][0],
        denseCurrent[i][1] - denseCurrent[i - 1][1],
      ))
    }
    return out
  }, [denseCurrent])

  const strokeLen = cum ? cum[cum.length - 1] : 0
  const ink = cum && strokeLen > 0
    ? Math.max(0, (cum[takenIdx] - INK_WIDTH / 2) / strokeLen)
    : 0

  /**
   * Центр шарика на кончике пера. Он шире черты, поэтому сидит не в пройденной
   * точке, а позади неё на разницу радиусов: передний край шарика приходится
   * ровно туда же, куда край чернил, — на палец.
   */
  const nib: Point = (() => {
    if (!denseCurrent) return resumeAt
    const back = denseCurrent[Math.max(0, takenIdx - 3)]
    const dx = resumeAt[0] - back[0]
    const dy = resumeAt[1] - back[1]
    const len = Math.hypot(dx, dy)
    if (len === 0) return resumeAt
    const shift = NIB_R - INK_WIDTH / 2
    return [resumeAt[0] - (dx / len) * shift, resumeAt[1] - (dy / len) * shift]
  })()

  const reset = () => {
    setStrokeIndex(0)
    taken.current = 0
    setDrawing(false)
    setTakenCount(0)
    onChange('')
  }

  const onDown = (e: React.PointerEvent) => {
    if (disabled || done || !current) return
    // Иначе браузер примет зажатую мышь за протяжку выделения и оборвёт ведение.
    e.preventDefault()
    const p = toLocal(e.clientX, e.clientY)
    if (!p) return
    // Продолжают оттуда, где остановились: с начала черты, а если её уже начали
    // и отпустили — с кончика написанного. Там же стоит кружок со стрелкой.
    const nearResume = Math.hypot(p[0] - resumeAt[0], p[1] - resumeAt[1]) <= START_TOLERANCE
    // От начала черты тоже пускаем: кто хочет обвести её целиком заново, просто
    // ведёт от старта — написанное никуда не денется, и с кончика оно поедет
    // дальше само, когда палец до него дойдёт.
    const nearStart = Math.hypot(p[0] - current.pts[0][0], p[1] - current.pts[0][1]) <= START_TOLERANCE
    if (!nearResume && !nearStart) {
      setNudge(n => n + 1)
      return
    }
    if (taken.current === 0) taken.current = 1
    buzzed.current = taken.current
    setDrawing(true)
  }

  // Пока ведут, движение и отпускание слушает окно: так черта не рвётся, если
  // палец соскользнул за край квадрата или браузер решил не отдавать захват.
  useEffect(() => {
    if (!drawing || !current || !denseCurrent) return

    const move = (e: PointerEvent) => {
      e.preventDefault()
      // Браузер отдаёт движения пачками, склеивая всё, что случилось между
      // кадрами. Взять из пачки только последнюю точку — значит пропустить
      // середину быстрого росчерка: палец «перепрыгнул» кусок линии, и заливка
      // за ним не пошла. Разжимаем пачку и считаем весь пройденный путь.
      const coalesced = e.getCoalescedEvents?.() ?? []
      const steps = coalesced.length ? coalesced : [e]

      let seen = false
      let next = taken.current
      for (const step of steps) {
        const p = toLocal(step.clientX, step.clientY)
        if (!p) continue
        seen = true
        // Берём БЛИЖАЙШУЮ к пальцу точку, а не все, до которых дотянулся допуск.
        // Иначе чернила убегают вперёд руки на весь допуск: отпустил на середине
        // перекладины, а залито уже на треть дальше — и непонятно, где ты
        // остановился и откуда продолжать.
        //
        // ОКНО СМОТРИТ И НАЗАД — ИНАЧЕ ЧЕРНИЛА ЕДУТ БЫСТРЕЕ ПАЛЬЦА. Раньше поиск
        // начинался с уже пройденной точки, и позади пальца смотреть было
        // некуда: точка `next` лежит впереди руки, но в пределах допуска — и
        // потому оказывалась «ближайшей в окне». Каждое движение сдвигало
        // заливку на шаг сгущения независимо от того, сколько прошла рука, так
        // что при плавном ведении линия убегала ровно на весь допуск (замер:
        // палец на 50, край чернил на 65 из 100) и там ехала впереди пальца.
        // Со взглядом назад ближайшая точка — настоящая проекция руки на черту.
        let best = -1
        let bestDist = TOLERANCE
        const from = Math.max(0, next - LOOKAHEAD)
        const limit = Math.min(denseCurrent.length, next + LOOKAHEAD)
        for (let i = from; i < limit; i++) {
          const d = Math.hypot(p[0] - denseCurrent[i][0], p[1] - denseCurrent[i][1])
          if (d < bestDist) { bestDist = d; best = i }
        }
        // Назад заливка не отматывается: провёл — написано. Вперёд её двигает
        // только сам палец, и не дальше окна, чтобы нельзя было перепрыгнуть
        // середину черты.
        if (best >= 0) next = Math.max(next, best + 1)
      }
      if (!seen) return

      if (next !== taken.current) {
        taken.current = next
        setTakenCount(next)
        // Точки частые, и отклик на каждую превратился бы в непрерывный зуд:
        // отмечаем заметный кусок пути, а не каждый шаг сгущения.
        if (next - buzzed.current >= 10) {
          buzzed.current = next
          vibrate(4)
        }
      }
    }

    const up = () => {
      setDrawing(false)
      // Незаконченную черту не сбрасываем: снял руку — написанное осталось, и
      // кружок со стрелкой ждёт на кончике. Сбрасывает только «Заново».
      if (taken.current < denseCurrent.length) return
      taken.current = 0
      setTakenCount(0)
      const next = strokeIndex + 1
      setStrokeIndex(next)
      // Дописанная буква — это уже верный ответ, а не просто «закрылась ещё
      // одна черта»: холст сам себе эталон, сверять после него нечего. Поэтому
      // последняя черта звучит каноническим «верно», а промежуточные —
      // нейтральным щелчком.
      if (next >= strokes.length) {
        okChime()
        vibrate([10, 30, 10])
        onChange('done')
      } else {
        playPop()
      }
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, strokeIndex, denseCurrent, strokes.length])

  const paths = useMemo(() => strokes.map(s => strokePath(s)), [strokes])

  if (!letter) return null

  return (
    // Выделение текста здесь только мешает: протяжка по букве не должна
    // подсвечивать подпись под квадратом.
    <div className="flex flex-col" style={{ gap: 12, userSelect: 'none', WebkitUserSelect: 'none' }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <AudioPlayer ttsText={letter.ch} lang="ko" compact />
        <div>
          <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 700, color: 'var(--color-text)' }}>
            {letter.ch}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            {letter.sound}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {!disabled && (strokeIndex > 0 || takenCount > 0) && strokeIndex < strokes.length && (
          <button
            onClick={reset}
            className="flex items-center cursor-pointer"
            style={{
              gap: 6, padding: '8px 12px', borderRadius: 999,
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-muted)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
            }}
          >
            <RotateCcw size={13} />
            {t('Заново')}
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        onPointerDown={onDown}
        style={{
          width: '100%', maxWidth: 300, alignSelf: 'center', aspectRatio: '1',
          borderRadius: 22, background: 'var(--color-bg-3)',
          touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
          cursor: disabled || done ? 'default' : 'crosshair',
          // ВСЁ ВНУТРИ РИСУЕТСЯ ЦВЕТОМ ТЕКСТА, А ЯРКОСТЬ ЗАДАЁТСЯ ПРОЗРАЧНОСТЬЮ.
          //
          // Сначала буква под обводку была нарисована цветом рамки
          // (--color-border-strong). В светлой теме это сплошной серый и всё
          // читается, а в тёмной — белый с прозрачностью 0.15, и поверх него
          // ложилась ещё и прозрачность самой черты: 0.45 × 0.15 ≈ семь
          // процентов белого на почти чёрном. Буквы на экране просто не было,
          // и «обведите» превращалось в «угадайте, где линия».
          //
          // Цвет текста флипается вместе с темой сам, поэтому одна и та же
          // прозрачность честно работает в обеих.
          color: 'var(--color-text)',
        }}
      >
        {/* Разлиновка: без неё непонятно, где у квадрата середина, и буква
            уезжает в угол. */}
        <line x1="50" y1="4" x2="50" y2="96" stroke="currentColor" strokeOpacity={0.16} strokeWidth="0.5" strokeDasharray="3 3" />
        <line x1="4" y1="50" x2="96" y2="50" stroke="currentColor" strokeOpacity={0.16} strokeWidth="0.5" strokeDasharray="3 3" />

        {/* ПОДЛОЖКА СПЛОШНАЯ, А НЕ ПУНКТИРНАЯ. Пунктир с круглыми торцами при
            толщине 9 распадается на цепочку колбасок: буква читается «секциями»,
            а не линией, и ведение по ней выглядит рваным ещё до того, как к
            экрану притронулись. Направление показывает точка старта, а не
            штриховка. */}
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            // Пройденная черта — в полную силу, текущая — заметная тень,
            // будущие — намёк, по которому видно, что буква ещё не кончилась.
            strokeOpacity={i < strokeIndex ? 1 : i === strokeIndex ? 0.28 : 0.13}
            strokeWidth={INK_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* ЧЕРНИЛА. Буква наливается ровно на столько, сколько пройдено:
            pathLength=1 делает штрих долей пути, и линия растёт непрерывно,
            даже когда точки указателя приходят редкими пачками. Рисуется по
            самой черте, поэтому дрогнувшая рука не оставляет кляксу поперёк
            квадрата — она просто останавливает заливку. */}
        {current && !done && ink > 0 && (
          <path
            d={paths[strokeIndex]}
            fill="none"
            stroke="var(--color-blue-fill)"
            strokeWidth={INK_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${ink} 1`}
          />
        )}

        {/* Кончик пера: видно, где сейчас «рука» и докуда дописано. Шарик шире
            черты — вровень с ней он читался просто её обрезанным концом, — но
            посажен НАЗАД на разницу радиусов: центр в пройденной точке вынес бы
            передний край на два лишних деления вперёд пальца, ради чего вся
            арифметика с торцом и затевалась. */}
        {current && !done && drawing && (
          <circle cx={nib[0]} cy={nib[1]} r={NIB_R} fill="var(--color-blue-fill)" />
        )}

        {/* Точка старта текущей черты — с неё и только с неё начинают вести.
            nudge в ключе перезапускает пульс, когда нажали мимо: подсказка без
            лишней строки текста. */}
        {current && !done && !disabled && !drawing && (
          <motion.circle
            key={`${strokeIndex}-${nudge}`}
            cx={current.pts[0][0]}
            cy={current.pts[0][1]}
            r={7}
            fill="var(--color-blue-fill)"
            initial={{ scale: 0.7, opacity: 0.7 }}
            animate={{ scale: [0.85, 1.05, 0.85], opacity: 1 }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}

        {/* Стрелки рисуются ПОСЛЕ стартового кружка: у ㅇ черта кончается там
            же, где начинается, и наконечник «сюда вести» уходил под пульсирующий
            кружок — стрелки на экране просто не было. */}
        {/* ОТКУДА ПРОДОЛЖАТЬ И КУДА ВЕСТИ. У ㄴ и ㅁ по одной точке не понять,
            вниз линия пойдёт или влево, — а ошибка в направлении это уже другая
            буква. Поэтому рядом с кружком стрелка, повёрнутая по ходу черты; и
            стоят они не на старте, а там, где руку сняли. */}
        {current && !done && !disabled && !drawing && (
          <motion.g
            key={`${strokeIndex}-${nudge}-${takenIdx}`}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, repeat: Infinity, repeatType: 'reverse' }}
          >
            {/* Кружок на кончике написанного: с него продолжают, если руку
                сняли посреди черты. */}
            {takenIdx > 0 && <circle cx={resumeAt[0]} cy={resumeAt[1]} r={6} fill="var(--color-blue-fill)" />}
            {guide ? (
              <>
                <path
                  d={guide.d}
                  fill="none"
                  stroke="var(--color-blue-fill)"
                  // Тонко и заметно тоньше самой черты: подсказка показывает
                  // путь, а не изображает уже написанное. На толщине 2.2 линия
                  // читалась как налитые чернила, и было непонятно, обведено уже
                  // или нет.
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Наконечники обведены цветом подложки: без обводки синий
                    треугольник ложился прямо на серую черту той же ширины и
                    переставал читаться как стрелка. */}
                {guide.showLead && (
                  <path
                    d={ARROW_HEAD}
                    fill="var(--color-blue-fill)"
                    stroke="var(--color-bg-3)"
                    strokeWidth={1.2}
                    strokeLinejoin="round"
                    transform={`translate(${guide.lead[0]} ${guide.lead[1]}) rotate(${guide.leadAngle})`}
                  />
                )}
                <path
                  d={ARROW_HEAD}
                  fill="var(--color-blue-fill)"
                  stroke="var(--color-bg-3)"
                  strokeWidth={1.2}
                  strokeLinejoin="round"
                  transform={`translate(${guide.tip[0]} ${guide.tip[1]}) rotate(${guide.angle})`}
                />
              </>
            ) : (
              <path
                d={ARROW_HEAD}
                fill="var(--color-blue-fill)"
                stroke="var(--color-bg-3)"
                strokeWidth={1.2}
                strokeLinejoin="round"
                transform={`translate(${resumeAt[0]} ${resumeAt[1]}) rotate(${heading}) translate(14 0)`}
              />
            )}
          </motion.g>
        )}
      </svg>

      <p style={{ fontSize: 13, textAlign: 'center', color: done ? 'var(--color-green-text)' : 'var(--color-muted)' }}>
        {done
          ? t('Буква написана')
          : `${t('Черта')} ${Math.min(strokeIndex + 1, strokes.length)} ${t('из')} ${strokes.length} — ${t('ведите от точки')}`}
      </p>
    </div>
  )
}
