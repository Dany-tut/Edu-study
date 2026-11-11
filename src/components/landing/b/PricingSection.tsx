// «Тарифы» (Figma «Искра», стр. 290:2, узел 303:451 / тёмный 303:837).
// Названия, цены и лимиты в макете совпадают с PLAN_TIERS — рисуем из данных,
// чтобы витрина не разошлась с кабинетом. Огонёк в макете один для обеих тем.

import { useLang, useT } from '../../../lib/i18n'
import { PLAN_TIERS, planPrice, type PlanTier } from '../../../lib/plan'
import { PrimaryButton, SecondaryButton, Section, SectionHead, asset } from './kit'

const btn = 'w-full !px-2 !py-3'

function Cta({ tier, t }: { tier: PlanTier; t: (s: string) => string }) {
  if (tier.code === 'pro') return <PrimaryButton href="#lead" className={btn}>{t('Оставить заявку')}</PrimaryButton>
  if (tier.code === 'free') return <SecondaryButton href="#/teacher" className={btn}>{t('Начать бесплатно')}</SecondaryButton>
  return <SecondaryButton href="#login" className={btn}>{t('Войти в кабинет')}</SecondaryButton>
}

export default function PricingSection() {
  const t = useT()
  const lang = useLang(s => s.lang)

  return (
    <Section id="pricing" className="pb-[10px]">
      <div className="relative flex flex-col items-center gap-10 pt-16 sm:pt-[110px]">
        <SectionHead
          eyebrow={t('Тарифы')}
          title={t('Начните бесплатно')}
          lead={t('Оплата подключается вручную: оставьте заявку — мы активируем тариф.')}
        />

        <div className="flex w-full max-w-[1196px] flex-wrap items-end justify-center gap-[14px]">
          {PLAN_TIERS.map(tier => {
            const pro = tier.code === 'pro'
            return (
              <div
                key={tier.code}
                className={`${tier.code === 'free' ? 'lp-press ' : ''}relative flex w-full flex-col items-start gap-2 rounded-[24px] border px-[22px] py-6 sm:w-[calc(50%-7px)] lg:w-[calc((100%-28px)/3)] xl:w-auto xl:min-w-0 xl:max-w-[228px] xl:flex-1 ${
                  pro
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : 'border-[var(--color-border-soft)] bg-[var(--color-bg-card)]'
                }`}
              >
                {pro && (
                  <span className="rounded-[99px] bg-gradient-to-r from-[#786bd6] to-[#6f3fbf] px-2.5 py-1 text-[11px] font-bold text-white">
                    {t('Популярный')}
                  </span>
                )}
                <h3 className="text-[17px] font-bold text-[var(--color-text)]">{t(tier.name)}</h3>
                <p className="flex items-baseline gap-1 whitespace-nowrap">
                  <span className="text-[30px] font-bold tracking-[-0.3px] text-[var(--color-text)]">{planPrice(tier, lang)}</span>
                  {tier.priceRub > 0 && <span className="text-[13px] text-[var(--color-muted)]">/ {t('мес')}</span>}
                </p>
                <p className="text-[14px] text-[var(--color-muted)]">
                  {tier.maxStudents == null ? t('без лимита') : `${t('До').toLowerCase()} ${tier.maxStudents} ${t('учеников')}`}
                </p>
                <Cta tier={tier} t={t} />
                {tier.code === 'free' && (
                  <img
                    src={asset('price-ogonek-coin.webp')}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="lp-hop pointer-events-none absolute right-[5px] top-[-151px] hidden h-[156px] w-[96px] select-none object-contain xl:block"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Огонёк-спутник с подсказкой (в макете — справа от заголовка) */}
        <div className="pointer-events-none absolute left-[calc(100%-198px)] top-24 hidden items-end gap-2 xl:flex">
          <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] whitespace-nowrap px-[14px] py-[11px] text-[13px] leading-[1.4] text-[var(--color-text)] shadow-[0px_10px_24px_-6px_rgba(38,26,89,0.18)]">
            {t('Начать можно бесплатно —')}<br />{t('до двух учеников.')}
          </div>
          <img src={asset('price-ogonek-coin.webp')} alt="" aria-hidden loading="lazy" className="lp-sway h-[100px] w-[62px] shrink-0 select-none object-contain" />
        </div>
      </div>
    </Section>
  )
}
