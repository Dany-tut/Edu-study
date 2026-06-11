export type Subject = 'biology' | 'chemistry'

export type QuestionType = 'choice' | 'free'
export type ScoreMode = 'perOption' | 'criteria' | 'whole'

export type AnswerType =
  | 'single' | 'multi' | 'short' | 'matching' | 'sequence' | 'tableFill' | 'extended'

export interface TaskChoice { id: string; text: string; correct: boolean; points?: number }
export interface TaskAnswerKey { id: string; keyword: string; points: number }
export interface TaskCriterion { id: string; text: string; points: number }

export interface Task {
  id: number
  subject: Subject
  section: string
  topic: string
  part: 1 | 2
  line: number
  source: string
  question: string
  questionTable?: { headers: string[]; rows: string[][] }
  questionImage?: string
  answer: string
  solution: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionType?: QuestionType
  scoreMode?: ScoreMode
  choices?: TaskChoice[]
  answerKeys?: TaskAnswerKey[]
  criteria?: TaskCriterion[]
  criteriaVisibleOnCheck?: boolean
  maxPoints?: number
  answerType?: AnswerType
  matchLeft?: string[]
  matchRight?: string[]
  sequenceItems?: string[]
  allowPhoto?: boolean
}

export const BIOLOGY_SECTIONS = ['Биология как наука', 'Клетка', 'Организм', 'Экосистемы', 'Эволюция', 'Человек']
export const CHEMISTRY_SECTIONS = ['Неорганическая химия', 'Органическая химия', 'Химические реакции', 'Вещества и смеси', 'Электрохимия']

export const BIOLOGY_TOPICS: Record<string, string[]> = {
  'Биология как наука': ['Разделы биологии', 'Методы биологии', 'Уровни организации'],
  'Клетка': ['Строение клетки', 'Обмен веществ', 'Деление клетки', 'Прокариоты и эукариоты'],
  'Организм': ['Размножение', 'Генетика', 'Онтогенез', 'Изменчивость'],
  'Экосистемы': ['Экологические факторы', 'Биогеоценоз', 'Круговорот веществ', 'Сукцессии'],
  'Эволюция': ['Теории эволюции', 'Движущие силы', 'Видообразование', 'Макроэволюция'],
  'Человек': ['Анатомия', 'Физиология', 'Гигиена', 'Нервная система'],
}

export const CHEMISTRY_TOPICS: Record<string, string[]> = {
  'Неорганическая химия': ['Классификация веществ', 'Оксиды', 'Кислоты', 'Соли', 'Основания'],
  'Органическая химия': ['Углеводороды', 'Спирты', 'Карбоновые кислоты', 'Полимеры'],
  'Химические реакции': ['Типы реакций', 'Скорость реакции', 'Равновесие', 'Электролиз'],
  'Вещества и смеси': ['Атомное строение', 'ПСЭ', 'Химическая связь', 'Растворы'],
  'Электрохимия': ['Гальванический элемент', 'Коррозия', 'Электролиз расплавов'],
}

export const SOURCES = ['ЕГЭ 2023', 'ЕГЭ 2024', 'ЕГЭ 2025', 'Досрочный 2024', 'Пробный 2025', 'Авторский']

export const tasks: Task[] = []
