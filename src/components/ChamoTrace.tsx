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
// КАК УСТРОЕНА ПРОВЕРКА. Черта — ломаная из точек (data/hangul.ts). Палец
// должен пройти её от начала к концу, не отходя дальше TOLERANCE: считаем,
// сколько подряд идущих опорных точек он «взял». Отпустил на середине — черта
// сбрасывается и её начинают заново; дошёл до конца — черта фиксируется, и
// подсвечивается следующая. Никакого «почти правильно»: черта либо пройдена,
// либо нет.
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
const TOLERANCE = 15

/** Сколько опорных точек черты надо взять, чтобы считать её пройденной. */
const progressOf = (stroke: Stroke, taken: number) => taken / stroke.pts.length

/** Расстояние от точки до отрезка. */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
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
  /**
   * Ход текущей черты живёт в ref, а не в state, и это принципиально: события
   * pointermove приходят пачкой, а состояние обновляется только между
   * перерисовками. Через state каждое следующее движение читало бы значение,
   * устаревшее на всю пачку, — палец идёт по линии, а счётчик стоит на первой
   * точке, и черта не засчитывается никогда.
   */
  const taken = useRef(0)
  const drawing = useRef(false)
  const done = value === 'done'

  const strokes = letter?.strokes ?? []

  // Готовое задание, открытое заново (возврат к заданию, F5), показывает букву
  // целиком: переобводить её, чтобы вернуть себе уже полученный балл, незачем.
  useEffect(() => {
    if (done) setStrokeIndex(strokes.length)
  }, [done, strokes.length])

  const current = strokes[strokeIndex]

  /** Экранные координаты → квадрат буквы 0..100. */
  const toLocal = (e: React.PointerEvent): Point | null => {
    const box = svgRef.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    return [((e.clientX - box.left) / box.width) * 100, ((e.clientY - box.top) / box.height) * 100]
  }

  const reset = () => { setStrokeIndex(0); taken.current = 0; drawing.current = false; onChange('') }

  const onDown = (e: React.PointerEvent) => {
    if (disabled || done || !current) return
    const p = toLocal(e)
    if (!p) return
    // Начинать надо от начала черты — с той точки, где стоит кружок со стрелкой.
    if (Math.hypot(p[0] - current.pts[0][0], p[1] - current.pts[0][1]) > TOLERANCE * 1.6) return
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* мышь без захвата — не беда */ }
    drawing.current = true
    taken.current = 1
  }

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !current) return
    const p = toLocal(e)
    if (!p) return
    const pts = current.pts
    // Следующая опорная точка засчитывается, когда палец до неё дошёл; при этом
    // он не должен уходить от самой линии дальше допуска.
    let next = taken.current
    while (next < pts.length && Math.hypot(p[0] - pts[next][0], p[1] - pts[next][1]) < TOLERANCE) next++
    if (next !== taken.current) {
      taken.current = next
      vibrate(6)
    } else {
      const a = pts[Math.max(0, taken.current - 1)]
      const b = pts[Math.min(pts.length - 1, taken.current)]
      if (distToSegment(p, a, b) > TOLERANCE * 1.4) {
        // Ушёл с линии — черту начинают заново. Иначе «обвёл» превращается в
        // «поводил пальцем по экрану».
        drawing.current = false
        taken.current = 0
      }
    }
  }

  const onUp = () => {
    if (!drawing.current || !current) return
    drawing.current = false
    const complete = progressOf(current, taken.current) >= 1
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

  const paths = useMemo(() => strokes.map(s => strokePath(s)), [strokes])

  if (!letter) return null

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <AudioPlayer ttsText={letter.ch} lang="ko" compact />
        <div>
          <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 700, color: 'var(--color-text)' }}>
            {letter.ch}
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>
            {letter.sound} · {t('черт')}: {strokes.length}
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
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          width: '100%', maxWidth: 300, alignSelf: 'center', aspectRatio: '1',
          borderRadius: 22, background: 'var(--color-bg-3)',
          touchAction: 'none', cursor: disabled || done ? 'default' : 'crosshair',
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

        {/* Точка старта текущей черты — с неё и только с неё начинают вести. */}
        {current && !done && !disabled && (
          <motion.circle
            key={strokeIndex}
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
