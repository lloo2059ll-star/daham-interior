(function(root){
'use strict';
const PYEONG_M2=3.3058;
const money=n=>Math.round((Number(n)||0)/100)*100;
const I=(id,name,unit,laborUnit=0,materialUnit=0,extra={})=>({id,name,unit,laborUnit,materialUnit,...extra});
const CATALOG=[
{id:'temporary',name:'가설·보양',items:[
 I('temp-wall-single','가설벽 단면','㎡',0,0,{calc:'tempWall',sides:1,studSpacingMm:450,studBundlePrice:32000,plywoodSheetPrice:16000,wasteRate:.15,productivity:10}),
 I('temp-wall-double','가설벽 양면','㎡',0,0,{calc:'tempWall',sides:2,studSpacingMm:450,studBundlePrice:32000,plywoodSheetPrice:16000,wasteRate:.15,productivity:7}),
 I('protect-paper','바닥 보양지','평',7000,5000),I('protect-plavenia','바닥 플로베니아','평',8000,6000),I('protect-both','보양지+플로베니아','평',13000,12000),
 I('protect-opening-vinyl','문·창 비닐보양','개소',15000,10000),I('protect-opening-full','문·창 비닐+플로베니아','개소',25000,20000),
 I('protect-elevator-basic','엘리베이터 내부 보양','식',120000,160000),I('protect-elevator-full','엘리베이터 내부+입구 보양','식',180000,220000),I('protect-route','공용 동선 보양','식',60000,90000)]},
{id:'demolition',name:'철거·폐기물',items:[
 I('waste-disposal','폐기물 반출·운반·처리','식',0,0,{expenseUnit:450000,calc:'simple'}),
 I('demo-floor-vinyl','비닐·카펫 철거','평',5000),I('demo-floor-deco','데코타일 철거','평',15000),I('demo-floor-laminate','강화마루 철거','평',20000),I('demo-floor-wood','강마루 철거','평',30000),I('demo-floor-tile','바닥타일 철거','평',50000),I('demo-floor-tile-mortar','타일·몰탈층 철거','평',80000),I('demo-floor-epoxy','에폭시 연삭·철거','평',30000),
 I('demo-wall-finish','도배·필름 철거','평',8000),I('demo-wall-gypsum','석고벽 철거','평',25000),I('demo-wall-wood','목상·합판벽 철거','평',35000),I('demo-wall-lightsteel','경량·석고벽 철거','평',40000),I('demo-wall-masonry','조적벽 철거','평',70000),I('demo-wall-tile','벽타일 철거','평',80000),
 I('demo-ceiling-tex','비석면 텍스 철거','평',15000),I('demo-ceiling-gypsum','석고천장 철거','평',25000),I('demo-ceiling-wood','목상·합판천장 철거','평',35000),I('demo-ceiling-lightsteel','경량·석고천장 철거','평',35000),I('demo-ceiling-design','디자인천장 철거','평',45000),I('demo-ceiling-asbestos','석면 의심 텍스','식',0,0,{calc:'warning',warning:'석면 확인 전 철거 금지 · 전문업체 별도견적'}),
 I('demo-light','일반조명 철거','개',10000),I('demo-downlight','매입등 철거','개',5000),I('demo-device','콘센트·스위치 철거','개',5000),I('demo-panel','분전함 철거','개',150000),I('demo-ac','천장형 에어컨 철거','대',250000),I('demo-fan','환풍기·소형후드 철거','대',50000),I('demo-duct','덕트 철거','m',15000),I('demo-restroom','화장실 철거','칸',250000),I('demo-basin','공용 세면대 철거','개',50000)]},
{id:'plumbing',name:'설비',items:[
 I('plumbing-pb15','PB 급·온수 15A','m',20000,10000),I('plumbing-pvc50','PVC VG1 배수 50A','m',25000,10000),I('plumbing-pvc75','PVC VG1 배수 75A','m',35000,15000),I('plumbing-pvc100','PVC VG1 배수 100A','m',45000,20000),
 I('plumbing-core50','코어 50A 이하','공',70000,30000,{warning:'구조체 타공 승인 확인'}),I('plumbing-core100','코어 75~100A','공',100000,50000,{warning:'구조체 타공 승인 확인'}),I('plumbing-chase','콘크리트 바닥 홈파기','m',30000,10000),I('plumbing-mortar-repair','배관 후 몰탈복구','m',20000,15000),
 I('fixture-toilet','양변기 설치','개',80000),I('fixture-urinal','소변기 설치','개',100000),I('fixture-basin','세면기 설치','개',100000),I('fixture-faucet','수전 설치','개',50000),I('fixture-sink-connect','싱크 급배수 연결','개소',100000),I('fixture-drain','육가 설치','개',50000),I('fixture-heater','온수기 설치','개',150000),
 I('waterproof-commercial','액방 1회+도막 2회','평',120000,80000,{minimumTotal:600000}),I('plumbing-other','기타 설비','식',0,0,{editable:true})]},
{id:'electrical',name:'전기·조명',items:[
 I('electrical-base','기본 전기·LED 조명','평',90000,130000,{totalUnit:220000}),I('electrical-three35','내부 3상 변경 35kW 이하','식',700000,1100000,{warning:'한전 계약전력 증설·불입금·계량기·외부 인입은 임대인·건축주 별도'}),I('electrical-three50','내부 3상 변경 36~50kW','식',900000,1600000),I('electrical-three-over','50kW 초과·동력제어','식',0,0,{calc:'warning',warning:'전문업체 별도견적'}),
 I('electrical-dedicated','전용회로','개소',60000,40000),I('electrical-internet','인터넷 배선','개소',30000,20000),I('electrical-cctv','CCTV 배선','개소',40000,30000),I('electrical-speaker','스피커 배선','개소',30000,20000),I('electrical-emergency','비상·유도등 배선','개소',30000,20000)]},
{id:'hvac',name:'냉난방·환기',items:[
 I('hvac-wall','벽걸이 에어컨 설치','대',150000,100000),I('hvac-stand','스탠드 에어컨 설치','대',200000,150000),I('hvac-ceiling-small','천장형 에어컨 15평 이하 설치','대',250000,200000),I('hvac-ceiling-large','천장형 에어컨 16평 이상 설치','대',300000,250000),I('hvac-copper','냉매 동관 추가','m',8000,22000),I('hvac-drain','드레인 배관','m',20000,30000),I('hvac-outdoor-stand','실외기 받침','대',30000,70000),I('hvac-lift','양중·고소작업','식',200000,0,{expenseEditable:true}),
 I('duct-flex','플렉시블 덕트 100~150A','m',10000,15000),I('duct-spiral-small','스파이럴 덕트 100~150A','m',20000,30000),I('duct-spiral-large','스파이럴 덕트 200~250A','m',30000,45000),I('duct-fan','환풍기 설치','대',100000,0,{productEditable:true}),I('duct-diffuser','디퓨저·그릴 설치','개',20000,0,{productEditable:true}),I('duct-wall-cap','외벽 타공·캡','개소',100000,50000),I('duct-kitchen','주방 후드·대형 사각덕트','식',0,0,{calc:'warning',warning:'전문업체 별도견적'})]},
{id:'metal-glass',name:'금속·유리',items:[
 I('metal-zinc-30','아연각관 30×30×1.4T','m',25000,15000),I('metal-zinc-40','아연각관 40×40×1.4T','m',30000,20000),I('metal-zinc-50-14','아연각관 50×50×1.4T','m',35000,30000),I('metal-zinc-50-20','아연각관 50×50×2.0T','m',40000,40000),
 I('glass-8','강화유리 투명 8T','㎡',60000,100000),I('glass-10','강화유리 투명 10T','㎡',70000,130000),I('glass-12','강화유리 투명 12T','㎡',80000,160000),I('glass-door-swing','강화유리 여닫이문','세트',250000,650000),I('glass-door-slide','강화유리 슬라이딩문','세트',300000,800000)]},
{id:'carpentry',name:'목공',items:[
 I('carpentry-wall-single','석고벽 단면 2PLY','평',0,0,{calc:'carpentryWall',sides:1,studSpacingMm:300,productivity:4,boardPrice:5000,boardCoverageM2:1.62,studBundlePrice:32000,wasteRate:.15}),
 I('carpentry-wall-double','석고벽 양면 2PLY','평',0,0,{calc:'carpentryWall',sides:2,studSpacingMm:300,productivity:3,boardPrice:5000,boardCoverageM2:1.62,studBundlePrice:32000,wasteRate:.15}),
 I('carpentry-mdf-panel','MDF 알판 5T','평',0,0,{calc:'carpentryPanel',materialSheetPrice:9000,boardCoverageM2:2.9768,studSpacingMm:300,studBundlePrice:32000,wasteRate:.15,productivity:5}),
 I('carpentry-ceiling','목상+석고 천장 2PLY','평',0,0,{calc:'carpentryCeiling',studSpacingMm:300,productivity:4,boardPrice:5000,boardCoverageM2:1.62,studBundlePrice:32000,wasteRate:.15}),
 I('carpentry-floor','목상+구조합판 12T','평',0,0,{calc:'carpentryFloor',studSpacingMm:300,productivity:5,materialSheetPrice:30000,boardCoverageM2:2.9768,studBundlePrice:32000,wasteRate:.15}),
 I('carpentry-light-box','간접등 박스','m',70000,50000),I('carpentry-curtain-box','커튼박스','m',50000,30000),I('carpentry-molding','걸레받이·몰딩 목공틀','m',20000,15000),I('carpentry-door-reinforce','문틀·출입구 목공 보강','개소',100000,50000),I('carpentry-backing','TV·선반·상부장 보강합판','㎡',35000,25000)]},
{id:'tile',name:'타일',minimumLabor:350000,items:[
 I('tile-floor-pressure','바닥 타일 압착 시공','평',90000,35000),I('tile-wall-pressure','벽 타일 압착 시공','평',110000,40000),
 I('tile-600x600-product','600×600 타일 본품','평',0,69000,{calc:'package',packagePrice:26000,packageCoverageM2:1.44,wasteRate:.15}),I('tile-600x1200-product','600×1200 타일 본품','평',0,138000,{calc:'package',packagePrice:52000,packageCoverageM2:1.44,wasteRate:.15,laborSurcharge:.3}),I('tile-300x600-product','300×600 타일 본품','평',0,48000,{calc:'package',packagePrice:18000,packageCoverageM2:1.44,wasteRate:.15}),I('tile-300x300-product','300×300 타일 본품','평',0,48000,{calc:'package',packagePrice:18000,packageCoverageM2:1.44,wasteRate:.15}),
 I('tile-floor-mortar','바닥 구배·몰탈 미장','평',45000,35000),I('tile-wall-level','벽면 평활 미장','평',40000,30000),I('tile-skirting','타일 걸레받이','m',20000,10000),I('tile-stair','계단 타일','단',70000,30000),I('tile-jolly','졸리컷·코너 가공','m',25000)]},
{id:'paint',name:'도장',minimumLabor:350000,items:[
 I('paint-wall','벽 수성도장','평',70000,35000),I('paint-ceiling','천장 수성도장','평',80000,35000),I('paint-epoxy-coat','에폭시 코팅','평',45000,45000),I('paint-epoxy-1','에폭시 라이닝 1mm','평',55000,85000),I('paint-epoxy-3','에폭시 라이닝 3mm','평',75000,165000),I('paint-metal','철재 방청+에나멜 2회','㎡',55000,35000),I('paint-wood','목재 락카·우레탄','㎡',65000,45000),I('paint-stain','스테인','㎡',50000,30000),I('paint-exposed','노출천장 수성 뿜칠 2회','평',40000,25000)]},
{id:'film',name:'필름',minimumLabor:400000,items:[
 I('film-flat','기본 무광 단색 평면','㎡',45000,40000),I('film-door','문짝 양면','개',0,250000),I('film-frame','문틀','개',0,180000),I('film-door-set','문짝+문틀','세트',0,420000)]},
{id:'wallpaper',name:'도배',minimumLabor:500000,items:[
 I('wallpaper-paper','합지벽지','평',25000,20000),I('wallpaper-silk','실크벽지','평',35000,35000),I('wallpaper-fire','방염벽지','평',40000,50000),I('wallpaper-paper-ceiling','천장 합지벽지','평',35000,20000),I('wallpaper-silk-ceiling','천장 실크벽지','평',45000,35000),I('wallpaper-fire-ceiling','천장 방염벽지','평',50000,50000)]},
{id:'flooring',name:'바닥',minimumLabor:300000,items:[
 I('floor-deco','데코타일 3T','평',35000,45000),I('floor-lvt','LVT','평',40000,75000),I('floor-pvc','상업용 PVC 시트','평',30000,65000),I('floor-carpet','카펫타일','평',30000,70000),I('floor-leveling','셀프레벨링','평',20000,35000),I('floor-skirting-pvc','PVC 걸레받이','m',6000,6000),I('floor-skirting-rubber','고무 걸레받이','m',7000,8000),I('floor-skirting-al','알루미늄 걸레받이','m',12000,18000)]},
{id:'door',name:'문·도어',items:[
 I('door-abs','ABS 여닫이문','세트',150000,450000),I('door-wood','목문','세트',180000,620000),I('door-fire','철제 방화문','세트',250000,950000),I('door-aluminum','알루미늄 프레임 도어','세트',300000,900000),I('door-auto','자동문 기본형','세트',500000,2500000),I('door-closer','도어클로저','개',20000,100000),I('door-lock','일반 디지털 도어락','개',50000,200000),I('door-access','카드 출입통제 도어락','개',100000,350000),I('door-panic','패닉바','개',70000,230000),I('door-stopper','스토퍼·문보호대','개',10000,20000)]},
{id:'fire',name:'소방',items:[
 I('fire-sprinkler-move','스프링클러 헤드 이설','개',100000,50000),I('fire-sprinkler-add','스프링클러 헤드 증설','개',150000,100000),I('fire-detector-move','감지기 이설','개',50000,20000),I('fire-detector-add','감지기 증설','개',70000,50000),I('fire-exit','유도등 설치','개',60000,90000),I('fire-emergency-light','비상조명 설치','개',60000,70000),I('fire-extinguisher','분말소화기 3.3kg','개',10000,40000),I('fire-speaker','비상방송 스피커 배선·설치','개',70000,50000),I('fire-panel-test','소방 수신기 연동·시험','식',500000),I('fire-drawing','소방 도면·신고 대행','식',800000),I('fire-certificate','다중이용업소 완비증명 대행','식',1500000)]},
{id:'cleaning',name:'청소',items:[
 I('cleaning-progress','공사 중 현장 정리','회',180000,50000),I('cleaning-final','준공청소','평',25000,5000,{minimumTotal:500000})]},
{id:'site-cost',name:'기타·현장경비',items:[
 I('site-manager','현장소장','일',0,0,{expenseUnit:300000}),I('site-truck1','1톤 운반','회',0,0,{expenseUnit:150000}),I('site-truck25','2.5톤 운반','회',0,0,{expenseUnit:250000}),I('site-lifting','인력 양중','인·일',0,0,{expenseUnit:250000}),I('site-ladder','사다리차','회',0,0,{expenseUnit:200000}),I('site-equipment','크레인·스카이·기타 실비','식',0,0,{expenseEditable:true}),I('site-other','주차·보험·출장·예비비','식',0,0,{expenseEditable:true})]}
];
const ITEM_MAP=new Map(CATALOG.flatMap(c=>c.items.map(i=>[i.id,{...i,categoryId:c.id}])));
const MINIMUMS=Object.fromEntries(CATALOG.filter(c=>c.minimumLabor).map(c=>[c.id,c.minimumLabor]));
const toSquareMeters=p=>Number((Number(p||0)*PYEONG_M2).toFixed(4));
const toPyeong=m=>Number((Number(m||0)/PYEONG_M2).toFixed(4));
const calculateOrderQuantity=({areaM2,coveragePerPackageM2,wasteRate=0})=>Math.ceil(Number(areaM2||0)*(1+Number(wasteRate||0))/Number(coveragePerPackageM2||1));
function calculateLine(input){
 const def=ITEM_MAP.get(input.id)||{}; const row={...def,...input}; const q=Number(row.quantity||0); const ov=row.overrides||{};
 const lu=ov.laborUnit!==undefined?Number(ov.laborUnit):Number(row.laborUnit||0); const mu=ov.materialUnit!==undefined?Number(ov.materialUnit):Number(row.materialUnit||0); const eu=ov.expenseUnit!==undefined?Number(ov.expenseUnit):Number(row.expenseUnit||0);
 let labor=input.labor!==undefined?Number(input.labor):money(q*lu), material=input.material!==undefined?Number(input.material):money(q*mu), expense=input.expense!==undefined?Number(input.expense):money(q*eu),orderQuantity=0,details={};
 if(row.calc==='package'||row.packagePrice){orderQuantity=calculateOrderQuantity({areaM2:toSquareMeters(q),coveragePerPackageM2:row.packageCoverageM2,wasteRate:row.wasteRate});material=money(orderQuantity*Number(row.packagePrice));}
 if(/^carpentry/.test(row.calc||'')){
  const areaM2=toSquareMeters(q),wasteArea=areaM2*(1+Number(row.wasteRate||0)),workerDays=Math.ceil(q/Number(row.productivity||1));
  const boardLayers=row.calc==='carpentryWall'?2*Number(row.sides||1):(row.calc==='carpentryCeiling'?2:1);
  const boardSheets=Math.ceil(wasteArea*boardLayers/Number(row.boardCoverageM2||1));
  const studPieces=Math.ceil((wasteArea/(Number(row.studSpacingMm||300)/1000))/2.4);
  const studBundles=Math.ceil(studPieces/12);
  const boardPrice=Number(row.boardPrice||row.materialSheetPrice||0);
  const mainMaterial=boardSheets*boardPrice+studBundles*Number(row.studBundlePrice||0);
  labor=workerDays*350000;material=money(mainMaterial*1.1);details={workerDays,boardSheets,studBundles};
 }
 const extraDays=Number(row.extraDays||0),extraLabor=money(extraDays*350000),extraMaterial=money(extraDays*245000); labor+=extraLabor;material+=extraMaterial;
 if(row.minimumTotal&&labor+material<row.minimumTotal){labor+=row.minimumTotal-labor-material;}
 return {id:row.id,categoryId:row.categoryId||input.categoryId,labor:money(labor),material:money(material),expense:money(expense),orderQuantity,extraLabor,extraMaterial,details,automatic:{laborUnit:Number(row.laborUnit||0),materialUnit:Number(row.materialUnit||0),expenseUnit:Number(row.expenseUnit||0)},applied:{laborUnit:lu,materialUnit:mu,expenseUnit:eu}};
}
function calculateEstimate(estimate){
 const categories={}; for(const raw of estimate.lines||[]){const line=(raw.labor!==undefined||raw.material!==undefined)?{...raw,expense:Number(raw.expense||0)}:calculateLine(raw);const id=line.categoryId||ITEM_MAP.get(line.id)?.categoryId||'other';const c=categories[id]||(categories[id]={labor:0,material:0,expense:0,minimumLaborAdjustment:0});c.labor+=Number(line.labor||0);c.material+=Number(line.material||0);c.expense+=Number(line.expense||0);}
 for(const [id,c] of Object.entries(categories)){const min=MINIMUMS[id]||0;if(c.labor>0&&c.labor<min){c.minimumLaborAdjustment=min-c.labor;c.labor=min;}}
 const totals=Object.values(categories).reduce((a,c)=>({labor:a.labor+c.labor,material:a.material+c.material,expense:a.expense+c.expense}),{labor:0,material:0,expense:0});return {categories,totals};
}
const WASTE_COEFFICIENTS={'vinyl-carpet':30,'deco-tile':20,'wood-floor':15,'tile':10,'tile-mortar':7,'gypsum-wall':10,'ceiling':15,'restroom':2};
function suggestWasteLoads(lines){return Math.ceil((lines||[]).reduce((sum,line)=>sum+Number(line.quantity||0)/Number(WASTE_COEFFICIENTS[line.type]||10),0));}
function validateEstimate(estimate){const errors=[];for(const line of estimate.lines||[]){for(const field of ['quantity','laborUnit','materialUnit','expenseUnit']){if(line[field]!==undefined&&(!Number.isFinite(Number(line[field]))||Number(line[field])<0))errors.push({lineId:line.id,field,message:'0 이상의 숫자를 입력하세요.'});}}return errors;}
function calculateCommercialTotals(costs,fees={}){const labor=money(costs.labor),material=money(costs.material),expense=money(costs.expense),subtotal=labor+material+expense,management=money(subtotal*Number(fees.managementRate||0)/100),base=subtotal+management,profit=fees.profitMode==='fixed'?money(fees.profitAmount):money(base*Number(fees.profitRate||0)/100),supplyTotal=base+profit,vat=money(supplyTotal*Number(fees.vatRate||0)/100);return{labor,material,expense,subtotal,management,profit,supplyTotal,vat,grandTotal:supplyTotal+vat};}
const api={CATALOG,PYEONG_M2,toSquareMeters,toPyeong,calculateOrderQuantity,calculateLine,calculateEstimate,suggestWasteLoads,validateEstimate,calculateCommercialTotals};root.DAHAM_COMMERCIAL_ESTIMATE=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
