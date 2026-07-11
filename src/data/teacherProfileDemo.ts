// DEV-ONLY demo для мобильного профиля учителя ("Профиль").
//
// Тот же паттерн, что teacherHomeDemo.ts: работает только в import.meta.env.DEV
// и ТОЛЬКО как заглушка, когда реальные хуки пусты (нет залогиненного учителя
// в локальной разработке). В проде реальные данные всегда побеждают.
//
// Нужно, чтобы полировать редизайн профиля на реалистичном репетиторе, а не на
// пустом 0/0/0-состоянии.

export type TeacherProfileModel = {
  name: string
  subject: string
  planName: string
  studentsUsed: number
  maxStudents: number | null
  received: number
  debt: number
  debtorCount: number
  studentTotal: number
  groupCount: number
  pending: number
}

export const DEMO_TEACHER_PROFILE: TeacherProfileModel = {
  name: 'Дарья',
  subject: 'химия · биология',
  planName: 'Про',
  studentsUsed: 18,
  maxStudents: 40,
  received: 24000,
  debt: 4800,
  debtorCount: 2,
  studentTotal: 18,
  groupCount: 4,
  pending: 3,
}
