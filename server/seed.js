/**
 * Seeds the database with initial data from the original mockData.
 * Run once: node server/seed.js
 */
import prisma from './db.js'

const subjects = [
  { id: 'chemistry', name: 'Химия', emoji: '⚗️', modules: [
    { label: 'Модуль 1', lessons: [
      { id: 'c1-1', title: 'Введение в химию', number: 1, shape: 'circle' },
      { id: 'c1-2', title: 'Периодическая таблица', number: 2, shape: 'circle' },
      { id: 'c1-3', title: 'Химические связи', number: 3, shape: 'square' },
      { id: 'c1-4', title: 'Атомы и молекулы', number: 4, shape: 'circle' },
      { id: 'c1-5', title: 'Изотопы', number: 5, shape: 'circle' },
      { id: 'c1-6', title: 'Валентность', number: 6, shape: 'circle' },
      { id: 'c1-7', title: 'Моль и молярная масса', number: 7, shape: 'square' },
      { id: 'c1-8', title: 'Закон Авогадро', number: 8, shape: 'circle' },
      { id: 'c1-9', title: 'Практикум', number: 9, shape: 'square' },
      { id: 'c1-10', title: 'Итоговый тест', number: 10, shape: 'diamond' },
    ]},
    { label: 'Модуль 2', lessons: [
      { id: 'c2-1', title: 'Растворы и смеси', number: 4, shape: 'circle' },
      { id: 'c2-2', title: 'Реакции окисления', number: 5, shape: 'circle' },
      { id: 'c2-3', title: 'Контрольная работа', number: 6, shape: 'square' },
      { id: 'c2-4', title: 'Скорость реакций', number: 7, shape: 'circle' },
      { id: 'c2-5', title: 'Химическое равновесие', number: 8, shape: 'circle' },
      { id: 'c2-6', title: 'Катализаторы', number: 9, shape: 'circle' },
      { id: 'c2-7', title: 'Практикум', number: 10, shape: 'square' },
      { id: 'c2-8', title: 'Итоговый тест модуля', number: 11, shape: 'diamond' },
    ]},
    { label: 'Модуль 3', lessons: [
      { id: 'c3-1', title: 'Строение атома', number: 7, shape: 'circle' },
      { id: 'c3-2', title: 'Электронные оболочки', number: 8, shape: 'circle' },
      { id: 'c3-3', title: 'Электролиты', number: 9, shape: 'circle' },
      { id: 'c3-4', title: 'Самостоятельная работа', number: 10, shape: 'square' },
      { id: 'c3-5', title: 'Кислоты и основания', number: 11, shape: 'circle' },
      { id: 'c3-5b', title: 'Реакции нейтрализации', number: 12, shape: 'circle' },
      { id: 'c3-6', title: 'Соли', number: 13, shape: 'circle' },
      { id: 'c3-7', title: 'Гидролиз', number: 14, shape: 'circle' },
      { id: 'c3-8', title: 'Практикум', number: 15, shape: 'square' },
      { id: 'c3-9', title: 'Итоговый тест', number: 16, shape: 'diamond' },
    ]},
    { label: 'Модуль 4', lessons: [
      { id: 'c4-1', title: 'Органическая химия', number: 17, shape: 'circle' },
      { id: 'c4-2', title: 'Углеводороды', number: 18, shape: 'circle' },
      { id: 'c4-3', title: 'Спирты и эфиры', number: 19, shape: 'circle' },
      { id: 'c4-4', title: 'Карбоновые кислоты', number: 20, shape: 'circle' },
      { id: 'c4-5', title: 'Практикум', number: 21, shape: 'square' },
      { id: 'c4-6', title: 'Итоговый тест', number: 22, shape: 'diamond' },
    ]},
  ]},
  { id: 'biology', name: 'Биология', emoji: '🧬', modules: [
    { label: 'Модуль 1', lessons: [
      { id: 'b1-1', title: 'Клетка', number: 1, shape: 'circle' },
      { id: 'b1-2', title: 'Фотосинтез', number: 2, shape: 'circle' },
      { id: 'b1-3', title: 'Митоз и мейоз', number: 3, shape: 'circle' },
      { id: 'b1-4', title: 'ДНК и РНК', number: 4, shape: 'circle' },
      { id: 'b1-5', title: 'Генетика', number: 5, shape: 'square' },
      { id: 'b1-6', title: 'Итоговый тест', number: 6, shape: 'diamond' },
    ]},
    { label: 'Модуль 2', lessons: [
      { id: 'b2-1', title: 'Эволюция', number: 7, shape: 'circle' },
      { id: 'b2-2', title: 'Экосистемы', number: 8, shape: 'circle' },
      { id: 'b2-3', title: 'Клеточное дыхание', number: 9, shape: 'circle' },
      { id: 'b2-4', title: 'Практикум: микроскопия', number: 10, shape: 'square' },
      { id: 'b2-5', title: 'Ткани и органы растений', number: 11, shape: 'circle' },
      { id: 'b2-6', title: 'Итоговый тест', number: 12, shape: 'diamond' },
    ]},
    { label: 'Модуль 3', lessons: [
      { id: 'b3-1', title: 'Нервная система', number: 13, shape: 'circle' },
      { id: 'b3-2', title: 'Эндокринная система', number: 14, shape: 'circle' },
      { id: 'b3-3', title: 'Иммунитет', number: 15, shape: 'circle' },
      { id: 'b3-4', title: 'Размножение', number: 16, shape: 'circle' },
      { id: 'b3-5', title: 'Онтогенез', number: 17, shape: 'circle' },
      { id: 'b3-6', title: 'Экология', number: 18, shape: 'circle' },
      { id: 'b3-7', title: 'Биогеоценозы', number: 19, shape: 'circle' },
      { id: 'b3-8', title: 'Итоговый тест', number: 20, shape: 'diamond' },
    ]},
  ]},
  { id: 'math', name: 'Математика', emoji: '📐', modules: [
    { label: 'Модуль 1', lessons: [
      { id: 'm1-1', title: 'Алгебра выражений', number: 1, shape: 'circle' },
      { id: 'm1-2', title: 'Уравнения', number: 2, shape: 'circle' },
      { id: 'm1-3', title: 'Неравенства', number: 3, shape: 'circle' },
      { id: 'm1-4', title: 'Функции', number: 4, shape: 'circle' },
      { id: 'm1-5', title: 'Производная', number: 5, shape: 'square' },
      { id: 'm1-6', title: 'Итоговый тест', number: 6, shape: 'diamond' },
    ]},
  ]},
  { id: 'physics', name: 'Физика', emoji: '⚡', modules: [
    { label: 'Модуль 1', lessons: [
      { id: 'p1-1', title: 'Механика', number: 1, shape: 'circle' },
      { id: 'p1-2', title: 'Термодинамика', number: 2, shape: 'circle' },
      { id: 'p1-3', title: 'Электричество', number: 3, shape: 'circle' },
      { id: 'p1-4', title: 'Оптика', number: 4, shape: 'circle' },
      { id: 'p1-5', title: 'Итоговый тест', number: 5, shape: 'diamond' },
    ]},
  ]},
  { id: 'russian', name: 'Русский язык', emoji: '📝', modules: [
    { label: 'Модуль 1', lessons: [
      { id: 'r1-1', title: 'Орфография', number: 1, shape: 'circle' },
      { id: 'r1-2', title: 'Пунктуация', number: 2, shape: 'circle' },
      { id: 'r1-3', title: 'Синтаксис', number: 3, shape: 'circle' },
      { id: 'r1-4', title: 'Морфология', number: 4, shape: 'circle' },
      { id: 'r1-5', title: 'Итоговый тест', number: 5, shape: 'diamond' },
    ]},
  ]},
]

