// Optional: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs npm run test:browser
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dataDir=mkdtempSync(join(tmpdir(),'cstc-browser-'));
const {server,db}=createApp({dataDir,demo:true});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.status()>=400)console.log('HTTP failure',r.status(),new URL(r.url()).pathname,await r.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('button',{name:'Open demonstration'}).click();await page.getByRole('heading',{name:'Your studio, at a glance.'}).waitFor();
 await page.screenshot({path:'/tmp/cstc-dashboard.png',fullPage:true});
 for(const route of ['campaigns','content','calendar','audiences','assets','inquiries','analytics','brand','ads','settings']){
   await page.locator(`[data-nav="${route}"]`).click();await page.waitForTimeout(40);assert(await page.locator('h1').count()===1);
 }
 await page.getByRole('button',{name:'Configure workspace'}).click();
 await page.locator('[name="account-LinkedIn"]').fill('https://www.linkedin.com/company/test-example-only/');
 await page.locator('[name="verified-LinkedIn"]').check();await page.locator('[name="review-LinkedIn"]').fill('2026-11-24');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 const identity=async id=>{await page.locator('#identity').selectOption(id);await page.waitForFunction(id=>document.querySelector('#identity')?.value===id,id);await page.waitForTimeout(120);};
 await identity('author');await page.locator('[data-nav="audiences"]').click();await page.getByRole('button',{name:'New audience',exact:true}).click();await page.locator('[name=name]').fill('Browser audience');await page.locator('[name=assumptions]').fill('Illustrative recommendations');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.locator('[data-nav="campaigns"]').click();await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.locator('[name=name]').fill('Browser campaign');await page.locator('[name=offering]').fill('Safety training');await page.locator('[name=start]').fill('2026-11-24');await page.locator('[name=end]').fill('2026-12-24');await page.locator('[name=offeringConfirmed]').check();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.locator('article').filter({hasText:'Browser campaign'}).getByRole('button',{name:'Create platform drafts ↗'}).click();await page.locator('[name=idea]').fill('Browser coordinated idea');await page.locator('[name=confirm]').check();await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.locator('[data-nav="content"]').click();assert.equal(await page.getByRole('row').filter({hasText:'Browser coordinated idea'}).count(),4);await page.getByRole('button',{name:'Create content',exact:true}).click();
 await page.locator('[name=title]').fill('Browser workflow introduction');await page.locator('[name=caption]').fill('Ask CSTC about your team’s training options.');await page.locator('[name=factsConfirmed]').check();await page.locator('[name=reviewer]').selectOption('reviewer');await page.locator('[name=publisher]').selectOption('publisher');
 await page.locator('#tracking').click();await page.locator('[name=utm-destination]').fill('https://www.cstcsafety.com/?existing=preserved');await page.locator('#insert-utm').click();assert((await page.locator('[name=caption]').inputValue()).includes('existing=preserved&utm_source=linkedin'));
 await page.locator('[name=planned]').fill('2026-11-24T09:00:00-08:00');await page.locator('[name=deadline]').fill('2026-11-23T09:00:00-08:00');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Submit for review'}).waitFor();
 await page.getByRole('button',{name:'Submit for review'}).click();await page.getByRole('dialog').getByText('In Review',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Close dialog'}).click();await identity('reviewer');
 const open=async()=>{await page.locator('[data-nav="content"]').click();await page.getByRole('row').filter({hasText:'Browser workflow introduction'}).getByRole('button').click();};
 await open();await page.locator('#comment-form textarea').fill('Please make the invitation more specific.');await page.getByRole('button',{name:'Add comment',exact:true}).click();
 await page.getByRole('button',{name:'Request changes',exact:true}).click();await page.getByRole('dialog').getByText('Changes Requested',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();
 await identity('author');await open();await page.locator('[name=caption]').fill('Ask CSTC about bilingual safety training options for your team.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('button',{name:'Submit for review'}).click();await page.getByRole('dialog').getByText('In Review',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();
 await identity('reviewer');await open();await page.getByRole('button',{name:'Approve content',exact:true}).click();await page.getByRole('dialog').getByText('Approved',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();
 await identity('publisher');await open();await page.getByRole('button',{name:'Mark ready to post',exact:true}).click();await page.locator('#prepare').click();
 // Record a fictional URL in isolated test data. Never open a real platform or publish.
 await page.getByRole('heading',{name:'Final manual checklist',exact:true}).waitFor();await page.locator('#publication-form input[type=checkbox]').evaluateAll(els=>els.forEach(el=>el.click()));await page.locator('[name=liveUrl]').fill('https://www.linkedin.com/feed/update/test-browser-only');await page.getByRole('button',{name:'Record team-confirmed publication',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await identity('analyst');await page.locator('[data-nav="inquiries"]').click();await page.getByRole('button',{name:'Add inquiry',exact:true}).click();await page.locator('[name=contact]').fill('Browser test organization');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.locator('[data-nav="analytics"]').click();await page.getByRole('button',{name:'Record results',exact:true}).click();await page.locator('[name=impressions]').fill('0');await page.getByRole('button',{name:'Save changes',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await identity('reviewer');await page.locator('[data-nav="content"]').click();await page.getByRole('row').filter({hasText:'Meet your safety training partner'}).getByRole('button').click();await page.getByRole('button',{name:'Approve content',exact:true}).click();await page.getByRole('dialog').getByText('Approved',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();
 await identity('admin');await page.locator('[data-nav="settings"]').click();await page.getByRole('button',{name:'Explore queue simulation',exact:true}).click();await page.getByRole('button',{name:'Allow simulation steps',exact:true}).click();await page.getByRole('button',{name:'Queue simulated job',exact:true}).click();await page.getByRole('button',{name:'Start simulated attempt',exact:true}).click();await page.getByRole('button',{name:'Simulate uncertainty',exact:true}).click();await page.getByRole('button',{name:'Reconcile: not created',exact:true}).click();await page.getByRole('button',{name:'Retry same job safely',exact:true}).click();await page.getByRole('button',{name:'Start simulated attempt',exact:true}).click();await page.getByRole('button',{name:'Simulate confirmation',exact:true}).click();await page.getByRole('dialog').getByText('Simulated confirmation',{exact:true}).waitFor();await page.getByRole('button',{name:'Close dialog'}).click();
 await identity('analyst');await page.locator('[data-nav="analytics"]').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/cstc-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.getByRole('button',{name:'Toggle navigation'}).click();await page.locator('[data-nav="calendar"]').click();await page.getByRole('heading',{name:'Your shared content calendar.'}).waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: 10 routes, audience/campaign creation, four-platform drafting, tracking links, complete review/revision/publication workflow, inquiries, metrics, queue simulation and mobile layout; no browser errors.');
}finally{await browser.close();await new Promise(r=>server.close(r));db.close();rmSync(dataDir,{recursive:true,force:true});}
