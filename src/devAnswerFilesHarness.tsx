// Стенд «файл в ответе на сложное задание» (dev-answer-files.html).
//
// ЗАЧЕМ. Сдача файла живёт внутри сложной домашки, а до неё в приложении —
// ученик, курс, урок и сдача в Supabase. Здесь та же HardConversation и те же
// карточки AnswerFileCard на фикстурах, без базы: загрузка подменена задержкой,
// ссылки — blob:. Кадры концепта (4 версии × 2 темы) снимаются отсюда.
//
//   ?view=student  — ученик: черновик с тремя состояниями файла
//   ?view=teacher  — учитель: лента решения с файлами + форма проверки
//   ?view=sheet    — мобильная проверка учителя (лист)
//   ?theme=dark    — тёмная тема
//   ?iphone=1 / ?ipad=1 — версия (Android — по UA эмулятора)
import './lib/platform'
import './store/studentDataStore'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import HardConversation, { type HardTabVM } from './components/teacher/HardConversation'
import { AnswerFileList } from './components/teacher/AnswerFileCard'
import type { HardTaskStudentBlock, HardTaskReviewBlock } from './lib/useHomework'
import { ANSWER_FILE_TYPES, answerFileExt, validateAnswerFile, AnswerFileError, type AnswerFile } from './lib/answerFiles'
import { PLATFORM } from './lib/platform'
import './index.css'

const params = new URLSearchParams(location.search)
const view = params.get('view') ?? 'student'
if (params.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark'

const blob = (name: string) => URL.createObjectURL(new Blob(['stand'], { type: ANSWER_FILE_TYPES[answerFileExt(name)] }))
const f = (name: string, size: number): AnswerFile => ({ path: blob(name), name, size, mime: ANSWER_FILE_TYPES[answerFileExt(name)] ?? '' })

const STATEMENT = 'Заполните шаблон «Оборотно-сальдовая ведомость за квартал» (файл osv-template.xlsx из материалов урока): перенесите обороты по счетам 60, 62 и 68.02, проверьте, что сальдо сходится, и пришлите заполненный файл. В ответе коротко опишите, где нашли расхождение.'
const tabs: HardTabVM[] = [
  { key: 't1', title: 'Задание 1', statement: STATEMENT },
  { key: 't2', title: 'Задание 2', statement: 'Сверьте акт с поставщиком и пришлите PDF с отметками.' },
]

const submitted: HardTaskStudentBlock[] = [{
  key: 't1', statement: STATEMENT,
  solutions: [{
    id: 's1', at: '2026-11-26T09:40:00Z', photos: [], board: null,
    answer: '<p>Заполнила ведомость. Расхождение было в 68.02: НДС к вычету по счёту-фактуре № 418 дважды попал в оборот — исправила, сальдо сошлось.</p>',
    files: [f('ОСВ_3 квартал_Иванова_заполнено.xlsx', 48_620), f('Акт сверки с ООО «Ромашка» — подписан.pdf', 1_284_000)],
  }],
}]

// Ученик: заранее один готовый, один грузится, один упал — все три состояния в кадре.
const draftKey = 'draft:hardFiles:stand:t1:0'
try { sessionStorage.setItem(draftKey, JSON.stringify([f('ОСВ_3 квартал_Иванова_заполнено.xlsx', 48_620)])) } catch { /* приватный режим */ }

async function fakeUpload(file: File): Promise<AnswerFile> {
  const bad = validateAnswerFile(file)
  if (bad) throw bad
  await new Promise(r => setTimeout(r, file.size === 7_340_032 ? 1e9 : 1400))
  if (file.size === 2_097_152) throw new AnswerFileError('Файл не загрузился — проверьте связь и повторите', 'upload')
  return { path: URL.createObjectURL(file), name: file.name, size: file.size, mime: ANSWER_FILE_TYPES[answerFileExt(file.name)] }
}

function Stand() {
  const [key, setKey] = useState('t1')
  const touch = PLATFORM !== 'pc'
  const pad = touch ? 16 : 24

  if (view === 'sheet') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', padding: pad, boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', borderRadius: 28, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)', padding: 16 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: 'var(--color-border-medium)', margin: '0 auto 14px' }} />
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>Иванова Мария · ОСВ за квартал</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.45, padding: '10px 12px', borderRadius: 12, background: 'var(--color-bg-4)' }}>
            Заполнила ведомость. Расхождение было в 68.02: НДС к вычету по счёту-фактуре № 418 дважды попал в оборот — исправила, сальдо сошлось.
          </div>
          <AnswerFileList files={submitted[0].solutions![0].files} />
        </div>
      </div>
    )
  }

  const reviewBlocks: HardTaskReviewBlock[] = []
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', padding: pad, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <HardConversation
          tabs={tabs}
          studentBlocks={view === 'teacher' ? submitted : []}
          reviewBlocks={reviewBlocks}
          role={view === 'teacher' ? 'teacher' : 'student'}
          activeKey={key}
          onSelectTab={setKey}
          draftScope="stand"
          onSubmitSolution={(k, p) => { console.log('[stand] submit', k, p) }}
          uploadAnswerFile={fakeUpload}
          onReview={(k, p) => { console.log('[stand] review', k, p) }}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
