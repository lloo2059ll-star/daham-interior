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

test('existing modal and domain integration hooks remain available', () => {
  for (const id of ['task-modal', 'phase-modal', 'proj-pick-modal', 'agenda-area', 'sync-dot']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /schedule-domain\.js/);
  assert.match(html, /schedule-holidays\.js/);
});

test('responsive UI provides real sizing rather than clipping page overflow', () => {
  assert.match(html, /@media[^\{]*\(min-width:\s*768px\)[\s\S]*?\(max-width:\s*1024px\)/);
  assert.match(html, /min-height:\s*44px/);
  assert.match(html, /\.schedule-workspace[\s\S]*?min-width:\s*0/);
  assert.match(html, /@media[^\{]*\(max-width:\s*600px\)[\s\S]*?\.cal-months\s*\{\s*display:\s*none/);
  assert.doesNotMatch(html, /(?:html|body)\s*\{[^}]*overflow-x\s*:\s*hidden/i);
});

