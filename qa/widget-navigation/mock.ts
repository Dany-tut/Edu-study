const emit=(id:string)=>{window.dispatchEvent(new CustomEvent('qa-action',{detail:id}))}
export const groups=[{id:'group-A',name:'Группа Альфа',subject:'Химия',color:'#8866cc',studentCount:2}]
export const students=[{id:'student-A',name:'Ученик Альфа',groupId:'group-A',debt:2400,lessonBalance:-1,paymentDue:'2026-01-01'},{id:'student-B',name:'Ученик Бета',groupId:'group-A',debt:2600,lessonBalance:-2,paymentDue:'2026-01-02'}]
export function useGroups(){return {groups}}
export function useAllStudents(){return students}
export async function addPayment(p:any){emit('payment:'+p.studentId)}
export function useHomeData(){const empty=location.search.includes('empty');const reminders=empty?[]:Array.from({length:12},(_,i)=>({id:'hw-'+i,type:'check-hw',text:'Работа '+(i===0?'Альфа':'Бета '+i),detail:'Ожидает проверки',pendingCount:1})).concat([{id:'pay-A',type:'payment-debt',text:'Оплата Альфа',detail:'2400 ₽',pendingCount:1},{id:'pay-B',type:'payment-debt',text:'Оплата Бета',detail:'2600 ₽',pendingCount:1}] as any)
return {groups,totalStudents:16,pendingCount:12,loading:false,todaySchedule:empty?[]:[{id:'lesson-A',time:'17:30'}],nextLesson:empty?undefined:{id:'lesson-A',time:'17:30'},reminders,reminderAction:(r:any)=>()=>emit(r.id),reminderDone:()=>false}}
