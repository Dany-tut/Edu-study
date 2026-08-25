import { compareHeard } from '../lib/asr'
import { useT } from '../lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// «Что услышал браузер» — строка сверки под записью голоса
//
// ОДНА НА ДВА МЕСТА. Шэдоуинг в тренажёре показывает её как подсказку к своей
// записи, устное задание домашки — как вердикт. Рисуется одно и то же: текст,
// в котором слова не из эталона подсвечены, и приписка «не прозвучало». Раньше
// это жило внутри Shadowing.tsx одним куском разметки; второе место означало бы
// вторую копию — и расхождение в том, что считать совпадением.
//
// ЭТО НЕ ОЦЕНКА ПРОИЗНОШЕНИЯ. Распознавание речи возвращает текст, а не
// близость к эталону (см. lib/asr.ts). Поэтому формулировки говорят о СЛОВАХ:
// «совпало с образцом», «не прозвучало» — и никогда о том, как это прозвучало.
// ─────────────────────────────────────────────────────────────────────────────

export default function SpeechHeard({ heard, target, ok, title }: {
  /** Что вернула распознавалка. */
  heard: string
  /** Эталон, с которым сверяем. */
  target: string
  /**
   * Вердикт вызывающего. Домашка засчитывает эталон, прозвучавший целиком
   * (лишнее сверх него не в счёт), шэдоуинг — только полное совпадение.
   * Не задан — по полному совпадению.
   */
  ok?: boolean
  /** Подпись сверху. Не задана — «Услышано». */
  title?: string
}) {
  const t = useT()
  if (!heard.trim() || !target.trim()) return null

  const cmp = compareHeard(heard, target)
  const good = ok ?? cmp.matched

  return (
    <div style={{
      padding: '12px 16px', borderRadius: 14, fontSize: 13, lineHeight: 1.55,
      background: 'var(--color-bg-2)',
      border: `1px solid ${good ? 'var(--color-green-text)' : 'var(--color-border-medium)'}`,
    }}>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginBottom: 4 }}>
        {title ?? (good ? t('Услышано — совпало с образцом') : t('Услышано'))}
      </div>
      <div style={{ color: 'var(--color-text)' }}>
        {cmp.got.map((w, i) => (
          <span key={i} style={{
            color: cmp.wanted.has(w) ? 'var(--color-text)' : 'var(--color-red-text)',
            fontWeight: cmp.wanted.has(w) ? 500 : 700,
          }}>
            {w}{i < cmp.got.length - 1 ? ' ' : ''}
          </span>
        ))}
      </div>
      {!good && cmp.missing.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 4 }}>
          {t('Не прозвучало')}: {cmp.missing.join(', ')}
        </div>
      )}
    </div>
  )
}
