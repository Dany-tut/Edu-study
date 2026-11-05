// Edge Function: reset a student's login password.
//
// Authorizes the owner/admin, changes Auth, and returns the credential once.
// The credential is never persisted in public tables.
//
// Request:  POST { studentId: string, password?: string }   (JWT in Authorization header)
// Response: { password: string }  on success

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { MFA_REQUIRED, mfaPending } from '../_shared/mfa.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

// Generate an unpredictable credential with the platform CSPRNG.
function genPassword() {
  return crypto.randomUUID().replace(/-/g, '')
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
  if (mfaPending(userData.user, authHeader)) return json(MFA_REQUIRED, 403)
  const callerId = userData.user.id
  const callerRole = (userData.user.app_metadata as { role?: string } | null)?.role

  let studentId: string, password: string | undefined
  try {
    const body = await req.json()
    studentId = String(body.studentId ?? '')
    if (body.password !== undefined && (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128)) {
      return json({ error: 'Пароль должен содержать от 12 до 128 символов' }, 400)
    }
    password = body.password
  } catch {
    return json({ error: 'Некорректный запрос' }, 400)
  }
  if (!studentId) return json({ error: 'Не указан ученик' }, 400)

  // 2) Service-role client for privileged reads + the actual password change.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

  const { data: student, error: sErr } = await admin
    .from('students')
    .select('id, auth_user_id, created_by')
    .eq('id', studentId)
    .single()
  if (sErr || !student) return json({ error: 'Ученик не найден' }, 404)

  // 3) Authorize: only the owning teacher (or an admin) may reset.
  const ownerId = student.created_by
  const isOwner = ownerId && ownerId === callerId
  const isAdmin = callerRole === 'admin'
  if (!isOwner && !isAdmin) return json({ error: 'Нет доступа к этому ученику' }, 403)

  const authUserId = (student as { auth_user_id?: string }).auth_user_id
  if (!authUserId) {
    return json({ error: 'Ученик ещё не зарегистрировался — пароль выдать нельзя.' }, 409)
  }

  // An owned student row must never become a password-reset proxy for staff.
  const { data: targetAuth, error: targetErr } = await admin.auth.admin.getUserById(authUserId)
  const { data: targetProfile } = await admin.from('profiles').select('role').eq('id', authUserId).single()
  if (targetErr || !targetAuth?.user || !targetProfile || targetProfile.role !== 'student' ||
      ['teacher', 'admin'].includes(targetAuth.user.app_metadata?.role)) {
    return json({ error: 'Это не аккаунт ученика' }, 409)
  }

  const newPass = password ?? genPassword()

  // 4) Change the real Auth password.
  const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, { password: newPass })
  if (updErr) return json({ error: 'Не удалось сменить пароль: ' + updErr.message }, 500)

  return json({ password: newPass })
})
