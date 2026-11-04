import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import StudentProfile, { type StudentProfileTab } from '../../src/components/StudentProfile'
import type { FriendsTab } from '../../src/lib/desktopFriends'
import { Flower2 } from '../../src/components/icons/appIcons'
import '../../src/index.css'
const params = new URLSearchParams(location.search)
document.documentElement.dataset.theme = params.get('theme') ?? 'light'
function Stand() {
  const [section,setSection] = useState<StudentProfileTab|null>('main')
  const [tab,setTab] = useState<FriendsTab|null>(null)
  const [theme,setTheme] = useState(params.get('theme') ?? 'light')
  const contacts = params.has('empty') ? [] : Array.from({length:24},(_,i)=>({id:'person-'+i,handle:'friend_'+i,state:'friend' as const}))
  const model = {account:'fixture',tab,setTab,snapshot:{handle:params.has('empty') ? null : 'mita12222',searchable:true,contacts},incoming:[],error:'',refresh:async()=>{}}
  return <><button onClick={()=>setSection('main')}>Открыть профиль</button>{section && <StudentProfile
    section={tab === 'profile' ? 'settings' : section} onChange={setSection} onClose={()=>setSection(null)} model={model}
    name="Мита" avatar={<Flower2/>} avatarControls={<p>Аватары используют сохранение кабинета</p>}
    settings={<button className="profile-social-edit" onClick={()=>{const next=theme==='light'?'dark':'light';setTheme(next);document.documentElement.dataset.theme=next}}>Сменить тему</button>}/>}</>
}
createRoot(document.getElementById('root')!).render(<Stand/> )
