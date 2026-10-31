(function(root){
  'use strict';
  const D=typeof module!=='undefined'&&module.exports?require('./data.js'):root.GameData;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const base=day=>day<=2?75:55;
  function create(seed){return {version:D.version,id:`run-${Date.now()}-${seed>>>0}`,rng:seed>>>0,day:1,index:0,phase:'overview',stage:'ready',cash:55,spent:0,delay:0,units:0,real:0,pending:null,current:null,days:[],events:[],money:[],effects:[],rev:0};}
  const row=s=>D.schedules[s.day-1][s.index];
  const token=s=>`${s.day}:${s.index}:${s.phase}:${s.stage}`;
  const options=(type,paid)=>{const t=D.byId[type];return paid?[{kind:'normal',delta:t.paidNormal,q:5,p:.35},{kind:'good',delta:t.paidGood,q:6,p:.385},{kind:'bad',delta:-t.paidBad,q:0,p:.265}]:[{kind:'normal',delta:1,q:5,p:.175},{kind:'normal',delta:2,q:5,p:.175},{kind:'good',delta:t.freeGood,q:6,p:.385},{kind:'bad',delta:-t.freeBad,q:0,p:.265}];};
  function random(s){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
  function draw(type,paid,r){const pool=options(type,paid);let p=0;return {...(pool.find(e=>(p+=Math.round(e.p*10000))>r*10000)||pool.at(-1))};}
  function applyTime(s,e){const before=s.delay, spare=Math.max(0,e.delta-before);s.delay=Math.max(0,before-e.delta);s.units+=spare*e.q;s.real+=spare;return {caught:Math.min(before,Math.max(0,e.delta)),spare,added:spare*e.q,delayBefore:before,delayAfter:s.delay};}
  function totals(s){const sum=s.days.reduce((a,d)=>a+d.score,0),good=s.days.filter(d=>d.score>=360).length;return {sum,good,won:s.days.length===7&&sum>=3390&&good>=6&&s.cash>=0,impossible:s.days.filter(d=>d.score<360).length>=2};}
  function reduce(input,action){
    // A stale UI action cannot apply to the next node (including double clicks).
    if(action.token!==token(input))return input;
    const s=copy(input),r=row(s);
    if(action.type==='begin'&&s.phase==='overview'){s.phase='play';}
    else if(action.type==='choose'&&s.phase==='play'&&s.stage==='ready'&&(r.choice||(r.id&&r.id!=='work'))){
      const type=r.choice||r.type,t=D.byId[type],cost=action.paid?t.cost:0;
      if(s.cash<cost)return input;
      const outcome=draw(type,!!action.paid,random(s));
      const record={key:r.key,day:s.day,node:s.index,type,label:r.label,paid:!!action.paid,cost,...outcome,revealed:false,resolved:false};
      s.cash-=cost;s.spent+=cost;
      if(cost)s.money.push({key:r.key,day:s.day,label:action.paid?t.paid:t.free,amount:-cost,balance:s.cash,time:r.start+s.delay});
      s.current=record;s.stage='draw';
      if(r.choice)s.pending=copy(record);
    }
    else if(action.type==='reveal'&&s.phase==='play'&&s.stage==='draw'){
      s.current.revealed=true;s.stage='result';if(r.choice)s.pending.revealed=true;
    }
    else if(action.type==='advance'&&s.phase==='play'){
      const choice=r.choice||(r.id&&r.id!=='work');
      if(choice&&s.stage!=='result')return input;
      if(!choice&&s.stage!=='ready')return input;
      const actualStart=r.start+s.delay;
      if(r.base){
        if(s.delay>base(s.day))throw Error('日程超出睡眠边界，请检查配置。');
        const night=base(s.day)-s.delay,score=Math.min(600,s.units+5*night);
        s.days.push({day:s.day,score,real:s.real+night,experience:(s.units+5*night)/5,gapReal:s.real,gapUnits:s.units,night,delay:s.delay,base:base(s.day),spent:s.money.filter(m=>m.day===s.day&&m.amount<0).reduce((n,m)=>n-m.amount,0),cash:s.cash});
        s.events.push({key:r.key,day:s.day,label:r.label,start:actualStart,end:1320,base:true,real:night});
        s.phase='day';s.current=null;
      }else if(r.choice){
        s.events.push({...s.current,start:actualStart,end:actualStart,locked:true});
        s.index++;s.current=null;s.stage='ready';
      }else{
        let event={key:r.key,day:s.day,label:r.label,start:actualStart,plannedStart:r.start,plannedEnd:r.end};
        if(r.pay){
          if(!s.events.some(e=>e.day===s.day&&e.type==='work'&&e.resolved))throw Error('工作尚未完成。');
          if(!s.money.some(m=>m.key===r.key)){s.cash+=35;s.money.push({key:r.key,day:s.day,label:'工资150 − 基础生活费115',amount:35,balance:s.cash,time:actualStart});}
          event.pay=true;
        }else if(r.id){
          const e=r.id==='work'?s.pending:s.current;if(!e)throw Error('缺少已锁定的结果。');
          event={...event,...e,key:r.key,start:actualStart,...applyTime(s,e),resolved:true,workDuration:r.id==='work'?480-e.delta:undefined};
          if(r.id==='work')s.pending=null;
          if(s.day===4&&r.id==='dinner'){
            const bonus=s.effects.find(e=>e.type==='prep'&&!e.used);
            if(bonus){event.bonus=applyTime(s,{delta:5,q:5});bonus.used=true;}
          }
          if(s.day===3&&r.id==='grocery'&&e.kind==='good')s.effects.push({type:'prep',from:r.key,day:4,used:false});
          if(s.day===5&&r.id==='repair'&&e.kind==='bad')s.effects.push({type:'repair',from:r.key,day:6,used:false});
        }
        event.end=r.end+s.delay;
        // End includes the enjoyed gap up to the original boundary; no double advance.
        event.completedAt=r.id?actualStart+r.duration-event.delta-(event.bonus?5:0):event.end;
        s.events.push(event);s.index++;s.current=null;s.stage='ready';
      }
    }
    else if(action.type==='next'&&s.phase==='day'){
      if(s.day===7){s.phase='week';}
      else{
        s.day++;s.index=0;s.phase='overview';s.stage='ready';s.delay=0;s.real=0;s.units=0;s.current=null;s.pending=null;
        const carry=s.effects.find(e=>e.type==='repair'&&e.day===s.day&&!e.used);
        if(carry){s.delay=5;carry.used=true;s.events.push({key:`carry-${s.day}`,day:s.day,label:'台灯复查（昨日影响）',start:420,end:425,delta:-5,delayAfter:5,carry:true});}
      }
    }else return input;
    s.rev++;return s;
  }
  function validate(s){
    if(!s||s.version!==D.version||!Number.isInteger(s.day)||s.day<1||s.day>7||!Number.isInteger(s.index)||!D.schedules[s.day-1][s.index])throw Error('这是旧概率版本的存档或日程不兼容；请先导出备份，再开始新局。');
    if(!['overview','play','day','week'].includes(s.phase)||!['ready','draw','result'].includes(s.stage))throw Error('存档阶段无效。');
    for(const k of ['cash','spent','delay','units','real','rev','rng'])if(!Number.isInteger(s[k])||s[k]<0)throw Error('存档数值无效。');
    for(const k of ['days','events','money','effects'])if(!Array.isArray(s[k]))throw Error('存档不完整。');
    if(s.delay>base(s.day)||s.money.reduce((v,m)=>v+m.amount,55)!==s.cash||s.money.filter(m=>m.amount<0).reduce((v,m)=>v-m.amount,0)!==s.spent)throw Error('存档账本不一致。');
    if(new Set(s.money.map(m=>m.key)).size!==s.money.length)throw Error('存档交易重复。');
    if(s.days.some((d,i)=>d.day!==i+1||!Number.isInteger(d.score)||d.score<0||d.score>600))throw Error('日结记录无效。');
    if(s.days.length!==s.day-(['day','week'].includes(s.phase)?0:1))throw Error('日结进度无效。');
    if(s.stage!=='ready'&&(!s.current||s.current.key!==row(s).key))throw Error('锁定卡面缺失。');
    return s;
  }
  const api={create,row,token,options,draw,applyTime,reduce,totals,validate,base};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
