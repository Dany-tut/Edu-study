import type { TaskTypeId } from './taskTypes'
import type { PreviewBlock } from './taskTypePreviews'

export interface FipiPreview {
  subject: string
  prompt: string
  hint?: string
  source: { url: string; year: number }
}

const examples: Record<string, Partial<Record<TaskTypeId, PreviewBlock[]>>> = {
  Биология: {
    fill: [
      { kind: 'prompt', text: 'Как называется процесс образования органических веществ из углекислого газа и воды на свету?' },
      { kind: 'field', text: 'Фотосинтез' },
      { kind: 'verdict', text: 'Верно', ok: true },
    ],
    multi: [
      { kind: 'prompt', text: 'Выберите примеры биологического эксперимента.' },
      { kind: 'choices', multi: true, options: [
        { text: 'Сравнить рост проростков при разной освещённости', state: 'correct' },
        { text: 'Записать время прилёта перелётных птиц' },
        { text: 'Проверить прорастание семян при разных температурах', state: 'correct' },
      ] },
    ],
    single: [
      { kind: 'prompt', text: 'Какая ткань проводит воду от корней к листьям?' },
      { kind: 'choices', options: [
        { text: 'Ксилема', state: 'correct' },
        { text: 'Флоэма' },
        { text: 'Эпидерма' },
      ] },
    ],
    numeric: [
      { kind: 'prompt', text: 'В соматической клетке гороха 14 хромосом. Сколько хромосом в его гамете?' },
      { kind: 'field', text: '7' },
      { kind: 'verdict', text: 'Верно', ok: true },
    ],
    matching: [
      { kind: 'prompt', text: 'Соотнесите животных с их классами.' },
      { kind: 'pairs', rows: [
        { left: 'Тритон', right: 'Земноводные', linked: true },
        { left: 'Гадюка', right: 'Пресмыкающиеся', linked: true },
      ] },
    ],
    sequence: [
      { kind: 'prompt', text: 'Расположите таксоны от меньшего к большему.' },
      { kind: 'line', items: [{ text: '1. Вид' }] },
      { kind: 'line', items: [{ text: '2. Род' }] },
      { kind: 'line', items: [{ text: '3. Семейство' }] },
    ],
    tableFill: [
      { kind: 'prompt', text: 'Заполните пропуск в таблице функций органоидов.' },
      { kind: 'table', headers: ['Органоид', 'Функция'], rows: [
        ['Рибосома', 'Синтез белка'],
        ['Хлоропласт', null],
      ] },
    ],
    dropdownGap: [
      { kind: 'prompt', text: 'Выберите пропущенное слово.' },
      { kind: 'gap', parts: ['Воду и минеральные вещества из почвы поглощают корневые ', { select: 'волоски' }, '.'] },
    ],
    extended: [
      { kind: 'prompt', text: 'Объясните, почему при закрытии устьиц испарение воды листьями уменьшается.' },
      { kind: 'field', lines: 3, text: 'Через закрытые устьица наружу выходит меньше водяного пара.' },
    ],
  },
  Литература: {
    fill: [
      { kind: 'prompt', text: 'Назовите фамилию главного героя «Капитанской дочки» А. С. Пушкина.' },
      { kind: 'field', text: 'Гринёв' },
      { kind: 'verdict', text: 'Верно', ok: true },
    ],
    extended: [
      { kind: 'prompt', text: 'Как встреча с Пугачёвым в метели помогает раскрыть характер Гринёва?' },
      { kind: 'field', lines: 3, text: 'Гринёв дарит вожатому заячий тулуп в благодарность за помощь. Этот поступок показывает его щедрость.' },
    ],
  },
}

export function fipiPreviewBlocks(type: TaskTypeId, preview: FipiPreview): PreviewBlock[] {
  return examples[preview.subject]?.[type] ?? [
    { kind: 'prompt', text: preview.prompt },
    ...(preview.hint ? [{ kind: 'prompt' as const, text: preview.hint, muted: true }] : []),
  ]
}
