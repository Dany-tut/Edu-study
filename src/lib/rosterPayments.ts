import type { Student } from '../data/teacherMockData'

export type RosterPaymentInfo = Pick<Student, 'lastPayment' | 'debt'>

/** Zero debt is compatible with active billing; lesson credits alone are not billing. */
export function hasStudentPaymentTracking(student: Student): boolean {
  return !!student.lastPayment?.trim() || !!student.paymentDue?.trim() ||
    (Number.isFinite(student.paymentAmount) && (student.paymentAmount ?? 0) > 0) ||
    (Number.isFinite(student.debt) && (student.debt ?? 0) > 0)
}
