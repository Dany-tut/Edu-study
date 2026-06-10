import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/students — list all (teacher view)
router.get('/', async (req, res) => {
  const students = await prisma.student.findMany({
    include: { stats: true },
    orderBy: { name: 'asc' },
  })
  res.json(students)
})

// GET /api/students/:id — single student with stats and progress
router.get('/:id', async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      stats: true,
      lessonProgress: {
        include: { lesson: { include: { module: { include: { subject: true } } } } },
      },
    },
  })
  if (!student) return res.status(404).json({ error: 'Not found' })
  res.json(student)
})

// POST /api/students — register/create student
router.post('/', async (req, res) => {
  const { name, email, avatarUrl } = req.body
  const student = await prisma.student.create({
    data: { name, email, avatarUrl },
  })
  res.json(student)
})

// PATCH /api/students/:id/progress — update lesson status (teacher)
router.patch('/:id/progress', async (req, res) => {
  const { lessonId, status, points, comment } = req.body
  const progress = await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: req.params.id, lessonId } },
    create: { studentId: req.params.id, lessonId, status, points, comment },
    update: { status, points, comment },
  })
  res.json(progress)
})

// GET /api/students/:id/homework — all homework attempts
router.get('/:id/homework', async (req, res) => {
  const attempts = await prisma.homeworkAttempt.findMany({
    where: { studentId: req.params.id },
    include: { lesson: { include: { module: { include: { subject: true } } } } },
    orderBy: { submittedAt: 'desc' },
  })
  res.json(attempts)
})

export default router
