// Стенд тренажёра с банком ФИПИ (dev-trainer-fipi.html).
//
// ЗАЧЕМ. Тренажёр ученика в DEV без настоящей сессии висит на скелетоне (данные
// ученика под RLS), а задания ФИПИ в DEV приходят из фикстуры
// (data/devFipiSample.ts через taskBankStore.loadFipiSet). Здесь — тот же
// BankTrainer с подставленным предметом:
//   ?s=chemistry|biology — предмет (по умолчанию химия);
//   ?p=pc|ipad|iphone|android — хром версии; ?theme=dark.
// Концепт: Figma «Искра», стр. 27.
import './lib/platform'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import BankTrainer from './components/trainer/BankTrainer'
import { useStudentData } from './store/studentDataStore'
import { useTaskBank } from './store/taskBankStore'
import { useTheme } from './store/themeStore'
import { getSubject } from './lib/subjects'
import { PLATFORM, type Platform } from './lib/platform'
import type { TrainerSubjectState } from './lib/trainerSubject'
import './index.css'

const q = new URLSearchParams(location.search)
// Тема и через хранилище: палитра предмета берёт `dark` из useTheme, не из атрибута.
if ((q.get('theme') === 'dark') !== useTheme.getState().dark) useTheme.getState().toggle()
const platform = (q.get('p') as Platform | null) ?? PLATFORM
document.documentElement.dataset.platform = platform
try { localStorage.removeItem('dev-task-bank') } catch { /* приватный режим */ }
useStudentData.setState({ loaded: true })
// Только задания ФИПИ из фикстуры: DEV-сид старого банка на стенде не нужен.
useTaskBank.setState({ tasks: [], loaded: true, load: async () => {} })

function Stand() {
  const [id, setId] = useState(q.get('s') ?? 'chemistry')
  const def = getSubject(id)!
  const state: TrainerSubjectState = {
    options: ['chemistry', 'biology'].map(s => ({ def: getSubject(s)!, kind: 'bank' as const, count: 0, hasBook: false })),
    current: { def, kind: 'bank', count: 0, hasBook: false },
    pick: setId,
    due: {},
    loadDue: () => {},
  }
  return (
    <div className="dashboard-main" style={{ minHeight: '100dvh', padding: platform === 'pc' ? '24px 40px' : 0, background: 'var(--color-bg)', overflowY: 'auto', height: '100dvh' }}>
      <BankTrainer subjectState={state} />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
