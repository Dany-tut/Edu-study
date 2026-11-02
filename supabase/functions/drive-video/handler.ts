import { createClient } from 'npm:@supabase/supabase-js@2.108.1'
import {
  boundedVideoRange,
  DRIVE_ID,
  fetchDriveVideo,
  signVideoTicket,
  verifyVideoTicket,
} from '../_shared/driveVideo.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'POST, GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

export async function handleDriveVideo(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!secret) return json({ error: 'Видео временно недоступно' }, 503)
  try {
    if (req.method === 'POST') {
      const auth = req.headers.get('Authorization') ?? ''
      if (!auth.startsWith('Bearer ')) return json({ error: 'Войдите в Искру, чтобы смотреть запись' }, 401)
      const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false },
      })
      const { data: { user }, error } = await caller.auth.getUser()
      if (error || !user) return json({ error: 'Войдите в Искру, чтобы смотреть запись' }, 401)
      const { fileId } = await req.json()
      if (typeof fileId !== 'string' || !DRIVE_ID.test(fileId)) {
        return json({ error: 'Некорректная ссылка на запись' }, 400)
      }
      // RLS restricts students to their lessons. Teachers may also preview a
      // public Drive link before saving it in the constructor.
      const [{ data: lessons }, { data: profile }] = await Promise.all([
        caller.from('lessons').select('id, youtube_url').ilike('youtube_url', `%${fileId.replace(/_/g, '\\_')}%`).limit(
          5,
        ),
        caller.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ])
      const teacher = profile?.role === 'teacher' || profile?.role === 'admin'
      const hasLesson = lessons?.some((lesson) => {
        try {
          const url = new URL(lesson.youtube_url)
          return url.hostname === 'drive.google.com' &&
            (url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get('id')) === fileId
        } catch {
          return false
        }
      })
      if (!hasLesson && !teacher) return json({ error: 'Нет доступа к записи урока' }, 403)
      const probe = await fetchDriveVideo(fileId, 'bytes=0-1', req.signal)
      await probe.body?.cancel()
      if (probe.status !== 206) return json({ error: 'Не удалось открыть запись с Google Диска' }, 502)
      const ticket = await signVideoTicket(fileId, user.id, secret)
      return json({ ticket })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405)
    const ticket = new URL(req.url).searchParams.get('ticket') ?? ''
    const fileId = await verifyVideoTicket(ticket, secret)
    if (!fileId) return json({ error: 'Ссылка на запись устарела. Откройте видео заново' }, 401)
    let range: string
    try {
      range = boundedVideoRange(req.method === 'HEAD' ? 'bytes=0-0' : req.headers.get('Range'))
    } catch {
      return json({ error: 'Invalid range' }, 416)
    }
    const upstream = await fetchDriveVideo(fileId, range, req.signal)
    const headers = new Headers({
      ...cors,
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    })
    for (const name of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
      const value = upstream.headers.get(name)
      if (value) headers.set(name, value)
    }
    if (req.method === 'HEAD') {
      const total = upstream.headers.get('Content-Range')?.split('/')[1]
      await upstream.body?.cancel()
      headers.delete('Content-Range')
      if (total) headers.set('Content-Length', total)
      return new Response(null, { status: 200, headers })
    }
    return new Response(upstream.body, { status: upstream.status, headers })
  } catch {
    return json(
      { error: 'Не удалось открыть запись. Проверьте доступ к файлу на Google Диске и попробуйте ещё раз' },
      502,
    )
  }
}
