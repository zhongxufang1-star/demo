const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../dist/js/data.js'),E=require('../dist/js/engine.js');
const a=(s,type,more={})=>E.reduce(s,{type,token:E.token(s),...more});
// Forced results are confined to the test runner. Production exposes no override.
function select(s,paid=false,outcome){s=a(s,'choose',{paid});if(outcome){Object.assign(s.current,outcome);if(E.row(s).choice)Object.assign(s.pending,outcome);}return a(a(s,'reveal'),'advance');}
function at(s,id){if(s.phase==='overview')s=a(s,'begin');while((E.row(s).choice||E.row(s).id)!==id){const r=E.row(s);s=r.id&&r.id!=='work'?select(s):a(s,'advance');}return s;}
function full(seed=7,policy=()=>false,override){let s=E.create(seed),guard=0;while(s.phase!=='week'){
  assert(++guard<1000);E.validate(s);
  if(s.phase==='overview')s=a(s,'begin');else if(s.phase==='day')s=a(s,'next');else{
    const r=E.row(s);
    if(r.choice||(r.id&&r.id!=='work')){const t=D.byId[r.choice||r.type];s=select(s,policy(s,r,t)&&s.cash>=t.cost,override?.(s,r));}
    else s=a(s,'advance');
  }
}E.validate(s);return s;}
test('AC01: exactly 47 choices; each day two paid commutes, whole work and chores; 900 awake minutes',()=>{
  assert.deepEqual(D.schedules.map(rs=>rs.filter(r=>r.choice||(r.id&&r.id!=='work')).length),[4,5,6,7,8,8,9]);
  D.schedules.forEach(rs=>{assert.equal(rs.reduce((v,r)=>v+r.duration,0),900);for(const id of ['outbound','inbound','chores'])assert(rs.find(r=>r.id===id));assert.equal(rs.filter(r=>r.choice==='work').length,1);assert.equal(rs.find(r=>r.am).duration+rs.find(r=>r.id==='work').duration,480);});
  assert.equal(D.byId.work.duration,480);
});
test('AC02/03: work payable once at 09:00; morning taxi can make it unaffordable',()=>{
  let s=at(E.create(2),'outbound');s=select(s,false,{kind:'normal',delta:2,q:5});s=at(s,'work');
  assert(E.row(s).choice);s=a(s,'choose',{paid:true});assert.equal(s.cash,5);assert.equal(s.units,10);assert.equal(s.pending.cost,50);
  const once=s;s=a(s,'choose',{paid:true});assert.strictEqual(s,once);
  let taxi=at(E.create(2),'outbound');taxi=select(taxi,true);taxi=at(taxi,'work');assert.equal(taxi.cash,19);assert.strictEqual(a(taxi,'choose',{paid:true}),taxi);assert.equal(a(taxi,'choose',{paid:false}).cash,19);
});
test('AC04: stale clicks cannot charge, advance, settle or score twice',()=>{
  let s=at(E.create(9),'outbound');const cmd={type:'choose',paid:true,token:E.token(s)};s=E.reduce(s,cmd);assert.equal(s.cash,19);assert.strictEqual(E.reduce(s,cmd),s);
  s=a(s,'reveal');const advance={type:'advance',token:E.token(s)};s=E.reduce(s,advance);assert.strictEqual(E.reduce(s,advance),s);
  let week=full(9);assert.equal(week.money.filter(m=>m.amount===35).length,7);assert.equal(new Set(week.money.map(m=>m.key)).size,week.money.length);assert.equal(week.cash+week.spent,300);
});
test('AC05/06/07: catch delay first; later delay preserves already enjoyed gaps',()=>{
  let s={delay:10,units:0,real:0};assert.deepEqual(E.applyTime(s,{delta:20,q:6}),{caught:10,spare:10,added:60,delayBefore:10,delayAfter:0});assert.equal(s.units,60);assert.equal(s.real,10);
  s={delay:10,units:0,real:0};E.applyTime(s,{delta:5,q:6});assert.equal(s.delay,5);assert.equal(s.units,0);
  s={delay:0,units:0,real:0};E.applyTime(s,{delta:10,q:5});E.applyTime(s,{delta:-5,q:0});assert.equal(s.units,50);assert.equal(s.real,10);assert.equal(s.delay,5);
});
test('AC08/09/10: integer thresholds, daily cap, no weekly compensation for two low days',()=>{
  let s=full(2,()=>true,()=>({kind:'good',delta:30,q:6}));assert(s.days.every(d=>d.score<=600));assert(s.days.some(d=>d.experience>120));
  const mock=scores=>({days:scores.map(score=>({score})),cash:0});
  assert(E.totals(mock([500,500,500,500,500,530,360])).won);
  assert(!E.totals(mock([500,500,500,500,500,529,360])).won);
  assert(!E.totals(mock([600,600,600,600,600,359,359])).won);
});
test('AC11/12: carry effects consumed once and do not repeat indefinitely',()=>{
  const good=full(8,()=>false,(s,r)=>({kind:'good',delta:D.byId[r.choice||r.type].freeGood,q:6}));
  const dinners=good.events.filter(e=>e.bonus);assert.equal(dinners.length,1);assert.equal(dinners[0].day,4);assert.equal(dinners[0].bonus.added,25);assert(good.effects.find(e=>e.type==='prep').used);
  const bad=full(8,()=>false,(s,r)=>({kind:'bad',delta:-D.byId[r.choice||r.type].freeBad,q:0}));
  const checks=bad.events.filter(e=>e.carry);assert.equal(checks.length,1);assert.equal(checks[0].day,6);assert.equal(checks[0].delta,-5);assert.equal(bad.effects.length,1);assert(bad.effects[0].used);
});
test('AC13/17: save/resume between every stage is deterministic; animations are outside engine',()=>{
  let s=E.create(20261031);while(s.phase!=='week'){
    const r=E.row(s);let action;
    if(s.phase==='overview')action={type:'begin'};else if(s.phase==='day')action={type:'next'};
    else if(s.stage==='draw')action={type:'reveal'};else if(s.stage==='result')action={type:'advance'};
    else if(r.choice||(r.id&&r.id!=='work'))action={type:'choose',paid:s.cash>=D.byId[r.choice||r.type].cost};else action={type:'advance'};
    action.token=E.token(s);const restored=E.validate(JSON.parse(JSON.stringify(s)));assert.deepEqual(E.reduce(restored,action),E.reduce(s,action));s=E.reduce(restored,action);
  }
});
test('AC14: weighted bucket boundaries and all 24 result configurations',()=>{
  for(const t of D.types)for(const paid of [false,true]){
    const opts=E.options(t.id,paid);assert.equal(opts.reduce((a,e)=>a+e.p,0),1);assert(opts.every(e=>t.duration-e.delta>0));
    assert.equal(E.draw(t.id,paid,0).kind,'normal');assert.equal(E.draw(t.id,paid,.349999).kind,'normal');assert.equal(E.draw(t.id,paid,.35).kind,'good');assert.equal(E.draw(t.id,paid,.734999).kind,'good');assert.equal(E.draw(t.id,paid,.735).kind,'bad');
    assert.equal(E.draw(t.id,false,.174999).delta,1);assert.equal(E.draw(t.id,false,.175).delta,2);
  }
});
test('AC15/16: worst days finish by sleep; free ordinary week has exact documented range',()=>{
  const bad=full(1,()=>false,(s,r)=>({kind:'bad',delta:-D.byId[r.choice||r.type].freeBad,q:0}));
  assert.deepEqual(bad.days.map(d=>d.delay),[25,30,35,40,45,50,50]);assert(bad.days.every(d=>d.night>=0));assert(bad.events.every(e=>e.end<=1320));
  const min=full(1,()=>false,()=>({kind:'normal',delta:1,q:5}));
  const max=full(1,()=>false,()=>({kind:'normal',delta:2,q:5}));
  assert.equal(E.totals(min).sum,2360);assert.equal(E.totals(max).sum,2595);assert(!E.totals(max).won);
});
test('PRD regression day 1: 110 actual, 116 experience, 580 score units, cash 40',()=>{
  const s=full(1,(s,r)=>s.day===1&&r.choice==='work',(s,r)=>s.day===1?{kind:r.choice?'good':'normal',delta:r.choice?30:r.id==='inbound'?1:2,q:r.choice?6:5}:{kind:'normal',delta:1,q:5});
  assert.deepEqual([s.days[0].real,s.days[0].experience,s.days[0].score,s.days[0].cash],[110,116,580,40]);
  assert.equal(s.money.filter(m=>m.day===1&&m.amount===-50).length,1);
});
test('Whole work resolves once, wage never early, salary exactly at 18:00 + outstanding delay',()=>{
  const s=full(20,()=>true);for(let day=1;day<=7;day++){
    const work=s.events.filter(e=>e.day===day&&e.type==='work'&&e.resolved);assert.equal(work.length,1);
    const wage=s.money.find(e=>e.day===day&&e.amount===35);assert.equal(wage.time,1080+work[0].delayAfter);assert(wage.time>=1080);
    const locked=s.events.find(e=>e.day===day&&e.locked);assert.equal(work[0].delta,locked.delta);assert.equal(work[0].workDuration,480-locked.delta);
  }
});
test('Randomized full runs agree with independent v7 time model; cash and record invariants',()=>{
  const reference=require('./reference/full-workday-v7.cjs');
  for(let seed=0;seed<300;seed++){
    const s=full(seed,(s,r,t)=>((seed+s.index+s.day)%3===0));
    let carry=0;
    for(let day=1;day<=7;day++){
      let time={delay:Math.max(0,carry),earned:0},next=0;
      for(const e of s.events.filter(e=>e.day===day&&e.resolved)){
        time=reference.step(time,e);
        if(day===4&&e.type==='dinner'&&carry<0)time=reference.step(time,{delta:5,q:5});
        if(day===3&&e.type==='grocery'&&e.kind==='good')next=-5;
        if(day===5&&e.type==='repair'&&e.kind==='bad')next=5;
      }
      assert.equal(s.days[day-1].score,reference.finish(day,time));carry=next;
    }
    assert.equal(s.cash+s.spent,300);assert.equal(s.events.filter(e=>e.resolved).length,47);assert(s.money.every(m=>m.balance>=0));
  }
});
test('Corrupt or incompatible saves are rejected instead of silently changing rules',()=>{
  const s=E.create(1);assert.throws(()=>E.validate({...s,version:'old'}));assert.throws(()=>E.validate({...s,cash:999}));assert.throws(()=>E.validate({...s,index:999}));assert.throws(()=>E.validate({...s,day:0}));
});
