const path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const url='file:///'+path.join(__dirname,'../dist/index.html').replace(/\\/g,'/');await page.goto(url);
  const fixture=await page.evaluate(()=>{
   const E=GameEngine;let s=E.create(123);
   while(!(s.phase==='day'&&s.day===2)){
    let type=s.phase==='overview'?'begin':s.phase==='day'?'next':s.stage==='draw'?'reveal':s.stage==='result'?'advance':(E.row(s).choice||(E.row(s).id&&E.row(s).id!=='work'))?'choose':'advance';
    s=E.reduce(s,{type,token:E.token(s),paid:false});
    if(type==='choose'){Object.assign(s.current,{kind:'bad',delta:-GameData.byId[s.current.type].freeBad,q:0});if(s.pending)Object.assign(s.pending,{kind:'bad',delta:-10,q:0});}
   }return s;
  });
  const open=async scores=>{const s=structuredClone(fixture);s.days.forEach((d,i)=>d.score=scores[i]);await page.evaluate(s=>localStorage.setItem('time-poverty-prd1-v7-save',JSON.stringify(s)),s);await page.reload();await page.locator('[data-action="continue"]').click();};
  await open([359,360]);assert.equal(await page.locator('dialog[open]').count(),0,'60 counts as qualifying; one low day must not prompt');
  await open([359,359]);await page.waitForSelector('dialog[open]');assert((await page.locator('dialog').innerText()).includes('第 1 天和第 2 天'));
  await page.locator('dialog [data-action="close"]').first().click();assert.equal(await page.locator('dialog[open]').count(),0);
  await page.reload();await page.locator('[data-action="continue"]').click();await page.waitForSelector('dialog[open]');
  await page.locator('dialog [data-action="confirm-new"]').click();await page.waitForSelector('.overview-grid');
  const fresh=await page.evaluate(()=>JSON.parse(localStorage.getItem('time-poverty-prd1-v7-save')));assert.equal(fresh.day,1);assert.equal(fresh.cash,55);assert.equal(fresh.days.length,0);assert.equal(await page.locator('dialog[open]').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS: first low day / exact 60 no prompt; second low day prompts; reload restores prompt; restart resets to day 1 with 55 yuan.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
