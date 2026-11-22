import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import { AddStudentModal } from '../../src/pages/teacher/TeacherGroupsPage'
import MobileTeacherStudents from '../../src/components/teacher/mobile/MobileTeacherStudents'
import { useGroups, useAllStudents } from '../../src/lib/useGroups'
import { useTeacherAccess } from '../../src/lib/teacherAccess'
import { PLATFORM } from '../../src/lib/platform'
import { groups, writes } from './supabase'
import '../../src/index.css'
const params=new URLSearchParams(location.search)
document.documentElement.dataset.theme=params.get('theme')??'light'
useTeacherAccess.setState({loaded:true,isTeacher:true,subjects:['chemistry','biology']})
function Stand(){
  const [open,setOpen]=useState(true)
  const {addUnassignedStudent,addStudentToGroup}=useGroups()
  const students=useAllStudents()
  return <><output data-testid="loaded-students" style={{position:'fixed',left:0,bottom:0,fontSize:10,zIndex:0}}>{JSON.stringify(students.map(s=>({id:s.id,name:s.name,subjects:s.subjects})))}</output>
    {params.has('mobile')?<MobileTeacherStudents/>:<><button onClick={()=>setOpen(true)}>Открыть форму</button>{open&&<AddStudentModal groups={groups as any} initialGroupId={null} onClose={()=>setOpen(false)} onSave={async(groupId,s)=>{
      const result=groupId?await addStudentToGroup(groupId,s):await addUnassignedStudent(s)
      return {studentId:result.studentId,inviteToken:result.inviteToken,error:result.error?.message??null}
    }}/>}</>}
  </>
}
Object.assign(window,{subjectQa:{writes,platform:PLATFORM}})
createRoot(document.getElementById('root')!).render(<Stand/> )
