const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function edit(file,fn){const p=path.join(root,file);fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')));}
edit('dist/js/data.js',s=>s.replace("version:'prd1-v7-demo1'","version:'prd1-v7-demo2'"));
edit('dist/js/engine.js',s=>s.replaceAll('p:.4,','p:.385,').replaceAll('p:.25,','p:.265,').replace('存档版本或日程不兼容。','这是旧概率版本的存档或日程不兼容；请先导出备份，再开始新局。'));
edit('dist/js/app.js',s=>s.replaceAll('40%','38.5%').replaceAll('25%','26.5%').replaceAll('PRD 1.0 / 第七版','PRD 1.0 / 第七版 · 概率调整版').replaceAll('PRD1.0 第七版','PRD1.0 第七版 概率调整版'));
edit('tests/engine.test.cjs',s=>s.replaceAll('.749999','.734999').replaceAll(',paid,.75)',',paid,.735)'));
edit('README.md',s=>s.replace('数值沿用第七版。','价格、日程、计分与门槛沿用第七版；抽卡概率按本次试玩反馈调整。').replaceAll('正合心意40%、计划外25%','正合心意38.5%、计划外26.5%'));
edit('验收记录.md',s=>'本次概率调整：普通35%、符合需要38.5%、坏结果26.5%；存档版本升级，新概率需新开一局。旧存档保留供导出，不在进行中的旧局悄悄更改概率。\n\n'+s);
