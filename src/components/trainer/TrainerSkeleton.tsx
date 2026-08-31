// ─────────────────────────────────────────────────────────────────────────────
// Заглушка тренажёра на время загрузки данных ученика
//
// ЗАЧЕМ. Тренажёр — это развилка: языковому ученику показывается языковой
// тренажёр, остальным — банк ЕГЭ. Решается она по курсу из studentDataStore, а
// он приезжает по сети. До ответа сервера курсов нет вообще, и развилка молча
// падала в банк: после F5 ученик-кореец успевал увидеть «Банк заданий ЕГЭ-2026 ·
// Биология · Всего: 0» и только потом свой корейский.
//
// Ждать нечего — правильный ответ ещё не известен, поэтому ни одну из двух
// сторон показывать нельзя. Здесь общая для них геометрия: рейл слева, строка
// управления, сетка карточек. Что бы ни выиграло развилку, блоки останутся на
// местах и содержимое просто проявится вместо серых плашек.
// ─────────────────────────────────────────────────────────────────────────────

import TrainerShell, { useTrainerNarrow } from './TrainerShell'
import { useT } from '../../lib/i18n'

/** Серая плашка: класс .skeleton даёт фон и бегущий блик. */
function Bar({ w = '100%', h = 14, r = 8 }: { w?: number | string; h?: number; r?: number }) {
  return <span aria-hidden className="skeleton" style={{ display: 'block', width: w, height: h, borderRadius: r }} />
}

export default function TrainerSkeleton() {
  const t = useT()
  // На телефоне рейл уходит в шторку, и от заглушки остаются строка управления
  // и несколько карточек — «кусочек по центру» посреди пустого экрана. Поэтому
  // на узком добавляется шапка (место предмета с переключателем) и список
  // тянется до низа окна: экран занят целиком, как и после загрузки.
  const narrow = useTrainerNarrow()
  const rows = narrow ? 7 : 3
  return (
    <div role="status" aria-busy="true" aria-label={t('Загрузка тренажёра')}>
      <TrainerShell
        rail={
          <>
            {/* Шапка рейла — на её месте появится предмет с переключателем языков. */}
            <Bar h={104} r={16} />
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 11, padding: 14, borderRadius: 16,
              background: 'rgba(var(--glass-rgb), 0.94)',
              border: '1px solid var(--color-border-soft)',
            }}>
              <Bar w="45%" h={13} />
              <Bar h={38} r={12} />
              <Bar h={38} r={12} />
              <Bar h={38} r={12} />
            </div>
          </>
        }
        toolbar={
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <Bar w={112} h={36} r={999} />
            <Bar w={196} h={36} r={999} />
            <Bar w={148} h={36} r={999} />
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {narrow && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: '18px 18px 20px', borderRadius: 20, marginBottom: 2,
              background: 'rgba(var(--glass-rgb), 0.94)',
              border: '1px solid var(--color-border-soft)',
            }}>
              <Bar w="52%" h={20} r={10} />
              <Bar w="34%" h={13} />
            </div>
          )}
          {Array.from({ length: rows }, (_, i) => i).map(i => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', gap: 9,
                padding: '16px 18px', borderRadius: 18,
                background: 'var(--color-bg-2)', border: '1px solid var(--color-border)',
                // Лёгкое затухание вглубь списка: край выборки не притворяется
                // содержимым, которого может и не оказаться.
                // Затухают только два последних ряда: при семи плашках
                // равномерный шаг гасил бы список уже на середине экрана.
                opacity: i >= rows - 2 ? 1 - (i - (rows - 3)) * 0.26 : 1,
              }}
            >
              <Bar w={170} h={12} />
              <Bar w={`${64 - (i % 3) * 9}%`} h={17} />
            </div>
          ))}
        </div>
      </TrainerShell>
    </div>
  )
}
