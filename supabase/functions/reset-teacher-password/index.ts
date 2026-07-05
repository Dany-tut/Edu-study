// Edge Function: reset a teacher's login password (admin only).
//
// Teachers self-register via an invite link and choose their own password, which
// lives ONLY as a bcrypt hash in Supabase Auth — nobody, including the admin, can
// read it. So there is no "show password" for teachers. This function lets an
// admin issue a NEW password: it runs server-side with the service_role key
// (which must never ship to the browser), verifies the caller is an admin,
// changes the teacher's Auth password, and returns the new password ONCE so the
// admin can pass it on. It is NOT stored anywhere.
//
// Request:  POST { teacherId: string, password?: string }   (JWT in Authorization header)
// Response: { password: string }  on success

import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// Readable password, same family as the student reset (iskra####).
function genPassword() {
  return 'iskra' + Math.floor(1000 + Math.random() * 9000)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'Не авторизован' }, 401)

  // 1) Identify the caller from their JWT.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData.user) return json({ error: 'Не авторизован' }, 401)
  const callerRole = (userData.user.user_metadata as { role?: string } | null)?.role

  let teacherId: string, password: string | undefined
  try {
    const body = await req.json()
    teacherId = String(body.teacherId ?? '')
    password = body.password ? String(body.password) : undefined
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  if (!teacherId) return json({ error: 'Не указан учитель' }, 400)

  // 2) Service-role client for the privileged profile check + password change.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  // 3) Authorize: only an admin may reset a teacher's password. Cross-check the
  //    caller's role against profiles too (not just the JWT claim) so a stale/
  //    forged metadata role can't unlock this.
  const { data: callerProfile } = await admin
    .from('profiles').select('role').eq('id', userData.user.id).single()
  const isAdmin = callerRole === 'admin' || (callerProfile as { role?: string } | null)?.role === 'admin'
  if (!isAdmin) return json({ error: 'Только администратор может сбросить пароль учителя' }, 403)

  // 4) Target must be a real teacher/admin profile. Its id IS the Auth user id.
  const { data: target, error: tErr } = await admin
    .from('profiles').select('id, role').eq('id', teacherId).single()
  if (tErr || !target) return json({ error: 'Учитель не найден' }, 404)
  const targetRole = (target as { role?: string }).role
  if (targetRole !== 'teacher' && targetRole !== 'admin') {
    return json({ error: 'Это не аккаунт учителя' }, 409)
  }

  const newPass = password && password.length >= 4 ? password : genPassword()

  // 5) Change the real Auth password.
  const { error: updErr } = await admin.auth.admin.updateUserById(teacherId, { password: newPass })
  if (updErr) return json({ error: 'Не удалось сменить пароль: ' + updErr.message }, 500)

  // Not persisted anywhere — returned once for the admin to relay to the teacher.
  return json({ password: newPass })
})
