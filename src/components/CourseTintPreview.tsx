import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, ClipboardList, Dumbbell, BookOpen, Home, Flame, CheckCircle2, Star, Trophy, Sparkles } from 'lucide-react'
import { previewVars, type TintLevel } from '../lib/courseTint'
import { useTheme } from '../store/themeStore'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Живой макет «что изменится» для настроек цвета курса.
//
// ЗАЧЕМ. Шторка настроек закрывает ровно тот экран, который и перекрашивается:
// ученик выбирал уровень вслепую и, чтобы увидеть результат, должен был закрыть
// настройки, посмотреть, открыть заново. Здесь тот же экран уменьшен и лежит
// над переключателем.
//
// КАК. Обёртке выдаётся ПОЛНЫЙ набор переменных (previewVars): то, что даёт
// выбранный уровень, плюс брендовые значения на всё остальное. Поэтому макет
// показывает выбранный уровень честно, даже когда приложение вокруг покрашено
// иначе — например, пока ученик примеряет «Выключено» на перекрашенном экране.
//
// Что показано, тем и отличаются уровни: «Акцент» трогает только карточку,
// иконку дока и прогресс; «Подложки» добавляют плитки, бейджи и левый чипс
// статистики; «Среда» уводит фон и стекло. Зелёный чипс стоит рядом нарочно —
// он не шевелится ни на одном уровне, и это видно.
//
// ПОЧЕМУ ПОДСВЕТКА. Одного перекраса мало: «Акцент» и «Подложки» отличаются
// заливками площадью в пару чипсов, а если курс синий, а бренд фиолетовый, то
// разница — полтона на 30 пикселях, и переключатель кажется мёртвым. Поэтому
// при смене уровня то, что этой сменой ЗАДЕТО, на секунду обводится кольцом:
// видно не «стало чуть иначе», а «поменялось вот это, это и это». Обводятся
// именно перешедшие ступени — с «Акцента» на «Среду» вспыхнут и подложки, и
// фон. Ради той же разницы у «Подложек» добавлен ряд бейджей: на одном чипсе
// ступень не прочитывается, на четырёх — прочитывается.
// ─────────────────────────────────────────────────────────────────────────────

const ORDER: TintLevel[] = ['off', 'accent', 'soft', 'ambient']
/** Ступень, на которой элемент впервые красится: 1 — акцент, 2 — подложки, 3 — среда. */
type Tier = 1 | 2 | 3