// Schedule items: { lessonId, dayOffset, time, subject, passed }
const scheduleItems = [
  { lessonId: 'b2-3', dayOffset: -3, time: '11:00', subject: 'Биология', passed: true },
  { lessonId: 'b2-4', dayOffset: -2, time: '11:00', subject: 'Биология', passed: true },
  { lessonId: 'c3-2', dayOffset: -2, time: '15:00', subject: 'Химия', passed: true },
  { lessonId: 'b2-5', dayOffset: -1, time: '12:30', subject: 'Биология', passed: true },
  { lessonId: 'c3-3', dayOffset: -1, time: '15:00', subject: 'Химия', passed: true },
  { lessonId: 'b3-6', dayOffset: 0,  time: '12:30', subject: 'Биология', passed: false },
  { lessonId: 'c3-6', dayOffset: 0,  time: '15:00', subject: 'Химия', passed: false },
  { lessonId: 'b3-7', dayOffset: 1,  time: '12:30', subject: 'Биология', passed: false },
  { lessonId: 'c3-7', dayOffset: 1,  time: '15:00', subject: 'Химия', passed: false },
  { lessonId: 'c3-8', dayOffset: 3,  time: '16:00', subject: 'Химия', passed: false },
]

// Default student progress (from mockData statuses)
const studentProgress = [
  // Chemistry module 1 — all completed
  { lessonId: 'c1-1', status: 'completed', points: 90 },
  { lessonId: 'c1-2', status: 'completed', points: 85 },
  { lessonId: 'c1-3', status: 'completed', points: 78 },
  { lessonId: 'c1-4', status: 'completed', points: 88 },
  { lessonId: 'c1-5', status: 'completed', points: 82 },
  { lessonId: 'c1-6', status: 'completed', points: 91 },
  { lessonId: 'c1-7', status: 'completed', points: 76 },
  { lessonId: 'c1-8', status: 'completed', points: 84 },
  { lessonId: 'c1-9', status: 'completed', points: 80 },
  { lessonId: 'c1-10', status: 'completed', points: 95 },
  // Chemistry module 2
  { lessonId: 'c2-1', status: 'completed', points: 92 },
  { lessonId: 'c2-2', status: 'completed', points: 78 },
  { lessonId: 'c2-3', status: 'completed', points: 83 },
  { lessonId: 'c2-4', status: 'completed', points: 87 },
  { lessonId: 'c2-5', status: 'completed', points: 85 },
  { lessonId: 'c2-6', status: 'completed', points: 81 },
  { lessonId: 'c2-7', status: 'completed', points: 89 },
  { lessonId: 'c2-8', status: 'completed', points: 94 },
  // Chemistry module 3
  { lessonId: 'c3-1', status: 'completed', points: 82 },
  { lessonId: 'c3-2', status: 'completed', points: 74 },
  { lessonId: 'c3-3', status: 'completed', points: 88 },
  { lessonId: 'c3-4', status: 'completed', points: 79 },
  { lessonId: 'c3-5', status: 'completed', points: 91 },
  { lessonId: 'c3-5b', status: 'submitted', points: 60 },
  { lessonId: 'c3-6', status: 'current', points: null },
  { lessonId: 'c3-7', status: 'locked', points: null },
  { lessonId: 'c3-8', status: 'locked', points: null },
  { lessonId: 'c3-9', status: 'locked', points: null },
  // Chemistry module 4 — locked
  { lessonId: 'c4-1', status: 'locked', points: null },
  { lessonId: 'c4-2', status: 'locked', points: null },
  { lessonId: 'c4-3', status: 'locked', points: null },
  { lessonId: 'c4-4', status: 'locked', points: null },
  { lessonId: 'c4-5', status: 'locked', points: null },
  { lessonId: 'c4-6', status: 'locked', points: null },
  // Biology — partial
  { lessonId: 'b1-1', status: 'completed', points: 88 },
  { lessonId: 'b1-2', status: 'completed', points: 92 },
  { lessonId: 'b1-3', status: 'completed', points: 76 },
  { lessonId: 'b1-4', status: 'completed', points: 84 },
  { lessonId: 'b1-5', status: 'completed', points: 79 },
  { lessonId: 'b1-6', status: 'completed', points: 90 },
  { lessonId: 'b2-1', status: 'completed', points: 85 },
  { lessonId: 'b2-2', status: 'completed', points: 81 },
  { lessonId: 'b2-3', status: 'completed', points: 87 },
  { lessonId: 'b2-4', status: 'completed', points: 83 },
  { lessonId: 'b2-5', status: 'completed', points: 89 },
  { lessonId: 'b2-6', status: 'completed', points: 93 },
  { lessonId: 'b3-1', status: 'completed', points: 77 },
  { lessonId: 'b3-2', status: 'completed', points: 82 },
  { lessonId: 'b3-3', status: 'current', points: null },
  { lessonId: 'b3-4', status: 'locked', points: null },
  { lessonId: 'b3-5', status: 'locked', points: null },
  { lessonId: 'b3-6', status: 'locked', points: null },
  { lessonId: 'b3-7', status: 'locked', points: null },
  { lessonId: 'b3-8', status: 'locked', points: null },
]

