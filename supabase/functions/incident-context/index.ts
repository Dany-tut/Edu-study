import {incidentContextRequest} from './handler.ts'
Deno.serve((request:Request)=>incidentContextRequest(request,Deno.env.get('ISKRA_MONITOR_WORKER_SECRET')??'',async()=>{
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
 const r=await fetch('https://igsdwvwiqnozgwczzycx.supabase.co/rest/v1/rpc/iskra_monitor_agent_context',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)})
 if(!r.ok)throw Error('Context unavailable')
 return await r.json()
}))
