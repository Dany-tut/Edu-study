// Edge Function: reset a student's login password.
//
// The client-side "Сбросить пароль" button can only rewrite students.temp_password —
// it has no way to change the actual Supabase Auth password, so the student could
// never log in with the "new" password. Password changes require the service_role
// admin API, which must never ship to the browser. This function runs server-side:
// it verifies the caller owns the student (or is admin), generates a fresh password,
// updates the Auth user, and mirrors it into students.temp_password for the teacher.
//
// Request:  POST { studentId: string, password?: string }   (JWT in Authorization header)
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

// Readable password, same family as the old client-side one (iskra####).
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
  const callerId = userData.user.id
  const callerRole = (userData.user.user_metadata as { role?: string } | null)?.role

  let studentId: string, password: string | undefined
  try {
    const body = await req.json()
    studentId = String(body.studentId ?? '')
    password = body.password ? String(body.password) : undefined
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  if (!studentId) return json({ error: 'Не указан ученик' }, 400)

  // 2) Service-role client for privileged reads + the actual password change.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: student, error: sErr } = await admin
    .from('students')
    .select('id, auth_user_id, group_id, groups!inner(created_by)')
    .eq('id', studentId)
    .single()
  if (sErr || !student) return json({ error: 'Ученик не найден' }, 404)

  // 3) Authorize: only the owning teacher (or an admin) may reset.
  const ownerId = (student as { groups?: { created_by?: string } }).groups?.created_by
  const isOwner = ownerId && ownerId === callerId
  const isAdmin = callerRole === 'admin'
  if (!isOwner && !isAdmin) return json({ error: 'Нет доступа к этому ученику' }, 403)

  const authUserId = (student as { auth_user_id?: string }).auth_user_id
  if (!authUserId) {
    return json({ error: 'Ученик ещё не зарегистрировался — пароль выдать нельзя.' }, 409)
  }

  const newPass = password && password.length >= 4 ? password : genPassword()

  // 4) Change the real Auth password.
  const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, { password: newPass })
  if (updErr) return json({ error: 'Не удалось сменить пароль: ' + updErr.message }, 500)

  // 5) Mirror it into temp_password so the teacher can see/copy it. Apply to every
  //    sibling card sharing this auth account (1:1 multi-subject students).
  await admin.from('students').update({ temp_password: newPass }).eq('auth_user_id', authUserId)

  return json({ password: newPass })
})
