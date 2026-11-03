import {nativeCrashWebhook} from './handler.ts'
Deno.serve((request: Request)=>nativeCrashWebhook(request,{
  secret:Deno.env.get('SENTRY_WEBHOOK_SECRET')??'',project:Deno.env.get('SENTRY_PROJECT_ID')??'',
  store:async row=>{
    const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??''
    const response=await fetch('https://igsdwvwiqnozgwczzycx.supabase.co/rest/v1/analytics_events',{
      method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify(row),signal:AbortSignal.timeout(10000)})
    return response.ok
  },
}))
