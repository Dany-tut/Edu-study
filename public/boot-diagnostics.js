/* Runs before the entry module: no application imports, form values or error text. */
(() => {
  const key = document.currentScript?.dataset.key;
  if (!key || key.includes('%') || !['edu-study-app.vercel.app','localhost'].includes(location.hostname)) return;
  if (location.hostname === 'localhost' && !window.Capacitor?.isNativePlatform?.()) return;
  const storageKey = 'iskra:boot-outbox';
  // crypto.randomUUID — iOS 15.4+. Без запасного пути скрипт падал раньше, чем ставил слушатели, и старые телефоны были не видны.
  const uuid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID()}catch{}return Date.now().toString(36)+'-'+Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,'0')).join('')};
  let session;try { session=sessionStorage.getItem('analytics_session');if(!session){session=uuid();sessionStorage.setItem('analytics_session',session)} } catch {session=uuid()}
  let pending=[];try{const rows=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(rows))pending=rows.filter(x=>x?.event==='bootstrap_error' && x.role==='anon' && x.user_id===null && x.student_id===null && typeof x.meta?.incident_id==='string' && x.meta?.channel==='prebootstrap' && Date.now()-Date.parse(x.created_at)<86400000).slice(-20).map(x=>({event:'bootstrap_error',role:'anon',user_id:null,student_id:null,created_at:x.created_at,session_id:String(x.session_id).slice(0,80),path:null,meta:{incident_id:x.meta.incident_id.slice(0,80),channel:'prebootstrap',reason:'replayed_bootstrap_error',event_source:['qa','automation_suspected'].includes(x.meta.event_source)?x.meta.event_source:'browser_unclassified',app_host_kind:x.meta.app_host_kind==='native'?'native':'canonical_production'}}))}catch{}
  const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(pending.slice(-20)))}catch{}};
  let inflight=false;
  const flush=async()=>{if(inflight||!pending.length)return;inflight=true;const batch=[...pending];try{
    const r=await fetch('https://igsdwvwiqnozgwczzycx.supabase.co/rest/v1/analytics_events',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify(batch),keepalive:true});
    if(r.ok){const ids=new Set(batch.map(x=>x.meta.incident_id));pending=pending.filter(x=>!ids.has(x.meta.incident_id));persist()}
  }catch{}finally{inflight=false}};
  let sent=0;
  const report=(reason,asset)=>{if(sent++>=5)return;let qa=false;try{qa=sessionStorage.getItem('iskra:telemetry-source')==='qa'}catch{}
    const hash=location.hash.startsWith('#/')?location.hash.split(/[?&]/)[0].slice(0,180):'#/';
    pending.push({event:'bootstrap_error',created_at:new Date().toISOString(),role:'anon',user_id:null,student_id:null,session_id:session,path:hash,
      meta:{incident_id:uuid(),channel:'prebootstrap',reason,...(asset?{asset}:{}),event_source:qa?'qa':navigator.webdriver||/HeadlessChrome|Playwright/i.test(navigator.userAgent)?'automation_suspected':'browser_unclassified',app_host_kind:location.hostname==='edu-study-app.vercel.app'?'canonical_production':'native'}});
    pending=pending.slice(-20);persist();void flush();
  };
  const error=e=>{let asset;try{const name=new URL(e?.filename||e?.target?.src||location.href).pathname.split('/').pop();if(/^[a-zA-Z0-9_.-]{1,120}\.(js|css)$/.test(name))asset=name}catch{}report('entry_error',asset)};const rejection=()=>report('entry_rejection');
  window.addEventListener('error',error,true);window.addEventListener('unhandledrejection',rejection);
  const timer=setTimeout(()=>report('bootstrap_stalled'),20000);
  window.addEventListener('iskra:diagnostics-ready',()=>{clearTimeout(timer);window.removeEventListener('error',error,true);window.removeEventListener('unhandledrejection',rejection)},{once:true});
  window.addEventListener('online',()=>void flush());void flush();
})();
