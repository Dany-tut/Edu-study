import { ArrowUpRight } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// «Открыть раздел» у БОЛЬШИХ виджетов Главной (ПК): одна кнопка в правом верхнем
// углу шапки. Вид — как «+» у «Моих задач» (32×32, радиус 10, фон bg-3, иконка
// акцентом 17), чтобы все кнопки шапок стояли одним рядом и одним размером.
// У маленьких карточек-метрик открытие — кружок со стрелкой внизу справа
// (_MiniStatCard). У виджета одна точка открытия: без «Все →» и «Открыть» в подвале.
// ─────────────────────────────────────────────────────────────────────────────

export default function WidgetOpenButton({ onOpen, label }: { onOpen: () => void; label?: string }) {
  const t = useT()
  const text = label ?? t('Открыть')
  return (
    <button type="button" data-hover="layer" className="ww-open" aria-label={text} title={text}
      onClick={e => { e.stopPropagation(); onOpen() }}>
      <ArrowUpRight size={17} />
    </button>
  )
}
