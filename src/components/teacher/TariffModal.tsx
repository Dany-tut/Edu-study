import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Check, Sparkles } from 'lucide-react'
import { PLAN_TIERS, planPrice, type PlanTier } from '../../lib/plan'
import { tactile } from '../../lib/feedback'
import { submitFeedback } from '../../lib/feedbackRequests'
import { useT, useLang } from '../../lib/i18n'

// Витрина тарифов (мобильный профиль учителя). Оплата не подключена: выбор
// тарифа сразу шлёт заявку админу (без формы обратной связи), админ
// назначает вручную. Текущий тариф подсвечен и не предлагается к выбору.

export default function TariffModal({ currentName, currentMaxStudents, onClose }: {
  currentName?: string
  currentMaxStudents?: number | null
  onClose: () => void
}) {
  const t = useT()
  const { lang } = useLang()
  const [requesting, setRequesting] = useState<PlanTier | null>(null)
  const [sentPlan, setSentPlan] = useState<PlanTier | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function requestPlan(p: PlanTier) {
    tactile()
    setRequesting(p)
    setError(null)
    const message = `${t('Хочу перейти на тариф')} «${t(p.name)}» (${p.priceRub === 0 ? t('бесплатно') : `${planPrice(p, lang)}/${t('мес')}`}).`
    const { error } = await submitFeedback({ role: 'teacher', section: 'Тариф', message, attachments: [] })
    setRequesting(null)
    if (error) { setError(t('Не удалось отправить. Попробуйте ещё раз.')); return }
    setSentPlan(p)
    setTimeout(onClose, 1400)
  }

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

  const price = (p: PlanTier) => (p.priceRub === 0 ? t('бесплатно') : planPrice(p, lang))

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

          {sentPlan ? (
            <div style={{ padding: '28px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t('Заявка отправлена')}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>
                {t('Мы свяжемся с вами и подключим тариф')} «{t(sentPlan.name)}».
              </div>
            </div>
          ) : (
            <>
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
                          {price(p)}{p.priceRub > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)' }}> /{t('мес')}</span>}
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
                            onClick={() => void requestPlan(p)}
                            disabled={requesting !== null}
                            style={{
                              width: '100%', padding: '10px 0', borderRadius: 12, border: 'none',
                              cursor: requesting !== null ? 'default' : 'pointer',
                              background: 'var(--color-purple)', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                              opacity: requesting !== null && requesting.code !== p.code ? 0.5 : 1,
                            }}
                          >
                            {requesting?.code === p.code ? t('Отправляю…') : t('Выбрать')}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {error && <div style={{ fontSize: 13, color: 'var(--color-red-text, #e5484d)', marginTop: 12, textAlign: 'center' }}>{error}</div>}

              <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 14, textAlign: 'center', lineHeight: 1.4 }}>
                {t('Оплата подключается вручную: после заявки мы свяжемся с вами.')}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </>,
    document.body,
  )
}
