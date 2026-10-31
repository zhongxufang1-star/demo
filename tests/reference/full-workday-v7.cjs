const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const m=require('./daily-core-v6.cjs');
// Reuse tested time arithmetic, but select and charge the WHOLE workday at its start.
m.byId.work.duration=480;m.byId.work.name='全天工作自己完成／全天工作购买协助';
for(const rows of m.schedules){
 const am=rows.findIndex(r=>r.label==='上午工作');
 rows.splice(am,0,{label:'选择当天工作方式',duration:0,choice:'work'});
 const afternoon=rows.findIndex(r=>r.label==='下午固定工作');rows.splice(afternoon,1);
 const work=rows.find(r=>r.id==='work');work.duration=300;work.label='下午工作（沿用当天工作方式，结算全天结果）';
 rows.find(r=>r.label==='上午工作').label='上午工作（当天自做或付费协助方案）';
}
const settings=m.settings;
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};}
function draw(t,paid,r){const pool=m.options(t,paid);for(const e of pool){r-=e.p;if(r<0)return e;}return pool.at(-1);}
function desire(policy,day,t,cash,state,left,r,purchaseProbability=.35){
 if(policy==='free')return false;if(policy==='buyAllAffordable')return true;if(policy==='late')return day>=5;if(policy==='random35')return r<purchaseProbability;if(policy==='cheap')return t.cost<=20;
 if(policy==='need')return m.finish(day,m.step(state,{delta:left*2,q:5}))<450&&t.cost<=25&&cash-t.cost>=10;
 throw Error(policy);
}
function simulate(policy,n,seed=20261029,config={}){
 const random=rng(seed);let wins=0,totalH=0,totalSpent=0,invalid=0;const closings=Array(7).fill(0);
 const thresholds=config.thresholds||[],thresholdWins=thresholds.map(()=>0);let qualifyingWeeks=0,scoreAtMostCount=0,blockedPlanPurchases=0;
 for(let k=0;k<n;k++){
  let cash=55,sum=0,good=0,spent=0,carry=0,earlyLow=0;
  for(let day=1;day<=7;day++){
   const rows=m.schedules[day-1];let state={delay:Math.max(0,carry),earned:0},next=0,pending=null;
   for(let i=0;i<rows.length;i++){
    const row=rows[i];if(row.pay){cash+=35;continue;}
    if(!row.id&&!row.choice)continue;
    let e;
    if(row.id==='work'){assert(pending);e=pending;pending=null;}
    else {
     const t=m.byId[row.choice||row.type];const left=rows.slice(i+1).filter(x=>x.id).length-(row.choice?1:0);
     const a=random(),b=random();
     const want=config.plan?config.plan[day-1].includes(row.choice||row.id):desire(policy,day,t,cash,state,left,a,config.purchaseProbability??.35);
     if(config.plan&&want&&cash<t.cost)blockedPlanPurchases++;
     const paid=want&&cash>=t.cost;
     if(paid){cash-=t.cost;spent+=t.cost;}e=draw(t,paid,b);
     if(row.choice){assert.equal(pending,null);pending=e;continue;}
    }
    state=m.step(state,e);
    if(day===4&&row.id==='dinner'&&carry<0)state=m.step(state,{delta:5,q:5});
    if(day===3&&row.id==='grocery'&&e.kind==='good')next=-5;
    if(day===5&&row.id==='repair'&&e.kind==='bad')next=5;
   }
   assert.equal(pending,null);const h=m.finish(day,state);sum+=h;if(h>=360)good++;else if(day<=4)earlyLow++;
   carry=next;closings[day-1]+=cash;
  }
  assert(cash>=0);assert.equal(cash+spent,300);if(m.won(sum,good)){wins++;if(earlyLow>=2)invalid++;}totalH+=sum/6;totalSpent+=spent;
  if(good>=6){qualifyingWeeks++;thresholds.forEach((t,i)=>{if(sum>=t*6)thresholdWins[i]++;});}
  if(config.scoreCutoff!==undefined&&sum<=config.scoreCutoff*6)scoreAtMostCount++;
 }
 assert.equal(invalid,0);const p=wins/n;return {policy,n,seed,winRate:p,confidence95:[p-1.96*Math.sqrt(p*(1-p)/n),p+1.96*Math.sqrt(p*(1-p)/n)],meanH:totalH/n,meanSpent:totalSpent/n,meanClosing:closings.map(x=>x/n),invalidRecoveryWins:invalid,...(thresholds.length?{purchaseProbability:config.plan?null:config.purchaseProbability??.35,qualifyingWeekRate:qualifyingWeeks/n,thresholdResults:thresholds.map((t,i)=>({threshold:t,winRate:thresholdWins[i]/n}))}:{}),...(config.plan?{plan:config.plan,blockedPlanPurchases}:{}),...(config.scoreCutoff!==undefined?{scoreCutoff:config.scoreCutoff,scoreAtMostRate:scoreAtMostCount/n}:{})};
}
function audit(){
 const clock=m.audit();let cash=new Set([55]),transitions=0;
 for(let day=1;day<=7;day++){
  const rows=m.schedules[day-1];assert.equal(rows.filter(r=>r.choice==='work').length,1);assert.equal(rows.filter(r=>r.id==='work').length,1);
  const selectAt=rows.findIndex(r=>r.choice==='work'),resolveAt=rows.findIndex(r=>r.id==='work'),payAt=rows.findIndex(r=>r.pay);
  assert(selectAt<resolveAt&&resolveAt<payAt);assert.equal(rows.slice(0,selectAt).reduce((n,r)=>n+r.duration,420),540);
  assert.equal(rows[selectAt+1].duration+rows[resolveAt].duration,480);
  for(const row of rows){
   if(row.pay)cash=new Set([...cash].map(c=>c+35));
   if(row.id==='work'||(!row.id&&!row.choice))continue;
   const cost=m.byId[row.choice||row.type].cost,newCash=new Set(cash);for(const c of cash){assert(c>=0);if(c>=cost){newCash.add(c-cost);transitions++;}}cash=newCash;
  }
 }
 const w=m.wallet();assert(m.select(w,1,'outbound',false));assert(m.select(w,1,'work',true));assert.equal(w.cash,5);assert(!m.select(w,1,'work',true));assert.equal(w.cash,5);assert(!m.settle(w,1,false));assert(m.settle(w,1,true));assert.equal(w.cash,40);assert(!m.settle(w,1,true));
 for(const paid of [false,true])for(const e of m.options(m.byId.work,paid))assert.equal(180+300-e.delta,480-e.delta);
 assert.equal(Math.max(...cash),300);
 return {timeTransitions:clock.statesChecked,maxFinalDelay:clock.maxFinalDelay,moneyTransitions:transitions,finalCashStates:cash.size,oneWorkSelectionAndChargePerDay:true,allDays480MinutesBaselineWork:true};
}
if(require.main===module){const result={settings,audit:audit(),policies:['free','random35','cheap','need','buyAllAffordable','late'].map(p=>simulate(p,Number(process.env.V7_RUNS||1000000)))};fs.writeFileSync(path.join(__dirname,'full-workday-v7-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}
module.exports={...m,simulate,audit};
