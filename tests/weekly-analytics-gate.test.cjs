const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {dueWeek, gate, readRuns} = require('../scripts/weekly-analytics-gate.cjs');

test('Toronto Monday 9 AM boundary survives standard and daylight time', () => {
  assert.equal(dueWeek(new Date('2026-11-02T13:59:00Z')), '2026-10-26');
  assert.equal(dueWeek(new Date('2026-11-02T14:00:00Z')), '2026-11-02');
  assert.equal(dueWeek(new Date('2027-03-15T12:59:00Z')), '2027-03-08');
  assert.equal(dueWeek(new Date('2027-03-15T13:00:00Z')), '2027-03-15');
});

test('missed Monday remains due Tuesday and Sunday, with only newest overdue week', () => {
  assert.equal(gate([], new Date('2026-11-03T20:00:00Z')).run, true);
  assert.equal(gate([], new Date('2026-11-08T20:00:00Z')).week, '2026-11-02');
  assert.equal(gate([], new Date('2026-11-17T20:00:00Z')).week, '2026-11-16');
});

test('no premature scheduled collection; explicit manual run remains available', () => {
  assert.equal(gate([], new Date('2026-10-27T20:00:00Z')).reason, 'not_due');
  assert.equal(gate([], new Date('2026-10-27T20:00:00Z'), true).run, true);
  assert.equal(gate([], new Date('2026-10-27T20:00:00Z'), true).week, '2026-10-26');
});

test('completed week skips while a later week becomes due', () => {
  const runs = [{week: '2026-11-02', result: 'complete', finishedAt: '2026-11-02T15:00:00Z'}];
  assert.equal(gate(runs, new Date('2026-11-03T20:00:00Z')).reason, 'already_complete');
  assert.equal(gate(runs, new Date('2026-11-09T15:00:00Z')).run, true);
  assert.equal(gate(runs, new Date('2026-11-03T20:00:00Z'), true).run, true);
});

test('partial and blocked attempts wait before retry; manual overrides backoff', () => {
  const partial = [{week: '2026-11-02', result: 'partial', finishedAt: '2026-11-02T15:00:00Z'}];
  assert.equal(gate(partial, new Date('2026-11-02T17:00:00Z')).reason, 'retry_backoff');
  assert.equal(gate(partial, new Date('2026-11-02T19:00:00Z')).run, true);
  const blocked = [{...partial[0], result: 'blocked'}];
  assert.equal(gate(blocked, new Date('2026-11-03T14:00:00Z')).reason, 'retry_backoff');
  assert.equal(gate(blocked, new Date('2026-11-03T15:00:00Z')).run, true);
  assert.equal(gate(blocked, new Date('2026-11-02T17:00:00Z'), true).run, true);
});

test('saved completion records suppress repeats, while malformed records fail closed', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'accelerator-gate-test-'));
  const file = path.join(directory, 'run-test.json');
  try {
    fs.writeFileSync(file, JSON.stringify({week: '2026-11-02', result: 'complete',
      finishedAt: '2026-11-02T15:00:00Z', channels: []}));
    assert.equal(gate(readRuns(directory), new Date('2026-11-03T20:00:00Z')).reason, 'already_complete');
    fs.writeFileSync(file, JSON.stringify({week: '2026-11-02', result: 'success'}));
    assert.throws(() => readRuns(directory), /Invalid run record/);
    fs.writeFileSync(file, '{');
    assert.throws(() => readRuns(directory), SyntaxError);
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});