async function seed() {
  console.log('Seeding database...')

  // Create subjects, modules, lessons
  for (const subjectData of subjects) {
    const { modules, ...subjectFields } = subjectData
    await prisma.subject.upsert({
      where: { id: subjectFields.id },
      create: subjectFields,
      update: { name: subjectFields.name, emoji: subjectFields.emoji },
    })

    for (let mi = 0; mi < modules.length; mi++) {
      const { lessons, ...moduleFields } = modules[mi]
      const moduleId = `${subjectFields.id}-m${mi + 1}`
      await prisma.module.upsert({
        where: { id: moduleId },
        create: { id: moduleId, subjectId: subjectFields.id, ...moduleFields, order: mi },
        update: { label: moduleFields.label, order: mi },
      })

      for (let li = 0; li < lessons.length; li++) {
        const lesson = lessons[li]
        await prisma.lesson.upsert({
          where: { id: lesson.id },
          create: { ...lesson, moduleId, order: li },
          update: { title: lesson.title, number: lesson.number, shape: lesson.shape, order: li },
        })
      }
    }
  }

  // Create default student
  let student = await prisma.student.findFirst({ where: { name: 'Сидни Суини' } })
  if (!student) {
    student = await prisma.student.create({
      data: {
        name: 'Сидни Суини',
        stats: {
          create: {
            performance: 70,
            completedTasks: 8,
            totalTasks: 12,
            avgScore: 64,
            streak: 5,
            totalPoints: 1840,
          },
        },
      },
    })
  }
  console.log(`Student: ${student.id}`)

  // Seed lesson progress
  for (const p of studentProgress) {
    await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId: p.lessonId } },
      create: { studentId: student.id, ...p },
      update: { status: p.status, points: p.points },
    })
  }

  // Seed schedule items (clear and re-insert)
  await prisma.scheduleItem.deleteMany()
  for (const item of scheduleItems) {
    await prisma.scheduleItem.create({ data: item })
  }

  console.log('Done! Student ID:', student.id)
  console.log('Copy this to your .env.local: VITE_STUDENT_ID=' + student.id)
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
