// Local review entry only. Never connects to a real account.
const user = { id: 'e80611a9-db5e-4d31-ac5b-a74b5f60a36e', email: 'demo@iskra.example', app_metadata: { role: 'teacher' }, user_metadata: { name: 'Александр', avatarId: 'flower' } }
const snapshot = { handle: 'alex_teacher', searchable: true, contacts: [] }
localStorage.setItem('sb-fixture-auth-token', JSON.stringify({ access_token: 'fixture', refresh_token: 'fixture', expires_at: Math.floor(Date.now()/1000)+86400, token_type: 'bearer', user }))
const originalFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
 const url = String(input instanceof Request ? input.url : input)
 if (!url.startsWith('http://fixture.invalid/')) return originalFetch(input, init)
 const rawBody = typeof init?.body === 'string' ? init.body : input instanceof Request ? await input.clone().text() : ''
 const body = rawBody ? JSON.parse(rawBody) : {}
 let data: unknown = []
 if (url.includes('/auth/v1/user')) {
   if (body.data) Object.assign(user.user_metadata, body.data)
   data = user
 } else if (url.includes('desktop_friends')) {
   if (body.operation === 'save') Object.assign(snapshot, { handle: body.payload.handle, searchable: body.payload.searchable })
   data = body.operation === 'search' ? { status: 'missing' } : snapshot
 } else if (url.includes('/teacher_modules')) data = [{ meta: { email: 'demo@testly.example', tests: 25 } }]
 return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
document.getElementById('theme')!.onclick = () => {
 document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
}
void import('./stand')
