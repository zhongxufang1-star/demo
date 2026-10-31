const fs=require('node:fs'),path=require('node:path');
const base=require('../tests/reference/daily-core-v6.cjs');
const model=require('../tests/reference/full-workday-v7.cjs');
const original=base.options;
const rows=[];
for(const [normal,good,bad] of [[.35,.385,.265]]){
 base.options=(t,paid)=>original(t,paid).map(e=>({...e,p:e.kind==='good'?good:e.kind==='bad'?bad:paid?normal:normal/2}));
 for(const policy of ['random35','cheap','need','buyAllAffordable']){
  const r=model.simulate(policy,100000,20261101);
  rows.push({normal,good,bad,policy,winRate:r.winRate,meanScore:r.meanH});
 }
}
fs.writeFileSync(path.join(__dirname,'../qa/probability-tuned.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows,null,2));
