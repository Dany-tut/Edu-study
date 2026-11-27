// «Каталог курсов» на лендинге: Искра теперь не только кабинет репетитора,
// но и площадка готовых курсов (docs/analysis/course-marketplace-2026-11-25.md).
// Карточки — живые, из catalog_list; пока каталог пуст — плитки направлений.
// Продаёт автор курса, Искра берёт комиссию (решение Дани 25.11).

import { useEffect, useState } from 'react'
import { useT } from '../../../lib/i18n'
import { catalogHref, categoryLabel, coverBackground, fetchCatalog, formatPrice, lessonsLabel, type CatalogItem } from '../../../lib/catalog'
import FadeText from '../../FadeText'
import { PrimaryButton, SecondaryButton, Section, SectionHead } from './kit'

const DIRECTIONS: { category: string; title: string; text: string; glyph: string }[] = [
  { category: 'accounting', title: 'Бухгалтерия и финансы', text: 'Excel, 1С и нормы — на рабочих задачах', glyph: '=СУММ' },
  { category: 'languages', title: 'Иностранные языки', text: 'С нуля и до экзамена, с тренажёром слов', glyph: 'Aa' },
  { category: 'exams', title: 'Школа и экзамены', text: 'ЕГЭ, ОГЭ и олимпиады от практиков', glyph: 'ЕГЭ' },
]

export default function CatalogSection() {
  const t = useT()
  const [items, setItems] = useState<CatalogItem[] | null>(null)
  useEffect(() => {
    let alive = true
    fetchCatalog().then(list => { if (alive) setItems(list) }).catch(() => { if (alive) setItems([]) })
    return () => { alive = false }
  }, [])
  const live = (items ?? []).slice(0, 3)

  return (
    <Section id="courses" className="pt-16 sm:pt-[110px]">
      <SectionHead
        eyebrow={t('Каталог курсов')}
        title={t('Учитесь сами — по готовым курсам')}
        lead={t('Не только школьные предметы: бухгалтерия, Excel, языки, IT. Курсы ведут практики, у многих первый модуль бесплатный.')}
        width={760}
      />
      <div className="mx-auto mt-10 grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:mt-14 md:grid-cols-3">
        {live.length > 0
          ? live.map(i => (
            <a key={i.slug} href={catalogHref(i.slug)} data-hover="layer"
              className="flex min-w-0 flex-col gap-3 rounded-[24px] border border-[var(--color-border-soft)] bg-[var(--color-bg-2)] p-[10px] transition-transform hover:-translate-y-1">
              <div className="relative h-[140px] overflow-hidden rounded-[18px]" style={{ background: coverBackground(i.cover_tone, i.category) }} aria-hidden>
                <span className="absolute bottom-1 right-3 font-mono text-[44px] font-extrabold text-white/30">{i.cover_glyph}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 px-[6px] pb-[6px]">
                <FadeText lines={2} className="text-[17px] font-bold leading-[1.25] text-[var(--color-text)]">{i.title}</FadeText>
                <FadeText className="text-[13.5px] text-[var(--color-muted)]">{`${categoryLabel(i.category)} · ${i.author}`}</FadeText>
                <div className="mt-1 flex items-center gap-2 text-[13.5px] text-[var(--color-muted)]">
                  {i.lesson_count > 0 && <span>{lessonsLabel(i.lesson_count)}</span>}
                  <span className="flex-1" />
                  <span className="font-extrabold tabular-nums text-[var(--color-text)]">{formatPrice(i.price_kopecks)}</span>
                </div>
              </div>
            </a>
          ))
          : DIRECTIONS.map(d => (
            <a key={d.category} href={catalogHref()} data-hover="layer"
              className="relative flex min-h-[200px] flex-col justify-end gap-1 overflow-hidden rounded-[24px] p-6 text-white transition-transform hover:-translate-y-1"
              style={{ background: coverBackground('', d.category) }}>
              <span aria-hidden className="pointer-events-none absolute right-4 top-2 font-mono text-[56px] font-extrabold text-white/25">{t(d.glyph)}</span>
              <span className="text-[20px] font-bold leading-tight">{t(d.title)}</span>
              <span className="text-[15px] text-white/85">{t(d.text)}</span>
            </a>
          ))}
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-[1200px] flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <PrimaryButton href={catalogHref()}>{t('Открыть каталог')}</PrimaryButton>
        <SecondaryButton href="#/teacher/storefront">{t('Выставить свой курс')}</SecondaryButton>
      </div>
      <p className="mx-auto mt-4 max-w-[560px] text-center text-[14px] leading-[1.5] text-[var(--color-muted)]">
        {t('Вы автор? Выставьте курс в каталог: продаёте вы, Искра берёт комиссию только с продаж.')}
      </p>
    </Section>
  )
}
