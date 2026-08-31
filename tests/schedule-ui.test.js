const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'schedule.html'), 'utf8');

test('schedule exposes the approved DAHAM navigation and workspace landmarks', () => {
  assert.match(html, /id="app-sidebar"[^>]*aria-label="주요 메뉴"/);
  assert.match(html, /class="[^"]*nav-item[^"]*active[^"]*"[^>]*data-page="schedule"/);
  assert.match(html, /id="schedule-workspace"/);
  assert.match(html, /전체 현장의 공정 일정을 한눈에 확인하고 관리하세요\./);
});

test('schedule header exposes every primary action in the approved order', () => {
  const general = html.indexOf('id="tb-general-btn"');
  const phases = html.indexOf('id="tb-phase-btn"');
  const today = html.indexOf('id="cal-today-btn"');
  const prev = html.indexOf('id="cal-prev-btn"');
  const next = html.indexOf('id="cal-next-btn"');
  assert.ok(general > -1 && phases > general && today > phases && prev > today && next > prev);
});

test('selected-site print action is exposed and owns an A4 portrait single-page surface', () => {
  assert.match(html, /id="tb-print-btn"[^>]*onclick="printSelectedProject\(\)"/);
  assert.match(html, /id="schedule-print-sheet"/);
  assert.match(html, /@page\s*\{size:\s*A4 portrait;?\s*margin:\s*7mm\}/s);
  assert.match(html, /\.schedule-print-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(html, /function printSelectedProject\(\)/);
});

test('sparse print months show only scheduled rows with month day and weekday', () => {
  assert.match(html, /function renderCompactPrintMonth\(section\)/);
  assert.match(html, /class="schedule-print-compact"/);
  assert.match(html, /class="schedule-print-task-date"/);
  assert.match(html, /\['일','월','화','수','목','금','토'\]/);
  assert.match(html, /section\.layout==='compact'/);
});

test('project cards and editor use separate compact and editing surfaces', () => {
  assert.match(html, /id="site-card-viewport"/);
  assert.match(html, /id="site-cards"[^>]*class="[^"]*site-cards/);
  assert.match(html, /id="project-drawer"/);
  assert.match(html, /function openProjectDrawer\(id\)/);
  assert.match(html, /function closeProjectDrawer\(\)/);
  assert.match(html, /data-action="edit-project"/);
});

test('monthly calendar has the approved toolbar, filters, and legend', () => {
  assert.match(html, /id="calendar-card"/);
  assert.match(html, /id="calendar-view-select"/);
  assert.match(html, /id="calendar-site-filter"/);
  assert.match(html, /id="toggle-holidays"/);
  assert.match(html, /id="toggle-weekends"/);
  assert.match(html, /id="schedule-legend"/);
  assert.match(html, /class="[^"]*schedule-bar/);
  assert.match(html, /class="[^"]*general-chip/);
});

test('general schedules expose contract as a distinct color-coded type', () => {
  assert.match(html, /id="m-general-type"[\s\S]*?<option value="contract">계약<\/option>/);
  assert.match(html, /generalTypeMeta\(e\.generalType\)\.color/);
  assert.match(html, /\['contract','consult','as','personal','other'\]/);
  assert.match(html, /--event-bg:/);
});

test('existing modal and domain integration hooks remain available', () => {
  for (const id of ['task-modal', 'phase-modal', 'proj-pick-modal', 'agenda-area', 'sync-dot']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /schedule-domain\.js/);
  assert.match(html, /schedule-holidays\.js/);
});

test('schedule loads the address-name domain update with a cache-busted asset', () => {
  assert.match(html, /schedule-domain\.js\?v=20260831-progress/);
});

test('static DOM ids are unique and every literal selector resolves', () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  assert.deepEqual(duplicateIds, []);

  const idSet = new Set(ids);
  const literalRefs = [...html.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map((match) => match[1]);
  const missingIds = [...new Set(literalRefs.filter((id) => !idSet.has(id)))];
  assert.deepEqual(missingIds, []);
});

test('schedule deletion owns a confirmation implementation before delete handlers use it', () => {
  const definition = html.indexOf('function dahamConfirm(msg, fn)');
  const deletion = html.indexOf('function deleteTask()');
  assert.ok(definition > -1 && definition < deletion);
  assert.match(html, /function dahamConfirm\(msg, fn\)\s*\{\s*if\(window\.confirm\(msg\)\) fn\(\);\s*\}/);
});

test('today navigation uses the real current month even while a site is selected', () => {
  assert.match(html, /var calAnchorToday\s*=\s*false/);
  assert.match(html, /function goToday\(\)\s*\{\s*calOffset=0;calAnchorToday=true;renderCalendar\(\);\s*\}/);
  assert.match(html, /if\(calAnchorToday\)\s*\{\s*base=todayStr\(\);/);
});

test('closing the project drawer flushes pending project edits', () => {
  assert.match(html, /function closeProjectDrawer\(\)\s*\{[^}]*autoSave\(\)/);
});

test('responsive UI provides real sizing rather than clipping page overflow', () => {
  assert.match(html, /@media[^\{]*\(min-width:\s*768px\)[\s\S]*?\(max-width:\s*1024px\)/);
  assert.match(html, /@media[^\{]*\(min-width:\s*768px\)[\s\S]*?\.schedule-workspace\s*\{[^}]*width:\s*100%[^}]*max-width:\s*100%/);
  assert.match(html, /min-height:\s*44px/);
  assert.match(html, /\.schedule-workspace[\s\S]*?min-width:\s*0/);
  assert.match(html, /@media[^\{]*\(max-width:\s*600px\)[\s\S]*?\.cal-months\s*\{\s*display:\s*none/);
  assert.match(html, /@media[^\{]*\(max-width:\s*600px\)[\s\S]*?\.schedule-drawer \.drawer-panel\s*\{[^}]*inset:\s*0[^}]*width:\s*auto[^}]*max-width:\s*none/);
  assert.doesNotMatch(html, /(?:html|body)\s*\{[^}]*overflow-x\s*:\s*hidden/i);
});




