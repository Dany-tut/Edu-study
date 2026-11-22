// Fixture transport only: real Supabase query builder / real app hooks,
// but every request stays in-memory. No production project credentials.
import { createClient } from '@supabase/supabase-js'
export const teacherId='10000000-0000-0000-0000-000000000001'
export const groups=[{id:'20000000-0000-0000-0000-000000000001',name:'Химия · ЕГЭ',subject:'Химия',icon:'',level:'ЕГЭ',created_by:teacherId,is_individual:false,color:'#6354CF',color_soft:'#E7E4FB',studentCount:0}]
export const writes: unknown[]=[]
const fixtureFetch:typeof fetch=async(input,init)=>{
  const url=new URL(String(input));const path=url.pathname.split('/').pop();const method=init?.method??'GET'
  if(path==='students'&&method==='POST'){
    const payload=JSON.parse(String(init?.body));writes.push(payload)
    if(sessionStorage.getItem('qa.fail'))return new Response(JSON.stringify({code:'TEST_ERROR',message:'QA: запись отклонена'}),{status:400,headers:{'Content-Type':'application/json'}})
    const row={...payload,id:crypto.randomUUID(),invite_token:crypto.randomUUID(),person_id:crypto.randomUUID(),groups:groups.find(g=>g.id===payload.group_id)??null}
    const rows=JSON.parse(localStorage.getItem('qa.subjectStudents')??'[]');rows.push(row);localStorage.setItem('qa.subjectStudents',JSON.stringify(rows))
    return new Response(JSON.stringify(row),{status:201,headers:{'Content-Type':'application/json'}})
  }
  const result=path==='students'?JSON.parse(localStorage.getItem('qa.subjectStudents')??'[]'):path==='groups'?groups:[]
  return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}})
}
export const supabase=createClient('http://127.0.0.1:18767','fixture-placeholder',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:fixtureFetch}})
const user={id:teacherId,email:'teacher@example.invalid',app_metadata:{role:'teacher'},user_metadata:{},aud:'authenticated',created_at:''}
supabase.auth.getSession=async()=>({data:{session:{user,access_token:'fixture',refresh_token:'fixture',expires_in:3600,token_type:'bearer'}},error:null}) as any
supabase.auth.getUser=async()=>({data:{user},error:null}) as any
supabase.channel=(()=>{const channel={on:()=>channel,subscribe:()=>channel,unsubscribe:async()=>{}};return channel}) as any
supabase.removeChannel=(async()=> 'ok') as any
export const SUPABASE_URL='http://127.0.0.1:18767'
export const SUPABASE_KEY='fixture-placeholder'
