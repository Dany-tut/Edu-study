// DEV-ONLY demo data for «Финансы» (репетитор Дарья, химия/биология).
//
// Те же правила, что teacherDevDemo.ts / teacherHomeDemo.ts:
//   • работает только в import.meta.env.DEV и только когда настоящих учеников нет
//     (локальная разработка без входа учителя);
//   • ученики и платежи — те же демо-ученики кабинета (id `demo-…`), к ним
//     добавлены только денежные поля;
//   • в базу ничего не пишется: «Оплачено» и удаление платежа для demo-id
//     обрываются до запроса (TeacherFinancesPage / usePayments).

import type { Student } from './teacherMockData'
import type { FinanceSummary, Payment } from '../lib/useFinances'
import { DEMO_STUDENTS_BY_GROUP } from './teacherDevDemo'

const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

type Money = Pick<Student, 'paymentDue' | 'paymentAmount' | 'lessonBalance'>

// Кто сколько должен: три просрочки, двое «на подходе», остальные оплачены вперёд.
const MONEY: Record<string, Money> = {
  'demo-st-4':  { paymentDue: day(-6), paymentAmount: 4800, lessonBalance: -2 }, // Кирилл Наумов
  'demo-st-10': { paymentDue: day(-3), paymentAmount: 4800, lessonBalance: -2 }, // Матвей Зуев
  'demo-artem': { paymentDue: day(-2), paymentAmount: 2400, lessonBalance: -1 }, // Артём Романов
  'demo-sonya': { paymentDue: day(2),  paymentAmount: 9600, lessonBalance: 0 },  // Соня Морозова
  'demo-st-2':  { paymentDue: day(3),  paymentAmount: 4800, lessonBalance: 1 },  // Данил Орлов
  'demo-st-8':  { paymentDue: day(9),  paymentAmount: 4800, lessonBalance: 2 },  // Егор Пантелеев
  'demo-st-1':  { lessonBalance: 6 },
  'demo-st-3':  { lessonBalance: 4 },
  'demo-st-5':  { lessonBalance: 3 },
  'demo-st-6':  { lessonBalance: 5 },
  'demo-st-7':  { lessonBalance: 4 },
  'demo-st-9':  { lessonBalance: 2 },
  'demo-st-11': { lessonBalance: 8 },
  'demo-st-12': { lessonBalance: 3 },
  'demo-st-13': { lessonBalance: 4 },
  'demo-igor':  { lessonBalance: 2 },
}

export const DEMO_FINANCE_STUDENTS: Student[] = Object.values(DEMO_STUDENTS_BY_GROUP).flat()
  .map(s => ({ ...s, ...MONEY[s.id] }))

// Сводка месяца сходится со списком: долг = три просрочки, ожидается = «на подходе».
export const DEMO_FINANCE_SUMMARY: FinanceSummary = {
  received: 86_400,
  expected: 19_200,
  debt: 12_000,
  forecast: 117_600,
}

const pay = (id: string, studentId: string, offset: number, amount: number, lessonsPaid: number, note = ''): Payment =>
  ({ id, studentId, teacherId: null, amount, lessonsPaid, note, paidAt: day(offset) + 'T10:00:00.000Z' })

const PAYMENTS: Payment[] = [
  pay('demo-pay-1', 'demo-st-4', -36, 4800, 2, 'Перевод на карту'),
  pay('demo-pay-2', 'demo-st-10', -33, 4800, 2),
  pay('demo-pay-3', 'demo-artem', -30, 9600, 4, 'СБП'),
  pay('demo-pay-4', 'demo-sonya', -28, 9600, 4, 'СБП'),
  pay('demo-pay-5', 'demo-st-2', -25, 4800, 2),
  pay('demo-pay-6', 'demo-st-1', -4, 9600, 4, 'Перевод на карту'),
  pay('demo-pay-7', 'demo-st-11', -2, 14400, 6),
]

export const demoPaymentsFor = (studentId: string) => PAYMENTS.filter(p => p.studentId === studentId)
