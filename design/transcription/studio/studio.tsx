import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import '../../../src/index.css'
import ScrollFade from '../../../src/components/ScrollFade'
import { AudioLines, Bell, BookOpen, Check, ChevronDown, CircleCheck, LayoutGrid, Link2, List, LockOpen, Monitor, Moon, RotateCcw, Send, Sparkles, Sun, Upload, Video } from '../../../src/components/icons/appIcons'
import './studio.css'

const lessons = ['Введение: клетка как система', 'Химия жизни: вода', 'Белки: от последовательности к функции', 'Ферменты и энергетика', 'Мембраны и транспорт', 'Компартменты клетки', 'Транскрипция и трансляция', 'Регуляция экспрессии', 'Репликация ДНК', 'Клеточный цикл', 'Методы микроскопии', 'Итоговый практикум']
const stages = ['Готовим запись', 'Распознаём речь', 'Читаем слайды', 'Собираем главы']
const bounds = [0, 12, 71, 89, 100]
const time = (s:number) => Math.floor(s/60)+':'+String(s%60).padStart(2,'0')
type Phase = 'connect'|'idle'|'source'|'running'|'error'|'review'|'saved'
function Lesson({id,connected,connect}:{id:number;connected:boolean;connect:()=>void}) {
  const [tab,setTab] = useState<'lesson'|'recording'>('lesson')
  const [preview,setPreview] = useState(false)
  const [phase,setPhase] = useState<Phase>('idle')
  const [mode,setMode] = useState<'link'|'file'>('link')
  const [link,setLink] = useState('')
  const [file,setFile] = useState<File|null>(null)
  const [attached,setAttached] = useState(false)
  const [localVideo,setLocalVideo] = useState('')
  const [manualChapter,setManualChapter] = useState(false)
  useEffect(()=>{
    if(!file){setLocalVideo('');return}
    const url=URL.createObjectURL(file)
    setLocalVideo(url)
    return ()=>URL.revokeObjectURL(url)
  },[file])
  function begin(){setProgress(0);setPhase('running')}
  const [progress,setProgress] = useState(0)
  const [fail,setFail] = useState(false)
  const [chapter,setChapter] = useState(lessons[id])
  const [speech,setSpeech] = useState('Сегодня разберём тему «'+lessons[id]+'» и обсудим её на примере живой клетки.')
  useEffect(()=>{
    if(phase!=='running') return
    const timer=window.setInterval(()=>setProgress(p=>Math.min(100,p+1)),120)
    return ()=>clearInterval(timer)
  },[phase])
  useEffect(()=>{
    if(phase!=='running')return
    if(fail && progress>=8){setPhase('error');setFail(false)}
    else if(progress===100)setPhase('review')
  },[phase,progress,fail])
  function source(next:'link'|'file'){setMode(next);setPhase('source')}
  const valid=mode==='link'?/^https?:\/\/[^\s/]+[^\s]*$/i.test(link.trim()):!!file && file.size<=2*1024**3
  const step = bounds.slice(1, -1).filter(end => progress >= end).length
  const percent=Math.round((progress-bounds[step])/(bounds[step+1]-bounds[step])*100)
  return <div className="lessonBody">
    <div className="lessonHead"><h2>{lessons[id]}</h2><span className="openBadge"><LockOpen size={13}/>Открыт</span></div>
    {preview ? <section className="workCard pupil">
      <small className="kicker">ПРЕДПРОСМОТР ДЛЯ УЧЕНИКА</small><h3>Расшифровка урока</h3>
      <small>Глава · 0:00</small><h4>{chapter}</h4><p className="replica"><b>0:06</b>{speech}</p>
      <button onClick={()=>setPreview(false)}>Вернуться в редактор</button>
    </section> : <>
    <div className="lessonTabs"><button aria-pressed={tab==='lesson'} onClick={()=>setTab('lesson')}>Урок</button><button aria-pressed={tab==='recording'} onClick={()=>setTab('recording')}>Запись</button><span>Домашки</span><span>Ученики</span></div>
    {tab==='lesson' ? <section className="workCard">
      <small className="kicker">МАТЕРИАЛЫ УРОКА</small><h3>{lessons[id]}</h3>
      <p>План занятия, запись и материалы для самостоятельной работы.</p>
      <button className="primary" onClick={()=>setTab('recording')}><Video size={16}/>Перейти к записи</button>
    </section> : <>
    {(phase==='idle'||phase==='review'||phase==='saved') ? attached ? <div className="recorded">
      <div className="recordedSource"><Video size={16}/><span>{mode==='file'?file?.name:link}</span><button onClick={()=>source(mode)}>Изменить</button></div>
      <div className="playerRail"><div className="playerPane">{mode==='file' && localVideo?<video src={localVideo} controls/>:<div className="demoPoster"><Video size={30}/><b>{lessons[id]}</b><small>Демозапись · 10:54</small></div>}
        {phase!=='idle' && <section className="workCard"><h3>Реплики</h3><label>0:06<textarea aria-label="Реплика" rows={2} value={speech} onChange={e=>{setSpeech(e.target.value);setPhase('review')}}/></label></section>}
      </div>
      <section className="workCard rail"><h3>{phase==='idle'?'Таймкоды':'Главы'}</h3>{phase==='idle'?<><p>{manualChapter?'0:00 · Начало урока':'Добавьте главу на текущей секунде записи.'}</p>
        <button className="primary" onClick={()=>connected?begin():setPhase('connect')}><AudioLines size={16}/>Расшифровать видео</button><button onClick={()=>setManualChapter(true)}>+ Таймкод 0:00</button></>:<>
        <label>0:00<input aria-label="Название главы" value={chapter} onChange={e=>{setChapter(e.target.value);setPhase('review')}}/></label>
        {phase==='saved'?<div className="success"><CircleCheck size={16}/>Добавлено в урок</div>:
          <button className="primary" disabled={!chapter.trim()||!speech.trim()} onClick={()=>setPhase('saved')}><Check size={16}/>Сохранить расшифровку</button>}
        <button onClick={()=>setPreview(true)}>Посмотреть как ученик</button>
      </>}</section></div></div> :
      <div className="emptyVideo"><span><Video size={26}/></span><h3>Добавьте запись урока</h3><small>Вставьте ссылку на запись или выберите видео с компьютера</small><div className="actions"><button onClick={()=>source('link')}><Link2 size={15}/>Вставить ссылку</button><button onClick={()=>source('file')}><Upload size={15}/>Загрузить файл</button></div></div> :
    <section className="workCard">
      <div className="workHead"><div className="mark">{phase==='source'?<Video size={24}/>:<AudioLines size={24}/>}</div><div className="grow"><h3>{phase==='source'?'Запись урока':'Расшифровка видео'}</h3></div></div>
      {phase==='connect' && <div className="intro"><h4>Подключите компьютер</h4><p>Искра обработает запись урока на вашем Mac.</p><button className="primary" onClick={()=>{connect();begin()}}><Monitor size={16}/>Подключить компьютер</button></div>}
      {phase==='source' && <><div className="switch"><button aria-pressed={mode==='link'} onClick={()=>setMode('link')}><Link2 size={16}/>По ссылке</button><button aria-pressed={mode==='file'} onClick={()=>setMode('file')}><Upload size={16}/>Из файла</button></div>
      {mode==='link'?<label>Ссылка на запись<input type="url" placeholder="https://" value={link} onChange={e=>setLink(e.target.value)}/></label>:<label className="drop"><Upload size={20}/><b>{file?.name || 'Выберите аудио или видео'}</b><small>{file && file.size>2*1024**3?'Файл слишком большой. Выберите другой.':'До 2 ГиБ · файл останется на компьютере'}</small><input type="file" accept="audio/*,video/*" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>}
      <div className="actions"><button className="primary" disabled={!valid} onClick={()=>{setAttached(true);setPhase('idle')}}><Check size={16}/>Добавить запись</button><button onClick={()=>setPhase('idle')}>Отмена</button></div>
      <div className="fixture">{mode==='link' && <button onClick={()=>setLink('https://example.org/lesson-'+(id+1))}>Подставить демоссылку</button>}<label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/>Показать ошибку</label></div></>}
      {phase==='running' && <><div className="titleline"><h4>Обрабатываем запись</h4><small>Этап {step+1} из 4</small></div><ol>{stages.map((name,i)=><li key={name} aria-current={i===step?'step':undefined}><span className="fill" style={{width:i===step?percent+'%':'0%'}}/><i>{i<step?<Check size={14}/>:i+1}</i>{name}{i===step && <b role="progressbar" aria-label={name} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>{percent}%</b>}</li>)}</ol><small>{step===1?time(Math.round(percent*654/100))+' из 10:54 записи':'Обработка на вашем компьютере'}</small></>}
      {phase==='error' && <div className="intro"><h4>Не удалось прочитать запись</h4><p>Проверьте ссылку или выберите другой файл. Источник сохранён.</p><button className="primary" onClick={()=>setPhase('source')}>Вернуться к источнику</button></div>}
    </section>}
    </>} </>}
  </div>
}
function Studio(){
  const [id,setId]=useState(0),[visited,setVisited]=useState([0]),[connected,setConnected]=useState(false),[dark,setDark]=useState(false),[mobileList,setMobileList]=useState(false),[session,setSession]=useState(0)
  const [overview,setOverview] = useState(true)
  function choose(n:number){setOverview(false);setId(n);setVisited(v=>v.includes(n)?v:[...v,n]);setMobileList(false)}
  function reset(){setOverview(true);setSession(v=>v+1);setConnected(false);setId(0);setVisited([0]);setMobileList(false)}
  return <main className="studio"><div className="topbar"><span>Главная</span><span>Группы</span><span>Журнал</span><b>Конструктор</b><span>Финансы</span><em/><Bell size={17}/><LayoutGrid size={17}/><div className="avatar"><Sparkles size={18}/></div></div>
  <header><button className="crumb" onClick={()=>{setOverview(true);setMobileList(false)}}><BookOpen size={15}/>Курс</button><h1>Биология клетки — университетский курс</h1><div className="published"><Send size={15}/>Опубликован</div></header>
  <div className="mobileLessons"><button onClick={()=>setMobileList(!mobileList)} aria-expanded={mobileList}><List size={16}/>Уроки курса<ChevronDown size={14}/></button></div>
  <div className="workspace"><div className={'lessonArea '+(mobileList?'hiddenMobile':'')}><ScrollFade maxHeight="100%" style={{height:'100%'}}>{overview && <section className="workCard overview"><div className="mark"><BookOpen size={22}/></div>
      <small className="kicker">ПРОГРАММА КУРСА · 12 УРОКОВ</small><h2>Клетка: молекулы и механизмы</h2>
      <p>Выберите урок, чтобы открыть его материалы и запись.</p>
      <div className="courseLessons">{lessons.map((name,n)=><button key={name} onClick={()=>choose(n)}><small>Урок {n+1}</small><strong>{name}</strong></button>)}</div>
    </section>}{visited.map(n=><div hidden={overview || n!==id} key={session+'-'+n}><Lesson id={n} connected={connected} connect={()=>setConnected(true)}/></div>)}</ScrollFade></div>
  <aside className={mobileList?'showMobile':''}><div className="asideHead"><h3>Уроки</h3><small>12 шт.</small></div><div className="module"><ChevronDown size={14}/>Клетка: молекулы и механизмы</div><ScrollFade maxHeight="100%" style={{flex:1,minHeight:0}}><div className="roster">{lessons.map((name,n)=><button key={name} onClick={()=>choose(n)} aria-current={!overview && id===n?'page':undefined}><i>{n+1}</i><span>{name}</span><LockOpen size={13}/></button>)}</div></ScrollFade></aside></div>
  <footer><small>Искра · Локальный стенд</small><div><button aria-label="Сменить тему" onClick={()=>{document.documentElement.dataset.theme=dark?'light':'dark';setDark(!dark)}}>{dark?<Sun size={15}/>:<Moon size={15}/>}</button><button onClick={reset}><RotateCcw size={14}/>Сначала</button></div></footer></main>
}
createRoot(document.getElementById('root')!).render(<Studio/>)
