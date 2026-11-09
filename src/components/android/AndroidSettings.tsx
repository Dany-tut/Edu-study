import { useState, type ReactNode } from 'react'
import MobileSheet from '../MobileSheet'
import { useT } from '../../lib/i18n'
import { ChevronRight, ChevronDown, Download } from '../icons/appIcons'
import './androidSettings.css'

// ─────────────────────────────────────────────────────────────────────────────
// Настройки профиля на Android (концепт v16, согласован Дани 07.11.2026)
//
// Один язык для всех строк — вместо смеси таблеток, шевронов и раскрытых
// выпадашек:
//   ▾  выбор из списка — нижний лист (MobileSheet) с радиокнопками;
//   ›  отдельный экран или своя шторка;
//   значение справа серым, переключатель — сразу.
// Данные и обработчики — те же, что у общего блока в MobileProfilePage;
// здесь только вид. iPhone/iPad/ПК этот файл не рендерят.
// ─────────────────────────────────────────────────────────────────────────────

export type TzMode = 'auto' | 'manual'

export interface AndroidSettingsProps {
  dark: boolean
  onTheme: (dark: boolean) => void
  lang: 'ru' | 'en'
  onLang: (lang: 'ru' | 'en') => void
  /** Праздничная тема: строка только пока сезон идёт. */
  season?: { label: string; open: () => void } | null
  tint: { color: string | null; open: () => void }
  appIcon?: { preview: ReactNode; open: () => void } | null
  courseOrder?: { count: number; open: () => void } | null
  feed: { value: string; open: () => void }
  /** Часовой пояс; null — строки нет (у ученика — по решению Дани, позже). */
  tz?: {
    mode: TzMode
    value: string
    autoLabel: string
    valueLabel: string
    options: { value: string; label: string }[]
    onMode: (m: TzMode) => void
    onValue: (tz: string) => void
  } | null
  teacherCabinet?: (() => void) | null
  payment?: (() => void) | null
  feedback: () => void
  install?: (() => void) | null
  /** Строка версии — существующий AppVersionRow. */
  versionRow: ReactNode
}

type Sheet = null | 'theme' | 'lang' | 'tz'

function Row({ label, value, kind, onClick, icon, accent }: {
  label: string; value?: ReactNode; kind: 'pick' | 'go'; onClick: () => void; icon?: ReactNode; accent?: boolean
}) {
  return (
    <button type="button" data-hover="layer" className="and-row" onClick={onClick} aria-haspopup={kind === 'pick' ? 'dialog' : undefined}>
      <span className="and-row-label" style={accent ? { color: 'var(--color-accent)', fontWeight: 600 } : undefined}>{icon}{label}</span>
      <span className="and-row-value">
        {value}
        {kind === 'pick' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </span>
    </button>
  )
}

function Choice({ label, hint, on, onClick }: { label: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} data-hover="layer" className="and-choice" onClick={onClick}>
      <span className={`and-radio${on ? ' on' : ''}`} aria-hidden="true" />
      <span className="and-choice-text"><span>{label}</span>{hint && <span className="and-choice-hint">{hint}</span>}</span>
    </button>
  )
}

export default function AndroidSettings(p: AndroidSettingsProps) {
  const t = useT()
  const [sheet, setSheet] = useState<Sheet>(null)
  const close = () => setSheet(null)
  const pick = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); close() }

  return (
    <>
      <div className="and-settings-group">
        <Row kind="pick" label={t('Тема оформления')} value={p.dark ? t('Тёмная') : t('Светлая')} onClick={() => setSheet('theme')} />
        {p.season && <Row kind="go" label={t('Хэллоуин-тема')} value={p.season.label} onClick={p.season.open} />}
        <Row kind="go" label={t('Цвет курса')} onClick={p.tint.open}
          value={p.tint.color
            ? <span className="and-swatch" style={{ background: p.tint.color }} />
            : t('Выключено')} />
        {p.appIcon && <Row kind="go" label={t('Иконка приложения')} value={p.appIcon.preview} onClick={p.appIcon.open} />}
        {p.courseOrder && <Row kind="go" label={t('Порядок курсов')} value={String(p.courseOrder.count)} onClick={p.courseOrder.open} />}
        <Row kind="go" label={t('Лента и жесты')} value={p.feed.value} onClick={p.feed.open} />
        {p.tz && <Row kind="pick" label={t('Часовой пояс')} value={p.tz.mode === 'auto' ? p.tz.autoLabel : p.tz.valueLabel} onClick={() => setSheet('tz')} />}
        <Row kind="pick" label={t('Язык')} value={p.lang === 'ru' ? 'Русский' : 'English'} onClick={() => setSheet('lang')} />
      </div>

      <div className="and-settings-group">
        {p.teacherCabinet && <Row kind="go" accent label={t('В кабинет препода')} onClick={p.teacherCabinet} />}
        {p.payment && <Row kind="go" label={t('Оплата')} onClick={p.payment} />}
        <Row kind="go" label={t('Обратная связь')} onClick={p.feedback} />
        {p.install && <Row kind="go" label={t('Установить приложение')} icon={<Download size={18} className="and-row-icon" />} onClick={p.install} />}
        <div className="and-version">{p.versionRow}</div>
      </div>

      <MobileSheet open={sheet === 'theme'} onClose={close} title={t('Тема оформления')}>
        <div role="radiogroup" className="and-choices">
          <Choice label={t('Светлая')} on={!p.dark} onClick={() => pick(p.onTheme)(false)} />
          <Choice label={t('Тёмная')} on={p.dark} onClick={() => pick(p.onTheme)(true)} />
        </div>
      </MobileSheet>

      <MobileSheet open={sheet === 'lang'} onClose={close} title={t('Язык')}>
        <div role="radiogroup" className="and-choices">
          <Choice label="Русский" on={p.lang === 'ru'} onClick={() => pick(p.onLang)('ru')} />
          <Choice label="English" on={p.lang === 'en'} onClick={() => pick(p.onLang)('en')} />
        </div>
      </MobileSheet>

      {p.tz && (
        <MobileSheet open={sheet === 'tz'} onClose={close} title={t('Часовой пояс')}>
          <div role="radiogroup" className="and-choices">
            <Choice label={t('Автоматически')} hint={p.tz.autoLabel} on={p.tz.mode === 'auto'}
              onClick={() => { p.tz!.onMode('auto'); close() }} />
            {p.tz.options.map(o => (
              <Choice key={o.value} label={o.label} on={p.tz!.mode === 'manual' && p.tz!.value === o.value}
                onClick={() => { p.tz!.onMode('manual'); p.tz!.onValue(o.value); close() }} />
            ))}
          </div>
          <p className="and-sheet-note">{t('Время урока показывается по этому поясу')}</p>
        </MobileSheet>
      )}
    </>
  )
}
