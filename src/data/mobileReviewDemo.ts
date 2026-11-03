import type { HwSubmission } from '../lib/useHomework'

// Only the existing signed-out DEV inbox uses these rows; never passed to publication.
export const DEMO_REGULAR_SUBMISSIONS: HwSubmission[] = ['Мария Ковалёва', 'Данил Орлов', 'Полина Ершова'].map((studentName, i) => ({
  id: `demo-regular-${i}`, hwId: 'demo-hw-1', studentId: `demo-st-${i + 1}`, studentName,
  submittedAt: '2026-11-02T06:30:00Z', verdict: 'pending', score: 0, comment: '', reviewComment: '', reviewPhotos: [], reviewBoard: null,
  answers: { v: 'basic-1', attemptId: `demo-attempt-${i}`, gradable: 1, correct: 1, rows: [
    { n: 1, type: 'single', prompt: 'Какой процесс происходит на катоде при электролизе?', answer: 'Восстановление', correct: 'Восстановление', verdict: 'correct' },
    { n: 2, type: 'extended', prompt: 'Объясните, как состав раствора влияет на продукты электролиза. Укажите, какие частицы участвуют в реакции на каждом электроде, и обоснуйте свой ответ.', answer: 'На катоде катионы принимают электроны. В водном растворе с ними конкурируют молекулы воды. На аноде окисляются анионы или вода — результат зависит от состава раствора и материала электрода.', verdict: 'review' },
  ] },
}))
