// «Вопросы» лендинга B (Figma «Искра», стр. «11 · Сайт — редизайн», узел 303:503).
// Слева — Огонёк «думает», справа — аккордеон: открыт один вопрос за раз,
// открытый обведён акцентом и показывает «−». Высота раскрытия анимируется
// framer-motion; заголовок вопроса — кнопка с aria-expanded / aria-controls.

import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useT } from '../../../lib/i18n'
import { Section, SectionHead, asset } from './kit'

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Как начать работать в Искре?',
    a: 'Нажмите «Зарегистрироваться» и войдите через Яндекс или VK — кабинет преподавателя откроется сразу. До двух учеников — бесплатно, платный тариф подключим по заявке.',
  },
  {
    q: 'Сколько это стоит?',
    a: 'До двух учеников — бесплатно. Дальше тариф зависит от числа учеников: от «Базового» до «Безлимита» для школ. Цены — в разделе «Тарифы».',
  },
  {
    q: 'Ученику нужно что-то устанавливать?',
    a: 'Нет. Искра открывается в браузере на компьютере, планшете и телефоне. Ученик входит по логину и паролю, которые выдаёт преподаватель.',
  },
  {
    q: 'Есть ли приложение?',
    a: 'Искру можно добавить на экран «Домой» — она откроется как приложение. Приложения для iPhone, iPad и Android готовятся к выпуску.',
  },
  {
    q: 'Можно ли проверять развёрнутые ответы и фото?',
    a: 'Да. Ученик пишет ответ или прикладывает фото, а вы разбираете работу прямо поверх неё — рисунком и комментарием — и ставите балл.',
  },
  {
    q: 'Подойдёт ли Искра учебному центру?',
    a: 'Да. Тарифы «Школа» и «Безлимит» рассчитаны на центры: несколько преподавателей, группы и кабинет администратора.',
  },
]

const ease = [0.22, 1, 0.36, 1] as const

export default function FaqSection() {
  const t = useT()
  const uid = useId().replace(/:/g, '')
  const [open, setOpen] = useState<number | null>(0)

  return (
    <Section id="faq" className="pt-16 pb-[10px] sm:pt-[110px]">
      <SectionHead eyebrow={t('Вопросы')} title={t('Частые вопросы')} />

      <div className="mx-auto mt-8 flex w-full max-w-[970px] items-start justify-center gap-10 sm:mt-10">
        <img
          src={asset('faq-ogonek-think.webp')}
          alt=""
          aria-hidden
          width={150}
          height={266}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="hidden h-[266px] w-[150px] shrink-0 select-none object-contain md:block"
        />

        <div className="flex w-full min-w-0 max-w-[780px] flex-col gap-[10px]">
          {FAQ.map((item, i) => {
            const isOpen = open === i
            const btnId = `faq-${uid}-q${i}`
            const panelId = `faq-${uid}-a${i}`
            return (
              <div
                key={item.q}
                className={`overflow-hidden rounded-[18px] border bg-[var(--color-bg-card)] transition-colors duration-200 ${
                  isOpen ? 'border-[var(--color-accent)]' : 'border-[var(--color-border-soft)] hover:border-[color-mix(in_srgb,var(--color-accent)_40%,transparent)]'
                }`}
              >
                <h3 className="m-0">
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center gap-3 rounded-[18px] px-5 py-[18px] text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-inset sm:px-6 sm:py-5"
                  >
                    <span className="min-w-0 flex-1 text-[16px] font-bold text-[var(--color-text)] sm:text-[17px]">{t(item.q)}</span>
                    <span
                      aria-hidden
                      className="relative h-[24px] w-[30px] shrink-0 rounded-[99px] bg-[var(--color-accent-soft)]"
                    >
                      {/* «+» / «−» рисуются двумя полосками: вертикальная складывается при открытии */}
                      <span className="absolute left-1/2 top-1/2 h-[2px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]" />
                      <span
                        className={`absolute left-1/2 top-1/2 h-[10px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)] transition-transform duration-300 ${
                          isOpen ? 'scale-y-0' : 'scale-y-100'
                        }`}
                      />
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={btnId}
                      key="panel"
                      // в макете ответ стоит на 10 px под строкой вопроса (gap 10), а не на её 20 px поля
                      initial={{ height: 0, opacity: 0, marginTop: 0 }}
                      animate={{ height: 'auto', opacity: 1, marginTop: -10 }}
                      exit={{ height: 0, opacity: 0, marginTop: 0 }}
                      transition={{ height: { duration: 0.32, ease }, marginTop: { duration: 0.32, ease }, opacity: { duration: 0.2 } }}
                      className="overflow-hidden"
                    >
                      <p className="m-0 px-5 pb-5 text-[15px] leading-[1.55] text-[var(--color-muted)] sm:pl-6 sm:pr-[26px]">
                        {t(item.a)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
