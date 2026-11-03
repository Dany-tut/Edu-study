// The only public output is constructed from an allowlist. Never forward upstream JSON.
export const ROOT='https://edu-study-app.vercel.app';
export const BACKEND='https://igsdwvwiqnozgwczzycx.supabase.co';
export function snapshot({summary,probeOk,previous,now=new Date().toISOString()}) {
  const fresh = summary?.project==='iskra' && summary?.schema_version===1 && typeof summary.checked_at==='string'
    && Number.isFinite(Date.parse(summary.checked_at)) && Date.parse(now)-Date.parse(summary.checked_at)>=-60000 && Date.parse(now)-Date.parse(summary.checked_at)<180000;
  const observing=probeOk && fresh && summary.capture_error===false;
  const at=now;
  const state=(code,label)=>({code,label,at});
  return {schema_version:1,project:'iskra',name:'Искра',updated_at:now,
    last_checked_at:observing?summary.checked_at:previous?.last_checked_at??null,
    states:{monitor:state(observing?'observing':'error',observing?'Серверный монитор отвечает':'Проверка сервера не подтверждена'),
      telemetry:state('unknown','Сбор проверяется отдельно от доступности'),
      incident:state(observing && Number.isSafeInteger(summary.open_signals)&&summary.open_signals>0?'detected':'unknown',observing && summary.open_signals>0?'Есть сигналы для разбора':'Подтверждённого вывода о сбоях нет'),
      hotfix:state('none','Исправления требуют отдельного разбора'),release:state('not_started','Источник не управляет выпуском')},history:[]};
}
export async function probe(fetcher=fetch,key=process.env.ISKRA_PUBLISHABLE_KEY) {
  const json=async(url,init={})=>{const r=await fetcher(url,{...init,signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok)throw Error('probe_failed');return r.json()};
  // Fixed targets only: no URLs or credentials from a diagnostic event are used.
  const [release,version,html]=await Promise.all([json(ROOT+'/release.json'),json(ROOT+'/version.json'),fetcher(ROOT+'/',{signal:AbortSignal.timeout(10000),redirect:'error'})]);
  if(!html.ok || !(await html.text()).includes('id="root"') || !/^[0-9a-f]{40}$/.test(release.commit) || release.commit!==version.commit || release.version!==version.version || release.build!==version.build || release.environment!=='production')throw Error('release_probe_failed');
  if(!key)throw Error('missing_publishable_key');
  const summary=await json(BACKEND+'/rest/v1/rpc/iskra_monitor_summary',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}'});
  return {summary,probeOk:true};
}
