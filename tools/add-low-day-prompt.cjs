const fs=require('node:fs'),path=require('node:path');
const p=path.join(__dirname,'../dist/js/app.js');let s=fs.readFileSync(p,'utf8');
const needle='  function render(){';
if(!s.includes('function promptSecondLowDay')){
 s=s.replace(needle,`  const lowDayPrompts=new Set();
  function promptSecondLowDay(){
    if(home||!state||state.phase!=='day'||modal.open)return;
    const lows=state.days.filter(d=>d.score<360);
    const key=state.id+':'+state.day;
    if(lows.length!==2||lows[1].day!==state.day||lowDayPrompts.has(key))return;
    lowDayPrompts.add(key);
    dialog('再来一局，重新安排生活',\`<p>第 \${lows[0].day} 天和第 \${lows[1].day} 天的幸福值低于60分。</p><p>通关需要至少六天达到60分，出现第二个低分日后，本局已无法通关。试着重新安排下一局吧。</p><p class="fineprint">新开一局会覆盖当前进度，你可以先导出本局记录。</p><div class="modal-actions">\${button('重新开始一局','confirm-new')}\${button('导出本局记录','export','secondary')}\${button('先查看本局结算','close','text-button')}</div>\`);
  }
`+needle);
 s=s.replace('list.scrollTop=Math.max(0,current.offsetTop-list.offsetTop-120);}}','list.scrollTop=Math.max(0,current.offsetTop-list.offsetTop-120);}promptSecondLowDay();}');
 fs.writeFileSync(p,s);
}
