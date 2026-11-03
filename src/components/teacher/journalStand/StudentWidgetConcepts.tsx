import { useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import { LoopSvg } from '../../icons/LoopIcon'
import {
  LoopArtworkBell, LoopArtworkTrendingUp, LoopArtworkTimer, LoopArtworkSparkles,
  LoopArtworkRows3, LoopArtworkBarChart3, LoopArtworkAward, LoopArtworkCircleHelp,
  LoopArtworkSunrise, LoopArtworkAtom, LoopArtworkBookOpenCheck, LoopArtworkDumbbell,
  LoopArtworkFlaskConical, LoopArtworkLaugh,
} from '../../icons/loopArtwork'

export type WidgetId = 'reminders' | 'stats' | 'trainer' | 'quiz' | 'practice' | 'focus' | 'reaction' | 'fact' | 'awards' | 'daily' | 'feed' | 'memes'
export type Scenario = 'tasks' | 'done' | 'loading' | 'error'
export type Subject = 'chemistry' | 'english'
export type Detail = Exclude<WidgetId, 'reminders' | 'stats' | 'focus'> | 'course' | 'lesson' | null
export type Task = { id: string; title: string; subject: string; topic: string; due: string; shortDue: string; description: string; overdue?: boolean }
export type PreviewSettings = { scenario: Scenario; subject: Subject; columns: number; widgets: WidgetId[]; lines: number; longContent: boolean; art: 'soft' | 'flat'; scope: 'all' | 'course' }
const ART = {
  Bell: LoopArtworkBell, TrendingUp: LoopArtworkTrendingUp, Timer: LoopArtworkTimer,
  Sparkles: LoopArtworkSparkles, Rows3: LoopArtworkRows3, BarChart3: LoopArtworkBarChart3,
  Award: LoopArtworkAward, CircleHelp: LoopArtworkCircleHelp, Sunrise: LoopArtworkSunrise,
  Atom: LoopArtworkAtom, BookOpenCheck: LoopArtworkBookOpenCheck, Dumbbell: LoopArtworkDumbbell,
  FlaskConical: LoopArtworkFlaskConical, Laugh: LoopArtworkLaugh,
}
type IconName = keyof typeof ART
export const WIDGETS: { id: WidgetId; label: string; icon: IconName; subject?: Subject }[] = [
  { id: 'reminders', label: 'Твои дела', icon: 'Rows3' },
  { id: 'stats', label: 'Статистика', icon: 'BarChart3' },
  { id: 'trainer', label: 'Прогресс тренажёра', icon: 'TrendingUp' },
  { id: 'quiz', label: 'Квиз', icon: 'Dumbbell' },
  { id: 'practice', label: 'Вопрос дня', icon: 'CircleHelp' },
  { id: 'focus', label: 'Фокус', icon: 'Timer' },
  { id: 'reaction', label: 'Реакции', icon: 'FlaskConical', subject: 'chemistry' },
  { id: 'fact', label: 'Научные факты', icon: 'Atom', subject: 'chemistry' },
  { id: 'awards', label: 'Стикеры', icon: 'Award' },
  { id: 'daily', label: 'Доза дня', icon: 'Sunrise', subject: 'english' },
  { id: 'feed', label: 'Лента', icon: 'BookOpenCheck', subject: 'english' },
  { id: 'memes', label: 'Мемы', icon: 'Laugh', subject: 'chemistry' },
]
export const TASKS: Task[] = [
  { id: 'returned', title: 'Исправить работу', subject: 'Биология', topic: 'Клетка', due: 'Срок прошёл вчера', shortDue: 'Вчера', overdue: true,
    description: 'Преподаватель оставил комментарий к заданию № 3. Уточни отличие митоза от мейоза и отправь работу повторно.' },
  { id: 'homework', title: 'Досдать домашку', subject: 'Химия', topic: 'Растворы', due: 'Сегодня до 21:00', shortDue: 'До 21:00',
    description: 'Выполнено 2 из 5 заданий. Продолжи с задания № 3 — о массовой доле растворённого вещества.' },
  { id: 'test', title: 'Пройти тест', subject: 'Английский', topic: 'Present Perfect', due: 'Завтра до 18:00', shortDue: 'Завтра',
    description: 'Тест назначен преподавателем. 12 вопросов. Попытка ещё не начата.' },
]
export function previewTasks(long: boolean): Task[] {
  return long ? TASKS.map((task, index) => ({ ...task,
    title: ['Исправить объяснение различий митоза и мейоза в работе о делении клетки', 'Досдать задания на массовую долю вещества в растворах и проверить вычисления', 'Пройти итоговый тест по Present Perfect и Past Simple'][index],
    topic: ['Клетка: деление и передача наследственной информации', 'Растворы: массовая доля и смешивание', 'Present Perfect: опыт, результат и незавершённое время'][index],
  })) : TASKS
}

/** Only fade when the visible text window actually overflows. Full text stays in the DOM. */
export function FadeText({ children, className = '', lines }: { children: ReactNode; className?: string; lines?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => setOverflow(element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    return () => observer.disconnect()
  }, [children, lines])
  return <div ref={ref} className={`sw-fade ${className}`} data-overflow={overflow} style={lines ? { '--sw-text-lines': lines } as CSSProperties : undefined}>{children}</div>
}

export function WidgetObject({ kind, className = '' }: { kind: WidgetId; className?: string }) {
  return <img className={`sw-object ${className}`} src={`/widget-objects-v1/${kind}.png`} alt="" aria-hidden="true" draggable={false} width={96} height={96} />
}
function Card({ id, title, extra, children, footer, onOpen }: { onOpen?: () => void; id: WidgetId; title?: string; extra?: ReactNode; children: ReactNode; footer: ReactNode }) {
  const meta = WIDGETS.find(item => item.id === id)!
  return <section className={`sw-card sw-card--${id}`} data-widget-type={id} onClick={onOpen ? event => { if (!(event.target as Element).closest('button, a, input, select')) onOpen() } : undefined} style={onOpen ? { cursor: 'pointer' } : undefined}>
    <header className="sw-card-heading"><h3>{onOpen ? <button type="button" onClick={onOpen} style={{ all: 'unset', cursor: 'pointer' }}><FadeText lines={1}>{title || meta.label}</FadeText></button> : <FadeText lines={1}>{title || meta.label}</FadeText>}</h3>{extra}</header>
    <div className="sw-card-body"><div className="sw-card-main">{children}</div><WidgetObject kind={id} /></div>
    <footer className="sw-card-footer">{footer}</footer>
  </section>
}
export function TaskRow({ task, onOpen, compact = false }: { task: Task; onOpen: (task: Task) => void; compact?: boolean }) {
  return <button type="button" className={`sw-task ${compact ? 'is-compact' : ''}`} onClick={() => onOpen(task)}>
    <span className={`sw-task-marker ${task.overdue ? 'is-overdue' : ''}`} aria-hidden="true" />
    <span className="sw-task-copy"><FadeText className="sw-task-title" lines={compact ? 2 : undefined}><strong>{task.title}</strong></FadeText><FadeText className="sw-task-topic" lines={1}>{task.subject} · {task.topic}</FadeText></span>
    <span className={`sw-task-due ${task.overdue ? 'is-overdue' : ''}`}>{compact ? task.shortDue : task.due}</span><span className="sw-task-chevron" aria-hidden="true">›</span>
  </button>
}
type Props = {
  id: WidgetId; settings: PreviewSettings; tasks: Task[]; timer: string; seconds: number; running: boolean; focusTask: boolean;
  onTasks: () => void; onTask: (task: Task) => void; onDetail: (detail: Detail) => void;
  onStart: () => void; onReset: () => void; onRetry: () => void;
}
export function WidgetConcept({ id, settings, tasks, timer, seconds, running, focusTask, onTasks, onTask, onDetail, onStart, onReset, onRetry }: Props) {
  const language = settings.subject === 'english'
  const long = settings.longContent
  const action = (label: string, detail: Detail) => <button type="button" className="sw-link sw-card-action" onClick={() => onDetail(detail)}>{label} →</button>
  if (id === 'reminders') return <Card id={id} onOpen={onTasks} extra={<span className="sw-small">Все курсы</span>} footer={<button type="button" className="sw-link sw-card-action" onClick={onTasks}>{settings.scenario === 'tasks' ? 'Все 3 дела' : 'Открыть дела'} →</button>}>
    {settings.scenario === 'done' ? <div className="sw-state"><h4>Всё сдано</h4><p>Можно выдохнуть. Практика — по желанию.</p></div>
      : settings.scenario === 'loading' ? <div className="sw-state" aria-busy="true"><p>Проверяем задания и сроки</p><div className="sw-skeleton" /><div className="sw-skeleton short" /></div>
      : settings.scenario === 'error' ? <div className="sw-state" role="alert"><h4>Дела пока недоступны</h4><button type="button" className="sw-link" onClick={onRetry}>Повторить →</button></div>
      : <div className="sw-short-list">{tasks.slice(0, 2).map(task => <TaskRow key={task.id} task={task} onOpen={onTask} compact />)}</div>}
  </Card>
  if (id === 'stats') return <Card id={id} title="Прогресс курса" extra={<span className="sw-small">{language ? 'A2' : 'Химия'}</span>} footer={<><span className="sw-growth-small">+1 за неделю</span>{action('К курсу', 'course')}</>}>
    <div className="sw-stats"><div><strong>{language ? '6' : '3'}<span> / {language ? '13' : '22'}</span></strong><span>Пройдено</span></div><div><strong>4/5</strong><span>Последняя работа</span></div></div>
    <progress className="sw-course-progress sw-bottom-track" aria-label="Пройденные уроки" value={language ? 6 : 3} max={language ? 13 : 22} />
  </Card>
  if (id === 'trainer') return <Card id={id} title="Тренажёр" extra={<span className="sw-small">За неделю</span>} footer={action('Разобрать ошибки', 'trainer')}><div className="sw-trainer-value"><strong>6<span> / 8</span></strong></div><FadeText className="sw-copy"><p>{long ? language ? 'Повтори употребление Present Perfect и Past Simple: жизненный опыт и события в завершённом прошлом. В двух заданиях пока есть ошибки.' : 'Повтори нейтрализацию, массовую долю растворённого вещества и расчёт концентрации после смешивания растворов. В двух заданиях пока есть ошибки.' : language ? '2 ошибки · времена глаголов' : '2 ошибки · нейтрализация и растворы'}</p></FadeText></Card>
  if (id === 'focus') return <Card id={id} extra={<span className="sw-small">{focusTask ? 'Домашка' : '25 минут'}</span>} footer={<div className="sw-focus-actions"><button type="button" className="sw-link sw-card-action" onClick={onStart}>{running ? 'Пауза' : seconds < 1500 && seconds > 0 ? 'Продолжить' : 'Начать'} →</button>{seconds < 1500 && <button type="button" className="sw-link sw-reset" onClick={onReset}>Сбросить</button>}</div>}><span className="sw-clock" role="timer" aria-label="Оставшееся время">{timer}</span><FadeText className="sw-copy"><p>{focusTask ? 'Растворы · домашняя работа' : 'Одна задача. Без отвлечений.'}</p></FadeText></Card>
  if (id === 'awards') return <Card id={id} extra={<span className="sw-small">Коллекция</span>} footer={action('Посмотреть', 'awards')}><div className="sw-award-value"><strong>3 <span>стикера</span></strong></div><FadeText className="sw-copy"><p>{long ? 'Новый — за принятую работу «Химические связи: ионная и ковалентная связь, электроотрицательность» · 4/5' : 'Новый за работу «Химические связи» · 4/5'}</p></FadeText></Card>
  const item = widgetCopy(id, settings)
  return <Card id={id} extra={item.extra && <span className="sw-small sw-content-meta">{item.extra}</span>} footer={action(item.label, id)}><FadeText className="sw-copy sw-reading-copy"><div className="sw-title-window"><FadeText lines={2}><h4>{item.title}</h4></FadeText></div><p>{item.text}</p></FadeText>{id === 'quiz' && <div className="sw-quiz-dots sw-bottom-track" aria-label="Пять вопросов"><i /><i /><i /><i /><i /></div>}</Card>
}

type ReadingWidgetId = Exclude<WidgetId, 'reminders' | 'stats' | 'trainer' | 'focus' | 'awards'>
export function widgetCopy(id: ReadingWidgetId, settings: PreviewSettings) {
  const language = settings.subject === 'english'
  const long = settings.longContent
  const content: Record<ReadingWidgetId, { title: string; text: string; label: string; extra?: string }> = {
    quiz: { title: language ? 'Времена без путаницы' : 'Растворы: проверь основу', text: long && language ? 'Пять коротких заданий на Present Perfect и Past Simple: жизненный опыт, результат и события в завершённом прошлом. После каждого ответа — объяснение.' : long ? 'Пять коротких заданий на массовую долю, концентрацию и смешивание растворов. Вернись к вопросам, в которых ошибался на занятии.' : '5 вопросов · около 3 минут', label: 'Начать квиз', extra: 'Практика' },
    practice: { title: language ? 'I have ___ this film before.' : long ? 'Почему катализатор ускоряет реакцию, но не изменяет положение химического равновесия?' : 'Что меняет катализатор?', text: 'Один вопрос. Объяснение после ответа.', label: 'Ответить', extra: 'Вопрос дня' },
    reaction: { title: long ? 'Ca(OH)₂ + H₃PO₄ → ?' : 'NaOH + HCl → ?', text: long ? 'Определи продукты нейтрализации, расставь коэффициенты и проверь, сохранилось ли число атомов каждого элемента в обеих частях уравнения.' : 'Вспомни продукты нейтрализации.', label: 'Проверить себя', extra: 'Повторение' },
    fact: { title: 'Почему лёд плавает?', text: long ? 'Когда вода замерзает, водородные связи собирают молекулы в открытую кристаллическую решётку. Между ними становится больше свободного места. Поэтому плотность льда меньше плотности жидкой воды.' : 'Всё дело в форме кристаллической решётки. Между молекулами остаётся больше места.', label: 'Разобраться' },
    daily: { title: long ? 'A small change can make an ordinary day feel completely new' : 'A small change, every day', text: long ? 'Every morning, Mia takes the same street to school. One day she chooses a different way and finds a small park. A little change becomes her favourite part of the day.' : 'Короткая история и три полезных выражения на сегодня.', label: 'Читать', extra: 'A2 · 3 мин' },
    feed: { title: 'Why do leaves change colour?', text: long ? 'In autumn, trees get less sunlight. The green colour begins to disappear. We can finally see the yellow and orange colours that were hiding in the leaves all summer long.' : 'A little science for your English. Read, listen and learn something new.', label: 'Открыть заметку', extra: 'A2 · 2 мин' },
    memes: { title: 'Когда уравнял реакцию с первого раза', text: long ? 'Пересчитал атомы ещё три раза, потому что слишком легко получилось. А коэффициенты всё равно сошлись. Маленькая победа — тоже победа.' : 'И пересчитал атомы ещё три раза. На всякий случай.', label: 'Открыть', extra: 'Пауза' },
  }
  return content[id]
}

const QUIZ_QUESTIONS = [
  { title: 'В 100 г раствора содержится 10 г соли. Какова массовая доля соли?', choices: ['10%', '1%', '90%'], answer: '10%', explanation: 'Массовая доля — масса вещества, делённая на массу раствора: 10 / 100 × 100% = 10%.' },
  { title: 'Что получится при нейтрализации кислоты щёлочью?', choices: ['Соль и вода', 'Только вода', 'Водород'], answer: 'Соль и вода', explanation: 'Ионы водорода и гидроксид-ионы образуют воду, а остальные ионы — соль.' },
  { title: 'В 200 г раствора массовая доля соли 5%. Сколько в нём соли?', choices: ['10 г', '5 г', '40 г'], answer: '10 г', explanation: '200 × 0,05 = 10 г.' },
  { title: 'К раствору добавили чистую воду. Что случилось с массовой долей соли?', choices: ['Уменьшилась', 'Увеличилась', 'Не изменилась'], answer: 'Уменьшилась', explanation: 'Масса соли осталась прежней, а общая масса раствора выросла.' },
  { title: 'Что нужно сделать, чтобы увеличить массовую долю соли в растворе?', choices: ['Добавить соль', 'Добавить воду', 'Перемешать'], answer: 'Добавить соль', explanation: 'При добавлении растворимой соли её доля в общей массе увеличится.' },
]
const LANGUAGE_QUIZ = [
  { title: 'I have ___ this film before.', choices: ['seen', 'saw', 'see'], answer: 'seen', explanation: 'После have нужна третья форма глагола: have seen.' },
  { title: 'She ___ to London last year.', choices: ['went', 'has gone', 'go'], answer: 'went', explanation: 'Last year — завершённое время в прошлом, поэтому нужен Past Simple.' },
  { title: 'Have you ___ tried sushi?', choices: ['ever', 'yesterday', 'last week'], answer: 'ever', explanation: 'Ever в вопросе о жизненном опыте означает «когда-нибудь».' },
  { title: 'We have lived here ___ 2020.', choices: ['since', 'for', 'ago'], answer: 'since', explanation: 'Since указывает точку начала: с 2020 года.' },
  { title: 'He has ___ finished his homework.', choices: ['already', 'yesterday', 'last night'], answer: 'already', explanation: 'Already означает «уже» и подходит к результату в Present Perfect.' },
]
export function QuizConceptDetail({ language = false }: { language?: boolean }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const question = (language ? LANGUAGE_QUIZ : QUIZ_QUESTIONS)[index]
  if (finished) return <><h3>{score} из 5 верно</h3><p>Короткая практика завершена. Можно вернуться к ошибкам в тренажёре.</p><button type="button" className="sw-button" onClick={() => { setIndex(0); setAnswer(null); setScore(0); setFinished(false) }}>Ещё раз</button></>
  return <><span className="sw-pill">Вопрос {index + 1} из 5</span><h3>{question.title}</h3><div className="sw-answers">{question.choices.map(choice => <button type="button" key={choice} disabled={answer !== null} className={`sw-button ${choice === answer ? 'is-primary' : ''}`} onClick={() => { setAnswer(choice); if (choice === question.answer) setScore(value => value + 1) }}>{choice}</button>)}</div>{answer && <><p role="status">{answer === question.answer ? 'Верно. ' : `Правильный ответ: ${question.answer}. `}{question.explanation}</p><button type="button" className="sw-button is-primary" onClick={() => { if (index === 4) setFinished(true); else { setIndex(value => value + 1); setAnswer(null) } }}>{index === 4 ? 'Результат' : 'Следующий вопрос'}</button></>}</>
}
