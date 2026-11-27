// Выбор версии Excel и способы решения (Figma «Искра» стр. 28, раздел 1).
// Блок конспекта: вкладки способов с пометкой «ваш вариант» и причинами
// недоступности. Версия спрашивается в первом блоке, где она нужна, и меняется
// пилюлей «Excel 2016 · изменить» (ExcelVersion.tsx): на телефонах — шторкой, на ПК и iPad — окном.

import { useEffect, useMemo, useState } from 'react'
import HScrollFade from '../HScrollFade'
import { METHOD_TITLES, STATUS_TEXT, loadExcelPrefs, methodStatus, pickMethod, useExcelPrefs, versionLabel } from '../../lib/excelLab/excelVersion'
import { ExcelOverlay, ExcelVersionPicker } from './ExcelVersion'
import type { MethodsSpec } from '../../lib/excelLab/spec'
import { ColoredFormula } from './ExcelTrainer'
import { AlertTriangle, Lock } from '../icons/appIcons'
import './excelLab.css'

export default function ExcelMethods({ spec }: { spec: MethodsSpec }) {
  const prefs = useExcelPrefs()
  useEffect(() => { void loadExcelPrefs() }, [])
  const mine = useMemo(() => pickMethod(spec, prefs), [spec, prefs])
  const [active, setActive] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const cur = spec.methods.find(m => m.id === (active ?? mine)) ?? spec.methods[0]
  const status = cur ? methodStatus(cur, prefs) : 'ok'


  return (
    <div className="xl-root" data-kind="methods">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <span className="xl-kicker">{spec.title ?? 'Способы решения'}</span>
        <button type="button" className="xl-pill" onClick={() => setPicker(true)} aria-haspopup="dialog">
          {versionLabel(prefs.version)} <em>{prefs.version ? 'изменить' : 'выбрать'}</em>
        </button>
      </div>

      {!prefs.version && (
        <div className="xl-card" style={{ background: 'var(--color-accent-soft)' }}>
          <div style={{ fontSize: 14 }}>Укажите версию Excel — первым откроется способ, который точно сработает у вас.</div>
          <div><button type="button" className="xl-btn" data-primary="" onClick={() => setPicker(true)}>Выбрать версию</button></div>
        </div>
      )}
      <ExcelOverlay open={picker} onClose={() => setPicker(false)} title="Версия Excel">
        <ExcelVersionPicker macros onDone={() => setPicker(false)} />
      </ExcelOverlay>

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
