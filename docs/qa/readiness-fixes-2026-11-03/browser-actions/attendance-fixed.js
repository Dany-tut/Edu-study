(async()=>{
 const {page,fs}=qa;const out='/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03';
 const dialog=()=>page.getByRole('dialog');const title='Оценки за урок · QA Занятие для проверки журнала';
 await dialog().getByRole('button',{name:'4',exact:true}).click();
 let arrived;const waiting=new Promise(r=>arrived=r);let release;const held=new Promise(r=>release=r);let posts=0;
 const handler=async route=>{posts++;arrived();await held;await route.fulfill({status:200,contentType:'application/json',body:'null'}).catch(()=>{})};
 await page.route('**/rest/v1/rpc/teacher_journal_save',handler);
 await dialog().getByRole('button',{name:'Сохранить',exact:true}).click();await waiting;
 await page.keyboard.press('Escape');await dialog().waitFor({state:'hidden'});
 await page.getByRole('button',{name:title,exact:true}).click();
 if(await dialog().getByRole('button',{name:'4',exact:true}).getAttribute('aria-pressed')!=='true')throw Error('Draft lost');
 release();await page.waitForTimeout(500);if(!await dialog().isVisible())throw Error('Late response closed new dialog');
 await page.unroute('**/rest/v1/rpc/teacher_journal_save',handler);
 const evidence=[];
 for(const [width,height] of [[1440,900],[320,568],[390,844]]){
 await page.setViewportSize({width,height});
 for(const position of ['start','middle','end']){
 const areas=await dialog().evaluate((d,pos)=>[...d.querySelectorAll('*')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+1).map(e=>{e.scrollTop=pos==='start'?0:pos==='end'?e.scrollHeight:(e.scrollHeight-e.clientHeight)/2;return {class:e.className,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}}),position);await page.waitForTimeout(100);await page.screenshot({path:`${out}/attendance-${width}-${position}.png`});evidence.push({width,height,position,areas});}}
 await dialog().getByRole('button',{name:'5',exact:true}).click();await dialog().getByRole('button',{name:'Отмена',exact:true}).click();await page.setViewportSize({width:1440,height:900});
 const result={cancelWhileSaving:true,draftRetained:true,lateResponseIgnored:true,interceptedPosts:posts,serverMutationSent:false,visual:evidence};await fs.writeFile(out+'/attendance-browser.json',JSON.stringify(result,null,2));return result;
})()
