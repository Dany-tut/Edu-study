import { Router } from 'express'
import prisma from '../db.js'

const router = Router()

// GET /api/schedule — all schedule items with lesson info
router.get('/', async (req, res) => {
  const items = await prisma.scheduleItem.findMany({
    include: { lesson: { include: { module: { include: { subject: true } } } } },
    orderBy: [{ dayOffset: 'asc' }, { time: 'asc' }],
  })
  res.json(items)
})

// POST /api/schedule — teacher adds a schedule entry
router.post('/', async (req, res) => {
  const { lessonId, dayOffset, time, subject, passed } = req.body
  const item = await prisma.scheduleItem.create({
    data: { lessonId, dayOffset, time, subject, passed: passed ?? false },
  })
  res.json(item)
})

// PATCH /api/schedule/:id
router.patch('/:id', async (req, res) => {
  const { dayOffset, time, subject, passed } = req.body
  const item = await prisma.scheduleItem.update({
    where: { id: req.params.id },
    data: { dayOffset, time, subject, passed },
  })
  res.json(item)
})

// DELETE /api/schedule/:id
router.delete('/:id', async (req, res) => {
  await prisma.scheduleItem.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
