// Выбор версии Excel и способы решения (Figma «Искра» стр. 28, раздел 1).
// Блок конспекта: вкладки способов с пометкой «ваш вариант» и причинами
// недоступности. Версия спрашивается в первом блоке, где она нужна, и меняется
// пилюлей «Excel 2016 · изменить»: на телефонах — шторкой, на ПК и iPad — на месте.

import { useEffect, useMemo, useState } from 'react'
import MobileSheet from '../MobileSheet'
import HScrollFade from '../HScrollFade'
import { PLATFORM } from '../../lib/platform'
import { EXCEL_CHOICES, METHOD_TITLES, STATUS_TEXT, loadExcelPrefs, methodStatus, pickMethod, saveExcelPrefs, useExcelPrefs, versionLabel, type ExcelChoice } from '../../lib/excelLab/excelVersion'
import type { MethodsSpec } from '../../lib/excelLab/spec'
import { ColoredFormula } from './ExcelTrainer'
import { AlertTriangle, Check, ChevronRight, HelpCircle, Lock } from '../icons/appIcons'
import './excelLab.css'

const PHONE = PLATFORM === 'iphone' || PLATFORM === 'android'

export function ExcelVersionPicker({ onDone }: { onDone?: () => void }) {
  const prefs = useExcelPrefs()
  const [help, setHelp] = useState(prefs.version === 'unknown')
  const [saved, setSaved] = useState<null | 'saved' | 'local'>(null)
  async function choose(v: ExcelChoice) {
    setSaved(await saveExcelPrefs({ version: v }))
    if (v !== 'unknown') onDone?.()
  }
  return (
    <div className="xl-root" data-kind="version">
      <div className="xl-title" style={{ fontSize: 18 }}>Какой у вас Excel?</div>
      <div className="xl-muted" style={{ fontSize: 14 }}>Покажем способы решения, которые сработают именно у вас. Поменять можно в любой момент.</div>
      <div className="xl-versions" role="radiogroup" aria-label="Версия Excel">
        {EXCEL_CHOICES.map(c => (
          <button key={c.id} type="button" role="radio" aria-checked={prefs.version === c.id} onClick={() => { setHelp(false); void choose(c.id) }}>
            {prefs.version === c.id && <Check size={16} aria-hidden />}{c.label}
          </button>
        ))}
        <button type="button" role="radio" aria-checked={prefs.version === 'unknown'} onClick={() => { setHelp(true); void choose('unknown') }}>
          <HelpCircle size={16} aria-hidden /> Не знаю — помогите определить
        </button>
      </div>
      {help && (
        <div className="xl-card" style={{ background: 'var(--color-accent-soft)' }}>
          <div className="xl-title">Как узнать версию за минуту</div>
          <div style={{ fontSize: 14 }}>Откройте Excel и пройдите:</div>
          <div className="xl-path"><b>Файл</b><ChevronRight size={14} aria-hidden /><b>Учётная запись</b><ChevronRight size={14} aria-hidden /><b>О программе Excel</b></div>
          <div className="xl-muted" style={{ color: 'var(--color-text-2)' }}>
            В первой строке окна — «Microsoft Excel 2016», «… 2021» или «Microsoft 365»: нажмите эту версию выше.
            Нет пункта «Учётная запись» — у вас 2010: Файл → Справка. Нет меню «Файл», а слева вверху круглая кнопка — это 2007.
          </div>
          <div className="xl-muted">Пока версия не выбрана, считаем, что у вас 2016 или новее, а функции 2021+ помечаем «проверьте в своей версии».</div>
        </div>
      )}
      <MacrosToggle />
      {saved === 'local' && <div className="xl-muted">Сохранили на этом устройстве. В профиль сохраним, когда будет связь.</div>}
    </div>
  )
}

function MacrosToggle() {
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

export default function ExcelMethods({ spec }: { spec: MethodsSpec }) {
  const prefs = useExcelPrefs()
  useEffect(() => { void loadExcelPrefs() }, [])
  const mine = useMemo(() => pickMethod(spec, prefs), [spec, prefs])
  const [active, setActive] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const cur = spec.methods.find(m => m.id === (active ?? mine)) ?? spec.methods[0]
  const status = cur ? methodStatus(cur, prefs) : 'ok'

  const pickerBody = <ExcelVersionPicker onDone={() => setPicker(false)} />

  return (
    <div className="xl-root" data-kind="methods">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <span className="xl-kicker">{spec.title ?? 'Способы решения'}</span>
        <button type="button" className="xl-pill" onClick={() => setPicker(p => !p)} aria-expanded={picker}>
          {versionLabel(prefs.version)} <em>{prefs.version ? 'изменить' : 'выбрать'}</em>
        </button>
      </div>

      {!prefs.version && !picker && (
        <div className="xl-card" style={{ background: 'var(--color-accent-soft)' }}>
          <div style={{ fontSize: 14 }}>Укажите версию Excel — первым откроется способ, который точно сработает у вас.</div>
          <div><button type="button" className="xl-btn" data-primary="" onClick={() => setPicker(true)}>Выбрать версию</button></div>
        </div>
      )}
      {picker && !PHONE && <div className="xl-card">{pickerBody}</div>}
      {PHONE && <MobileSheet open={picker} onClose={() => setPicker(false)} title="Версия Excel" softEdge>{pickerBody}</MobileSheet>}

      <HScrollFade padTop={0} padBottom={0} fadeWidth={28}>
      <div className="xl-tabs" role="tablist" aria-label="Способы решения" style={{ minWidth: '100%' }}>
        {spec.methods.map(m => {
          const s = methodStatus(m, prefs)
          return (
            <button key={m.id} type="button" role="tab" aria-selected={cur?.id === m.id} data-status={s} onClick={() => setActive(m.id)}>
              <span className="nm">{s === 'no' || s === 'permission' ? <Lock size={13} aria-hidden /> : s === 'addin' || s === 'check' ? <AlertTriangle size={13} aria-hidden /> : null}{m.title ?? METHOD_TITLES[m.id]}</span>
              {m.id === mine ? <span className="xl-mine">ваш вариант</span> : <span className="st">{s === 'ok' ? 'доступно' : STATUS_TEXT[s]}</span>}
            </button>
          )
        })}
      </div>
      </HScrollFade>

      {cur && (
        <div className="xl-card" role="tabpanel">
          {status !== 'ok' && (
            <div className="xl-verdict" data-info="">
              {status === 'no' && <>В {versionLabel(prefs.version)} этот способ не сработает. Можно посмотреть, чтобы знать на будущее; решать — способом «{METHOD_TITLES[mine ?? 'formulas']}».</>}
              {status === 'addin' && <>В вашей версии это надстройка: её ставят отдельно, иногда нужны права администратора.</>}
              {status === 'check' && <>Функции этого способа есть не во всех версиях. Проверьте в своём Excel: если формула даёт #ИМЯ?, выберите «{METHOD_TITLES[mine ?? 'formulas']}».</>}
              {status === 'permission' && <>Нужны макросы. На рабочем компьютере их часто запрещает отдел IT — включайте, только если разрешено.</>}
            </div>
          )}
          <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.45 }}>
            {cur.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {cur.formula && <div className="xl-fbar"><span className="xl-fx">fx</span><span style={{ fontSize: 15, lineHeight: '28px' }}><ColoredFormula formula={cur.formula} /></span></div>}
        </div>
      )}
      {spec.methods.length > 1 && <div className="xl-muted">Ответ один для всех способов — проверяется число, а не путь.</div>}
    </div>
  )
}
