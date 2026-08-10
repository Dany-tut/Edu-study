// ВРЕМЕННЫЙ стенд для скриншота тренажёра. Удаляется сразу после съёмки.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MotionGlobalConfig } from 'framer-motion'
import TaskBankPage from './pages/TaskBankPage'
import './index.css'

// В превью не тикает requestAnimationFrame — framer оставляет всё на initial.
MotionGlobalConfig.skipAnimations = true

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TaskBankPage />
  </React.StrictMode>,
)
