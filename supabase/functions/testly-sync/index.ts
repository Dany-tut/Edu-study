// Server-to-server completion notification. Scores are re-read from Testly;
// the sender cannot supply a grade or a student name to match.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { applyTestlyResult, ensureTestlySnapshots } from '../_shared/testlyProgress.ts'
const same = (secret: string, supplied: string) => {
  let diff = secret.length ^ supplied.length
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ (supplied.charCodeAt(i) || 0)
  return !!secret && !diff
}

/**
 * Testly pings Iskra only when a student submits. A teacher grading the manual
 * part in Testly, or a ping that never arrived, is picked up by this sweep
 * (pg_cron → iskra_private.dispatch_testly_sweep). Teacher-reviewed homework
 * is final and is never touched.
 */
async function sweep(secret: string) {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const since = new Date(Date.now() - 60 * 86400_000).toISOString()
  const { data: rows, error } = await db.from('lesson_progress').select('id, student_id, attachments, updated_at, status')
    .contains('attachments', { v: 'basic-1', rows: [{ type: 'testly' }] }).is('attachments->>reviewedAt', null)
    .in('status', ['current', 'submitted', 'completed', 'returned']).gte('updated_at', since)
    .order('updated_at', { ascending: false }).limit(300)
  if (error) throw error
  const open = (rows ?? []).filter(row => !row.attachments?.draft || row.status === 'current')
  if (!open.length) return 0
  const { data: students, error: studentError } = await db.from('students').select('id, created_by, group_id, auth_user_id')
    .in('id', [...new Set(open.map(row => row.student_id))])
  if (studentError) throw studentError
  const groupIds = [...new Set((students ?? []).map(s => s.group_id).filter(Boolean))]
  const { data: groups } = groupIds.length ? await db.from('groups').select('id, created_by').in('id', groupIds) : { data: [] }
  const ownerOf = (s: any) => s.created_by ?? (groups ?? []).find(g => g.id === s.group_id)?.created_by ?? null
  // Ask Testly once per teacher link, up to 100 attempts per request.
  const asks = new Map<string, { token: string; items: { testId: string; key: string }[]; rows: { row: any; testId: string; key: string }[] }>()
  for (const row of open) {
    const student = (students ?? []).find(s => s.id === row.student_id)
    const owner = student && ownerOf(student)
    if (!student?.auth_user_id || !owner) continue
    const key = row.attachments.testlyKey ?? `iskra:${student.auth_user_id}`
    for (const r of row.attachments.rows ?? []) {
      if (r?.type !== 'testly' || !r.testly?.testId) continue
      let ask = asks.get(owner)
      if (!ask) {
        const { data: link } = await db.from('teacher_module_secrets').select('token').eq('teacher_id', owner).eq('module', 'testly').maybeSingle()
        if (!link) continue
        ask = { token: link.token, items: [], rows: [] }
        asks.set(owner, ask)
      }
      ask.items.push({ testId: r.testly.testId, key })
      ask.rows.push({ row, testId: r.testly.testId, key })
    }
  }
  let changed = 0
  for (const ask of asks.values()) {
    for (let i = 0; i < ask.items.length; i += 100) {
      const res = await fetch(`${Deno.env.get('TESTLY_URL')}/functions/v1/iskra`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-iskra-secret': secret },
        body: JSON.stringify({ action: 'status', token: ask.token, items: ask.items.slice(i, i + 100) }),
      })
      if (!res.ok) { console.error('[testly-sync] sweep status', res.status); continue }
      for (const result of ((await res.json()).items ?? []) as any[]) {
        const target = ask.rows.find(x => x.testId === result.testId && x.key === result.key)
        if (!target || !['submitted', 'started'].includes(result.state)) continue
        const { row } = target
        const patch = applyTestlyResult(row.attachments, result.testId, result, row.status)
        if (!patch) continue
        const at = new Date().toISOString()
        const { data: saved, error: saveError } = await db.from('lesson_progress').update({ ...patch, updated_at: at })
          .eq('id', row.id).eq('updated_at', row.updated_at).select('id')
        if (saveError) throw saveError
        if (saved?.length) { changed++; row.attachments = patch.attachments; row.updated_at = at; row.status = patch.status ?? row.status }
      }
    }
  }
  return changed
}

Deno.serve(async req => {
  const secret = Deno.env.get('TESTLY_ISKRA_SECRET') ?? ''
  if (req.headers.get('x-sweep-secret') !== null) {
    if (!same(Deno.env.get('TESTLY_SWEEP_SECRET') ?? '', req.headers.get('x-sweep-secret') ?? '')) return new Response('Forbidden', { status: 403 })
    try {
      return Response.json({ ok: true, changed: await sweep(secret) })
    } catch (error) {
      console.error('[testly-sync] sweep', error)
      return new Response('Sweep failed', { status: 500 })
    }
  }
  if (!same(secret, req.headers.get('x-iskra-secret') ?? '')) return new Response('Forbidden', { status: 403 })
  try {
    const { key, testId } = await req.json()
    if (!/^iskra:[0-9a-f-]{36}$/i.test(key ?? '') || typeof testId !== 'string') return new Response('Bad request', { status: 400 })
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: attemptRows, error: attemptError } = await db.from('lesson_progress').select('student_id').eq('attachments->>testlyKey',key)
    if (attemptError) throw attemptError
    const people = db.from('students').select('id, created_by, group_id, auth_user_id')
    const { data: students, error } = attemptRows?.length ? await people.in('id',attemptRows.map(p => p.student_id)) : await people.eq('auth_user_id',key.slice(6))
    if (error) throw error
    // All enrollment rows of the person: the course decides which one owns the homework.
    const { data: person, error: peopleError } = await db.from('students').select('id, group_id, auth_user_id').eq('auth_user_id', key.slice(6))
    if (peopleError) throw peopleError
    let ensured = false
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
      if (!ensured) { await ensureTestlySnapshots(db, person ?? [], testId, key, result); ensured = true }
      const { data: rows, error: readError } = await db.from('lesson_progress').select('id, attachments, updated_at, status')
        .eq('student_id', student.id).contains('attachments', { v: 'basic-1' })
      if (readError) throw readError
      for (const row of rows ?? []) {
        if ((row.attachments?.testlyKey ?? `iskra:${student.auth_user_id}`) !== key) continue
        const patch = applyTestlyResult(row.attachments, testId, result, row.status)
        if (patch) {
          const { error } = await db.from('lesson_progress').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', row.id).eq('updated_at', row.updated_at)
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
