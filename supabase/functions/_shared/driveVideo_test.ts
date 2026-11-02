import { strict as assert } from 'node:assert'
import { boundedVideoRange, fetchDriveVideo, signVideoTicket, verifyVideoTicket } from './driveVideo.ts'

const id = '14a4-X5uWvPFMV5AANald10nC--XUWWin'
const secret = 'server-only-test-key'
const now = 1_800_000_000_000

Deno.test('media tickets validate signature, file ID and expiry', async () => {
  const ticket = await signVideoTicket(id, 'student', secret, now)
  assert.equal(await verifyVideoTicket(ticket, secret, now), id)
  assert.equal(await verifyVideoTicket(ticket, 'other-key', now), null)
  assert.equal(await verifyVideoTicket(ticket, secret, now + 6 * 3600_000), null)
  assert.equal(await verifyVideoTicket(`x${ticket}`, secret, now), null)
  assert.equal(await verifyVideoTicket(ticket + '.extra', secret, now), null)
  assert.equal(await verifyVideoTicket('bad', secret, now), null)
  const invalid = await signVideoTicket('https://internal.invalid', 'student', secret, now)
  assert.equal(await verifyVideoTicket(invalid, secret, now), null)
})

Deno.test('range requests are bounded, including open-ended browser requests', () => {
  assert.equal(boundedVideoRange(null), 'bytes=0-8388607')
  assert.equal(boundedVideoRange('bytes=0-1'), 'bytes=0-1')
  assert.equal(boundedVideoRange('bytes=123-'), 'bytes=123-8388730')
  assert.equal(boundedVideoRange('bytes=10-999999999'), 'bytes=10-8388617')
  for (const range of ['bytes=9-1', 'bytes=-50', 'bytes=0-1,2-3', 'junk', 'bytes=9007199254740992-']) {
    assert.throws(() => boundedVideoRange(range))
  }
})

function media() {
  return new Response(new Uint8Array([0, 1]), {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Range': 'bytes 0-1/144678351',
      'Content-Length': '2',
    },
  })
}

Deno.test('Drive media is streamed without reading/buffering the body', async () => {
  const fetcher = ((_url, init) => {
    assert.equal(new Headers(init?.headers).get('Range'), 'bytes=0-1')
    assert.equal(init?.redirect, 'error')
    return Promise.resolve(media())
  }) as typeof fetch
  const r = await fetchDriveVideo(id, 'bytes=0-1', undefined, fetcher)
  assert.equal(r.bodyUsed, false)
  assert.equal(r.status, 206)
  await r.body?.cancel()
})

Deno.test('large-file confirmation uses only UUID, never the supplied action URL', async () => {
  let calls = 0
  const fetcher = ((input) => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://drive.usercontent.google.com')
    assert.equal(url.searchParams.get('id'), id)
    if (++calls === 1) {
      return Promise.resolve(
        new Response('<form action="https://evil.invalid"><input name="uuid" value="test-confirmation-uuid"></form>', {
          headers: { 'Content-Type': 'text/html' },
        }),
      )
    }
    assert.equal(url.searchParams.get('uuid'), 'test-confirmation-uuid')
    return Promise.resolve(media())
  }) as typeof fetch
  const r = await fetchDriveVideo(id, 'bytes=0-1', undefined, fetcher)
  assert.equal(calls, 2)
  await r.body?.cancel()
})

Deno.test('private files, non-video bodies and ignored ranges cannot become playable responses', async () => {
  for (
    const response of [
      new Response('login', { headers: { 'Content-Type': 'text/html' } }),
      new Response('not video', { status: 206, headers: { 'Content-Type': 'application/pdf' } }),
      new Response('whole file', { headers: { 'Content-Type': 'video/mp4' } }),
    ]
  ) {
    await assert.rejects(fetchDriveVideo(id, 'bytes=0-1', undefined, (() => Promise.resolve(response)) as typeof fetch))
  }
  await assert.rejects(fetchDriveVideo('invalid', 'bytes=0-1'))
})
