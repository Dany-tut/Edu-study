import { sections, guides, pupilViews, attempts } from './guides.mjs'
const $ = id => document.getElementById(id)
const names = { students: 'Студентов', pending: 'Проверить ДЗ', lessons: 'Уроков сегодня', attention: 'Требуют внимания' }
const image = key => '<img src="media/' + key + '.webp" alt="">'
const crop = (key, alt) => '<img src="media/' + key + '.webp" alt="' + alt + '">'
const metrics = {students:['1','в одной группе'], pending:['1','на проверке'], lessons:['0','занятий сегодня нет'], attention:['0','все ученики в норме']}
const key = 'iskra.contextual-onboarding.v1'
let state
function restore() {
  state = JSON.parse(localStorage.getItem(key) || 'null') || {}
  if (Array.isArray(state.order)) state.order = state.order.map(id => id === 'earnings' ? 'attention' : id)
  if (!Array.isArray(state.order) || Object.keys(names).some(id => !state.order.includes(id))) {
    state.order = Object.keys(names)
  }
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
  const button=(action,label,cls='quiet')=>'<button class="'+cls+'" data-action="'+action+'">'+label+'</button>'
  const entries=Object.entries(sections).map(([id,[title,desc,icon]])=>'<button class="entry" data-action="'+id+'">'+'<div class="section-shot">'+image(icon)+'</div>'+'<b>'+title+'</b><span>'+desc+'</span></button>').join('')
  const widgets = state.order.map((id,i) => {
    const controls = [-1,1].map(d => '<button aria-label="'+names[id]+(d<0?' раньше':' позже')+'" data-move="'+id+','+d+'" '+(i+d<0||i+d>=state.order.length?'disabled':'')+'>'+(d<0?'Раньше':'Позже')+'</button>').join('')
    return '<div class="real-widget" data-widget="'+id+'">'+('<div class="live-metric"><span>'+names[id]+'</span><strong>'+metrics[id][0]+'</strong><small>'+metrics[id][1]+'</small><i aria-hidden="true" style="background-image:url(media/'+id+'.webp)"></i></div>')+(editing?'<div class="row">'+controls+'</div>':'')+'</div>'
  }).join('')
  const dashboard = '<section class="dashboard" aria-label="Главная Искры"><small>Главная преподавателя · Пример</small><div class="real-metrics">'+widgets+'</div><div class="home-panels">'+crop('schedule','Расписание на сегодня')+crop('reminders','Напоминания преподавателя')+'</div></section>'
  const navigation = '<nav>'+(editing?button('home','← На главную'):'<small>Кабинет преподавателя</small>')+'</nav>'
  const links = '<p>Откройте раздел, с которым хотите познакомиться.</p><div class="cards">'+entries+'</div>'
  const editor = '<p>Переставьте карточку кнопками «Раньше» и «Позже». Затем откройте главную, чтобы увидеть результат.</p>'+button('done','Готово · На главную','primary')+dashboard
  $('screen').innerHTML=navigation+'<h1>'+(editing?'Настроить виджеты':'Рабочий стол')+'</h1>'+(editing?editor:links+dashboard)
  fades()
}
function showAttempts() {
  const preview = $('preview')
  preview.innerHTML = '<div class="attempt-options" role="group" aria-label="Попытка Миши"></div><div class="attempt-content" aria-live="polite"></div>'
  const options = preview.firstElementChild
  const content = preview.lastElementChild
  for (const attempt of attempts) {
    const button = document.createElement('button')
    button.textContent = attempt.label
    options.append(button)
    const panel = document.createElement('div')
    panel.className = 'attempt-panel'
    panel.innerHTML = '<img src="media/'+attempt.file+'.png" alt="'+attempt.label+'. '+attempt.status+'. Ответ Миши: 6. '+attempt.answer+' Анна: '+attempt.comment+'">'+
      '<div class="attempt-summary"><div><b>Ответ Миши · 6</b><span>'+attempt.status+'</span><p>'+attempt.answer+'</p></div>'+
      '<div><b>Комментарий Анны</b><p>'+attempt.comment+'</p></div></div>'
    content.append(panel)
    button.onclick = () => {
      for (const item of options.children) item.setAttribute('aria-pressed', String(item === button))
      for (const item of content.children) item.hidden = item !== panel
    }
  }
  options.firstElementChild.click()
}

