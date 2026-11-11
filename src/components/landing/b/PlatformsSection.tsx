// «Одна Искра — четыре версии» (Figma «Искра», стр. 290:2, узел 303:418 /
// тёмный 303:804): карточки версий (плюс складной iPhone Duo — это iPhone-версия
// в развороте) и строка с живым переключателем темы.
// В каждой карточке снизу выглядывает своё устройство с настоящим снимком
// Искры (обрезается карточкой); при наведении на карточку приподнимается.

import type { ReactNode } from 'react'
import { useT } from '../../../lib/i18n'
import { useTheme } from '../../../store/themeStore'
import { IPad, IPhone, Mac, Section, SectionHead, asset } from './kit'

type Device = 'mac' | 'iphone' | 'ipad' | 'android' | 'duo'
type Version = { name: string; status: string; note: string; tone: 'green' | 'accent'; device: Device }

const VERSIONS: Version[] = [
  { name: 'Компьютер', status: 'В браузере', note: 'Колонки, журнал и проверка на весь экран.', tone: 'green', device: 'mac' },
  { name: 'iPhone', status: 'Бета-тест', note: 'Стекло, нижняя панель под большой палец.', tone: 'accent', device: 'iphone' },
  { name: 'iPad', status: 'Скоро приложением', note: 'Всё управление — в капсуле справа.', tone: 'accent', device: 'ipad' },
  { name: 'Android', status: 'Бета-тест', note: 'Таблетки навигации, плавные края.', tone: 'accent', device: 'android' },
  // Складной iPhone (Apple, сентябрь 2026) — та же iPhone-версия, но в развороте
  // раскладка становится планшетной.
  { name: 'iPhone Duo', status: 'Скоро', note: 'Сложен — как iPhone, раскрыт — как iPad.', tone: 'accent', device: 'duo' },
]

// Android — корпус в духе Galaxy S: плоская металлическая рамка, тонкая ровная
// чёрная рамка экрана, скругления меньше, чем у iPhone, камера-точка по центру
// и кнопки справа. Строка состояния — андроидная (время слева), а айфонная
// строка снимка прикрыта ею.
function AndroidPhone({ src, width, dark }: { src: string; width: number; dark?: boolean }) {
  const h = (width * 874) / 402
  const r = Math.round(width * 0.12)
  return (
    <div className="relative shrink-0" style={{ width, height: h, filter: 'drop-shadow(0px 30px 28px rgba(51,38,115,0.26))' }}>
      {/* кнопки громкости и питания на правой грани */}
      <span aria-hidden className="absolute right-[-2px] top-[22%] h-[13%] w-[3px] rounded-r-[2px] bg-gradient-to-b from-[#b9b9c0] via-[#8d8d95] to-[#b9b9c0]" />
      <span aria-hidden className="absolute right-[-2px] top-[38%] h-[7%] w-[3px] rounded-r-[2px] bg-gradient-to-b from-[#b9b9c0] via-[#8d8d95] to-[#b9b9c0]" />
      {/* металлическая рамка */}
      <div className="absolute inset-0 p-[2.5px]" style={{ borderRadius: r, background: 'linear-gradient(135deg, #d9d9de 0%, #9a9aa2 35%, #e4e4e8 55%, #8e8e96 80%, #c8c8ce 100%)' }}>
        <div className="relative h-full w-full overflow-hidden bg-[#0b0b0f] p-[3.5px]" style={{ borderRadius: r - 2.5 }}>
          <div className={`relative h-full w-full overflow-hidden ${dark ? 'bg-[#111113]' : 'bg-[#f6f6f6]'}`} style={{ borderRadius: r - 6 }}>
            <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-x-0 top-0 w-full max-w-none" />
            {/* строка состояния Android */}
            <div className={`absolute inset-x-0 top-0 flex h-[5.8%] items-center justify-between px-[9%] text-[6.5px] font-semibold ${dark ? 'bg-[#111113] text-[#f2f2f5]' : 'bg-[#f6f6f6] text-[#1d1b24]'}`}>
              <span>12:30</span>
              <span className="flex items-center gap-[2.5px]">
                <svg width="7" height="6" viewBox="0 0 14 12" aria-hidden><path d="M7 11.5 0.2 4.2a10 10 0 0 1 13.6 0Z" fill="currentColor" /></svg>
                <svg width="6" height="6" viewBox="0 0 12 12" aria-hidden><path d="M12 0v12H0Z" fill="currentColor" /></svg>
                <svg width="4" height="7" viewBox="0 0 8 14" aria-hidden><rect x="0.5" y="1.5" width="7" height="12" rx="1.5" fill="none" stroke="currentColor" /><rect x="2.5" y="0" width="3" height="1.5" fill="currentColor" /><rect x="1.8" y="5" width="4.4" height="7.2" rx="0.6" fill="currentColor" /></svg>
              </span>
            </div>
            <span aria-hidden className="absolute left-1/2 top-[1.6%] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-[#0b0b0f] ring-1 ring-black/20" />
          </div>
        </div>
      </div>
    </div>
  )
}

