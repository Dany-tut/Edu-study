const $ = id => document.getElementById(id)
const sections = {
  course: ['Конструктор', 'Курсы, модули и уроки', 'practice'],
  work: ['Домашние работы', 'Ответы, проверка и доработка', 'stats'],
  profile: ['Профиль', 'Настройки рабочего стола', 'focus']
}
const names = { focus: 'Фокус', stats: 'Статистика', practice: 'Практика' }
const image = key => '<img src="media/' + key + '.webp" alt="">'
const crop = (key, alt) => '<img src="media/' + key + '.webp" alt="' + alt + '">'
const mini = (tag,title,body) => '<div class="mini"><small class="tag">'+tag+'</small><b>'+title+'</b><span>'+body+'</span></div>'
const tiles = ids => '<div class="mini widgetrow">'+ids.map(id=>'<div>'+image(id)+'<b>'+names[id]+'</b></div>').join('')+'</div>'
const steps = {
  course: [
    ['Соберите первый урок',crop('editor','Снимок списка уроков и модулей в конструкторе Искры'),'В конструкторе уроки собраны в модули. Откройте следующий кадр, чтобы увидеть опубликованный курс.','Вид ученика'],
    ['Посмотрите глазами ученика',crop('student','Снимок курса на главной ученика после публикации'),'После публикации ученик с доступом к курсу увидит его на своей главной.','В конструктор']
  ],
  work: [
    ['Попробуйте сдать ответ',mini('Ученик · Задание','Как поздороваться по-английски?','Ваш ответ · Hello!'),'В примере ответ уже набран. Отправьте его и посмотрите, что получит преподаватель.','Отправить ответ'],
    ['Откройте ответ на проверку',mini('Преподаватель · На проверке','Ответ ученика · Hello!','Комментарий · Добавьте обращение по имени.'),'Комментарий готов. Верните эту попытку ученику на доработку.','Вернуть ученику'],
    ['Прочитайте комментарий',mini('Ученик · На доработке','Добавьте обращение по имени.','Ваш предыдущий ответ · Hello!'),'Ученик видит, что исправить, и может подготовить следующую попытку.','В домашние работы']
  ],
  profile: [
    ['Настройте рабочий стол',mini('Профиль','Настроить виджеты','Порядок карточек на главной'),'В профиле есть постоянный вход в настройки виджетов. Попробуйте поменять порядок карточек.','Показать пример'],
    ['Выберите, что будет первым',tiles(['focus','practice']),'Откройте редактор на главной. Перемещение сразу меняет порядок виджетов.','Настроить виджеты']
  ]
}
const key = 'iskra.contextual-onboarding.v1'
let state
function restore() {
  state = JSON.parse(localStorage.getItem(key) || 'null') || {seen:{}, order:Object.keys(names)}
}
restore()
const save = () => localStorage.setItem(key,JSON.stringify(state))
let page = 'home', editing = false, step = 0
function fades() {
  const el=$('screen')
  el.style.setProperty('--top',el.scrollTop>1?'14px':'0px')
  el.style.setProperty('--bottom',el.scrollHeight-el.clientHeight-el.scrollTop>1?'14px':'0px')
}
$('screen').onscroll=fades
new ResizeObserver(fades).observe($('screen'))
function render() {
  const home=page==='home'
  const heading=home?(editing?'Настроить виджеты':'Рабочий стол'):sections[page][0]
  const button=(action,label,cls='quiet')=>'<button class="'+cls+'" data-action="'+action+'">'+label+'</button>'
  const entries=Object.entries(sections).map(([id,[title,desc,icon]])=>'<button class="entry" data-action="'+id+'">'+image(icon)+'<b>'+title+'</b><span>'+desc+'</span></button>').join('')
  const widgets=state.order.map((id,i)=>'<div class="widget">'+image(id)+'<b>'+names[id]+'</b>'+(editing?'<div class="row">'+[-1,1].map(d=>'<button aria-label="'+names[id]+(d<0?' раньше':' позже')+'" data-move="'+id+','+d+'" '+(i+d<0||i+d>=state.order.length?'disabled':'')+'>'+(d<0?'Раньше':'Позже')+'</button>').join('')+'</div>':'')+'</div>').join('')
  $('screen').innerHTML='<nav>'+(home?'<small>Кабинет преподавателя</small>':button('home','← На главную'))+'</nav><h1>'+heading+'</h1>'+(home?(editing?'<p>Выберите место карточки на главной.</p>'+button('done','Готово','primary'):'<p>Откройте раздел, с которым хотите познакомиться.</p><div class="cards">'+entries+'</div>')+'<h3>Мои виджеты</h3><div class="cards">'+widgets+'</div>':'<div class="entry"><b>'+(page==='profile'?'Рабочий стол':page==='course'?'Пока нет курсов':'Пока нет домашних работ')+'</b><p>'+sections[page][1]+'</p><div class="row">'+(page==='profile'?button('edit','Настроить виджеты','primary'):'')+button('guide','Посмотреть пример')+'</div></div>')
  fades()
}
function show(i) {
  step=i
  const [title,preview,caption,next]=steps[page][i]
  $('shade').hidden=false
  $('screen').inert=true
  $('eyebrow').textContent=sections[page][0]+' · Пример '+(i+1)+' из '+steps[page].length
  $('title').textContent=title
  $('preview').innerHTML=preview
  $('caption').textContent=caption
  $('next').textContent=next
  $('back').disabled=i===0
  if (!i) $('close').focus()
}
function hide() {
  $('shade').hidden=true
  $('screen').inert=false
  $('screen').querySelector('[data-action="guide"]')?.focus()
}
function go(id) {
  page=id; editing=false; render(); $('screen').scrollTop=0
  if(sections[id] && !state.seen[id]) {state.seen[id]=true;save();show(0)}
}
function edit(){page='home';editing=true;render();$('screen').scrollTop=0;$('screen').querySelector('[data-action="done"]').focus()}
$('screen').onclick=e=>{
  const b=e.target.closest('button'); if(!b)return
  if(b.dataset.move){
    const [id,d]=b.dataset.move.split(','), a=state.order.indexOf(id), z=a+Number(d)
    if(z<0||z>=state.order.length)return
    ;[state.order[a],state.order[z]]=[state.order[z],state.order[a]]
    save();render();$('screen').querySelector('[data-move^="'+id+',"]:not(:disabled)')?.focus();return
  }
  const act=b.dataset.action
  if(act==='guide')show(0)
  else if(act==='edit')edit()
  else go(act==='done'?'home':act)
}
$('back').onclick=()=>show(step-1)
$('next').onclick=()=>{if(step+1<steps[page].length)show(step+1);else{hide();if(page==='profile')edit()}}
$('close').onclick=hide
document.onkeydown=e=>{
  if($('shade').hidden)return
  if(e.key==='Escape')hide()
  if(e.key==='Tab'){
    const buttons=[...$('sheet').querySelectorAll('button:not(:disabled)')]
    if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus()}
    if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus()}
  }
}
$('reset').onclick=()=>{localStorage.removeItem(key);restore();hide();go('home')}
$('device').onclick=()=>{const phone=$('frame').classList.toggle('phone');$('device').textContent=phone?'Вид десктопа':'Вид телефона'}
for(const key of ['editor','student'])new Image().src='media/'+key+'.webp'
render()
