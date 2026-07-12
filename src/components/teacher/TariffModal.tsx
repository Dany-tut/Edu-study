import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Check, Sparkles } from 'lucide-react'
import FeedbackModal from '../FeedbackModal'
import { PLAN_TIERS, type PlanTier } from '../../lib/plan'
import { tactile } from '../../lib/feedback'
import { useT } from '../../lib/i18n'

// Витрина тарифов (мобильный профиль учителя). Оплата не подключена: выбор
// тарифа = предзаполненная заявка в «Обратную связь», админ назначает вручную.
// Текущий тариф подсвечен и не предлагается к выбору.

export default function TariffModal({ currentName, currentMaxStudents, onClose }: {
  currentName?: string
  currentMaxStudents?: number | null
  onClose: () => void
}) {
  const t = useT()
  const [askPlan, setAskPlan] = useState<PlanTier | null>(null)

  // Esc закрывает.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Совпадение текущего тарифа: сначала по лимиту, иначе по названию.
  const isCurrent = (p: PlanTier) => {
    if (currentMaxStudents != null && p.maxStudents === currentMaxStudents) return true
    if (currentName && p.name.toLowerCase() === currentName.toLowerCase().replace(/·.*$/, '').trim()) return true
    return false
  }

  const price = (n: number) => (n === 0 ? t('бесплатно') : `${n.toLocaleString('ru-RU')} ₽`)

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1200 }}
      />
      <div style={{ position: 'fixed', inset: 0, zIndex: 1201, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 18 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            pointerEvents: 'auto', width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
            background: 'var(--color-bg-2)', borderRadius: 22, padding: 22,
            border: '1px solid var(--color-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 16 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={19} style={{ color: 'var(--color-purple)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{t('Тарифы')}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>{t('Выберите тариф — мы свяжемся и подключим его')}</div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {PLAN_TIERS.map(p => {
              const current = isCurrent(p)
              return (
                <div
                  key={p.code}
                  style={{
                    borderRadius: 16, padding: '15px 16px',
                    border: current ? '2px solid var(--color-purple)' : '1px solid var(--color-border-soft)',
                    background: current ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 750, color: 'var(--color-text)' }}>{t(p.name)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      {price(p.priceRub)}{p.priceRub > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)' }}> /{t('мес')}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2 }}>{t(p.tagline)}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 11 }}>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                        <Check size={14} style={{ color: 'var(--color-purple)', flexShrink: 0 }} strokeWidth={2.6} />
                        {t(f)}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 13 }}>
                    {current ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--color-purple)', background: 'var(--color-bg-2)', padding: '7px 13px', borderRadius: 20 }}>
                        <Check size={14} strokeWidth={2.6} /> {t('Ваш тариф')}
                      </div>
                    ) : (
                      <button
                        onClick={() => { tactile(); setAskPlan(p) }}
                        style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'var(--color-purple)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}
                      >
                        {t('Выбрать')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 14, textAlign: 'center', lineHeight: 1.4 }}>
            {t('Оплата подключается вручную: после заявки мы свяжемся с вами.')}
          </div>
        </motion.div>
      </div>

      {askPlan && (
        <FeedbackModal
          role="teacher"
          defaultSection="Тариф"
          defaultMessage={`${t('Хочу перейти на тариф')} «${t(askPlan.name)}» (${askPlan.priceRub === 0 ? t('бесплатно') : `${askPlan.priceRub.toLocaleString('ru-RU')} ₽/${t('мес')}`}).`}
          onClose={() => { setAskPlan(null); onClose() }}
        />
      )}
    </>,
    document.body,
  )
}