// iPhone Duo в развороте — корпус из мокапа Figma (Star White, landscape):
// экран 1.43 : 1, корпус выходит за экран неравномерно (кнопки сверху и справа),
// поэтому отступы рамки заданы по сторонам. width — ширина экрана.
const DUO = { l: 2.2, r: 2.49, t: 3.53, b: 3.15, radius: 0.0594 }
function DuoPhone({ src, width }: { src: string; width: number }) {
  const h = Math.round(width / 1.43)
  return (
    <div className="relative shrink-0" style={{ width, height: h, filter: 'drop-shadow(0px 30px 28px rgba(51,38,115,0.26))' }}>
      <img src={src} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-left-top" style={{ borderRadius: width * DUO.radius }} />
      <img
        src={asset('bezel-iphone-duo.webp')}
        alt=""
        aria-hidden
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{ left: `-${DUO.l}%`, top: `-${DUO.t}%`, width: `${100 + DUO.l + DUO.r}%`, height: `${100 + DUO.t + DUO.b}%` }}
      />
    </div>
  )
}

function DeviceArt({ device, dark }: { device: Device; dark: boolean }) {
  const tone = dark ? 'dark' : 'light'
  let art: ReactNode
  let place: string
  switch (device) {
    case 'mac':
      art = <Mac src={asset(`day-mac-summary-${tone}.webp`)} width={300} />
      place = 'left-[40px] top-[176px]'
      break
    case 'iphone':
      art = <IPhone src={asset(`day-iphone-homework-${tone}.webp`)} width={150} />
      place = 'right-[34px] top-[178px]'
      break
    case 'ipad':
      art = <IPad src={asset(`day-mac-journal-${tone}.webp`)} width={210} position="left top" />
      place = 'right-[-22px] top-[181px]'
      break
    case 'duo':
      art = <DuoPhone src={asset(`day-mac-attendance-${tone}.webp`)} width={262} />
      place = 'left-[24px] top-[186px] sm:left-auto sm:right-[56px] sm:top-[150px] xl:left-[24px] xl:right-auto xl:top-[178px]'
      break
    default:
      art = <AndroidPhone src={asset(dark ? 'day-iphone-student-home-dark.webp' : 'day-iphone-student-home.webp')} width={150} dark={dark} />
      place = 'right-[34px] top-[171px]'
  }
  return (
    <div aria-hidden className={`lp-plat-device pointer-events-none absolute ${place}`}>
      {art}
    </div>
  )
}

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

        <div className="grid w-full max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {VERSIONS.map(v => (
            <div key={v.name} className={`${card} lp-plat-card relative ${v.device === 'duo' ? 'sm:col-span-2 xl:col-span-1' : ''} flex h-[340px] flex-col items-start gap-3 overflow-hidden p-6 sm:h-[360px]`}>
              {/* Свечение под устройством — даёт глубину: устройство «стоит» в свете карточки. */}
              <span
                aria-hidden
                className="lp-plat-glow pointer-events-none absolute inset-x-0 bottom-0 h-[70%]"
                style={{ background: `radial-gradient(ellipse 75% 62% at 50% 92%, rgba(${dark ? '142,120,255,0.34' : '120,107,214,0.2'}) 0%, rgba(${dark ? '142,120,255,0.1' : '120,107,214,0.07'}) 45%, transparent 75%)` }}
              />
              <DeviceArt device={v.device} dark={dark} />
              <h3 className="relative text-[20px] font-bold text-[var(--color-text)]">{v.name === 'Компьютер' ? t(v.name) : v.name}</h3>
              <span
                className={`relative rounded-[99px] px-2.5 py-1 text-[12px] font-bold ${
                  v.tone === 'green'
                    ? 'bg-[rgba(51,158,102,0.14)] text-[#298c57]'
                    : 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                }`}
              >
                {t(v.status)}
              </span>
              <p className="relative max-w-[240px] text-[14px] leading-[1.5] text-[var(--color-muted)]">{t(v.note)}</p>
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