function show(i) {
  $('choices').replaceChildren()
  step=i
  const [title,file,caption,next]=guides[page][i]
  $('shade').hidden=false
  $('screen').inert=true
  $('eyebrow').textContent=sections[page][0]+' · '+(i+1)+' из '+guides[page].length
  $('title').textContent=title
  $('next').textContent=next
  $('back').textContent=i?'Назад':'Закрыть'
  $('motion').hidden = file === 'attempts'
  $('sheet').classList.toggle('reading-attempts', file === 'attempts')
  if (file === 'attempts') {
    $('eyebrow').textContent='Домашние работы · Проверяет Анна'
    showAttempts()
    return
  }
  const compare = file === 'pupil-open'
  const choices = compare ? '<div class="pupil-choices" role="group" aria-label="Урок в кабинете Миши">'+
    pupilViews.map((view,index)=>'<button type="button" data-pupil="'+index+'">'+view.label+'</button>').join('')+'</div>' : ''
  $('choices').innerHTML=choices
  $('preview').innerHTML='<img class="guide-animation" alt="">'
  const img=$('preview').querySelector('img')
  const toggle=$('motion')
  let media=file
  let playing=!matchMedia('(prefers-reduced-motion: reduce)').matches
  function paint() {
    img.src='media/'+media+(playing?'.gif?play='+performance.now():'.webp')
    toggle.textContent=playing?'Остановить':'Смотреть GIF'
    const action=playing?'Остановить анимацию':'Посмотреть анимацию снова'
    toggle.setAttribute('aria-label',action)
    toggle.title=action
  }
  toggle.onclick=()=>{ playing=!playing; paint() }
  function choose(index) {
    const view=pupilViews[index]
    media=view.file
    $('caption').textContent=view.caption
    img.alt=view.caption
    for(const button of $('choices').querySelectorAll('[data-pupil]')) {
      button.setAttribute('aria-pressed',String(Number(button.dataset.pupil)===index))
      button.onclick=()=>choose(Number(button.dataset.pupil))
    }
    paint()
  }
  if(compare) choose(0)
  else {
    img.alt=title
    $('caption').textContent=caption
    paint()
  }
  $('next').textContent=next
  $('back').textContent=i?'Назад':'Закрыть'
  if (!i) $('close').focus()
}
function hide() {
  $('preview').replaceChildren()
  $('shade').hidden=true
  $('screen').inert=false
  $('screen').querySelector('[data-action="'+page+'"]')?.focus()
  if (location.hash) history.replaceState(null, '', location.pathname + location.search)
  page='home'
}
function go(id) {
  page=id
  if (sections[id]) { show(0); return }
  editing=false
  render()
  $('screen').scrollTop=0
}
function edit(){page='profile';editing=true;render();$('screen').scrollTop=0;$('screen').querySelector('[data-action="done"]').focus()}
$('screen').onclick=e=>{
  const b=e.target.closest('button'); if(!b)return
  if(b.dataset.move){
    const [id,d]=b.dataset.move.split(','), a=state.order.indexOf(id), z=a+Number(d)
    if(z<0||z>=state.order.length)return
    const positions = new Map([...document.querySelectorAll('[data-widget]')].map(el => [el.dataset.widget, el.getBoundingClientRect()]))
    ;[state.order[a],state.order[z]]=[state.order[z],state.order[a]]
    save();render()
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const card of document.querySelectorAll('[data-widget]')) {
        const before = positions.get(card.dataset.widget), after = card.getBoundingClientRect()
        card.animate([{transform:'translate('+ (before.x-after.x)+'px,'+(before.y-after.y)+'px)'},{transform:'none'}], {duration:360,easing:'ease-out'})
      }
    }
    $('screen').querySelector('[data-move^="'+id+',"]:not(:disabled)')?.focus({preventScroll:true});return
  }
  const act=b.dataset.action
  if(act==='done'){go('home'); $('screen').querySelector('.dashboard').scrollIntoView({block:'start'})}
  else go(act)
}
$('back').onclick=()=>step?show(step-1):hide()
$('next').onclick=()=>{
  if (step+1<guides[page].length) { show(step+1); return }
  const openEditor = page === 'profile'
  hide()
  if (openEditor) edit()
}
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

const guideLinks = {
  '#priglasit-mishu': ['roster', 'roster-invite'],
  '#vid-uchenika': ['course', 'pupil-open'],
  '#sravnit-popytki': ['work', 'compare-answers'],
  '#ocenka-mishi': ['work', 'misha-result'],
  '#popytki-mishi': ['work', 'attempts'],
  '#povtornaya-sdacha': ['work', 'revised-answer']
}

function openLinkedGuide() {
  const target = guideLinks[location.hash]
  if (!target) return
  const [section, file] = target
  if (editing) {
    editing = false
    render()
  }
  page = section
  show(guides[section].findIndex(([, asset]) => asset === file))
  $('close').focus()
}

render()
openLinkedGuide()
window.addEventListener('hashchange', openLinkedGuide)
