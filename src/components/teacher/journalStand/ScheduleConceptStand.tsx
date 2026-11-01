import schedulePreview from './scheduleConceptPreview.html?raw'
import './scheduleConceptStand.css'

/** Standalone, in-memory concepts; the real schedule is not queried or changed. */
export default function ScheduleConceptStand() {
  return <section className="schedule-concept-stand" aria-label="Концепты расписания Искры">
    <header className="schedule-concept-heading">
      <div><h1>Расписание ученика</h1><p>Три варианта · переключатель под макетом</p></div>
      <span>Демонстрационные занятия</span>
    </header>
    <iframe className="schedule-concept-preview" title="Искра — три варианта расписания" srcDoc={schedulePreview}
      sandbox="allow-scripts" referrerPolicy="no-referrer" />
  </section>
}
