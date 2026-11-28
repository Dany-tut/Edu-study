import type { Lesson, Subject } from '../data/mockData'
export type HomeWidgetTask={key:string;subjectId:string;subjectName:string;lesson:Lesson;label:string;returned:boolean;homework:boolean}
/** Derived from confirmed lesson states. Schedule dates are never presented as homework deadlines. */
// activeId — курс, выбранный в профиле/треке: его дела идут первыми, чтобы
// виджет «Твои дела» открывался на нём, а не на курсе другого предмета.
export function homeWidgetTasks(subjects:Subject[],activeId?:string|null):HomeWidgetTask[]{
  const seen=new Set<string>(),tasks:HomeWidgetTask[]=[]
  for(const course of subjects)for(const module of course.modules)for(const lesson of module.lessons){
    const key=`${course.id}:${lesson.id}`
    if(seen.has(key)||lesson.nodeType==='rec'||lesson.result?.pending||!['returned','current'].includes(lesson.status))continue
    seen.add(key)
    const returned=lesson.status==='returned',draft=lesson.result?.draft===true,test=lesson.kind==='test'
    tasks.push({key,subjectId:course.id,subjectName:course.subject||course.name,lesson,returned,homework:returned||draft,
      label:returned?'Исправить работу':test?'Пройти тест':draft?'Продолжить домашку':'Продолжить урок'})
  }
  const mine=(t:HomeWidgetTask)=>Number(t.subjectId===activeId)
  return tasks.sort((a,b)=>mine(b)-mine(a)||Number(b.returned)-Number(a.returned)||Number(b.homework)-Number(a.homework))
}
