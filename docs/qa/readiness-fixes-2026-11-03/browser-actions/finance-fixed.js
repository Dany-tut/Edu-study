(async()=>{
 const {page,fs,coreFx}=qa;const base='http://127.0.0.1:5297';
 await page.goto(base+'/#/teacher');
 await page.getByPlaceholder('Email',{exact:true}).fill(coreFx.accounts.teacherA.email);
 await page.getByPlaceholder('Пароль',{exact:true}).fill(coreFx.accounts.teacherA.password);
 await page.getByRole('button',{name:'Войти',exact:true}).click();
 await page.getByRole('button',{name:'Финансы',exact:true}).click();
 await page.getByRole('button',{name:'Платёж',exact:true}).click();
 qa.financeBefore=await page.locator('body').innerText();
 qa.explicitRecipient=await page.getByText('Выберите ученика',{exact:true}).isVisible();
 await page.getByText('Выберите ученика',{exact:true}).click();
 await page.getByPlaceholder('Выберите ученика',{exact:true}).fill('QA Ученик через интерфейс');
 await page.getByText('QA Ученик через интерфейс',{exact:true}).click();
 qa.financeRequests=[];
 qa.financeMatch=url=>url.hostname==='127.0.0.1'&&url.pathname==='/rest/v1/payments';
 qa.financeHandler=async route=>{
  if(route.request().method()!=='POST')return route.fallback();
  const body=route.request().postDataJSON();qa.financeRequests.push(Array.isArray(body)?body[0]:body);
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:'QA_FAILURE',message:'Synthetic offline; not persisted'})});
 };
 await page.route(qa.financeMatch,qa.financeHandler);
 const results=[];
 for(const value of ['-100','100.50','1e3','2147483648']){
  await page.getByPlaceholder('4 500',{exact:true}).fill(value);
  await page.getByRole('button',{name:'Сохранить платёж',exact:true}).click();
  await page.getByRole('alert').waitFor();
  results.push({input:value,requests:qa.financeRequests.length,retained:await page.getByPlaceholder('4 500',{exact:true}).inputValue()===value,error:await page.getByRole('alert').innerText()});
 }
 await page.getByPlaceholder('4 500',{exact:true}).fill('1000');
 await page.getByPlaceholder('4',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Сохранить платёж',exact:true}).click();
 await page.getByText(/Не удалось подтвердить сохранение платежа/).waitFor();
 const state={scope:'Production frontend with actual Auth, explicit recipient; invalid inputs rejected without requests; valid POST intercepted before DB',explicitRecipient:qa.explicitRecipient,results,requests:qa.financeRequests,retained:await page.getByPlaceholder('4 500',{exact:true}).inputValue(),error:await page.getByRole('alert').innerText()};
 await fs.writeFile('/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03/finance-browser.json',JSON.stringify(state,null,2));
 return state;
})()
