// «Одна Искра — четыре версии» (Figma «Искра», стр. 290:2, узел 303:418 /
// тёмный 303:804): четыре карточки версий и строка с живым переключателем темы.

import { useT } from '../../../lib/i18n'
import { useTheme } from '../../../store/themeStore'
import { Section, SectionHead } from './kit'

type Version = { name: string; status: string; note: string; tone: 'green' | 'accent' }

const VERSIONS: Version[] = [
  { name: 'Компьютер', status: 'В браузере', note: 'Колонки, журнал и проверка на весь экран.', tone: 'green' },
  { name: 'iPhone', status: 'Бета-тест', note: 'Стекло, нижняя панель под большой палец.', tone: 'accent' },
  { name: 'iPad', status: 'Скоро приложением', note: 'Всё управление — в капсуле справа.', tone: 'accent' },
  { name: 'Android', status: 'Бета-тест', note: 'Таблетки навигации, плавные края.', tone: 'accent' },
]

const card = 'rounded-[24px] border border-[var(--color-border-soft)] bg-[var(--color-bg-card)]'

export default function PlatformsSection() {
  const t = useT()
  const dark = useTheme(s => s.dark)
  const toggle = useTheme(s => s.toggle)
  const setDark = (next: boolean) => { if (next !== dark) toggle() }

  return (
    <Section className="pb-[10px] pt-16 sm:pt-[110px]">
      <div className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow={t('Версии')}
          title={t('Одна Искра — четыре версии')}
          lead={t('Не растянутый сайт, а своя раскладка под каждое устройство. Данные общие.')}
        />

        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {VERSIONS.map(v => (
            <div key={v.name} className={`${card} flex flex-col items-start gap-3 p-6`}>
              <h3 className="text-[20px] font-bold text-[var(--color-text)]">{v.name === 'Компьютер' ? t(v.name) : v.name}</h3>
              <span
                className={`rounded-[99px] px-2.5 py-1 text-[12px] font-bold ${
                  v.tone === 'green'
                    ? 'bg-[rgba(51,158,102,0.14)] text-[#298c57]'
                    : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                }`}
              >
                {t(v.status)}
              </span>
              <p className="max-w-[240px] text-[14px] leading-[1.5] text-[var(--color-muted)]">{t(v.note)}</p>
            </div>
          ))}
        </div>

        <div className="flex w-full max-w-[1200px] flex-col items-start gap-3 rounded-[20px] border border-[var(--color-border-soft)] bg-[var(--color-bg-card)] px-5 py-4 sm:min-h-[60px] sm:flex-row sm:items-center sm:gap-4 sm:py-2 sm:pl-6 sm:pr-[18px]">
          <p className="min-w-0 flex-1 text-[16px] text-[var(--color-text)]">
            {t('Светлая и тёмная тема во всех версиях — попробуйте прямо здесь.')}
          </p>
          <div role="group" aria-label={t('Тема')} className="flex shrink-0 gap-1 rounded-[99px] bg-[var(--color-accent-soft)] p-1">
            {[false, true].map(isDark => {
              const active = dark === isDark
              return (
                <button
                  key={String(isDark)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDark(isDark)}
                  className={`rounded-[99px] px-4 py-2 text-[14px] font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--color-bg-card)] text-[var(--color-text)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {isDark ? t('Тёмная') : t('Светлая')}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Section>
  )
}
