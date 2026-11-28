// Версия Excel ученика (Figma «Искра» стр. 28, концепт 1, node 581:1856).
// - Окно «Какой у вас Excel?» при первом уроке курса «Бухгалтерия» — один раз,
//   «Пока пропустить» больше не навязывает.
// - «Настройки обучения»: выбор версии, «Что изменится в уроках», макросы,
//   «Как узнать версию за минуту», «Сохранить и к урокам».
// - Пилюля «Excel 2016 · изменить» в заданиях — открывает тот же выбор.
// Телефоны — шторка с грабером (без ×), ПК и iPad — окно по центру.

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import MobileSheet from '../MobileSheet'
import { PLATFORM } from '../../lib/platform'
import { useBackClose } from '../../lib/overlayStack'
import { Z } from '../../lib/layers'
import {
  EXCEL_CHOICES, GENERAL_METHODS, METHOD_TITLES, STATUS_TEXT, loadExcelPrefs, methodStatus, pickMethod,
  readExcelPrefs, saveExcelPrefs, skipExcelPrompt, useExcelPrefs, versionLabel, type ExcelChoice, type MethodStatus,
} from '../../lib/excelLab/excelVersion'
import { AlertTriangle, Check, CheckCircle2, ChevronRight, HelpCircle, Info, Lock } from '../icons/appIcons'
import './excelLab.css'

const PHONE = PLATFORM === 'iphone' || PLATFORM === 'android'

function VersionChips({ onPick }: { onPick?: (v: ExcelChoice) => void }) {
  const prefs = useExcelPrefs()
  return (
    <div className="xl-versions" role="radiogroup" aria-label="Версия Excel">
      {EXCEL_CHOICES.map(c => (
        <button key={c.id} type="button" role="radio" aria-checked={prefs.version === c.id}
          onClick={() => { void saveExcelPrefs({ version: c.id }); onPick?.(c.id) }}>
          {prefs.version === c.id && <Check size={16} aria-hidden />}{c.label}
        </button>
      ))}
    </div>
  )
}

/** «Как узнать версию за минуту» — три шага. */
export function VersionHelp({ tone = 'card' }: { tone?: 'card' | 'accent' }) {
  return (
    <div className="xl-card" style={tone === 'accent' ? { background: 'var(--color-accent-soft)' } : undefined}>
      <div className="xl-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Info size={18} aria-hidden style={{ color: 'var(--color-accent)' }} />Как узнать версию за минуту</div>
      <ol className="xl-help">
        <li>Откройте Excel и пройдите: <span className="xl-path"><b>Файл</b><ChevronRight size={14} aria-hidden /><b>Учётная запись</b><ChevronRight size={14} aria-hidden /><b>О программе Excel</b></span></li>
        <li>В первой строке окна — «Microsoft Excel 2016», «… 2021» или «Microsoft 365». Нажмите эту версию здесь.</li>
        <li>Нет пункта «Учётная запись» — у вас 2010: Файл → Справка. Нет меню «Файл», а слева вверху круглая кнопка Office — это 2007.</li>
      </ol>
    </div>
  )
}

export function MacrosToggle() {
  const prefs = useExcelPrefs()
  return (
    <div className="xl-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>На моём компьютере разрешены макросы</div>
        <div className="xl-muted" style={{ fontSize: 12 }}>Не уверены — оставьте выключенным: способ VBA будет виден с пометкой «нужно разрешение».</div>
      </div>
      <button type="button" role="switch" aria-checked={prefs.macros === true} aria-label="Разрешены макросы" className="xl-toggle"
        onClick={() => void saveExcelPrefs({ macros: prefs.macros !== true })} />
    </div>
  )
}

/**
 * Выбор версии: шторка первого урока и смена из пилюли.
 * `onSkip` — показать «Пока пропустить — показывать все способы».
 */
