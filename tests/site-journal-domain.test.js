const test = require('node:test');
const assert = require('node:assert/strict');
const Journal = require('../site-journal-domain.js');

const UUIDS = {
  companyId: '11111111-1111-4111-8111-111111111111',
  journalId: '22222222-2222-4222-8222-222222222222',
  photoId: '33333333-3333-4333-8333-333333333333'
};

test('validateDraft rejects an empty entry without a photo intent', () => {
  assert.throws(
    () => Journal.validateDraft({ projectId: 'project-1', workDate: '2026-09-03', visitType: 'visit', content: '   ' }),
    /content or photo intent is required/
  );
});

test('validateDraft accepts every supported visit type and normalizes strings', () => {
  ['visit', 'remote', 'none'].forEach(visitType => {
    const draft = Journal.validateDraft({
      projectId: ' project-1 ', workDate: '2026-09-03', visitType, trade: ' 목공 ', content: ' 작업 완료 '
    });
    assert.deepEqual(draft, {
      id: null, projectId: 'project-1', workDate: '2026-09-03', visitType, trade: '목공', content: '작업 완료', photoIntent: false
    });
  });
});

test('validateDraft requires a project and a real ISO work date', () => {
  assert.throws(() => Journal.validateDraft({ workDate: '2026-09-03', content: '작업' }), /projectId is required/);
  assert.throws(() => Journal.validateDraft({ projectId: 'project-1', workDate: '2026-02-31', content: '작업' }), /workDate must be a valid ISO date/);
});

test('validatePhoto allows the supported image MIME types at the 25MB boundary', () => {
  ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].forEach(type => {
    assert.doesNotThrow(() => Journal.validatePhoto({ type, size: 25 * 1024 * 1024 }, 19));
  });
});

test('validatePhoto rejects empty, oversized, unsupported, and twenty-first files', () => {
  assert.throws(() => Journal.validatePhoto({ type: 'image/jpeg', size: 0 }, 0), /positive/);
  assert.throws(() => Journal.validatePhoto({ type: 'image/jpeg', size: (25 * 1024 * 1024) + 1 }, 0), /25MB/);
  assert.throws(() => Journal.validatePhoto({ type: 'image/gif', size: 1 }, 0), /MIME/);
  assert.throws(() => Journal.validatePhoto({ type: 'image/jpeg', size: 1 }, 20), /20 photos/);
});

test('buildObjectPath roots a sanitized immutable object path at its company UUID', () => {
  const path = Journal.buildObjectPath({
    ...UUIDS, projectId: 'project/../one', originalName: '../../before floor plan (final).JPG'
  });
  assert.equal(path, '11111111-1111-4111-8111-111111111111/project-one/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/before-floor-plan-final.JPG');
  assert.doesNotMatch(path, /\.\.|\\/);
});

test('buildObjectPath rejects non-UUID immutable identifiers', () => {
  assert.throws(() => Journal.buildObjectPath({ ...UUIDS, journalId: 'not-a-uuid', projectId: 'p', originalName: 'x.jpg' }), /journalId must be a UUID/);
});

test('mergePage deduplicates IDs and orders rows newest-first deterministically', () => {
  const rows = Journal.mergePage(
    [
      { id: 'a', work_date: '2026-09-01', created_at: '2026-09-01T09:00:00Z', content: 'old' },
      { id: 'b', work_date: '2026-09-03', created_at: '2026-09-03T08:00:00Z' }
    ],
    [
      { id: 'a', work_date: '2026-09-02', created_at: '2026-09-02T10:00:00Z', content: 'new' },
      { id: 'c', work_date: '2026-09-03', created_at: '2026-09-03T08:00:00Z' }
    ]
  );
  assert.deepEqual(rows.map(row => [row.id, row.content || null]), [['c', null], ['b', null], ['a', 'new']]);
});

