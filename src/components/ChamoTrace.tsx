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
// подсвечивается следующая; отпустил раньше — черту начинают заново.
//
// ЗА ПАЛЬЦЕМ ТЯНЕТСЯ ЧЕРНИЛЬНЫЙ СЛЕД. Без него обводка немая: линия не
// шевелится, и непонятно, ведёшь ты или экран тебя не слышит. Рисуем ровно тот
// путь, который прошёл указатель, — это и обратная связь, и видно, где съехал.
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
import { useT } from '../lib/i18n'
import AudioPlayer from './AudioPlayer'

/** Насколько далеко от линии можно вести палец (в единицах квадрата 0..100). */
const TOLERANCE = 16

/** Начать черту можно, попав в этот радиус вокруг стартовой точки. */
const START_TOLERANCE = 24

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
  /** Чернильный след текущего ведения — то, что тянется за пальцем. */
  const [trail, setTrail] = useState<Point[]>([])
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

  const reset = () => {
    setStrokeIndex(0)
    taken.current = 0
    setDrawing(false)
    setTrail([])
    onChange('')
  }

  const onDown = (e: React.PointerEvent) => {
    if (disabled || done || !current) return
    // Иначе браузер примет зажатую мышь за протяжку выделения и оборвёт ведение.
    e.preventDefault()
    const p = toLocal(e.clientX, e.clientY)
    if (!p) return
    // Начинать надо от начала черты — с той точки, где пульсирует кружок.
    if (Math.hypot(p[0] - current.pts[0][0], p[1] - current.pts[0][1]) > START_TOLERANCE) {
      setNudge(n => n + 1)
      return
    }
    taken.current = 1
    buzzed.current = 0
    setTrail([current.pts[0], p])
    setDrawing(true)
  }

  // Пока ведут, движение и отпускание слушает окно: так черта не рвётся, если
  // палец соскользнул за край квадрата или браузер решил не отдавать захват.
  useEffect(() => {
    if (!drawing || !current || !denseCurrent) return

    const move = (e: PointerEvent) => {
      e.preventDefault()
      const p = toLocal(e.clientX, e.clientY)
      if (!p) return
      // След тянется всегда — даже когда съехали с линии: по нему и видно, куда.
      setTrail(prev => {
        const last = prev[prev.length - 1]
        if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.6) return prev
        return [...prev, p]
      })
      let next = taken.current
      while (next < denseCurrent.length && Math.hypot(p[0] - denseCurrent[next][0], p[1] - denseCurrent[next][1]) < TOLERANCE) next++
      if (next !== taken.current) {
        taken.current = next
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
      setTrail([])
      const complete = taken.current >= denseCurrent.length
      taken.current = 0
      if (!complete) return
      const next = strokeIndex + 1
      setStrokeIndex(next)
      playPop()
      if (next >= strokes.length) {
        vibrate([10, 30, 10])
        onChange('done')
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
        {!disabled && strokeIndex > 0 && strokeIndex < strokes.length && (
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

        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            // Пройденная черта — в полную силу, текущая — заметный пунктир,
            // будущие — тень, по которой видно, что буква ещё не кончилась.
            strokeOpacity={i < strokeIndex ? 1 : i === strokeIndex ? 0.42 : 0.16}
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={i === strokeIndex && !done ? '4 5' : undefined}
          />
        ))}

        {/* Чернила: путь, который прошёл указатель. Рисуются поверх пунктира,
            чтобы линия «вилась» прямо под пальцем, а не появлялась потом. */}
        {trail.length > 1 && (
          <polyline
            points={trail.map(p => `${p[0]},${p[1]}`).join(' ')}
            fill="none"
            stroke="var(--color-blue-fill)"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.85}
          />
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
      </svg>

      <p style={{ fontSize: 13, textAlign: 'center', color: done ? 'var(--color-green-text)' : 'var(--color-muted)' }}>
        {done
          ? t('Буква написана')
          : `${t('Черта')} ${Math.min(strokeIndex + 1, strokes.length)} ${t('из')} ${strokes.length} — ${t('ведите от точки')}`}
      </p>
    </div>
  )
}
