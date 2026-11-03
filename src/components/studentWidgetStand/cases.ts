import { WIDGET_META } from '../../data/widgets'
import type { HomeWidgetPresentationProps } from '../HomeWidgetPresentation'
import type { NextWorkWidgetProps } from '../NextWorkWidget'
import type { HomeWidgetTask } from '../../lib/homeWidgetTasks'

export const widgets=[...WIDGET_META.map(({id,label})=>({id,label})),{id:13,label:'Следующий шаг'}]
export const commonStates=[['ready','Данные'],['loading','Загрузка'],['placeholder','Заглушка'],['empty','Пусто'],['error','Ошибка'],['long','Длинный текст'],['large','Большие числа'],['no-art','Без картинки']] as const
const specifics:Record<number,readonly (readonly [string,string])[]>={
 0:[['complete','Всё пройдено'],['no-score','Нет оценок']],
 3:[['running','Таймер идёт'],['paused','Пауза'],['break','Перерыв'],['finished','Таймер завершён']],
 6:[['complete','Викторина пройдена']],7:[['mistakes','Есть ошибки']],8:[['one','Один стикер']],
 11:[['one','Одно дело'],['returned','Доработка'],['draft','Черновик'],['test','Тест']],
 13:[['overdue','Просрочено'],['returned','Доработка'],['test','Тест'],['review','На проверке'],['complete','Всё сдано'],['no-due','Без срока']],
}
export const statesFor=(id:number)=>[...commonStates,...(specifics[id]??[])]
/** Sizes from the live home: 180px strip, 132px short desktop, 124/112px phone. */
export const sizes=[
 {key:'wide',label:'Десктоп · 2 колонки',screenW:1512,screenH:982,width:692,height:180,columns:2},
 {key:'laptop',label:'Ноутбук · 2 колонки',screenW:1280,screenH:720,width:576,height:180,columns:2},
 {key:'short',label:'Низкий десктоп',screenW:1280,screenH:620,width:576,height:132,columns:2},
 {key:'one',label:'Десктоп · 1 колонка',screenW:1280,screenH:900,width:1168,height:180,columns:1},
 {key:'three',label:'Десктоп · 3 колонки',screenW:1440,screenH:900,width:432,height:180,columns:3},
 {key:'four',label:'Десктоп · 4 колонки',screenW:1440,screenH:900,width:320,height:180,columns:4},
 {key:'phone',label:'Телефон 390',screenW:390,screenH:844,width:310,height:180,columns:1},
 {key:'phone-low',label:'Телефон 390 · низкий',screenW:390,screenH:667,width:310,height:124,columns:1},
 {key:'small',label:'Телефон 320',screenW:320,screenH:568,width:240,height:112,columns:1},
] as const
export type StandSize=typeof sizes[number]
export const longTitle='Очень длинное название задания: строение клетки, химические связи и подробная подготовка к итоговому экзамену'
export const longText='Подробное объяснение с примерами и дополнительной практикой. '.repeat(12)
const noop=()=>{}
function task(index:number,state:string):HomeWidgetTask {
 return {key:`example-${index}`,subjectId:'example',subjectName:state==='long'?longTitle:'Химия',lesson:{id:`example-${index}`,number:index,title:state==='long'?longTitle:index?'Химические реакции: практикум':'Химическая связь',subject:'Химия',status:'returned',shape:'circle',kind:state==='test'?'test':'lesson',hasHard:false},label:state==='test'?'Пройти тест':state==='draft'?'Продолжить домашку':'Исправить работу',returned:state!=='test'&&state!=='draft',homework:true}
}
export function homeCase(id:number,state:string):HomeWidgetPresentationProps {
 const title=widgets.find(w=>w.id===id)?.label??'Виджет'
 const props:HomeWidgetPresentationProps={id,title,action:'Открыть',onOpen:noop}
 if(id===0){props.title='Прогресс курса';props.metrics=[{value:12,total:48,label:'Уроков пройдено'},{value:'87%',label:'Средний балл'}];props.progress={value:12,max:48};props.action='Подробнее'}
 else if(id===3){props.metrics=[{value:state==='finished'?'0:00':state==='break'?'5:00':'25:00',label:state==='break'?'Время отдохнуть':'Одна задача. Без отвлечений.'}];props.title=state==='break'?'Перерыв':'Фокус';props.action=state==='running'?'Пауза':'Начать';props.secondary='Настройки'}
 else if(id===7){props.metrics=[{value:24,label:'Минут сегодня'}];props.copy={title:'',text:state==='mistakes'?'Химия · Ошибок: 18':'Химия'};props.action='Открыть тренажёр'}
 else if(id===8){props.metrics=[{value:state==='one'?1:16,label:'Получено стикеров'}];props.copy={title:'',text:'Награды за принятые задания'};props.action='Коллекция'}
 else if(id===11){props.tasks=Array.from({length:state==='one'?1:2},(_,i)=>task(i,state));props.action='Все дела · 80'}
 else {props.copy={title:id===6?'Проверь себя':id===5?'Какая связь образуется между Na и Cl?':id===1?'У осьминога три сердца':id===2?'2H₂ + O₂ → 2H₂O':id===4?'Когда понял органическую химию':id===9?'A small discovery':'Как устроена память',text:id===6?'Вопросов: 20':id===2?'Образование воды':id===9?'A short story about learning something new.':'Короткий материал на языке курса'};props.quizTrack=id===6;props.action=id===6?'Начать':id===5?'Ответить':id===9?'Читать':'Открыть'}
 if(state==='empty'){props.metrics=props.metrics?.map(m=>({...m,value:0,total:m.total==null?undefined:0}));props.tasks=undefined;props.copy={title:'Новых данных нет',text:'Здесь появятся новые материалы'};props.progress=props.progress?{value:0,max:1}:undefined}
 if(state==='loading'||state==='placeholder')props.status='loading'
 if(state==='error')props.status='error'
 if(state==='long'){props.title=longTitle;if(props.copy)props.copy={title:longTitle,text:longText};if(props.metrics)props.metrics=props.metrics.map(m=>({...m,label:longTitle}));props.action='Открыть все материалы и продолжить обучение'}
 if(state==='large'&&props.metrics)props.metrics=props.metrics.map(m=>({...m,value:'999 999',total:m.total==null?undefined:'999 999'}))
 if(state==='complete'){props.progress={value:48,max:48};if(id===0)props.metrics=[{value:48,total:48,label:'Уроков пройдено'},{value:'100%',label:'Средний балл'}];if(id===6)props.copy={title:'Викторина пройдена',text:'20 из 20 · 100%'}}
 if(state==='no-score'&&props.metrics)props.metrics[1]={value:'—',label:'Средний балл'}
 return props
}
export function nextCase(state:string):NextWorkWidgetProps {
 const props:NextWorkWidgetProps={title:'Строение клетки',meta:'Биология · подготовка к экзамену · Модуль 1',due:'До 5 ноября',dueShort:'5 нояб.',action:'Открыть ДЗ',onOpen:noop}
 if(state==='loading'||state==='placeholder')props.status='loading'
 if(state==='empty'||state==='complete'){props.status='empty';props.title='Всё сдано';props.meta='Преподаватель откроет новые задания';props.due=undefined;props.action=undefined}
 if(state==='error'){props.status='error';props.title='Не удалось загрузить работы';props.meta=undefined;props.due=undefined;props.action='Повторить'}
 if(state==='overdue'){props.due='Просрочено 29 октября';props.dueShort='29 окт.';props.overdue=true}
 if(state==='returned')props.action='Доработать ДЗ'
 if(state==='test')props.action='Пройти тест'
 if(state==='review'){props.title='Всё сдано';props.due=undefined;props.action='На проверке';props.secondary=true}
 if(state==='no-due'){props.due='Без срока';props.dueShort='Без срока'}
 if(state==='long'){props.title=longTitle;props.meta='Биология: углублённая подготовка к экзамену · Модуль 12';props.due='Просрочено 29 сентября 2026 года';props.dueShort='29 сент.';props.overdue=true}
 if(state==='large')props.meta='Биология · Модуль 999'
 return props
}
