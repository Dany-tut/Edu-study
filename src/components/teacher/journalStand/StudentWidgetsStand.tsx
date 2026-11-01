import { useEffect, useState, type CSSProperties } from 'react'
import Modal from '../../Modal'
import WidgetCarousel from '../../WidgetCarousel'
import ScheduleCard from '../../ScheduleCard'
import CourseNode from '../../CourseNode'
import { TaskliIcon } from '../../icons/TaskliIcon'
import { LoopSvg } from '../../icons/LoopIcon'
import { LoopArtworkBell, LoopArtworkSlidersHorizontal, LoopArtworkChevronLeft, LoopArtworkChevronRight } from '../../icons/loopArtwork'
import type { Lesson, ScheduleDay } from '../../../data/mockData'
import { useIsDesktop } from '../../../lib/useIsDesktop'
import { WIDGETS, TASKS, TaskRow, WidgetConcept, WidgetObject, QuizConceptDetail, widgetCopy, previewTasks, type WidgetId, type Subject, type Scenario, type Detail, type Task, type PreviewSettings } from './StudentWidgetConcepts'
import './studentWidgetsStand.css'

const INITIAL: PreviewSettings = { scenario: 'tasks', subject: 'chemistry', columns: 2, widgets: WIDGETS.map(widget => widget.id), lines: 3, longContent: false, art: 'soft', scope: 'all' }
const TITLE: Record<Exclude<Detail, null>, string> = { quiz: 'Квиз · Растворы', trainer: 'Практика за неделю', practice: 'Вопрос дня', reaction: 'Повторение', fact: 'Факт по теме', awards: 'Твоя коллекция', daily: 'Пять минут языка', feed: 'Лента на английском', memes: 'Мем по теме', course: 'Твой курс', lesson: 'Занятие' }
const COURSE_TITLES = ['Строение атома', 'Химические связи', 'Растворы', 'Скорость реакции', 'Равновесие', 'Итоговый тест']
const LANGUAGE_TITLES = ['Знакомство', 'Past Simple', 'Present Perfect', 'Путешествия', 'Повторение', 'Итоговый тест']

function makeSchedule(subject: Subject): ScheduleDay[] {
  return [30, 31, 1, 2, 3].map((day, index) => ({
    date: `2026-${index < 2 ? '10' : '11'}-${String(day).padStart(2, '0')}`,
    label: `${['Пт', 'Сб', 'Вс', 'Пн', 'Вт'][index]}, ${day} ${index < 2 ? 'октября' : 'ноября'}`, isToday: index === 2,
    lessons: index === 1 ? [] : [{ id: `widget-stand-schedule-${index}`, subject: subject === 'english' ? 'Английский' : 'Химия', lessonTitle: subject === 'english' ? 'Present Perfect' : 'Растворы', lessonNumber: 3, time: '19:00', endTime: '20:00', kind: 'rec' as const },
      ...(index === 2 ? [{ id: 'widget-stand-schedule-biology', subject: 'Биология', lessonTitle: 'Клетка', lessonNumber: 4, time: '20:15', endTime: '21:00', kind: 'rec' as const }] : [])],
  }))
}

