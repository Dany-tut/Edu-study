import { createClient } from '@supabase/supabase-js'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const cfg = JSON.parse(readFileSync('/tmp/iskra-local-security/status.json'))
const inbox = 'http://127.0.0.1:55324'
assert.equal(cfg.API_URL,'http://127.0.0.1:55321')
const client = () => createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const email = 'recovery-'+randomUUID()+'@example.invalid'
const oldPassword = randomUUID(), newPassword = randomUUID()
const first = client()
assert.ifError((await first.auth.signUp({email,password:oldPassword})).error)
assert.ifError((await first.auth.resetPasswordForEmail(email,{redirectTo:'http://127.0.0.1:5291'})).error)
let message
for(let i=0;i<25 && !message;i++){
  const list=await (await fetch(inbox+'/api/v1/messages')).json()
  message=list.messages.find(item=>item.To.some(to=>to.Address===email))
  if(!message) await new Promise(resolve=>setTimeout(resolve,200))
}
assert.ok(message,'Missing recovery email')
const body=await (await fetch(inbox+'/api/v1/message/'+message.ID)).json()
const urls=body.HTML.match(/href="([^"]+)"/g)||[]
const link=urls.map(item=>new URL(item.slice(6,-1).replaceAll('&amp;','&'))).find(url=>url.pathname.endsWith('/verify'))
assert.ok(link)
assert.ok(['localhost','127.0.0.1'].includes(link.hostname) && link.port==='55321')
const confirm=async()=>new URL((await fetch(link,{redirect:'manual'})).headers.get('location'))
const redirect=await confirm()
assert.equal(redirect.origin,'http://127.0.0.1:5291')
const tokens=new URLSearchParams(redirect.hash.slice(1))
const recovery=client()
assert.ifError((await recovery.auth.setSession({access_token:tokens.get('access_token'),refresh_token:tokens.get('refresh_token')})).error)
assert.ifError((await recovery.auth.updateUser({password:newPassword})).error)
const replay=await confirm()
assert.ok(!new URLSearchParams(replay.hash.slice(1)).has('access_token') && (replay.hash+replay.search).includes('error'))
assert.ok((await client().auth.signInWithPassword({email,password:oldPassword})).error)
assert.ifError((await client().auth.signInWithPassword({email,password:newPassword})).error)
console.log('PASS recovery mail received, link consumed, replay rejected, old login denied, new login succeeds')
