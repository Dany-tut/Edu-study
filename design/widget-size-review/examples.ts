// Existing repository examples only. No new lesson, person, task or payment
// is authored here; this maps their camelCase fields to the existing API shape.
import { DEMO_GROUPS, DEMO_STUDENTS_BY_GROUP, DEMO_GROUP_LESSONS_BY_GROUP, DEMO_HW } from '../../src/data/teacherDevDemo'
import { DEMO_TEACHER_HOME } from '../../src/data/teacherHomeDemo'
import { DEMO_SUBJECTS, DEMO_SCHEDULE, DEMO_STATS } from '../../src/data/devStudentDemo'
import { useStudentData } from '../../src/store/studentDataStore'
import { useDashboard } from '../../src/store/dashboardStore'
const snake=(v:Record<string,unknown>)=>Object.fromEntries(Object.entries(v).map(([k,v])=>[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),v]))
const groups=DEMO_GROUPS.map(g=>({...snake(g),id:g.id,students:[{count:g.studentCount}]}))
const students=Object.values(DEMO_STUDENTS_BY_GROUP).flat().map(s=>({...snake(s),groups:groups.find(g=>g.id===s.groupId)}))
const schedule=Object.values(DEMO_GROUP_LESSONS_BY_GROUP).flat().map(s=>({id:s.id,date:s.date,time_start:s.timeStart,time_end:'',lesson_title:s.title,lesson_number:s.lessonNumber,group_id:s.groupId,student_id:s.studentId,groups:groups.find(g=>g.id===s.groupId),status:'upcoming'}))
const homework=DEMO_HW.map(h=>({id:h.id,group_id:h.groupId,title:h.title,total_students:h.totalCount,status:h.status,groups:groups.find(g=>g.id===h.groupId)}))
// Counter-only rows reproduce the existing demo's submitted/reviewed totals;
// no student answers, names or task content are synthesized.
const homeworkCounters=DEMO_HW.flatMap(h=>Array.from({length:h.submittedCount},(_,i)=>({lesson_ref:'hw-'+h.id,status:i<h.reviewedCount?'completed':'submitted',students:{created_by:null}})))
export function exampleResponse(url:URL):unknown[]|undefined{
 const table=url.pathname.split('/').pop()
 if(table==='lesson_progress'&&url.searchParams.get('select')?.includes('lesson_ref,status,students!inner(created_by)'))return homeworkCounters
 const data=({groups,students,schedule_lessons:schedule,payments:[],teacher_tasks:[],homework,lesson_progress:[],lesson_attendance:[],teacher_lesson_sessions:[]} as Record<string,unknown[]>)[table||'']
 if(table==='teacher_finance_summary')return [{received:DEMO_TEACHER_HOME.money.received,debt:DEMO_TEACHER_HOME.money.debt,forecast:DEMO_TEACHER_HOME.money.forecast,expected:0}]
 if(!data)return []
 let filtered=data as Record<string,unknown>[]
 for(const [key,value] of url.searchParams){if(key.includes('.')||['select','order','limit','offset','or','created_by','teacher_id'].includes(key))continue;if(value.startsWith('eq.'))filtered=filtered.filter(r=>String(r[key]??'')===value.slice(3));if(value.startsWith('gte.'))filtered=filtered.filter(r=>String(r[key]??'')>=value.slice(4));if(value.startsWith('lte.'))filtered=filtered.filter(r=>String(r[key]??'')<=value.slice(4));if(value.startsWith('in.(')){const set=value.slice(4,-1).split(',');filtered=filtered.filter(r=>set.includes(String(r[key])))} }
 return filtered
}
export function loadStudentExamples(){useStudentData.setState({loaded:true,subjects:DEMO_SUBJECTS,scheduleDays:DEMO_SCHEDULE,stats:DEMO_STATS});useDashboard.setState({activeSubjectId:DEMO_SUBJECTS[0].id})}