export function ExcelVersionPicker({ onDone, onSkip, macros = false }: { onDone?: () => void; onSkip?: () => void; macros?: boolean }) {
  const prefs = useExcelPrefs()
  const [help, setHelp] = useState(prefs.version === 'unknown')
  return (
    <div className="xl-root" data-kind="version">
      <div className="xl-title" style={{ fontSize: 22, fontWeight: 700 }}>Какой у вас Excel?</div>
      <div className="xl-muted" style={{ fontSize: 15 }}>Покажем способы решения, которые сработают именно у вас. Поменять можно в настройках курса.</div>
      <VersionChips onPick={() => { setHelp(false); onDone?.() }} />
      <div className={help ? 'xl-card' : undefined} style={help ? { background: 'var(--color-accent-soft)', border: '1.5px solid var(--color-accent)' } : undefined}>
        <button type="button" className="xl-unknown" aria-expanded={help}
          onClick={() => { const next = !help; setHelp(next); if (next && !prefs.version) void saveExcelPrefs({ version: 'unknown' }) }}>
          <HelpCircle size={18} aria-hidden /> <span style={{ flex: 1 }}>Не знаю — помогите определить</span>
          <ChevronRight size={16} aria-hidden style={{ transform: help ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .15s' }} />
        </button>
        {help && <>
          <div style={{ fontSize: 14 }}>На компьютере откройте Excel и пройдите:</div>
          <div className="xl-path"><b>Файл</b><ChevronRight size={14} aria-hidden /><b>Учётная запись</b><ChevronRight size={14} aria-hidden /><b>О программе Excel</b></div>
          <div className="xl-muted" style={{ color: 'var(--color-text-2)' }}>
            В первой строке — название: «Microsoft Excel 2016» или «Microsoft 365». Нажмите его выше.
            Нет пункта «Учётная запись» — у вас 2010: Файл → Справка. Нет «Файл», а круглая кнопка — это 2007.
          </div>
          {onDone && prefs.version === 'unknown' && <div><button type="button" className="xl-btn" onClick={onDone}>Пока не знаю — продолжить</button></div>}
        </>}
      </div>
      {macros && <MacrosToggle />}
      {onSkip && (
        <button type="button" className="xl-link" onClick={onSkip}>Пока пропустить — показывать все способы</button>
      )}
    </div>
  )
}

const ROUTE_ICON: Record<MethodStatus, ReactNode> = {
  ok: <CheckCircle2 size={20} aria-hidden style={{ color: 'var(--color-green-text)' }} />,
  check: <AlertTriangle size={20} aria-hidden style={{ color: 'var(--color-amber-text)' }} />,
  addin: <AlertTriangle size={20} aria-hidden style={{ color: 'var(--color-amber-text)' }} />,
  permission: <Info size={20} aria-hidden style={{ color: 'var(--color-accent)' }} />,
  no: <Lock size={20} aria-hidden style={{ color: 'var(--color-muted)' }} />,
}

/** «Что изменится в уроках»: пять способов и «ваш вариант» для разовых расчётов и регулярных отчётов. */
export function RoutesPreview() {
  const prefs = useExcelPrefs()
  const oneoff = pickMethod({ kind: 'methods', task: 'oneoff', methods: GENERAL_METHODS }, prefs)
  const automation = pickMethod({ kind: 'methods', task: 'automation', methods: GENERAL_METHODS }, prefs)
  return (
    <div className="xl-card" style={{ gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div className="xl-title" style={{ fontSize: 17, flex: 1 }}>Что изменится в уроках</div>
        <span className="xl-badge">{versionLabel(prefs.version)}</span>
      </div>
      <div className="xl-muted" style={{ fontSize: 14 }}>В заданиях с Excel до пяти способов решения. Первым откроется самый удобный из доступных вам.</div>
      <div className="xl-routes">
        {GENERAL_METHODS.map(m => {
          const s = methodStatus(m, prefs)
          const mine = m.id === oneoff || m.id === automation
          return (
            <div key={m.id} className="xl-route" data-mine={mine || undefined} data-status={s}>
              <span className="ic">{ROUTE_ICON[s]}</span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: s === 'no' ? 'var(--color-muted)' : undefined }}>{METHOD_TITLES[m.id]}{m.id === 'powerQuery' ? ', если доступен' : m.id === 'vba' ? ', если разрешён' : ''}</span>
                  {mine && <span className="xl-mine">{m.id === automation && m.id !== oneoff ? 'ваш вариант для регулярных отчётов' : 'ваш вариант'}</span>}
                  {!mine && s !== 'ok' && <span className={`xl-tag xl-tag-${s}`}>{STATUS_TEXT[s]}</span>}
                </div>
                <span className="xl-muted">{m.steps[0]}</span>
              </div>
            </div>
          )
        })}
      </div>
      <MacrosToggle />
    </div>
  )
}

/** Экран «Настройки обучения» курса. */
export function ExcelSettingsPanel({ onDone, courseTitle = 'Бухгалтерия' }: { onDone?: () => void; courseTitle?: string }) {
  useEffect(() => { void loadExcelPrefs() }, [])
  return (
    <div className="xl-root" data-kind="settings">
      <div className="xl-settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <span className="xl-kicker">Настройки обучения · {courseTitle}</span>
          <div className="xl-title" style={{ fontSize: 24, fontWeight: 700 }}>Какой Excel у вас на компьютере?</div>
          <div className="xl-muted" style={{ fontSize: 15 }}>От версии зависит, какими способами уроки покажут решение. Поменять можно в любой момент — уже сданные задания не пересчитываются.</div>
          <VersionChips />
          <UnknownChip />
          <VersionHelp />
        </div>
        <RoutesPreview />
      </div>
      {onDone && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="xl-btn" data-primary="" onClick={onDone}>Сохранить и к урокам</button></div>}
    </div>
  )
}

function UnknownChip() {
  const prefs = useExcelPrefs()
  return (
    <div className="xl-versions">
      <button type="button" role="radio" aria-checked={prefs.version === 'unknown'} onClick={() => void saveExcelPrefs({ version: 'unknown' })}>
        <HelpCircle size={16} aria-hidden /> Не знаю — помогите определить
      </button>
    </div>
  )
}

/** Окно: шторка на телефонах, диалог по центру на ПК и iPad. */
export function ExcelOverlay({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useBackClose(open && !PHONE, onClose)
  useEffect(() => {
    if (!open || PHONE) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  // Заголовок шторки не дублируем: он уже первой строкой внутри (как в концепте).
  if (PHONE) return <MobileSheet open={open} onClose={onClose} softEdge>{children}</MobileSheet>
  if (!open) return null
  return createPortal(
    <div className="xl-overlay" style={{ zIndex: Z.modal }} onClick={onClose} role="presentation">
      <div className="xl-dialog" data-wide={wide || undefined} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** Пилюля «Excel 2016 · изменить» — открывает выбор версии. */
export function ExcelVersionPill() {
  const prefs = useExcelPrefs()
  const [open, setOpen] = useState(false)
  useEffect(() => { void loadExcelPrefs() }, [])
  return (
    <>
      <button type="button" className="xl-pill" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {versionLabel(prefs.version)} <em>{prefs.version ? 'изменить' : 'выбрать'}</em>
      </button>
      <ExcelOverlay open={open} onClose={() => setOpen(false)} title="Версия Excel">
        <ExcelVersionPicker macros onDone={() => setOpen(false)} />
      </ExcelOverlay>
    </>
  )
}

/** Окно «Какой у вас Excel?» при первом уроке курса: один раз, пока версия не выбрана и не «пропустить». */
export function FirstLessonExcelPrompt() {
  // Решение «показать» принимается один раз после загрузки профиля: выбор
  // «Не знаю» тоже записывает версию, и окно не должно закрываться под пальцем,
  // пока ученик читает подсказку.
  const [open, setOpen] = useState(false)
  useEffect(() => {
    let alive = true
    void loadExcelPrefs().finally(() => {
      const p = readExcelPrefs()
      if (alive && !p.version && !p.skipped) setOpen(true)
    })
    return () => { alive = false }
  }, [])
  const skip = () => { skipExcelPrompt(); setOpen(false) }
  return (
    <ExcelOverlay open={open} onClose={skip} title="Какой у вас Excel?">
      <ExcelVersionPicker onDone={() => setOpen(false)} onSkip={skip} />
    </ExcelOverlay>
  )
}

/** Кнопка «Настройки обучения» и экран настроек для страницы курса. */
export function ExcelSettingsButton({ courseTitle }: { courseTitle?: string }) {
  const [open, setOpen] = useState(false)
  const prefs = useExcelPrefs()
  useEffect(() => { void loadExcelPrefs() }, [])
  return (
    <>
      <button type="button" className="xl-pill" onClick={() => setOpen(true)} aria-haspopup="dialog" title="Настройки обучения" aria-label={`Настройки обучения: ${versionLabel(prefs.version)}`}>
        <em>{versionLabel(prefs.version)}</em>
      </button>
      <ExcelOverlay open={open} onClose={() => setOpen(false)} title="Настройки обучения" wide>
        <ExcelSettingsPanel courseTitle={courseTitle} onDone={() => setOpen(false)} />
      </ExcelOverlay>
    </>
  )
}
