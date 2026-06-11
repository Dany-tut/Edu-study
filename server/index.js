import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import lessonsRouter from './routes/lessons.js'
import homeworkRouter from './routes/homework.js'
import studentsRouter from './routes/students.js'
import scheduleRouter from './routes/schedule.js'
import prisma from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// API routes
app.use('/api', lessonsRouter)
app.use('/api/homework', homeworkRouter)
app.use('/api/students', studentsRouter)
app.use('/api/schedule', scheduleRouter)

// Serve built frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  // Verify DB connection
  try {
    await prisma.$connect()
    console.log('Database connected')
  } catch (e) {
    console.error('Database connection failed:', e.message)
  }
})
