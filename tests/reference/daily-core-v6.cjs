const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const settings={initialCash:55,grossWage:150,living:115,netWage:35,days:7,cap:600,dailyFloor:360,goodDays:6,weeklyFloor:3390};
// Integer experience units: ordinary minute=5, matched minute=6. Happiness=units/6.
function task(id,name,duration,cost,freeGood,freeBad,paidNormal,paidGood,paidBad=freeBad){return {id,name,duration,cost,freeGood,freeBad,paidNormal,paidGood,paidBad};}
const types=[
 task('commute','公交通勤／打车',60,36,10,5,15,25),
 task('work','自己处理工作／购买任务协助',60,50,20,10,20,30),
 task('chores','自己日常清洁／预约局部清洁',30,25,10,5,10,15),
 task('lunch','自己准备午饭／预订工作餐',40,18,10,5,10,15),
 task('grocery','自己采购食材／食材配送',20,12,5,5,5,10),
 task('dinner','自己做饭用餐收拾／成品餐',60,20,15,5,15,20),
 task('parcel','自己退货／上门取件',20,10,5,5,5,10),
 task('breakfast','自己准备早餐／预订早餐',30,12,8,5,8,12),
 task('repair','自己排查台灯／预约维修',20,30,5,5,5,10),
 task('gift','自己包装礼物／店家代包',20,10,5,5,5,10),
 task('nextweek','自己整理次日用品／分类补给包',10,8,3,5,3,5),
 task('art','自己备画材／即用画材包',10,8,3,5,3,5),
];
const byId=Object.fromEntries(types.map(x=>[x.id,x]));
const fixed=(label,duration,extra={})=>({label,duration,...extra});
const action=(id,type=id)=>({id,type,duration:byId[type].duration,label:byId[type].name});
const schedules=Array.from({length:7},(_,d)=>{
 const day=d+1,rows=[day>=5?action('breakfast'):fixed('准备、吃早餐',30),fixed('洗漱、出门准备',30),action('outbound','commute'),fixed('上午工作',180),day>=2?action('lunch'):fixed('准备午饭、用餐',40),fixed('必要休息',20),fixed('下午固定工作',240),action('work'),fixed('日结工资',0,{pay:true}),action('inbound','commute'),day>=4?action('dinner'):fixed('做晚饭、用餐、洗碗',60),action('chores')];
 if(day===3)rows.push(action('grocery'));
 if(day===4)rows.push(action('parcel'));
 if(day===5)rows.push(action('repair'));
 if(day===6)rows.push(action('gift'));
 if(day===7)rows.push(action('nextweek'),action('art'));
 rows.push(fixed('洗澡、洗漱',15),fixed('自主时间',day<=2?75:55,{base:true}));return rows;
});
const dailyIds=schedules.map(rows=>rows.filter(r=>r.id).map(r=>r.id));
const rowFor=(day,id)=>schedules[day-1].find(r=>r.id===id);
const options=(t,paid)=>paid?[{delta:t.paidNormal,q:5,p:.35,kind:'normal'},{delta:t.paidGood,q:6,p:.4,kind:'good'},{delta:-t.paidBad,q:0,p:.25,kind:'bad'}]:[{delta:1,q:5,p:.175,kind:'normal'},{delta:2,q:5,p:.175,kind:'normal'},{delta:t.freeGood,q:6,p:.4,kind:'good'},{delta:-t.freeBad,q:0,p:.25,kind:'bad'}];
function step(s,e){const spare=e.delta-s.delay;return {delay:Math.max(0,-spare),earned:s.earned+Math.max(0,spare)*e.q};}
function finish(day,s){const base=day<=2?75:55;assert(s.delay<=base);return Math.min(settings.cap,s.earned+(base-s.delay)*5);}
function won(sum,good){return sum>=settings.weeklyFloor&&good>=settings.goodDays;}
function rng(seed){let v=seed>>>0;return()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};}
function pick(t,paid,r){const pool=options(t,paid);for(const e of pool){r-=e.p;if(r<0)return e;}return pool.at(-1);}
function carryFrom(day,id,e){if(day===3&&id==='grocery'&&e.kind==='good')return -5;if(day===5&&id==='repair'&&e.kind==='bad')return 5;return 0;}
// A salary is one atomic +35 transaction, unlocked only at actual work completion.
function wallet(){return {cash:settings.initialCash,paidDays:[],selected:[],spent:0};}
function settle(w,day,workComplete){assert(day>=1&&day<=7);if(!workComplete||w.paidDays.includes(day))return false;assert.equal(day,w.paidDays.length+1);w.cash+=settings.netWage;w.paidDays.push(day);return true;}
function select(w,day,id,paid){const row=rowFor(day,id);assert(row);const key=day+':'+id;if(w.selected.includes(key))return false;const cost=paid?byId[row.type].cost:0;if(w.cash<cost)return false;w.cash-=cost;w.spent+=cost;w.selected.push(key);return true;}
function choose(policy,day,id,t,cash,state,left,r){
 if(policy==='free')return false;
 if(policy==='buyAllAffordable')return true;
 if(policy==='late')return day>=5;
 if(policy==='random35')return r<.35;
 if(policy==='cheap')return t.cost<=20;
 if(policy==='need')return finish(day,step(state,{delta:left*2,q:5}))<450&&t.cost<=25&&cash-t.cost>=10;
 throw Error(policy);
}
function simulate(policy,n,seed=20261028){
 const random=rng(seed);let wins=0,sumH=0,totalSpent=0,lowWins=0;const closing=Array(7).fill(0);const samples=[];
 for(let run=0;run<n;run++){
  let cash=settings.initialCash,sum=0,good=0,spent=0,carry=0,earlyLow=0;const scores=[];
  for(let day=1;day<=7;day++){
   let s={delay:carry>0?carry:0,earned:0},next=0,left=dailyIds[day-1].length;
   for(const row of schedules[day-1]){
    if(row.pay){cash+=settings.netWage;continue;}
    if(!row.id)continue;
    let bonus=day===4&&row.id==='dinner'&&carry<0?5:0;
    const t=byId[row.type],rChoice=random(),rOutcome=random();
    const paid=choose(policy,day,row.id,t,cash,s,--left,rChoice)&&cash>=t.cost;
    if(paid){cash-=t.cost;spent+=t.cost;}
    const e=pick(t,paid,rOutcome);
    // Ingredient prep saves 5 ordinary minutes AFTER the dinner's own result; no duplicate bonus.
    s=step(s,e);if(bonus)s=step(s,{delta:bonus,q:5});
    next=carryFrom(day,row.id,e)||next;
   }
   const score=finish(day,s);scores.push(score);sum+=score;if(score>=settings.dailyFloor)good++;else if(day<=4)earlyLow++;
   carry=next;closing[day-1]+=cash;
  }
  assert.equal(cash+spent,settings.initialCash+7*settings.netWage);assert(cash>=0);
  if(won(sum,good)){wins++;if(earlyLow>=2)lowWins++;}
  sumH+=sum/6;totalSpent+=spent;if(run<10)samples.push(scores);
 }
 assert.equal(lowWins,0);const p=wins/n;
 return {policy,n,seed,winRate:p,approx95:[p-1.96*Math.sqrt(p*(1-p)/n),p+1.96*Math.sqrt(p*(1-p)/n)],meanH:sumH/n,meanSpent:totalSpent/n,meanClosing:closing.map(x=>x/n),invalidLowDayWins:lowWins};
}
// Independent clock implementation, cross-checked against an integer state enumeration.
function clockStep(actual,planned,row,e,bonus=0){
 const end=planned+row.duration,completed=actual+row.duration-e.delta-bonus;
 const saved=Math.max(0,end-completed),ownSaved=Math.max(0,saved-bonus);
 return {actual:Math.max(end,completed),units:ownSaved*e.q+(saved-ownSaved)*5,end};
}
function audit(){
 let statesChecked=0,maxFinalDelay=[];
 for(const t of types)for(const paid of [false,true]){const pool=options(t,paid);assert(Math.abs(pool.reduce((n,e)=>n+e.p,0)-1)<1e-12);for(const e of pool){assert(t.duration-e.delta>=0);assert(Number.isInteger(e.delta));}}
 for(let day=1;day<=7;day++){
  const rows=schedules[day-1],base=day<=2?75:55;assert.equal(rows.reduce((n,r)=>n+r.duration,0),900);
  assert.equal(rows.filter(r=>r.pay).length,1);assert.deepEqual(rows.filter(r=>['outbound','inbound','work','chores'].includes(r.id)).map(r=>r.id),['outbound','work','inbound','chores']);
  for(const carry of (day===4?[0,-5]:day===6?[0,5]:[0])){
   let states=new Map([[`${Math.max(carry,0)}:0`,{delay:Math.max(carry,0),earned:0}]]),planned=420;
   for(const row of rows){
    if(row.base){for(const s of states.values()){assert(s.delay<=base);assert.equal(finish(day,s),Math.min(600,s.earned+(1320-(planned+s.delay))*5));}planned+=row.duration;continue;}
    const t=row.id&&byId[row.type],pool=t?[...options(t,false),...options(t,true)]:[{delta:0,q:0}];
    const bonus=day===4&&row.id==='dinner'&&carry<0?5:0,next=new Map();
    for(const s of states.values())for(const e of pool){
     let out=step(s,e);if(bonus)out=step(out,{delta:bonus,q:5});
     const clock=clockStep(planned+s.delay,planned,row,e,bonus);
     assert.equal(out.delay,clock.actual-clock.end);assert.equal(out.earned,s.earned+clock.units);statesChecked++;
     if(row.pay)assert.equal(clock.actual,1080+out.delay);
     next.set(`${out.delay}:${out.earned}`,out);
    }
    planned+=row.duration;states=next;
   }
   assert.equal(planned,1320);maxFinalDelay.push({day,carry,maxDelay:Math.max(...[...states.values()].map(s=>s.delay)),base});
  }
 }
 let w=wallet();assert(!settle(w,1,false));assert(select(w,1,'outbound',true));assert.equal(w.cash,19);assert(!select(w,1,'outbound',true));assert(!select(w,1,'work',true));assert.equal(w.cash,19);assert(select(w,1,'work',false));assert(settle(w,1,true));assert.equal(w.cash,54);assert(!settle(w,1,true));w=JSON.parse(JSON.stringify(w));assert(!settle(w,1,true));
 // Exhaustive reachable cash states at every choice and payday across the whole week.
 let balances=new Set([settings.initialCash]),moneyTransitions=0;
 for(let day=1;day<=7;day++)for(const row of schedules[day-1]){
  if(row.pay)balances=new Set([...balances].map(c=>c+settings.netWage));
  if(!row.id)continue;const price=byId[row.type].cost,next=new Set(balances);
  for(const c of balances){assert(c>=0);if(c>=price){next.add(c-price);moneyTransitions++;}}
  balances=next;
 }
 assert.equal(Math.max(...balances),300);assert(!won(3400,5));assert(won(settings.weeklyFloor,6));assert(!won(settings.weeklyFloor-1,6));
 return {statesChecked,moneyTransitions,maxFinalDelay,finalCashStates:balances.size,nonnegativeBalances:true};
}
if(require.main===module){const n=Number(process.env.V6_RUNS||30000);const result={settings,audit:audit(),policies:['free','random35','cheap','need','buyAllAffordable','late'].map(p=>simulate(p,n))};fs.writeFileSync(path.join(__dirname,'daily-core-v6-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}
module.exports={settings,types,byId,schedules,dailyIds,options,step,finish,won,simulate,audit,wallet,settle,select};