/** Обводка вокруг элемента, который только что перешёл границу уровня. */
function Zone({
  tier, flash, radius, children, style,
}: {
  tier: Tier
  flash: { tiers: Tier[]; n: number }
  radius: number
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ position: 'relative', ...style }}>
      {children}
      {flash.tiers.includes(tier) && (
        <motion.span
          // Ключ — счётчик переключений: кольцо начинает заново на каждом тапе,
          // даже если тот же элемент задет второй раз подряд.
          key={flash.n}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.15, times: [0, 0.1, 0.55, 1], ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: -3, borderRadius: radius + 3,
            border: '2px solid var(--color-accent)', pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

export default function CourseTintPreview({ hex, level }: { hex: string; level: TintLevel }) {
  const t = useT()
  const { dark } = useTheme()
  const vars = previewVars(hex, level, dark)

  // Что вспыхнуло: ступени между прошлым уровнем и новым. Понижение подсвечивает
  // ровно то же самое — «Среда» → «Акцент» показывает, что именно погасло.
  const prev = useRef(level)
  const [flash, setFlash] = useState<{ tiers: Tier[]; n: number }>({ tiers: [], n: 0 })
  useEffect(() => {
    const from = ORDER.indexOf(prev.current)
    const to = ORDER.indexOf(level)
    prev.current = level
    if (from === to) return
    const tiers: Tier[] = []
    for (let i = Math.min(from, to) + 1; i <= Math.max(from, to); i++) tiers.push(i as Tier)
    setFlash(f => ({ tiers, n: f.n + 1 }))
  }, [level])

  return (
    <div
      style={{
        ...(vars as React.CSSProperties),
        position: 'relative',
        borderRadius: 18,
        overflow: 'hidden',
        border: '1px solid var(--color-border-soft)',
        background: 'var(--color-bg)',
        padding: '12px 12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        // Цвета внутри переезжают плавно — это и есть ответ на тап по уровню.
        transition: 'background-color 0.32s ease',
      }}
      aria-hidden
    >
      {/* Кольцо «среды» идёт по самому макету: у этой ступени меняется всё поле,
          обводить внутри нечего. */}
      {flash.tiers.includes(3) && (
        <motion.span
          key={flash.n}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.15, times: [0, 0.1, 0.55, 1], ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 2, borderRadius: 16,
            border: '2px solid var(--color-accent)', pointerEvents: 'none', zIndex: 3,
          }}
        />
      )}

      {/* Шапка-таблетка */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="flex items-center" style={{
          gap: 6, height: 26, padding: '0 12px', borderRadius: 999,
          background: 'rgba(var(--glass-rgb), 0.98)',
          boxShadow: 'var(--shadow-pill)',
          fontSize: 10.5, fontWeight: 700, color: 'var(--color-text)',
        }}>
          <Flame size={11} style={{ color: '#F59E0B' }} />
          2 {t('дней')}
        </div>
      </div>

      {/* Быстрые плитки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {[Play, ClipboardList, Dumbbell, BookOpen].map((Icon, i) => {
          const tile = (
            <div className="flex items-center justify-center" style={{
              height: 32, borderRadius: 10,
              background: i === 0 ? 'var(--color-purple-soft)' : 'var(--color-bg-5)',
              color: i === 0 ? 'var(--color-purple-text)' : 'var(--color-text-3)',
              transition: 'background-color 0.32s ease, color 0.32s ease',
            }}>
              <Icon size={14} strokeWidth={2} />
            </div>
          )
          return i === 0
            ? <Zone key={i} tier={2} flash={flash} radius={10}>{tile}</Zone>
            : <div key={i}>{tile}</div>
        })}
      </div>

      {/* Герой «Продолжить» */}
      <Zone tier={1} flash={flash} radius={14}>
      <div style={{
        borderRadius: 14, padding: '10px 11px', color: '#fff',
        background: 'var(--grad-purple)', boxShadow: 'var(--glow-accent)',
        transition: 'background 0.32s ease',
      }}>
        <div style={{ fontSize: 8, fontWeight: 700, opacity: 0.85, letterSpacing: '0.05em' }}>
          {t('ПРОДОЛЖИТЬ')}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 800, margin: '3px 0 7px' }}>{t('Занятие')} #4</div>
        <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.3)' }}>
          <div style={{ width: '42%', height: 4, borderRadius: 99, background: '#fff' }} />
        </div>
      </div>
      </Zone>

      {/* Бейджи — вторая половина «Подложек»: одного чипса статистики мало,
          чтобы ступень читалась. */}
      <Zone tier={2} flash={flash} radius={10}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[Star, Trophy, Sparkles].map((Icon, i) => (
            <div key={i} className="flex items-center" style={{
              gap: 4, height: 22, padding: '0 9px', borderRadius: 999,
              background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)',
              fontSize: 10, fontWeight: 800,
              transition: 'background-color 0.32s ease, color 0.32s ease',
            }}>
              <Icon size={10} />{[7, 3, 12][i]}
            </div>
          ))}
        </div>
      </Zone>

      {/* Статистика: левый чипс идёт за курсом, зелёный — никогда */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        <Zone tier={2} flash={flash} radius={10}>
        <div className="flex items-center" style={{
          gap: 5, height: 30, padding: '0 9px', borderRadius: 10,
          background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)',
          fontSize: 11, fontWeight: 800,
          transition: 'background-color 0.32s ease, color 0.32s ease',
        }}>
          <BookOpen size={11} />42%
        </div>
        </Zone>
        <div className="flex items-center" style={{
          gap: 5, height: 30, padding: '0 9px', borderRadius: 10,
          background: 'var(--color-green-soft)', color: 'var(--color-green-text)',
          fontSize: 11, fontWeight: 800,
        }}>
          <CheckCircle2 size={11} />5
        </div>
      </div>

      {/* Док */}
      <Zone tier={1} flash={flash} radius={14}>
      <div className="flex items-center justify-around" style={{
        height: 34, borderRadius: 14, padding: '0 6px',
        background: 'rgba(var(--glass-rgb), 0.98)',
        boxShadow: 'var(--shadow-bar)',
      }}>
        {[Home, BookOpen, Dumbbell, ClipboardList].map((Icon, i) => (
          <Icon
            key={i}
            size={14}
            strokeWidth={i === 0 ? 2.5 : 1.8}
            style={{ color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-4)', transition: 'color 0.32s ease' }}
          />
        ))}
      </div>
      </Zone>
    </div>
  )
}
