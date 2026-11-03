(async()=>{
 const {page,fs}=qa;
 await page.setViewportSize({width:1440,height:900});
 await page.unroute(qa.financeMatch,qa.financeHandler);
 qa.paymentTestNote='QA payment fixed '+Date.now();
 await page.getByPlaceholder('Перевод на карту...',{exact:true}).fill(qa.paymentTestNote);
 await page.getByRole('button',{name:'Сохранить платёж',exact:true}).click();
 await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.getByText('2 000 ₽',{exact:true}).first().waitFor();
 const afterCreate=(await page.locator('body').innerText()).slice(0,1200);
 await page.getByText('Оплачено',{exact:true}).click();
 await page.getByText('QA Ученик через интерфейс',{exact:true}).click();
 const note=page.getByText(qa.paymentTestNote,{exact:false});await note.waitFor();
 await page.screenshot({path:'/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03/payment-created.png',fullPage:true});
 await note.locator('..').locator('..').getByRole('button').click();
 await page.getByText('1 000 ₽',{exact:true}).first().waitFor();
 await page.getByText('История платежей пуста',{exact:true}).waitFor();
 const result={scope:'Real local payment record through UI; selected synthetic student; test record deleted through UI; no payment provider',createdWithExpectedAmount:true,summaryUpdatedAfterCreate:true,summaryUpdatedAfterDelete:true,note:qa.paymentTestNote,afterCreate,afterDelete:(await page.locator('body').innerText()).slice(0,1200)};
 await fs.writeFile('/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03/finance-crud.json',JSON.stringify(result,null,2));
 return result;
})()
