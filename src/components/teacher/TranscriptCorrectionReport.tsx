import OpticalText from '../OpticalText'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { btn } from '../../lib/pillStyles'
import { Alert } from '../Alert'
import { getSubject } from '../../lib/subjects'
import FadeText from '../FadeText'
import type { Correction } from '../../lib/transcriptCorrections'

type Row = Correction & {status:'pending'|'approved'|'rejected';created_at:string;reviewed_at:string|null;review_reasons:string[]}
const kinds = {'speech':'Реплика', 'text-title':'Глава по тексту', 'slide-title':'Название слайда'}
export default function TranscriptCorrectionReport() {
  const [rows,setRows]=useState<Row[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState<string|null>(null)
  async function load() {
    setLoading(true);setError('')
    const {data,error}=await supabase.from('transcript_corrections').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(200)
    if(error)setError('Не удалось загрузить отчёт об исправлениях.')
    else setRows((data??[]) as Row[])
    setLoading(false)
  }
  useEffect(()=>{let alive=true;void (async()=>{
    const {data,error}=await supabase.from('transcript_corrections').select('*').eq('status','pending').order('created_at',{ascending:false}).limit(200)
    if(!alive)return
    if(error)setError('Не удалось загрузить отчёт об исправлениях.');else setRows((data??[]) as Row[])
    setLoading(false)
  })();return()=>{alive=false}},[])
  async function decide(id:string,status:'approved'|'rejected') {
    if(busy||loading)return
    setBusy(id);setError('')
    const {data,error}=await supabase.from('transcript_corrections').update({status}).eq('id',id).eq('status','pending').select('id')
    if(error||data?.length!==1)setError('Решение не подтверждено. Обновите отчёт и повторите.')
    else setRows(value=>value.filter(row=>row.id!==id))
    setBusy(null)
  }
  return <section aria-label="Отчёт об исправлениях" style={{marginTop:24}}>
    <div style={{display:'flex',alignItems:'center',gap:12,paddingInline:16,marginBottom:12,flexWrap:'wrap'}}>
      <h3 style={{margin:0}}>Исправления преподавателей</h3>
      <button type="button" style={{...btn('M','secondary'),minHeight:44}} disabled={loading||!!busy} onClick={()=>void load()}><OpticalText as="iskra-button-label">Обновить отчёт</OpticalText></button>
    </div>
    <p style={{paddingInline:16,color:'var(--color-text-3)',fontSize:13,marginBottom:12}}>По понедельникам в 09:00 (Бангкок) проверка отмечает спорные варианты и изменения чисел. Это поводы для проверки, а не доказанные ошибки. Подтверждение сохраняет личную правку; общей заменой она автоматически не становится.</p>
    {error&&<Alert tone="danger" text={error}/>}
    {loading?<p role="status">Загружаем исправления…</p>:rows.length===0&&!error?<p style={{paddingInline:16}}>Исправлений для проверки пока нет.</p>:null}
    <div className="tterms-grid">{rows.map(row=><article key={row.id} className="tterms-card" style={{position:'relative',height:'auto',display:'grid',gap:10}}>
      <FadeText className="tterms-meta">{kinds[row.kind]} · {getSubject(row.subject)?.name ?? row.subject} · {new Date(row.created_at).toLocaleDateString('ru')}</FadeText>
      <details><summary style={{minHeight:44,paddingBlock:10}}>Посмотреть исправление</summary>
        <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>Было: {row.before_text||'Пустой текст'}</p>
        <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>Стало: {row.after_text||'Удалено'}</p>
      </details>
      <p style={{fontSize:12,color:'var(--color-text-3)',margin:0}}>{row.reviewed_at?(row.review_reasons.length?row.review_reasons.join(' · '):'Автоматические признаки риска не найдены; нужна проверка смысла.'):'Ожидает еженедельной проверки'}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" style={{...btn('M','secondary'),minHeight:44}} disabled={loading||!!busy} onClick={()=>void decide(row.id,'approved')}><OpticalText as="iskra-button-label">Подтвердить</OpticalText></button>
        <button type="button" style={{...btn('M','quiet'),minHeight:44}} disabled={loading||!!busy} onClick={()=>void decide(row.id,'rejected')}><OpticalText as="iskra-button-label">Не применять повторно</OpticalText></button>
      </div>
    </article>)}</div>
    {rows.length===200&&<p style={{paddingInline:16}}>Показаны последние 200 исправлений. После проверки обновите отчёт, чтобы увидеть остальные.</p>}
  </section>
}