/** Original home composition and carousel geometry; examples have no database writes. */
export default function StudentWidgetsStand() {
  const [settings, setSettings] = useState<PreviewSettings>(INITIAL)
  const [catalogWidget, setCatalogWidget] = useState<WidgetId>('reminders')
  const [draft, setDraft] = useState<PreviewSettings | null>(null)
  const [task, setTask] = useState<Task | null>(null)
  const [allTasks, setAllTasks] = useState(false)
  const [objectCollection, setObjectCollection] = useState(false)
  const [detail, setDetail] = useState<Detail>(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [focusTask, setFocusTask] = useState(false)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(1500)
  const [scheduleIndex, setScheduleIndex] = useState(2)
  const language = settings.subject === 'english'
  const desktop = useIsDesktop()
  const schedule = makeSchedule(settings.subject)
  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  const showDetail = (next: Detail) => { setAnswer(null); setRevealed(false); setDetail(next) }
  const openTask = (next: Task) => { setAllTasks(false); setTask(next) }
  const openLesson = (title: string) => { setLessonTitle(title); showDetail('lesson') }
  const openSettings = () => setDraft({ ...settings, widgets: [...settings.widgets] })
  useEffect(() => {
    if (!running) return
    const timerId = window.setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timerId)
  }, [running])
  useEffect(() => { if (seconds === 0) setRunning(false) }, [seconds])
  function focusOnHomework() {
    setFocusTask(true); setTask(null); setRunning(true)
    setCatalogWidget('reminders')
    if (seconds === 0) setSeconds(1500)
    setSettings(current => ({ ...current, widgets: ['reminders', 'focus', ...current.widgets.filter(id => id !== 'reminders' && id !== 'focus')] }))
  }
  const tasks = previewTasks(settings.longContent)
  const selectedWidgets = settings.widgets.filter(id => {
    const meta = WIDGETS.find(item => item.id === id)
    return settings.scope === 'all' || !meta?.subject || meta.subject === settings.subject
  })
  const startIndex = Math.max(0, selectedWidgets.indexOf(catalogWidget))
  const orderedWidgets = [...selectedWidgets.slice(startIndex), ...selectedWidgets.slice(0, startIndex)]
  function chooseWidget(id: WidgetId) {
    setCatalogWidget(id)
    setSettings(current => ({ ...current, scope: 'all', widgets: current.widgets.includes(id) ? current.widgets : [...current.widgets, id] }))
  }
  const lessons: Lesson[] = (language ? LANGUAGE_TITLES : COURSE_TITLES).map((title, index) => ({ id: `widget-preview-${settings.subject}-${index}`, title, number: index, subject: language ? 'Английский' : 'Химия', status: index < 2 ? 'completed' : index === 2 ? 'current' : 'locked', shape: index === 5 ? 'diamond' : 'circle', kind: index === 5 ? 'test' : 'lesson', hasHard: false }))

  return <div className="sw-home-root" data-testid="widgets-home-preview" data-art={settings.art} data-columns={desktop ? settings.columns : 1} style={{ '--sw-lines': settings.lines } as CSSProperties}>
    <header className="sw-home-header">
      <div className="sw-lab-controls"><a href="#/teacher/gradebook" className="sw-lab-back" aria-label="Вернуться в журнал стенда">‹</a><label><span>Каталог · 12 виджетов</span><select aria-label="Показать виджет" value={catalogWidget} onChange={event => chooseWidget(event.target.value as WidgetId)}>{WIDGETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="sw-grid-options" role="group" aria-label="Виджетов в ряду">{[2, 3, 4].map(columns => <button key={columns} type="button" aria-label={`${columns} виджета в ряду`} aria-pressed={settings.columns === columns} onClick={() => setSettings(current => ({ ...current, columns }))}>{columns}</button>)}</div></div>
      <nav className="sw-home-nav" aria-label="Главная Искры"><span className="sw-brand">и</span><button type="button" className="is-current" aria-current="page"><TaskliIcon name="home" size={17} /><span>Главная</span></button><button type="button" onClick={() => showDetail('course')}><TaskliIcon name="courses" size={17} /><span>Курсы</span></button><button type="button" onClick={() => showDetail('trainer')}><TaskliIcon name="trainer" size={17} /><span>Тренажёр</span></button></nav>
      <div className="sw-home-tools"><button type="button" className="sw-icon-button sw-objects-button" aria-label="3D-коллекция Искры" onClick={() => setObjectCollection(true)}>3D</button><label className="sw-quick-select"><span>Текст</span><select aria-label="Объём контента" value={settings.longContent ? 'long' : 'short'} onChange={event => setSettings(current => ({ ...current, longContent: event.target.value === 'long' }))}><option value="short">Обычный</option><option value="long">Длинный</option></select></label><label className="sw-quick-select"><span>Строки</span><select aria-label="Видимых строк текста" value={settings.lines} onChange={event => setSettings(current => ({ ...current, lines: Number(event.target.value) }))}>{[2,3,4].map(lines => <option key={lines} value={lines}>{lines}</option>)}</select></label><button type="button" className="sw-icon-button" aria-label="Все дела" onClick={() => setAllTasks(true)}><LoopSvg name="Bell" artwork={LoopArtworkBell} size={19} />{settings.scenario === 'tasks' && <span>3</span>}</button><button type="button" className="sw-icon-button" aria-label="Настроить виджеты" onClick={openSettings}><LoopSvg name="SlidersHorizontal" artwork={LoopArtworkSlidersHorizontal} size={19} /></button></div>
    </header>
    <div className="sw-home-content">
      <section className="sw-home-schedule" aria-label="Расписание занятий"><div className="sw-schedule-track">{[-2, -1, 0, 1, 2].map(offset => { const day = schedule[scheduleIndex + offset]; return day ? <ScheduleCard key={day.date} day={day} mobile={!desktop} isCenter={offset === 0} distance={Math.abs(offset)} dataSelected={offset === 0} onClick={() => setScheduleIndex(scheduleIndex + offset)} onOpenLesson={lesson => openLesson(lesson.lessonTitle)} /> : <div className="sw-schedule-spacer" key={offset} /> })}</div><button type="button" className="sw-schedule-arrow is-left" aria-label="Предыдущий день" disabled={scheduleIndex === 0} onClick={() => setScheduleIndex(index => index - 1)}><LoopSvg name="ChevronLeft" artwork={LoopArtworkChevronLeft} size={16} /></button><button type="button" className="sw-schedule-arrow is-right" aria-label="Следующий день" disabled={scheduleIndex === schedule.length - 1} onClick={() => setScheduleIndex(index => index + 1)}><LoopSvg name="ChevronRight" artwork={LoopArtworkChevronRight} size={16} /></button></section>
      <section className="sw-home-widget-zone" aria-label="Виджеты главной" data-testid="home-widget-zone"><WidgetCarousel key={`${catalogWidget}-${settings.scope}-${settings.widgets.join(',')}`} columnsOverride={desktop ? settings.columns : 1} previewWidgets={orderedWidgets.map(id => ({ id: WIDGETS.findIndex(item => item.id === id), content: <WidgetConcept id={id} settings={settings} tasks={tasks} timer={timer} seconds={seconds} running={running} focusTask={focusTask} onTasks={() => setAllTasks(true)} onTask={openTask} onDetail={showDetail} onStart={() => { if (seconds === 0) setSeconds(1500); setRunning(value => !value) }} onReset={() => { setRunning(false); setSeconds(1500) }} onRetry={() => setSettings(current => ({ ...current, scenario: 'tasks' }))} /> }))} /></section>
      <section className="sw-home-course" aria-label="Трек курса"><div className="sw-course-bar"><button type="button" className="sw-course-select" onClick={openSettings}><TaskliIcon name="courses" size={17} />{language ? 'Английский · A2' : 'Химия · Основной курс'}<span aria-hidden="true">⌄</span></button><span className="sw-module">Основы предмета</span></div><div className="sw-course-track">{lessons.map((lesson, index) => <div className="sw-course-step" key={lesson.id}><CourseNode lesson={lesson} status={lesson.status} index={index} onSelect={item => openLesson(item.title)} /></div>)}</div></section>
    </div>
    {objectCollection && <Modal title="Предметы со стола Искры" subtitle="Единая 3D-коллекция для виджетов" width={760} onClose={() => setObjectCollection(false)}><p className="sw-object-intro">Молочная керамика, полупрозрачный сиреневый акрил и янтарные детали. У каждого виджета — свой предмет и узнаваемый силуэт.</p><div className="sw-object-collection">{WIDGETS.map(item => <figure key={item.id}><WidgetObject kind={item.id} /><figcaption>{item.label}</figcaption></figure>)}</div></Modal>}
    {draft && <Modal title="Виджеты" subtitle="Каталог концептов · настройки действуют только в стенде" width={530} onClose={() => setDraft(null)} footer={<><button type="button" className="sw-button" onClick={() => setDraft(null)}>Отмена</button><button type="button" className="sw-button is-primary" onClick={() => { setSettings(draft); setDraft(null) }}>Готово</button></>}><div className="sw-settings"><div className="sw-setting-controls">
      <label>Курс<select value={draft.subject} onChange={event => setDraft(current => current && ({ ...current, subject: event.target.value as Subject }))}><option value="chemistry">Химия</option><option value="english">Английский</option></select></label>
      <label>Показывать<select value={draft.scope} onChange={event => setDraft(current => current && ({ ...current, scope: event.target.value as PreviewSettings['scope'] }))}><option value="all">Все 12 типов</option><option value="course">По выбранному курсу</option></select></label>
      <label>Виджетов в ряду<select value={draft.columns} onChange={event => setDraft(current => current && ({ ...current, columns: Number(event.target.value) }))}>{[1,2,3,4].map(columns => <option key={columns} value={columns}>{columns}</option>)}</select></label>
      <label>Визуальный акцент<select value={draft.art} onChange={event => setDraft(current => current && ({ ...current, art: event.target.value as PreviewSettings['art'] }))}><option value="soft">Предметы Искры · 3D</option><option value="flat">Без иллюстраций</option></select></label>
      <label>Состояние дел<select value={draft.scenario} onChange={event => setDraft(current => current && ({ ...current, scenario: event.target.value as Scenario }))}><option value="tasks">Есть дела</option><option value="done">Всё сдано</option><option value="loading">Загрузка</option><option value="error">Ошибка</option></select></label>
      <label>Строки текста<select value={draft.lines} onChange={event => setDraft(current => current && ({ ...current, lines: Number(event.target.value) }))}>{[2,3,4].map(lines => <option key={lines} value={lines}>{lines}</option>)}</select></label>
    </div><label className="sw-setting-row"><span>Длинные названия и описания</span><input type="checkbox" checked={draft.longContent} onChange={event => { const checked = event.target.checked; setDraft(current => current && ({ ...current, longContent: checked })) }} /></label><p className="sw-settings-hint">Листай стрелками в том же ряду. Длинный текст уходит в фейд; полный материал открывается по нажатию. Сетка 4 — дополнительный вариант для сравнения.</p>
    {WIDGETS.map(item => <label className="sw-setting-row" key={item.id}><span>{item.label}</span>{item.subject && <small>{item.subject === 'english' ? 'Английский' : 'Химия'}</small>}{item.id === 'reminders' ? <small>Список дел</small> : <input type="checkbox" checked={draft.widgets.includes(item.id)} onChange={event => { const checked = event.target.checked; setDraft(current => current && ({ ...current, widgets: checked ? [...current.widgets, item.id] : current.widgets.filter(id => id !== item.id) })) }} />}</label>)}</div></Modal>}
    {allTasks && <Modal title={settings.scenario === 'tasks' ? 'Твои дела · 3' : 'Твои дела'} subtitle="По всем курсам" onClose={() => setAllTasks(false)}><div className="sw-detail">{settings.scenario === 'tasks' ? tasks.map(item => <TaskRow key={item.id} task={item} onOpen={openTask} />) : <p>{settings.scenario === 'done' ? 'Всё сдано. Обязательных дел нет.' : settings.scenario === 'loading' ? 'Проверяем задания и сроки…' : 'Список пока недоступен. Повтори загрузку в виджете.'}</p>}</div></Modal>}
    {task && <Modal title={task.title} subtitle={`${task.subject} · ${task.topic}`} onClose={() => setTask(null)} footer={task.id === 'homework' ? <button type="button" className="sw-button is-primary" onClick={focusOnHomework}>Сфокусироваться на домашке</button> : <button type="button" className="sw-button is-primary" onClick={() => setTask(null)}>Вернуться</button>}><div className="sw-detail"><span className={`sw-pill ${task.overdue ? 'is-overdue' : ''}`}>{task.due}</span><p>{task.description}</p><small>Учебный пример · данные не отправляются</small></div></Modal>}
    {detail && <Modal title={detail === 'quiz' ? (language ? 'Квиз · Времена' : 'Квиз · Растворы') : TITLE[detail]} onClose={() => setDetail(null)}><div className="sw-detail">
      {detail === 'quiz' ? <QuizConceptDetail language={language} /> : detail === 'practice' ? <><h3>{widgetCopy('practice', settings).title}</h3><div className="sw-answers">{(language ? ['seen', 'saw'] : ['Скорость реакции', 'Положение равновесия']).map(text => <button type="button" className={`sw-button ${answer === text ? 'is-primary' : ''}`} key={text} onClick={() => setAnswer(text)}>{text}</button>)}</div>{answer && <p role="status">{language ? `${answer === 'seen' ? 'Верно.' : 'Попробуй ещё.'} После have нужна третья форма глагола: have seen.` : `${answer === 'Скорость реакции' ? 'Верно.' : 'Катализатор не смещает равновесие.'} Он снижает энергию активации и ускоряет прямую и обратную реакции.`}</p>}</>
        : detail === 'reaction' ? <><h3>{settings.longContent ? 'Ca(OH)₂ + H₃PO₄ → ?' : 'NaOH + HCl → ?'}</h3><p>Назови продукты реакции нейтрализации.</p>{revealed ? <p role="status">{settings.longContent ? '3Ca(OH)₂ + 2H₃PO₄ → Ca₃(PO₄)₂ + 6H₂O.' : 'NaCl + H₂O.'} Щёлочь реагирует с кислотой, образуя соль и воду.</p> : <button type="button" className="sw-button is-primary" onClick={() => setRevealed(true)}>Показать объяснение</button>}</>
        : detail === 'fact' ? <><h3>Почему лёд плавает?</h3>{settings.longContent && <p>{widgetCopy('fact', settings).text}</p>}<p>В кристаллической структуре льда молекулы воды расположены менее плотно, чем в жидкой воде. Поэтому лёд имеет меньшую плотность и остаётся на поверхности.</p></>
        : detail === 'daily' ? <><span className="sw-pill">A2 · 3 минуты</span><h3>{widgetCopy('daily', settings).title}</h3><p>{widgetCopy('daily', settings).text}</p><p>Every morning, Mia walks to school. Last week, she started taking a different street. She found a small park and now stops there to read a page of her book. A small change can make an ordinary day feel new.</p><p>take a different street — пойти другой улицей<br />an ordinary day — обычный день<br />feel new — ощущаться по-новому</p></>
        : detail === 'feed' ? <><span className="sw-pill">A2 · 2 минуты</span><h3>{widgetCopy('feed', settings).title}</h3><p>{widgetCopy('feed', settings).text}</p><p>In autumn, trees get less sunlight. The green colour in their leaves begins to disappear. We can then see the yellow and orange colours that were there all along.</p></>
        : detail === 'trainer' ? <><h3>6 из 8 ответов верные</h3><p>{language ? 'Две ошибки в употреблении времён.' : 'Нейтрализация и массовая доля — две темы для повторения.'}</p><button type="button" className="sw-button is-primary" onClick={() => showDetail(language ? 'practice' : 'reaction')}>Разобрать первую ошибку</button></>
        : detail === 'course' ? <><h3>{language ? 'Английский · A2' : 'Химия · Основной курс'}</h3><p>Пройдено {language ? '6 из 13' : '3 из 22'} уроков. Последняя принятая работа: 4/5.</p><button type="button" className="sw-button is-primary" onClick={() => { setDetail(null); openTask(TASKS[language ? 2 : 1]) }}>{language ? 'Посмотреть назначенный тест' : 'Продолжить домашку'}</button></>
        : detail === 'lesson' ? <><h3>{lessonTitle}</h3><p>Учебный пример занятия. Подробности открываются поверх главной.</p><button type="button" className="sw-button is-primary" onClick={() => { setDetail(null); openTask(TASKS[1]) }}>Открыть домашку</button></>
        : detail === 'memes' ? <><h3>Когда уравнял реакцию с первого раза</h3><p>{widgetCopy('memes', settings).text}</p><p>Коэффициенты сошлись. Можно проверить себя на следующем примере.</p><button type="button" className="sw-button" onClick={() => showDetail('reaction')}>К реакции</button></>
        : <><span className="sw-pill is-good">Новый стикер</span><h3>{language ? 'Past Simple' : 'Химические связи'}</h3><p>За принятую работу. Результат: 4/5.</p></>}
    </div></Modal>}
  </div>
}
