// ─────────────────────────────────────────────────────────────────────────────
// Отправка голосового ответа из тренажёра преподавателю
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. В тренажёре запись голоса раньше никуда не уходила:
// компонент стоял, обработчик был пустой. Кнопка работала, файл загружался в
// хранилище — и терялся. Здесь она наконец доезжает до очереди проверки.
//
// КУДА ПИШЕМ. В lesson_progress — туда же, куда идут все ответы учеников, и
// откуда преподаватель их читает. Ключ строки: `trainer-speaking-<предмет>`.
// Отдельный ключ на предмет, а не один на всё: у человека может быть корейский
// и английский одновременно, и мешать их записи в одну ленту нельзя.
//
// ФОРМА ДАННЫХ. Та же, что у сложных заданий домашки (attachments v2):
// массив задач, у каждой список решений с датой. Своей формы не заводим —
// иначе преподавателю пришлось бы читать два разных формата, а панель проверки
// умеет только один.
//
// ЗАПИСИ НЕ ЗАТИРАЮТСЯ. Каждая новая уходит в конец списка: ученик может
// записать себя в начале месяца и в конце, а преподаватель — услышать разницу.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'

/** Ключ строки прогресса для голосовых ответов из тренажёра. */
export function trainerSpeakingRef(subjectId: string): string {
  return `trainer-speaking-${subjectId}`
}

/** Одна запись ученика — совпадает по форме с HardSolution из useHomework. */
interface VoiceSolution {
  id: string
  at: string
  answer: string
  photos: string[]
  board: string | null
  voice: string
}

interface Attachments {
  v: 2
  tasks: Array<{ key: string; statement?: string; solutions?: VoiceSolution[] }>
}

const TASK_KEY = 'trainer-speaking'

/**
 * Добавить голосовой ответ в ленту ученика.
 *
 * @param studentId владелец строки прогресса (см. ownerStudentIdFor)
 * @param subjectId слаг предмета — из него собирается ключ строки
 * @param subjectName русское название предмета, пишется в колонку subject
 * @param voicePath путь записи в бакете task-media
 * @param prompt задание, на которое отвечали, — чтобы преподаватель понимал контекст
 */
export async function submitTrainerVoice(
  studentId: string,
  subjectId: string,
  subjectName: string,
  voicePath: string,
  prompt: string,
): Promise<void> {
  const ref = trainerSpeakingRef(subjectId)

  // Читаем текущую ленту: дописываем в конец, а не заменяем. Иначе каждая новая
  // запись стирала бы предыдущие, и сравнить прогресс было бы не с чем.
  const { data } = await supabase
    .from('lesson_progress')
    .select('attachments')
    .eq('student_id', studentId)
    .eq('lesson_ref', ref)
    .maybeSingle()

  const prev = (data?.attachments ?? null) as Attachments | null
  const block = prev?.tasks?.find(x => x.key === TASK_KEY)
  const solutions = block?.solutions ?? []

  const next: Attachments = {
    v: 2,
    tasks: [{
      key: TASK_KEY,
      statement: prompt,
      solutions: [
        ...solutions,
        {
          id: `${Date.now()}`,
          at: new Date().toISOString(),
          answer: '',
          photos: [],
          board: null,
          voice: voicePath,
        },
      ],
    }],
  }

  const { error } = await supabase.from('lesson_progress').upsert({
    student_id: studentId,
    lesson_ref: ref,
    subject: subjectName,
    // 'submitted' — запись ждёт преподавателя. Без этого статуса строка не
    // попадёт в очередь проверки и снова потеряется, только уже в базе.
    status: 'submitted',
    attachments: next,
    hard_submitted: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'student_id,lesson_ref' })

  if (error) throw error
}

/** Сколько записей ученик уже отправил по этому предмету. */
export async function countTrainerVoice(studentId: string, subjectId: string): Promise<number> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('attachments')
    .eq('student_id', studentId)
    .eq('lesson_ref', trainerSpeakingRef(subjectId))
    .maybeSingle()

  const att = (data?.attachments ?? null) as Attachments | null
  return att?.tasks?.find(x => x.key === TASK_KEY)?.solutions?.length ?? 0
}
