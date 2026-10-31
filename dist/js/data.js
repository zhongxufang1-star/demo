/* PRD 1.0 / 第七版。所有价格均为额外差价，时间单位为分钟。 */
(function (root) {
  const task = (id, name, free, paid, duration, cost, fg, fb, pn, pg, scene) => ({id, name, free, paid, duration, cost, freeGood:fg, freeBad:fb, paidNormal:pn, paidGood:pg, paidBad:fb, scene});
  const types = [
    task('commute','通勤','乘坐公交','打车出发',60,36,10,5,15,25,'commute'),
    task('work','全天工作','自己完成','购买全天协助',480,50,20,10,20,30,'office'),
    task('chores','日常清洁','自己打扫','预约局部清洁',30,25,10,5,10,15,'home'),
    task('lunch','准备午饭、用餐','自己准备午饭','预订工作餐',40,18,10,5,10,15,'kitchen'),
    task('grocery','采购食材','自己采购','食材配送',20,12,5,5,5,10,'errands'),
    task('dinner','晚饭、用餐、收拾','自己做饭收拾','购买成品餐',60,20,15,5,15,20,'kitchen'),
    task('parcel','退货快递','自己退货','预约上门取件',20,10,5,5,5,10,'errands'),
    task('breakfast','准备早餐、用餐','自己准备早餐','预订早餐',30,12,8,5,8,12,'kitchen'),
    task('repair','修理台灯','自己排查','预约维修',20,30,5,5,5,10,'home'),
    task('gift','包装礼物','自己包装','请店家代包',20,10,5,5,5,10,'home'),
    task('nextweek','整理次日用品','自己整理','分类补给包',10,8,3,5,3,5,'home'),
    task('art','准备画材','自己准备','即用画材包',10,8,3,5,3,5,'leisure')
  ];
  const byId = Object.fromEntries(types.map(t=>[t.id,t]));
  const themes = [
    ['先把今天过好','一趟公交，一张工位，一盏等你回家的灯。先试着给自己留一点时间。','四次选择，认识自己的时间与钱包。'],
    ['午饭也是一道选择题','饭要吃，午休也想要。今天开始，午饭可以换一种准备方式。','新增：午饭的免费与付费方案。'],
    ['冰箱发来了待办','成年人的冰箱不会自己补货。今晚采购，也可能帮到明天的自己。','新增：采购食材。晚间基础自由时间变为55分钟。'],
    ['生活不止一个待办','工作收工了，快递还没收工。安排晚饭，也安排那个拖了几天的包裹。','新增：成品餐与退货快递；采购的好结果可带来备菜收益。'],
    ['灯泡也需要被照顾','早饭、工作，还有罢工的台灯。小事排起队来，也是一整天。','新增：早餐方案与台灯维修。维修坏结果会影响下一天。'],
    ['给在意的人留一点时间','礼物不需要完美包装。重要的是，你也还留有打开生活的力气。','新增：礼物包装；处理昨天可能留下的台灯复查。'],
    ['把一点时间留给自己','忙完今天，别忘了那个想画画的自己。最后一天，照顾好这一小段时光。','新增：次日用品与画材准备。完成后查看七日回顾。']
  ];
  const schedules = Array.from({length:7},(_,d)=>{
    const day=d+1;
    const fixed=(label,duration,scene,extra={})=>({label,duration,scene,...extra});
    const action=(id,type=id,label)=>({id,type,label:label||byId[type].name,duration:byId[type].duration,scene:byId[type].scene});
    const rows=[day>=5?action('breakfast'):fixed('准备、吃早餐',30,'kitchen'),fixed('洗漱、出门准备',30,'wash'),action('outbound','commute','去程通勤'),fixed('选择全天工作方式',0,'office',{choice:'work'}),fixed('上午工作',180,'office',{am:true}),day>=2?action('lunch'):fixed('准备午饭、用餐',40,'kitchen'),fixed('必要午间休息',20,'leisure'),{...action('work'),label:'下午工作 · 结算全天结果',duration:300},fixed('日结工资',0,'office',{pay:true}),action('inbound','commute','返程通勤'),day>=4?action('dinner'):fixed('做晚饭、用餐、洗碗',60,'kitchen'),action('chores')];
    if(day===3) rows.push(action('grocery'));
    if(day===4) rows.push(action('parcel'));
    if(day===5) rows.push(action('repair'));
    if(day===6) rows.push(action('gift'));
    if(day===7) rows.push(action('nextweek'),action('art'));
    rows.push(fixed('洗澡、洗漱',15,'wash'),fixed('属于自己的时间',day<=2?75:55,'leisure',{base:true}));
    let time=420;
    return rows.map((r,i)=>{const row={...r,key:`d${day}-${i}`,start:time,end:time+r.duration}; time=row.end;return row;});
  });
  // 六列依次为：免费普通、免费好、免费坏、付费普通、付费好、付费坏。
  const stories = {
    commute:['车没开挂，你只是这次找对了出口。','一路绿灯，城市今天暂时没有为难你。','前方刹车灯排成了红色长龙，公交也加入了队伍。','司机走了熟悉的小路，导航终于不再叹气。','一路顺畅，车门一开就有了属于自己的空档。','打了车，但堵车并不区分会员等级。'],
    work:['任务清单少了一行，最终版暂时还是最终版。','同类任务一起处理，脑内标签页终于关掉了一排。','“最后再改一点点。”最终版开始繁殖了。','协助交接顺利，你的待办终于学会了分工。','搭档接得住任务，你终于不用同时扮演三个人。','协助变成答疑大会，你给自己的助手当起了助手。'],
    chores:['扫地、擦桌、倒垃圾，地板获得一次短暂胜利。','顺手收拾减少了重复劳动，拖把提前打卡。','刚收好的垃圾袋破了，地板申请重新开局。','清洁按约完成，房间终于能看见自己的地板。','沟通清楚，清洁利落，沙发正在认真邀请你坐下。','清洁范围需要重新确认，沟通也成了一项家务。'],
    lunch:['饭盒没有漏，微波炉也没有排长队。','备餐一气呵成，饭盒和你的胃达成了共识。','微波炉前排起小队，饭还没热，人先急了。','工作餐准时送达，备餐步骤从待办里消失。','餐盒准时又合胃口，午间终于有一小段余裕。','骑手在园区绕圈，你和午饭开始远程会师。'],
    grocery:['照着清单买，购物车没有自由发挥。','熟悉的货架都没挪位，食材顺手分了份。','常买的菜换了货架，超市变成寻宝地图。','配送按约到达，买菜这趟腿有人替你跑了。','食材齐全，分装顺手，明天的饭也有了着落。','袋里少了一样菜，联系客服成了隐藏菜谱。'],
    dinner:['锅没有糊，碗也洗完了，今日厨房平安。','熟悉的菜谱一路顺手，锅铲提前宣布下班。','盐和糖长得太像，厨房进入补救模式。','成品餐省去备菜开火，吃完收拾也很顺手。','餐点按时又省心，今天终于不用和锅铲加班。','漏送的餐具和取餐沟通，把省下的工夫要了回去。'],
    parcel:['退货码找得到，包裹也封得住。','快递点不排队，取件码一次就扫上了。','胶带封住了盒子，也顺便封住了退货码。','快递员按约上门，包裹终于搬出了玄关。','取件衔接顺畅，门一关，这件心事也关上了。','快递员走错单元，你和包裹一起等了一会儿。'],
    breakfast:['鸡蛋没煎糊，面包没掉地，早晨顺利启动。','昨晚备好的食材派上用场，早餐今天很配合。','水壶插头没插，等了半天的水保持冷静。','早餐按时拿到，早晨少了一轮锅碗协奏曲。','热乎的早餐准时到，今天可以从容一点出门。','取餐号叫错了，早餐在柜台进行了短暂社交。'],
    repair:['检查电源再拧一拧，台灯愿意继续合作。','发现只是接触松动，台灯重新找到了人生方向。','台灯亮了一下又暗了，明早还得复查。','维修按约完成，台灯恢复了工作态度。','师傅定位准确，灯亮起来，心里的待办也少了一项。','故障没有完全排除，师傅建议明早再检查一次。'],
    gift:['包装纸服帖，胶带这次没粘手。','尺寸一次裁对，蝴蝶结居然也听话。','包装纸短了一截，礼物看起来有点怕冷。','店家包得利落，你负责把心意带回家。','包装和心意刚好合拍，省下的时间也很温柔。','标签写错名字，礼物差点认识了新朋友。'],
    nextweek:['钥匙、证件、充电线，终于在同一个包里。','东西按用途归好，明天少了一场找钥匙大赛。','充电线不见了，抽屉里的耳机线主动加入纠缠。','分类包到位，整理有了现成的小帮手。','需要的东西一包齐，明天的自己会谢谢你。','补给包规格不对，还是要重新整理一遍。'],
    art:['笔找齐了，纸也铺好了，灵感尚未下班。','画材早有归位，手边恰好都是想用的颜色。','常用的笔干了，灵感在旁边礼貌等候。','即用画材省去挑选整理，白纸已经准备就绪。','画材刚好趁手，终于可以把注意力留给喜欢的事。','画材包缺了常用颜色，你又翻起了抽屉。']
  };
  const needs={commute:'坐下来安静歇一会',work:'在工位伸展、画一页随身速写',chores:'安心坐进刚收拾好的房间',lunch:'用午间空档安静休息',grocery:'放下购物袋，松一口气',dinner:'吃过饭，安静听一首喜欢的歌',parcel:'放下手机，休息一下',breakfast:'从容坐下，让早晨慢一点',repair:'在亮起来的灯旁安静休息',gift:'给在意的人写一句祝福',nextweek:'不用惦记明天，放松一会',art:'投入喜欢的绘画'};
  const assets={commute:'assets/scenes/commute.svg',office:'assets/scenes/office.svg',home:'assets/scenes/home.svg',kitchen:'assets/scenes/kitchen.svg',errands:'assets/scenes/errands.svg',leisure:'assets/scenes/leisure.svg',wash:'assets/scenes/wash.svg'};
  const api={version:'prd1-v7-demo2',types,byId,themes,schedules,stories,needs,assets};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GameData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
