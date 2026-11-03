import { strict as assert } from 'node:assert'
import { handleDriveVideo } from './handler.ts'

Deno.test('gateway checks user and lesson access before signing; media accepts only a valid ticket', async () => {
  const names = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
  const old = names.map((name) => Deno.env.get(name))
  const originalFetch = globalThis.fetch
  const id = '14a4-X5uWvPFMV5AANald10nC--XUWWin'
  let accessible = false, teacher = false, mediaCalls = 0
  Deno.env.set(names[0], 'https://iskra-test.invalid')
  Deno.env.set(names[1], 'test-publishable')
  Deno.env.set(names[2], 'test-server-secret')
  globalThis.fetch = ((input) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url)
    const json = (data: unknown) => Promise.resolve(Response.json(data))
    if (url.pathname === '/auth/v1/user') {
      return json({ id: 'test-student', aud: 'authenticated', role: 'authenticated' })
    }
    if (url.pathname === '/rest/v1/profiles') return json({ role: teacher ? 'teacher' : 'student' })
    if (url.pathname === '/rest/v1/lessons') {
      return json(accessible ? [{ id: 'lesson', youtube_url: `https://drive.google.com/file/d/${id}/view` }] : [])
    }
    assert.equal(url.hostname, 'drive.usercontent.google.com')
    mediaCalls++
    return Promise.resolve(
      new Response(new Uint8Array([0, 1]), {
        status: 206,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': 'bytes 0-1/100',
          'Content-Length': '2',
          'Accept-Ranges': 'bytes',
        },
      }),
    )
  }) as typeof fetch
  const post = (body = { fileId: id }, auth = true) =>
    handleDriveVideo(
      new Request('https://gateway.invalid/drive-video', {
        method: 'POST',
        headers: auth ? { Authorization: 'Bearer caller-token', 'Content-Type': 'application/json' } : {},
        body: JSON.stringify(body),
      }),
    )
  try {
    assert.equal((await post(undefined, false)).status, 401)
    assert.equal((await post({ fileId: 'https://internal.invalid' })).status, 400)
    assert.equal((await post()).status, 403)
    assert.equal(mediaCalls, 0)
    accessible = true
    const response = await post()
    assert.equal(response.status, 200)
    const { ticket } = await response.json()
    assert.equal(typeof ticket, 'string')
    assert.equal(ticket.includes('caller-token'), false)
    const media = await handleDriveVideo(
      new Request(`https://gateway.invalid/drive-video?ticket=${ticket}`, { headers: { Range: 'bytes=0-1' } }),
    )
    assert.equal(media.status, 206)
    assert.equal(media.headers.get('Content-Type'), 'video/mp4')
    assert.equal(media.headers.get('Content-Range'), 'bytes 0-1/100')
    assert.equal(media.headers.get('Access-Control-Allow-Origin'), '*')
    await media.body?.cancel()
    assert.equal(
      (await handleDriveVideo(new Request('https://gateway.invalid/drive-video?ticket=invalid'))).status,
      401,
    )
    const badRange = await handleDriveVideo(
      new Request(`https://gateway.invalid/drive-video?ticket=${ticket}`, { headers: { Range: 'bytes=0-1,2-3' } }),
    )
    assert.equal(badRange.status, 416)
    accessible = false
    teacher = true
    assert.equal((await post()).status, 200)
  } finally {
    globalThis.fetch = originalFetch
    names.forEach((name, i) => old[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, old[i]!))
  }
})
