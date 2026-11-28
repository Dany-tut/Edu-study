// ─────────────────────────────────────────────────────────────────────────────
// «Вопрос по уроку» в конце конспекта: карточка того же вида, что «Проверка
// себя» (AnswerReveal), и кнопка, которая сразу открывает обратную связь с
// заполненным разделом («Бухгалтерия, урок №25»). Скриншот вставляется в форме
// (Ctrl+V / Cmd+V или кнопкой фото) — искать «меню профиля → Обратная связь»
// не нужно. Кнопка видна всегда, без наведения (docs/platforms.md).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import FeedbackModal from './FeedbackModal'
import OpticalText from './OpticalText'
import { MessageCircleQuestion } from './icons/appIcons'
import { PLATFORM } from '../lib/platform'
import { useT } from '../lib/i18n'

export default function LessonAskCard({ section, scale = 1 }: { section: string; scale?: number }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div
      className="lesson-ask-card flex items-center"
      style={{
        gap: 12, padding: '12px 14px', borderRadius: 16,
        border: '1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-border-soft))',
        background: 'var(--color-bg-2)',
      }}
    >
      <span className="answer-reveal-icon" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--color-accent-soft)', color: 'var(--color-accent)',
      }}>
        <MessageCircleQuestion size={17} />
      </span>
      <span className="lesson-ask-text flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
        <span style={{ fontSize: 14 * scale, fontWeight: 600, lineHeight: 1.35, color: 'var(--color-text)' }}>
          {t('Вопрос по уроку')}
        </span>
        <span style={{ fontSize: 13 * scale, lineHeight: 1.4, color: 'var(--color-text-2)' }}>
          {t('Непонятно или у вас на работе иначе? Напишите и приложите скриншот.')}
        </span>
        <span style={{ fontSize: 12 * scale, lineHeight: 1.35, color: 'var(--color-muted)' }}>
          {t('Без ФИО, ИНН и номеров счетов.')}
        </span>
      </span>
      <button
        type="button"
        data-hover="layer"
        onClick={() => setOpen(true)}
        className="flex items-center flex-shrink-0 cursor-pointer"
        style={{
          // Действие карточки — мягкий акцент, а не графит «Показать»: блок
          // должен считываться как приглашение написать, иначе его не видно.
          height: 34 * scale, padding: `0 ${14 * scale}px`, borderRadius: 999,
          border: 0, background: 'var(--color-accent-soft)',
          fontFamily: 'inherit', fontSize: 13 * scale, fontWeight: 600, color: 'var(--color-accent)',
        }}
      >
        <OpticalText as="iskra-button-label">{t('Задать вопрос')}</OpticalText>
      </button>
      {open && (
        <FeedbackModal
          role="student"
          defaultSection={section}
          bottomSheet={PLATFORM === 'iphone'}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
