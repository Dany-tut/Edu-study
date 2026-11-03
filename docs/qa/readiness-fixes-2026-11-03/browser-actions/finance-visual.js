(async()=>{
 const {page,fs}=qa;const out='/Users/dany/Cursor/student-dashboard/docs/qa/readiness-fixes-2026-11-03';const evidence=[];
 for(const [width,height] of [[1440,900],[320,568],[390,844]]){
  await page.setViewportSize({width,height});
  for(const position of ['start','middle','end']){
   const areas=await page.getByRole('dialog').evaluate((dialog,position)=>[...dialog.querySelectorAll('*')].filter(el=>/auto|scroll/.test(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+1).map(el=>{el.scrollTop=position==='start'?0:position==='end'?el.scrollHeight:(el.scrollHeight-el.clientHeight)/2;return {class:el.className,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight}}),position);
   await page.waitForTimeout(100);
   await page.screenshot({path:`${out}/finance-${width}-${position}.png`,fullPage:true});
   evidence.push({width,height,position,areas});
  }
 }
 await fs.writeFile(out+'/finance-visual.json',JSON.stringify(evidence,null,2));return evidence;
})()
