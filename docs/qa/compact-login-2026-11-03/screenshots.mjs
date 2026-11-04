import {chromium} from 'playwright'
const browser=await chromium.launch({channel:'chrome',headless:true})
const output=new URL('.',import.meta.url).pathname
for(const [width,height,label] of [[390,844,'mobile'],[1440,900,'desktop']]){
 const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'})
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 const page=await context.newPage()
 for(const [role,route] of [['teacher','teacher'],['student','login']]){
  await page.goto('http://127.0.0.1:5318/#/'+route);await page.getByRole('heading',{name:role==='teacher'?'Вход для препода':'Вход для ученика',exact:true}).waitFor();await page.locator('.auth-hero-art').evaluate(e=>e.decode());await page.waitForTimeout(250)
  await page.screenshot({path:output+role+'-'+label+'.png'})
  console.log(role,label,await page.locator('.auth-page-card').boundingBox())
 }
 await context.close()
}
await browser.close()
