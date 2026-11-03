(async()=>{
 const {page,fs}=qa;const results=[];qa.paymentRequests=[];
 await page.route(url=>url.hostname==='127.0.0.1'&&url.pathname==='/rest/v1/payments',async route=>{
  if(route.request().method()!=='POST')return route.fallback();
  const data=route.request().postDataJSON();qa.paymentRequests.push(Array.isArray(data)?data[0]:data);
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'QA_NETWORK_FAILURE',message:'Synthetic offline; no payment was recorded'})});
 });
 for(const value of ['-100','100.50','1e3','1000']){
  const count=qa.paymentRequests.length;
  await page.getByPlaceholder('4 500',{exact:true}).fill(value);
  await page.getByPlaceholder('4',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Сохранить платёж',exact:true}).click();
  for(let n=0;n<40&&qa.paymentRequests.length===count;n++)await page.waitForTimeout(50);
  await page.waitForTimeout(150);
  const sent=qa.paymentRequests[count];
  results.push({typed:value,requestAttempted:!!sent,amount:sent?.amount,lessonsPaid:sent?.lessons_paid,visibleError:await page.getByRole('alert').count()});
 }
 await page.screenshot({path:'/Users/dany/Cursor/student-dashboard/docs/qa/readiness-2026-11-03/payment-input.png',fullPage:true});
 const out={scope:'Actual UI and request construction; every payment POST intercepted before server and answered synthetic 503; no payment write reached database',results,recipientSelectionAvailable:false};
 await fs.writeFile('/Users/dany/Cursor/student-dashboard/docs/qa/readiness-2026-11-03/payment-input.json',JSON.stringify(out,null,2));
 await page.unrouteAll({behavior:'wait'});
 return out;
})()
