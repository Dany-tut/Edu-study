import { motion } from 'framer-motion'
import { ArrowDownToLine } from 'lucide-react'
import { useSmoothCollapse, glassBase } from './MobileDock'
import { useAppUpdate } from '../lib/appUpdate'
import { useT } from '../lib/i18n'
import { tactile } from '../lib/feedback'
import { TAP_SCALE } from '../lib/mobileTokens'

// Таблетка «есть обновление» — встаёт в док на месте переключателя курсов.
//
// Почему именно там: это единственная полка экрана, которую глаз и так
// проверяет, и она временная — обновление живёт минуту, а не всегда. Когда
// обновы нет, переключатель курсов стоит на своём месте как ни в чём не бывало.
//
// Тап заливает таблетку слева направо: снос воркера и чистка кешей занимают
// секунду-две, и без заливки экран в этот момент выглядит зависшим.

export default function UpdateDockPill() {
  const t = useT()
  const collapsed = useSmoothCollapse()
  const phase = useAppUpdate(s => s.phase)
  const remote = useAppUpdate(s => s.remoteVersion)
  const progress = useAppUpdate(s => s.progress)
  const apply = useAppUpdate(s => s.apply)

  const updating = phase === 'updating'
  const pct = Math.min(100, Math.round(progress * 100))

  return (
    <motion.button
      type="button"
      // Приезжает снизу пружиной: обновление появилось только что, и таблетка
      // должна это показать, а не подмениться беззвучно.
      initial={{ opacity: 0, y: 18, scale: 0.94 }}
      animate={{
        opacity: collapsed ? 0 : 1,
        y: collapsed ? 46 : 0,
        scale: collapsed ? 0.9 : 1,
        filter: collapsed ? 'blur(9px)' : 'blur(0px)',
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      whileTap={{ scale: updating ? 1 : TAP_SCALE }}
      onClick={() => { if (!updating) { tactile(); void apply() } }}
      aria-label={t('Обновить')}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 9,
        height: 46, padding: '0 6px 0 16px', maxWidth: 340, minWidth: 0,
        borderRadius: 999, cursor: updating ? 'default' : 'pointer',
        transformOrigin: 'bottom center',
        ...glassBase,
      }}
    >
      {/* Заливка прогресса — под содержимым, поэтому подпись читается всегда.
          Ширина едет обычным CSS-переходом, а не анимацией framer: полоса
          должна ползти даже там, где кадры идут туго. */}
      <span
        aria-hidden
        style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: updating ? `${pct}%` : 0,
          background: 'var(--grad-purple)', opacity: 0.9,
          transition: 'width 0.18s linear',
        }}
      />

      <span
        className="flex items-center"
        style={{
          position: 'relative', gap: 7, minWidth: 0,
          fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
          color: updating && pct > 12 ? '#fff' : 'var(--color-text-2)',
          transition: 'color 0.2s',
        }}
      >
        <ArrowDownToLine size={15} strokeWidth={2.3} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {updating ? `${t('Обновляем…')} ${pct}%` : `${t('Есть обновление')}${remote ? ` · ${remote}` : ''}`}
        </span>
      </span>

      {/* Кнопка справа — та же сплошная фиолетовая, что и везде. Во время
          загрузки исчезает: жать больше некуда, работа уже идёт. */}
      {!updating && (
        <span
          style={{
            position: 'relative', flexShrink: 0,
            height: 34, display: 'inline-flex', alignItems: 'center', padding: '0 15px',
            borderRadius: 999, background: 'var(--grad-purple)', color: '#fff',
            fontSize: 12.5, fontWeight: 700,
          }}
        >
          {t('Обновить')}
        </span>
      )}
    </motion.button>
  )
}
