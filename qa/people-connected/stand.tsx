import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { FriendsContent } from '../../src/components/DesktopFriends'
import { supabase } from '../../src/lib/supabase'
import type { Contact, FriendsModel } from '../../src/lib/desktopFriends'
import '../../src/index.css'
const people:Contact[]=[{id:'edge1',personKey:'one',name:'Митя',handle:'mita12222',role:'student',avatarId:'flower',state:'friend'},{id:'edge2',personKey:'two',name:'Александра Константинопольская',handle:'alexandra_long',role:'teacher',avatarId:'teacher',state:'friend'}]
let contacts=[...people]
let fail=false
// DEV-only fixture of production components. It never sends RPCs or changes server data.
if(import.meta.env.DEV) supabase.rpc=(async(_name:string,args:any)=>{
 await new Promise(r=>setTimeout(r,200))
 if(fail){fail=false;return {data:null,error:{message:'fixture error'}}}
 if(args.operation==='person')return {data:{...people.find(p=>p.personKey===args.payload.personKey),status:'found',state:contacts.some(p=>p.personKey===args.payload.personKey)?'friend':'none'},error:null}
 if(args.operation==='remove'){contacts=contacts.filter(p=>p.id!==args.payload.id);return {data:true,error:null}}
 return {data:{status:'found',...people[1],key:'two'},error:null}
}) as typeof supabase.rpc
function App(){
 const [snapshot,setSnapshot]=useState({handle:'myself',searchable:true,contacts}),[dark,setDark]=useState(false)
 const model:FriendsModel={account:'fixture',tab:'contacts',setTab:()=>{},snapshot,refresh:async()=>setSnapshot({...snapshot,contacts:[...contacts]}),incoming:[],error:''}
 return <main style={{maxWidth:900,margin:'40px auto',padding:20}}><h1>Карточки · проверка компонентов</h1><button onClick={()=>{setDark(!dark);document.documentElement.dataset.theme=dark?'light':'dark'}}>Тема</button><button onClick={()=>{contacts=[...people];setSnapshot({...snapshot,contacts})}}>Сбросить</button><button onClick={()=>{fail=true}}>Ошибка следующего запроса</button><FriendsContent model={model} overview polished/></main>
}
createRoot(document.getElementById('root')!).render(<App/> )
