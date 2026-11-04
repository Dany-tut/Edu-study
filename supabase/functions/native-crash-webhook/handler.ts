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
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return new Response(null,{status:400})
  if(!['created','triggered'].includes(payload.action))return new Response(null,{status:204})
  // Issue lifecycle notifications have no individual error: never invent a crash from them.
  const event=payload?.data?.event??payload?.data?.error
  const project=event?.project??payload?.data?.issue?.project?.id
  if(String(project)!==options.project)return new Response(null,{status:403})
  if(payload?.data?.issue?.project?.id!=null&&String(payload.data.issue.project.id)!==options.project)return new Response(null,{status:403})
  if(!event)return new Response(null,{status:204})
  if(typeof event.event_id!=='string'||!/^[a-f0-9]{32}$/i.test(event.event_id))return new Response(null,{status:422})
  // Delivery metadata, action and property order may differ for the same error.
  const identity=options.project+':'+event.event_id.toLowerCase()
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)))].map(x=>x.toString(16).padStart(2,'0')).join('')
  const tags=Array.isArray(event.tags)?event.tags:[]
  const tag=(name:string,allowed:string[],fallback:string)=>{
    const matches=tags.filter((pair:unknown)=>Array.isArray(pair)&&pair[0]===name)
    return matches.length===1&&allowed.includes(matches[0][1])?matches[0][1]:fallback
  }
  const native=['cocoa','java','native'].includes(event.platform)
  if(!native&&event.platform!=='javascript')return new Response(null,{status:422})
  const release=event.release
  const row={event:native?'native_crash':'js_error',role:'system',session_id:'server:sentry',user_id:null,student_id:null,path:null,
    meta:{incident_id:'sentry:'+hash,event_source:tag('event_source',['qa','automation_suspected','browser_unclassified'],'browser_unclassified'),
      app_host_kind:tag('app_host_kind',['canonical_production','local','other_host','native'],native?'native':'other_host'),provider:'sentry',
      provider_issue_id:/^[0-9]{1,30}$/.test(String(event.issue_id??payload?.data?.issue?.id))?String(event.issue_id??payload.data.issue.id):null,
      app_version:typeof release==='string' && /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,9}(·[a-f0-9]{7,40})?$/.test(release)?release:null}}
  try { return new Response(null,{status:await options.store(row)?202:503}) } catch { return new Response(null,{status:503}) }
}
