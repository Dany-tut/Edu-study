(() => {
  const samples = [];
  let initial = false;
  let waiting = false;
  let began = 0;
  let route = '';
  let fingerprint = '';
  const control = () => {
    const root = document.getElementById('root');
    const button = root && root.querySelector('button,input,[role="button"]');
    return root && button && button.getClientRects().length ? root : null;
  };
  function show() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource').filter(item => {
      const url = new URL(item.name);
      return url.origin === location.origin && url.pathname.endsWith('.js');
    });
    const payload = {
      origin: location.origin,
      navigation: navigation ? {domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),load:Math.round(navigation.loadEventEnd)} : null,
      paint: Object.fromEntries(paints.map(item => [item.name,Math.round(item.startTime)])),
      samples,
      js: {count:resources.length,decodedBytes:resources.reduce((sum,item)=>sum+item.decodedBodySize,0),transferBytes:resources.reduce((sum,item)=>sum+item.transferSize,0),files:resources.map(item=>({name:new URL(item.name).pathname.split('/').pop(),bytes:item.decodedBodySize,duration:Math.round(item.duration)}))}
    };
    let panel = document.getElementById('iskra-benchmark');
    if(!panel){panel=document.createElement('pre');panel.id='iskra-benchmark';panel.setAttribute('aria-label','Iskra benchmark');panel.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:999999;background:white;color:black;font:11px monospace;margin:0;max-height:260px;overflow:auto;border:1px solid #777;white-space:pre-wrap';document.body.append(panel)}
    panel.textContent = JSON.stringify(payload);
  }
  const observer = new MutationObserver(() => {
    const root = control();
    if(!root)return;
    const now = performance.now();
    if(!initial){initial=true;fingerprint=root.textContent;performance.mark('iskra-first-control');samples.push({route:location.hash,firstControl:Math.round(now)});setTimeout(show,1000);setTimeout(show,3000)}
    if(waiting && root.textContent!==fingerprint){waiting=false;samples.push({route,firstControlAfterHash:Math.round(now-began)});fingerprint=root.textContent;setTimeout(show,1000)}
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  addEventListener('hashchange',()=>{began=performance.now();waiting=true;route=location.hash;fingerprint=document.getElementById('root')?.textContent??''});
  setTimeout(()=>{if(!initial){samples.push({route:location.hash,error:'No visible control after 15s'});show()}},15000);
})();
