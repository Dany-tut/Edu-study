(async()=>{
 const {page,fs}=qa;qa.newScheduleTitle='QA Journal refresh '+Date.now();
 await page.evaluate(()=>{window.__qaFocusCount=0;window.addEventListener('focus',()=>window.__qaFocusCount++)});
 await page.getByRole('button',{name:'Действия',exact:true}).click();await page.getByText('Создать урок',{exact:true}).click();
 await page.getByRole('button',{name:'Группа или ученик',exact:true}).click();
 await page.getByText('QA Бета — группа через UI',{exact:true}).click();
 await page.getByRole('button',{name:'Готово',exact:true}).click();
 await page.getByPlaceholder('Например: Основные оксиды',{exact:true}).fill(qa.newScheduleTitle);
 await page.getByRole('button',{name:'—',exact:true}).first().click();await page.getByRole('button',{name:'14:00',exact:true}).click();
 await page.getByRole('button',{name:'—',exact:true}).last().click();await page.getByRole('button',{name:'15:00',exact:true}).last().click();
 await page.getByRole('radio',{name:'Опубликовать',exact:true}).click();await page.getByRole('radio',{name:'Опубликован',exact:true}).waitFor();
 await page.waitForTimeout(1800);
 await page.getByRole('button',{name:/^Журнал/}).first().click();
 if(!await page.getByRole('button',{name:/^QA Бета — группа через UI/}).count())await page.getByRole('button',{name:'Группы',exact:true}).last().click();
 await page.getByRole('button',{name:/^QA Бета — группа через UI/}).click();
 await page.locator('select').selectOption('*');await page.getByRole('button',{name:'Посещаемость',exact:true}).click();
 await page.getByRole('button',{name:'Оценки за урок · '+qa.newScheduleTitle,exact:true}).waitFor();
 const result={title:qa.newScheduleTitle,visibleWithoutReload:true,windowFocusEvents:await page.evaluate(()=>window.__qaFocusCount)};
 await fs.writeFile('/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03/journal-refresh.json',JSON.stringify(result,null,2));
 await page.screenshot({path:'/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03/journal-refreshed.png',fullPage:true});return result;
})()
