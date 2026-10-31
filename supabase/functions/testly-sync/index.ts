// Server-to-server completion notification. Scores are re-read from Testly;
// the sender cannot supply a grade or a student name to match.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { applyTestlyResult } from '../_shared/testlyProgress.ts'
Deno.serve(async req => {
  const secret = Deno.env.get('TESTLY_ISKRA_SECRET') ?? ''
  const supplied = req.headers.get('x-iskra-secret') ?? ''
  let diff = secret.length ^ supplied.length
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0)
  if (!secret || diff) return new Response('Forbidden', { status: 403 })
  try {
    const { key, testId } = await req.json()
    if (!/^iskra:[0-9a-f-]{36}$/i.test(key ?? '') || typeof testId !== 'string') return new Response('Bad request', { status: 400 })
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: students, error } = await db.from('students').select('id, created_by, group_id').eq('auth_user_id', key.slice(6))
    if (error) throw error
    for (const student of students ?? []) {
      let owner = student.created_by
      if (!owner && student.group_id) {
        const { data } = await db.from('groups').select('created_by').eq('id', student.group_id).maybeSingle()
        owner = data?.created_by
      }
      if (!owner) continue
      const { data: link } = await db.from('teacher_module_secrets').select('token').eq('teacher_id', owner).eq('module', 'testly').maybeSingle()
      if (!link) continue
      const res = await fetch(`${Deno.env.get('TESTLY_URL')}/functions/v1/iskra`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-iskra-secret': secret },
        body: JSON.stringify({ action: 'status', token: link.token, items: [{ key, testId }] }),
      })
      if (!res.ok) throw new Error(`Testly status ${res.status}`)
      const result = (await res.json()).items?.[0]
      if (!result || !['submitted', 'started'].includes(result.state)) continue
      const { data: rows, error: readError } = await db.from('lesson_progress').select('id, attachments, updated_at, status')
        .eq('student_id', student.id).contains('attachments', { v: 'basic-1' })
      if (readError) throw readError
      for (const row of rows ?? []) {
        const patch = applyTestlyResult(row.attachments, testId, result, row.status)
        if (patch) {
          const { error } = await db.from('lesson_progress').update(patch).eq('id', row.id).eq('updated_at', row.updated_at)
          if (error) throw error
        }
      }
    }
    return Response.json({ ok: true })
  } catch (error) {
    console.error('[testly-sync]', error)
    return new Response('Sync failed', { status: 500 })
  }
})
