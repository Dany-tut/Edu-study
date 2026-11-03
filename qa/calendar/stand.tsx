import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Widget from '../../src/components/teacher/widgets/WidgetTodaySchedule'
import { addDays, type SchedItem } from '../../src/lib/teacherSchedule'
import '../../src/index.css'

// Distinct identities on each date: checking only card counts misses stale data.
export function calendarFixtures(start: string): SchedItem[] {
  return [12, 2, 0, 3, 1, 1, 0].flatMap((count, day) => Array.from({ length: count }, (_, index) => ({
    id: `${start}/${day}/${index}`, date: addDays(start, day),
    time: `${String(8 + index).padStart(2, '0')}:00`, endTime: `${String(9 + index).padStart(2, '0')}:00`,
    who: `${addDays(start, day)} · ученик ${index + 1}${index === 4 ? ' с очень длинным именем для проверки узкой карточки' : ''}`,
    title: `Тема ${day + 1}.${index + 1}`, color: 'var(--color-purple)',
    number: index + 1, groupId: null, studentId: `fixture-${day}-${index}`,
    cancelled: day === 5, rec: day === 4, fromCourse: false,
    isIndividual: true, subject: 'Биология', level: 'ОГЭ',
  })))
}
function useFixtureWeek(start: string) {
  return { items: calendarFixtures(start), reload: () => {}, error: false }
}
function Stand() {
  const [theme, setTheme] = useState('light')
  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  return <main style={{ padding: 8, maxWidth: 1200, margin: 'auto' }}>
    <h1 style={{ fontSize: 18 }}>Искра · календарь · наполненный стенд</h1>
    <p>Пн: 12 занятий · Вт: 2 · Ср: пусто · Чт: 3 · Пт: запись · Сб: отменено. Недели имеют разные ID и подписи.</p>
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} style={{ minHeight: 44 }}>Сменить тему</button>
    <div style={{ height: 'min(600px, 75vh)', minHeight: 280, marginTop: 8 }}><Widget readOnly useWeek={useFixtureWeek} /></div>
  </main>
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')!).render(<Stand />)
