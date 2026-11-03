import { createClient } from 'jsr:@supabase/supabase-js@2.118.0'
import { loadWork } from '../_shared/homeworkWork.ts'
import { gradeViaLinali, GradeError, DEFAULT_MODEL, classifyProviderStatus } from '../_shared/homeworkAi.ts'
import { resolveLinaliKey } from '../_shared/homeworkAiKey.ts'

declare const EdgeRuntime: { waitUntil(task: Promise<unknown>): void }
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type, x-hw-grade-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const url = Deno.env.get('SUPABASE_URL')!
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const providerKey = () => resolveLinaliKey(Deno.env.get('LINALI_API_KEY'),Deno.env.get('KIE_API_KEY'),Deno.env.get('LINALI_KEY_SOURCE')==='KIE_API_KEY')

async function enabled() {
  const { data, error } = await admin.from('app_flags').select('key,enabled').in('key', ['ai_enabled','ai_hw_grade','ai_hw_api'])
  if (error) throw error
  return ['ai_enabled','ai_hw_grade','ai_hw_api'].every(key => data?.some(flag => flag.key === key && flag.enabled))
}

async function run(id: string) {
  const { data: row, error: readError } = await admin.from('hw_ai_grades').select('id,status,updated_at,run_attempts').eq('id', id).maybeSingle()
  if (readError) throw readError
  if (!row || row.status !== 'pending') return
  const token = new Date().toISOString()
  const { data: claim, error: claimError } = await admin.from('hw_ai_grades').update({ status: 'working', claimed_at: token, updated_at: token, run_attempts: row.run_attempts + 1, error: null })
    .eq('id', id).eq('status', 'pending').eq('updated_at', row.updated_at).select('id').maybeSingle()
  if (claimError) throw claimError
  if (!claim) return
  // Both a new submission and a different worker change the lease. A late
  // response must never overwrite either of them or the teacher's decision.
  const finish = (patch: Record<string, unknown>) => admin.from('hw_ai_grades').update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id).eq('status', 'working').eq('claimed_at', token)
  try {
    const { work, images } = await loadWork(admin, id)
    if (!work) throw new GradeError('missing_evidence')
    if (images.length > 12 || images.reduce((size, image) => size + image.data.length, 0) > 20_000_000 || work.tasks.length > 40) throw new GradeError('missing_evidence')
    const { data: snapshot } = await admin.from('hw_ai_grades').select('progress_id').eq('id', id).single()
    const { data: progress } = await admin.from('lesson_progress').select('attachments,status').eq('id', snapshot!.progress_id).single()
    if (progress?.status !== 'submitted') return
    const graded = await gradeViaLinali(work, images, { key: providerKey(), model: Deno.env.get('LINALI_HW_MODEL') })
<<<<<<< HEAD
    const { error } = await finish({ status: 'graded', result: { tasks: graded.tasks, teacher_note: graded.teacher_note, attempt_id: progress.attachments?.attemptId ?? null, token_usage: graded.tokenUsage ?? null },
=======
    const { error } = await finish({ status: 'graded', result: { tasks: graded.tasks, teacher_note: graded.teacher_note, attempt_id: progress.attachments?.attemptId ?? null },
>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
      primary_score: graded.primary, max_score: graded.max, score: graded.score, comment: graded.comment,
      model: graded.model, graded_at: new Date().toISOString(), error: null, next_retry_at: null })
    if (error) throw error
  } catch (error) {
    const failure = error instanceof GradeError ? error : new GradeError('unavailable', true)
    const attempts = row.run_attempts + 1
    const nextRetry = failure.retryable && attempts < 3 ? new Date(Date.now() + 60_000 * 2 ** attempts).toISOString() : null
    const { error: saveError } = await finish({ status: 'error', error: failure.code, next_retry_at: nextRetry })
    // No answer text, provider body, key, or student identity in logs.
    console.error('[hw-grade-run]', { code: failure.code, saved: !saveError })
  }
}

async function tick() {
  if (!providerKey()) return
  // Recover interrupted calls. The old lease is invalidated before requeueing.
  const stale = new Date(Date.now() - 5 * 60_000).toISOString()
  const { error: recoverError } = await admin.from('hw_ai_grades').update({ status: 'error', error: 'timeout', next_retry_at: new Date().toISOString(), claimed_at: null })
    .eq('status','working').lt('claimed_at',stale).lt('run_attempts',3)
  if (recoverError) throw recoverError
  const { error: exhaustedError } = await admin.from('hw_ai_grades').update({ status:'error',error:'timeout',next_retry_at:null,claimed_at:null }).eq('status','working').lt('claimed_at',stale).gte('run_attempts',3)
  if (exhaustedError) throw exhaustedError
  const { error: retryError } = await admin.from('hw_ai_grades').update({ status:'pending', next_retry_at:null, claimed_at:null })
    .eq('status','error').not('next_retry_at','is',null).lte('next_retry_at',new Date().toISOString()).lt('run_attempts',3)
  if (retryError) throw retryError
  const { data, error } = await admin.from('hw_ai_grades').select('id').eq('status','pending').order('submitted_at').limit(2)
  if (error) throw error
  await Promise.all((data ?? []).map(row => run(row.id)))
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply({ error:'method' },405)
  try {
    const body = await req.json().catch(() => ({}))
    const secret = Deno.env.get('HW_GRADE_SECRET')
    // Operator-only diagnostics use a fixed anonymous example. They cannot
    // insert submissions, alter marks, or return the provider credential.
    if (body.action === 'probe' || body.action === 'models') {
      if (!secret || req.headers.get('x-hw-grade-secret') !== secret) return reply({ error:'unauthorized' },401)
      const key = providerKey()
      const keySource = Deno.env.get('LINALI_API_KEY')?.trim() ? 'LINALI_API_KEY' : key ? 'KIE_API_KEY' : null
      if (!key) return reply({ error:'configuration', legacyLinaliKey:false },503)
      try {
        if (body.action === 'models') {
          const response = await fetch('https://api.linaliapi.com/v1/models', { headers:{ Authorization:`Bearer ${key}` },signal:AbortSignal.timeout(15_000) })
          if (!response.ok) { await response.body?.cancel(); throw classifyProviderStatus(response.status) }
          const catalog = await response.json()
          return reply({ configured:true, keySource, model:Deno.env.get('LINALI_HW_MODEL') || DEFAULT_MODEL, models:(catalog.data ?? []).map((item: {id?: string})=>item.id).filter(Boolean) })
        }
        if (!(await enabled())) return reply({ error:'disabled' },503)
        const graded = await gradeViaLinali({ kind:'basic',subject:'chemistry',exam:'ege',title:'Учебный пример проверки подключения',note:'',tasks:[
          {n:1,type:'write',statement:'Объясните восстановление железа в реакции Fe₂O₃ + CO → Fe + CO₂.',reference:'Железо принимает электроны: Fe³⁺ + 3e⁻ → Fe⁰.',answer:'Fe: +3 → 0. Железо принимает 3 электрона; CO — восстановитель.',machine:'review'},
          {n:2,type:'write',statement:'Расставьте коэффициенты в реакции Fe₂O₃ + CO → Fe + CO₂.',reference:'Fe₂O₃ + 3CO → 2Fe + 3CO₂',answer:'Fe₂O₃ + 3CO → 2Fe + CO₂',machine:'review'},
        ] },[],{ key,model:typeof body.model==='string'&&body.model.length<100?body.model:Deno.env.get('LINALI_HW_MODEL') })
        return reply({ ok:true, ...graded })
      } catch(error) { return reply({ error:error instanceof GradeError?error.code:'unavailable', ...(error instanceof GradeError ? {providerStatus:error.providerStatus,providerCode:error.providerCode} : {}) },503) }
    }
    if (body.action === 'tick') {
      if (!secret || req.headers.get('x-hw-grade-secret') !== secret) return reply({ error:'unauthorized' },401)
      if (!(await enabled())) return reply({ error:'disabled' },503)
      EdgeRuntime.waitUntil((uuid(body.id) && providerKey() ? run(body.id) : tick()).catch(() => console.error('[hw-grade-run] tick failed')))
      return reply({ ok:true },202)
    }
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) return reply({ error:'unauthorized' },401)
    const { data: { user }, error: authError } = await admin.auth.getUser(auth.slice(7))
    if (authError || !user) return reply({ error:'unauthorized' },401)
    if (!uuid(body.progressId)) return reply({ error:'invalid_request' },400)
    // RLS is also enforced by the request RPC, not by a client-supplied teacher id.
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers:{ Authorization:auth } }, auth:{ persistSession:false } })
    if (!(await enabled())) return reply({ error:'disabled' },503)
    if (!providerKey()) return reply({ error:'configuration' },503)
    const { data: id, error } = await client.rpc('hw_ai_grade_request', { p_progress_id: body.progressId, p_retry: body.action === 'retry' })
    if (error) return reply({ error: error.code === '42501' ? 'forbidden' : ['unsupported_subject','submission_not_pending','cooldown'].includes(error.message) ? error.message : 'unavailable' },error.code === '42501' ? 403 : 409)
    EdgeRuntime.waitUntil(run(id).catch(() => console.error('[hw-grade-run] task failed')))
    return reply({ ok:true, id },202)
  } catch { return reply({ error:'unavailable' },503) }
})
