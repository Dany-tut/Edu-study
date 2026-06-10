import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/homework/:lessonId/questions
router.get('/:lessonId/questions', async (req, res) => {
  const questions = await prisma.homeworkQuestion.findMany({
    where: { lessonId: req.params.lessonId },
    orderBy: { order: 'asc' },
  })
  res.json(questions)
})

// POST /api/homework/:lessonId/questions — teacher adds a question
router.post('/:lessonId/questions', async (req, res) => {
  const { question, options, correctIndex, order } = req.body
  const q = await prisma.homeworkQuestion.create({
    data: {
      lessonId: req.params.lessonId,
      question,
      options,
      correctIndex,
      order: order ?? 0,
    },
  })
  res.json(q)
})

// PUT /api/homework/questions/:id
router.put('/questions/:id', async (req, res) => {
  const { question, options, correctIndex, order } = req.body
  const q = await prisma.homeworkQuestion.update({
    where: { id: req.params.id },
    data: { question, options, correctIndex, order },
  })
  res.json(q)
})

// DELETE /api/homework/questions/:id
router.delete('/questions/:id', async (req, res) => {
  await prisma.homeworkQuestion.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// POST /api/homework/:lessonId/attempt — student submits homework
router.post('/:lessonId/attempt', async (req, res) => {
  const { studentId, answers, score, total } = req.body
  const attempt = await prisma.homeworkAttempt.create({
    data: { studentId, lessonId: req.params.lessonId, answers, score, total },
  })

  // Update lesson progress status
  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId: req.params.lessonId } },
    create: { studentId, lessonId: req.params.lessonId, status: 'submitted', points: score },
    update: { status: 'submitted', points: score },
  })

  // Update student stats
  await recalcStats(studentId)

  res.json(attempt)
})

// GET /api/homework/:lessonId/attempt?studentId=...
router.get('/:lessonId/attempt', async (req, res) => {
  const { studentId } = req.query
  const attempt = await prisma.homeworkAttempt.findFirst({
    where: { studentId, lessonId: req.params.lessonId },
    orderBy: { submittedAt: 'desc' },
  })
  res.json(attempt)
})

async function recalcStats(studentId) {
  const attempts = await prisma.homeworkAttempt.findMany({ where: { studentId } })
  const completed = attempts.length
  const avgScore = completed
    ? Math.round(attempts.reduce((s, a) => s + Math.round((a.score / a.total) * 100), 0) / completed)
    : 0
  const totalPoints = attempts.reduce((s, a) => s + a.score * 10, 0)

  await prisma.studentStats.upsert({
    where: { studentId },
    create: { studentId, completedTasks: completed, avgScore, totalPoints },
    update: { completedTasks: completed, avgScore, totalPoints },
  })
}

export default router
