import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/subjects — all subjects with modules and lessons (with student progress)
router.get('/subjects', async (req, res) => {
  const studentId = req.query.studentId

  const subjects = await prisma.subject.findMany({
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
            include: {
              studentProgress: studentId
                ? { where: { studentId } }
                : false,
            },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  // Shape response to match the frontend Subject interface
  const result = subjects.map(s => ({
    id: s.id,
    name: s.name,
    emoji: s.emoji,
    modules: s.modules.map(m => ({
      id: m.id,
      label: m.label,
      lessons: m.lessons.map(l => {
        const progress = studentId ? (l.studentProgress?.[0] ?? null) : null
        return {
          id: l.id,
          title: l.title,
          number: l.number,
          shape: l.shape,
          youtubeUrl: l.youtubeUrl,
          description: l.description,
          materials: l.materials,
          subject: s.id,
          status: progress?.status ?? 'locked',
          points: progress?.points ?? null,
          comment: progress?.comment ?? null,
        }
      }),
    })),
  }))

  res.json(result)
})

// GET /api/lessons/:id — single lesson detail
router.get('/lessons/:id', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.id },
    include: {
      homeworkQuestions: { orderBy: { order: 'asc' } },
      module: { include: { subject: true } },
    },
  })
  if (!lesson) return res.status(404).json({ error: 'Not found' })
  res.json(lesson)
})

// PATCH /api/lessons/:id — update lesson (teacher: youtube url, description, etc.)
router.patch('/lessons/:id', async (req, res) => {
  const { youtubeUrl, description, materials, isPublished } = req.body
  const lesson = await prisma.lesson.update({
    where: { id: req.params.id },
    data: { youtubeUrl, description, materials, isPublished },
  })
  res.json(lesson)
})

// POST /api/lessons — create a new lesson (teacher)
router.post('/lessons', async (req, res) => {
  const { moduleId, title, number, shape, youtubeUrl, description, order } = req.body
  const lesson = await prisma.lesson.create({
    data: { id: `${moduleId}-${Date.now()}`, moduleId, title, number, shape: shape ?? 'circle', youtubeUrl, description, order: order ?? 0 },
  })
  res.json(lesson)
})

export default router
