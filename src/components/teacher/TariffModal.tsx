import { useState } from 'react'
import Modal from '../Modal'
import { AlertIcon } from '../Alert'
import { X, Check, Sparkles } from '../icons/appIcons'
import { PLAN_TIERS, planPrice, type PlanTier } from '../../lib/plan'
import { tactile } from '../../lib/feedback'
import { submitFeedback } from '../../lib/feedbackRequests'
import { useT, useLang } from '../../lib/i18n'
import { Alert } from '../Alert'

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


  // Совпадение текущего тарифа: сначала по лимиту, иначе по названию.
  const isCurrent = (p: PlanTier) => {
    if (currentMaxStudents != null && p.maxStudents === currentMaxStudents) return true
    if (currentName && p.name.toLowerCase() === currentName.toLowerCase().replace(/·.*$/, '').trim()) return true
    return false
  }

  const price = (p: PlanTier) => (p.priceRub === 0 ? t('бесплатно') : planPrice(p, lang))

  return (
    <Modal
      onClose={onClose} width={480} padding={22}
      title={t('Тарифы')}
      subtitle={t('Выберите тариф — мы свяжемся и подключим его')}
      icon={
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-purple-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={20} style={{ color: 'var(--color-purple)' }} />
        </div>
      }
    >
      {sentPlan ? (
        <div style={{ padding: '28px 8px', textAlign: 'center' }}>
          <AlertIcon tone="success" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t('Заявка отправлена')}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>
            {t('Мы свяжемся с вами и подключим тариф')} «{t(sentPlan.name)}».
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PLAN_TIERS.map(p => {
              const current = isCurrent(p)
              return (
                <div
                  key={p.code}
                  style={{
                    borderRadius: 16, padding: '16px 16px',
                    border: current ? '2px solid var(--color-purple)' : '1px solid var(--color-border-soft)',
                    background: current ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{t(p.name)}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
                      {price(p)}{p.priceRub > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)' }}> /{t('мес')}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-muted)', marginTop: 2 }}>{t(p.tagline)}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                    {p.features.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                        <Check size={14} style={{ color: 'var(--color-purple)', flexShrink: 0 }} strokeWidth={2.5} />
                        {t(f)}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    {current ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--color-purple)', background: 'var(--color-bg-2)', padding: '8px 12px', borderRadius: 20 }}>
                        <Check size={14} strokeWidth={2.5} /> {t('Ваш тариф')}
                      </div>
                    ) : (
                      <button
                        onClick={() => void requestPlan(p)}
                        disabled={requesting !== null}
                        style={{ height: 48,
                          width: '100%', padding: '0 22px', borderRadius: 14, border: 'none',
                          cursor: requesting !== null ? 'default' : 'pointer',
                          background: 'var(--grad-purple)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
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

          {error && <Alert tone="danger" text={error} style={{ marginTop: 12 }} />}

          <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 14, textAlign: 'center', lineHeight: 1.4 }}>
            {t('Оплата подключается вручную: после заявки мы свяжемся с вами.')}
          </div>
        </>
      )}
    </Modal>
  )
}
