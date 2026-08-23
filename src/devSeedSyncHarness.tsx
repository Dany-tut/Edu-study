// Стенд окна «Что изменилось в готовом курсе»: живой SeedSyncDialog на
// выдуманном диффе — чтобы проверять шапку с группами без учительского входа
// и настоящего курса из сида. Открывается через /dev-seedsync.html.
import { createRoot } from 'react-dom/client'
import './index.css'
import SeedSyncDialog from './components/teacher/SeedSyncDialog'
import type { SeedChange, SeedDiff } from './lib/seedSync'

const mk = (i: number, kind: SeedChange['kind'], overwrites: boolean): SeedChange => ({
  key: `${kind}-${i}`,
  kind,
  lessonTitle: `${i}. Урок номер ${i}`,
  summary: `Новых заданий: ${1 + (i % 5)}`,
  overwrites,
  details: ['первая правка', 'вторая правка'],
})

const diff: SeedDiff = {
  seedKey: 'kotp',
  changes: [
    ...Array.from({ length: 47 }, (_, i) => mk(i + 2, 'task', false)),
    ...Array.from({ length: 33 }, (_, i) => mk(i + 2, 'task-fields', true)),
    ...Array.from({ length: 8 }, (_, i) => mk(i + 2, 'task-gone', true)),
  ],
}

createRoot(document.getElementById('root')!).render(
  <SeedSyncDialog diff={diff} onClose={() => {}} onApply={keys => console.log('apply', keys.size)} />,
)
