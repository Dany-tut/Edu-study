export async function incidentContextRequest(request: Request, secret: string, load: ()=>Promise<unknown>) {
  if(request.method!=='POST')return new Response(null,{status:405})
  if(!secret)return new Response(null,{status:503})
  if(Number(request.headers.get('content-length')??0)>1024)return new Response(null,{status:413})
  const signature=request.headers.get('x-monitor-signature')??''
  if(!/^[0-9a-f]{64}$/i.test(signature))return new Response(null,{status:401})
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400})
  let text='';const decoder=new TextDecoder();let bytes=0
  while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>1024){await reader.cancel();return new Response(null,{status:413})}text+=decoder.decode(part.value,{stream:true})}text+=decoder.decode()
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify'])
  if(!await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16)),new TextEncoder().encode(text)))return new Response(null,{status:401})
  try {
    const payload=JSON.parse(text);if(typeof payload.at!=='number'||Math.abs(Date.now()-payload.at)>60000)return new Response(null,{status:401})
    return Response.json(await load(),{headers:{'Cache-Control':'no-store'}})
  }catch{return new Response(null,{status:503})}
}
