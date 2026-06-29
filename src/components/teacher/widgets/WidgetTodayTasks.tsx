import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, X as XIcon } from 'lucide-react'
import { useTeacher } from '../../../store/teacherStore'
import type { TeacherTask } from '../../../store/teacherStore'
import CreateTaskModal from '../CreateTaskModal'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] },
})

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.15)',
      padding: 20,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: 0.2, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      {children}
    </div>
  )
}

function TaskRow({ task, onToggle, onRemove, onClick }: {
  task: TeacherTask
  onToggle: () => void
  onRemove: () => void
  onClick: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [showDelete, setShowDelete] = useState(false)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = rowRef.current?.getBoundingClientRect()
    if (!rect) return
    setShowDelete(e.clientX - rect.left > rect.width * 0.75)
  }

  return (
    <div
      ref={rowRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 12,
        background: task.done ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
        border: 'none',
        opacity: task.done ? 0.6 : 1,
        transition: 'opacity 0.2s, background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = task.done ? 'var(--color-bg-4)' : 'var(--color-bg-3)' }}
      onMouseLeave={e => { setShowDelete(false); (e.currentTarget as HTMLElement).style.background = task.done ? 'var(--color-bg-3)' : 'var(--color-bg-2)' }}
    >
      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: `2px solid ${task.done ? 'var(--color-accent)' : '#C4B0F0'}`,
          background: task.done ? 'var(--color-accent)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {task.done && <CheckCircle2 size={11} strokeWidth={3} style={{ color: '#fff' }} />}
      </button>

      {task.typeLabel && task.typeBg && task.typeColor && (
        <span style={{
          fontSize: 11, fontWeight: 650,
          background: task.typeBg, color: task.typeColor,
          borderRadius: 8, padding: '2px 8px', flexShrink: 0,
        }}>
          {task.typeLabel}
        </span>
      )}

      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500,
        color: task.done ? 'var(--color-text-3)' : 'var(--color-text)',
        textDecoration: task.done ? 'line-through' : 'none',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {(task.title || (task.typeLabel ?? 'Задача')).replace(/@/g, '')}
      </span>

      <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>
        {task.date}{task.time ? ` · ${task.time}` : ''}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        onMouseEnter={() => setShowDelete(true)}
        onMouseLeave={e => {
          const rect = rowRef.current?.getBoundingClientRect()
          if (!rect) return
          setShowDelete((e as React.MouseEvent).clientX - rect.left > rect.width * 0.75)
        }}
        style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          border: 'none', background: 'none', cursor: 'pointer',
          color: '#F48B91', display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: showDelete ? 1 : 0,
          transition: 'opacity 0.15s',
          pointerEvents: showDelete ? 'auto' : 'none',
        }}
      >
        <XIcon size={13} strokeWidth={2.5} />
      </button>
    </div>
  )
}

export default function WidgetTodayTasks() {
  const tasks = useTeacher(s => s.tasks)
  const toggleTask = useTeacher(s => s.toggleTask)
  const removeTask = useTeacher(s => s.removeTask)
  const updateTask = useTeacher(s => s.updateTask)
  const [editingTask, setEditingTask] = useState<TeacherTask | null>(null)
  const [tasksAtTop, setTasksAtTop] = useState(true)
  const [tasksAtBottom, setTasksAtBottom] = useState(false)

  if (!tasks.length) {
    return (
      <div style={{ height: '100%', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-4)', fontWeight: 500 }}>Нет задач</span>
      </div>
    )
  }

  const pending = tasks.filter(t => !t.done)
  const done    = tasks.filter(t => t.done)
  const allTasks = [...pending, ...done]
  const needsScroll = allTasks.length > 5
  const ROW_H = 52
  const GAP = 5
  const listMaxH = 5 * ROW_H + 4 * GAP
  const topFade = tasksAtTop ? 'black 0%' : 'transparent 0%, black 10px'
  const botFade = tasksAtBottom ? 'black 100%' : 'black calc(100% - 18px), transparent 100%'
  const tasksMask = needsScroll ? `linear-gradient(to bottom, ${topFade}, ${botFade})` : undefined

  return (
    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
      {editingTask && (
        <CreateTaskModal
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={saved => {
            updateTask(editingTask.id, {
              typeId: saved.type?.id ?? null,
              typeLabel: saved.type?.label ?? null,
              typeBg: saved.type?.bg ?? null,
              typeColor: saved.type?.textColor ?? null,
              title: saved.title,
              date: saved.date,
              time: saved.time,
              comment: saved.comment,
            })
            setEditingTask(null)
          }}
        />
      )}
      <motion.div {...fadeUp(0.26)} style={{ height: '100%' }}>
        <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardTitle>
            <CheckCircle2 size={14} strokeWidth={2} />
            Мои задачи
            {pending.length > 0 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 11, fontWeight: 700, color: 'var(--color-accent)',
                background: 'var(--color-purple-soft)', borderRadius: 8, padding: '2px 8px',
              }}>
                {pending.length}
              </span>
            )}
          </CardTitle>
          <div
            className="no-scrollbar"
            onScroll={needsScroll ? e => {
              const el = e.currentTarget
              setTasksAtTop(el.scrollTop < 4)
              setTasksAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4)
            } : undefined}
            style={{
              display: 'flex', flexDirection: 'column', gap: GAP,
              ...(needsScroll ? {
                maxHeight: listMaxH, overflowY: 'auto',
                maskImage: tasksMask, WebkitMaskImage: tasksMask,
              } : {}),
            }}
          >
            {allTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggleTask(task.id)}
                onRemove={() => removeTask(task.id)}
                onClick={() => setEditingTask(task)}
              />
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
