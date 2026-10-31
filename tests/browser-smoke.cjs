// Optional integration QA using an existing Playwright installation and Microsoft Edge.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const playwrightPath=process.env.PLAYWRIGHT_MODULE_PATH||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {chromium}=require(playwrightPath);
const out=path.join(__dirname,'../qa');fs.mkdirSync(out,{recursive:true});
const KEY='time-poverty-prd1-v7-save';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1050},deviceScaleFactor:1});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
 const click=async action=>{await page.locator(`[data-action="${action}"]`).first().click();};
 const transition=async action=>{const s=await read();await click(action);await page.waitForFunction(({key,rev})=>JSON.parse(localStorage.getItem(key)).rev!==rev,{key:KEY,rev:s.rev});};
 await page.goto('http://127.0.0.1:4173');await page.screenshot({path:path.join(out,'01-title.png'),fullPage:true});
 await click('new');await page.waitForSelector('.overview-grid');await page.screenshot({path:path.join(out,'02-overview.png'),fullPage:true});
 await transition('begin');assert.equal((await read()).cash,55);await page.screenshot({path:path.join(out,'03-choice.png'),fullPage:true});
 // Choose bus, verify the saved card survives closing/reopening the page.
 await transition('choose');const locked=await read();await page.screenshot({path:path.join(out,'04-draw.png'),fullPage:true});
 await page.reload();await click('continue');assert.deepEqual(await read(),locked);
 await transition('reveal');await page.screenshot({path:path.join(out,'05-result.png'),fullPage:true});await transition('advance');
 assert.equal((await read()).index,3);await click('paid');await transition('choose');assert.equal((await read()).cash,5);
 await transition('reveal');await transition('advance');assert.equal((await read()).pending.cost,50);
 await page.screenshot({path:path.join(out,'06-work.png'),fullPage:true});
 // Play through all seven days entirely through real UI buttons.
 let guard=0,choiceCount=2,dayScreens=0;
 while((await read()).phase!=='week'){
   assert(++guard<300);const s=await read();
   if(s.phase==='overview'){await transition('begin');continue;}
   if(s.phase==='day'){
     if(!dayScreens++){await page.screenshot({path:path.join(out,'07-day-report.png'),fullPage:true});}
     await transition('next');continue;
   }
   if(s.stage==='draw'){await transition('reveal');continue;}
   if(s.stage==='result'){await transition('advance');continue;}
   if(await page.locator('[data-action="choose"]').count()){
     const price=await page.locator('[data-action="paid"] strong').innerText();
     const can=await page.locator('[data-action="paid"]').isEnabled();
     if(can&&Number(price.replace(/\D/g,''))<=20)await click('paid');
     await transition('choose');choiceCount++;
   }else await transition('advance');
 }
 const final=await read();assert.equal(final.days.length,7);assert.equal(choiceCount,47);assert.equal(final.cash+final.spent,300);
 assert.equal(final.money.filter(x=>x.amount===35).length,7);assert.equal(final.events.filter(x=>x.resolved).length,47);
 await page.screenshot({path:path.join(out,'08-week-report.png'),fullPage:true});
 await click('ledger');assert(await page.locator('dialog').isVisible());await click('close');await click('rules');assert(await page.locator('dialog').isVisible());await click('close');
 const [download]=await Promise.all([page.waitForEvent('download'),click('export')]);await download.saveAs(path.join(out,'qa-run.json'));
 // An unaffordable work option is disabled and the free option remains available.
 const second=await context.newPage();await second.goto('http://127.0.0.1:4173');
 await second.evaluate(k=>localStorage.setItem(k,JSON.stringify(GameEngine.create(12345))),KEY);await second.reload();
 await second.locator('[data-action="continue"]').click();await second.locator('[data-action="begin"]').click();
 await second.locator('[data-action="paid"]').click();await second.locator('[data-action="choose"]').click();await second.locator('[data-action="reveal"]').first().click();await second.locator('[data-action="advance"]').click();
 assert(await second.locator('[data-action="paid"]').isDisabled());assert(await second.locator('[data-action="free"]').isEnabled());
 await second.setViewportSize({width:390,height:844});await second.screenshot({path:path.join(out,'09-mobile.png'),fullPage:true});
 assert(await second.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Offline distribution needs no HTTP server, external fonts or dependencies.
 const offline=await context.newPage();offline.on('pageerror',e=>errors.push(e.message));
 await offline.goto('file:///'+path.join(__dirname,'../dist/index.html').replace(/\\/g,'/'));
 await offline.locator('[data-action="new"]').click();await offline.locator('[data-action="begin"]').click();await offline.waitForSelector('[data-action="choose"]');assert.equal(await offline.locator('[data-action="choose"]').count(),1);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({passed:true,choiceCount,scores:final.days.map(d=>d.score/6),money:final.cash,spent:final.spent,consoleErrors:errors,offline:true,mobileNoHorizontalOverflow:true},null,2));
 console.log(JSON.stringify({passed:true,choiceCount,scores:final.days.map(d=>d.score/6),cash:final.cash,spent:final.spent,offline:true,mobile:true,errors}));
 await browser.close();
})().catch(err=>{console.error(err);process.exit(1);});
