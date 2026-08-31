const test=require('node:test');
const assert=require('node:assert/strict');
const D=require('../order-domain.js');

test('links only trade names and excludes floor furniture and sash from general orders',()=>{
  const estimate={selectedMaterials:[
    {sec:'타일',qty:2},{sec:'전기/조명',qty:1},{sec:'마루',qty:8},{sec:'가구',qty:1},{sec:'샷시',qty:1},{sec:'타일',qty:3}
  ]};
  assert.deepEqual(D.generalTrades(estimate),['타일','전기/조명']);
  assert.equal(D.hasWindowTrade(estimate),true);
});

test('window quote modes allow complete windows only for KCC and LX',()=>{
  assert.deepEqual(D.windowModes('KCC'),['제작창','완성창']);
  assert.deepEqual(D.windowModes('LX'),['제작창','완성창']);
  assert.deepEqual(D.windowModes('영림'),['제작창']);
  assert.deepEqual(D.windowModes('대우하이원'),['제작창']);
});

test('general share text excludes entry codes unless explicitly requested',()=>{
  const order={siteName:'현장A',address:'주소',manager:'홍길동',managerPhone:'010',deliveryDate:'2026-09-25',content:'등 2개',commonEntryCode:'1234*',doorCode:'5678*'};
  assert.doesNotMatch(D.generalShareText(order,false),/1234|5678/);
  assert.match(D.generalShareText(order,true),/공동현관: 1234\*/);
  assert.match(D.generalShareText(order,true),/세대 현관: 5678\*/);
});

test('overdue orders exclude delivered records',()=>{
  const rows=[{deliveryDate:'2026-08-29',status:'ordered'},{deliveryDate:'2026-08-20',status:'delivered'}];
  assert.equal(D.overdueOrders(rows,'2026-08-30').length,1);
});

