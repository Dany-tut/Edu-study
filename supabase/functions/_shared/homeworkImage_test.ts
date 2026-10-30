import { loadHomeworkImage } from './homeworkImage.ts'

const uid = '11111111-1111-4111-8111-111111111111'
const student = '22222222-2222-4222-8222-222222222222'
const now = 1793360000000
const prefix = `${uid}/${student}/`
const ref = `hwp:${prefix}${now}-33333333-3333-4333-8333-333333333333.png`
const assert = (ok: unknown, message: string) => { if (!ok) throw new Error(message) }

Deno.test('stored images keep bytes and omit student identifiers from the worker payload', async () => {
  const result = await loadHomeworkImage(ref, 't1-image1', {
    ownerPrefix: prefix, now,
    download: () => Promise.resolve({ data: new Blob(['image bytes'], { type: 'image/png' }), error: null }),
  })
  assert(result?.name === 't1-image1.png' && result.mediaType === 'image/png', 'wrong image metadata')
  assert(result?.data === btoa('image bytes'), 'image bytes changed')
  assert(!JSON.stringify(result).includes(uid) && !JSON.stringify(result).includes(student), 'identifier leaked')
})

Deno.test('another student, malformed paths, external URLs and expired photos never download', async () => {
  let downloads = 0
  const download = () => { downloads++; return Promise.resolve({ data: null, error: null }) }
  for (const [value, ownerPrefix, at] of [
    [ref, `${uid}/44444444-4444-4444-8444-444444444444/`, now],
    [ref, null, now],
    ['hwp:../../other-bucket/photo.png', prefix, now],
    ['https://example.com/photo.png', prefix, now],
    [ref, prefix, now + 7 * 24 * 3600 * 1000],
  ] as const) {
    assert(await loadHomeworkImage(value, 't1', { ownerPrefix, now: at, download }) === null, 'unsafe image accepted')
  }
  assert(downloads === 0, 'unsafe path reached storage')
})

Deno.test('missing files and invalid MIME types are rejected', async () => {
  for (const data of [null, new Blob(['not an image'], { type: 'text/html' })]) {
    assert(await loadHomeworkImage(ref, 't1', {
      ownerPrefix: prefix, now, download: () => Promise.resolve({ data, error: null }),
    }) === null, 'invalid file accepted')
  }
})

Deno.test('legacy base64 remains supported without a storage request', async () => {
  const result = await loadHomeworkImage('data:image/jpeg;base64,YWJj', 't2-board', {
    ownerPrefix: null, download: () => { throw new Error('legacy image requested storage') },
  })
  assert(result?.name === 't2-board.jpg' && result.data === 'YWJj', 'legacy image changed')
})
