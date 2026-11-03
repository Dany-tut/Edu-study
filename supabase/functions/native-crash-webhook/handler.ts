// Sentry internal-integration HMAC over exact request bytes. No raw report is logged.
export async function nativeCrashWebhook(request: Request, options: { secret: string; project: string; store: (row: Record<string, unknown>) => Promise<boolean> }) {
  if (request.method !== 'POST') return new Response(null, {status:405})
  if (!options.secret || !options.project) return new Response(null,{status:503})
  const signature=request.headers.get('sentry-hook-signature')??''
  if (!/^[0-9a-f]{64}$/i.test(signature)) return new Response(null,{status:401})
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400})
  const parts: Uint8Array[]=[];let size=0
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return new Response(null,{status:413})}parts.push(value)}
  const body=new Uint8Array(size);let pos=0;for(const part of parts){body.set(part,pos);pos+=part.length}
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(options.secret),{name:'HMAC',hash:'SHA-256'},false,['verify'])
  const sig=Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16))
  if(!await crypto.subtle.verify('HMAC',key,sig,body))return new Response(null,{status:401})
  let payload;try{payload=JSON.parse(new TextDecoder().decode(body))}catch{return new Response(null,{status:400})}
  const project=payload?.data?.issue?.project?.id??payload?.data?.event?.project
  if(String(project)!==options.project)return new Response(null,{status:403})
  if(!['created','triggered'].includes(payload.action))return new Response(null,{status:204})
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',body))].map(x=>x.toString(16).padStart(2,'0')).join('')
  const release=payload?.data?.event?.release
  const row={event:'native_crash',role:'system',session_id:'server:sentry',user_id:null,student_id:null,path:null,
    meta:{incident_id:'sentry:'+hash,event_source:'browser_unclassified',app_host_kind:'native',provider:'sentry',
      provider_issue_id:/^[0-9]{1,30}$/.test(String(payload?.data?.issue?.id))?String(payload.data.issue.id):null,
      app_version:typeof release==='string' && /^[a-zA-Z0-9.@+_-]{1,80}$/.test(release)?release:null}}
  try { return new Response(null,{status:await options.store(row)?202:503}) } catch { return new Response(null,{status:503}) }
}
