import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, afterReview, afterStudy, daysBetween, todayStr } from './srs.ts';

test('todayStr pads month and day', () => {
  assert.equal(todayStr(new Date(2026, 0, 5)), '2026-01-05');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('daysBetween', () => {
  assert.equal(daysBetween('2026-11-21', '2026-11-24'), 3);
  assert.equal(daysBetween('2026-11-24', '2026-11-21'), -3);
});

test('a studied page is first reviewed the next day', () => {
  assert.deepEqual(afterStudy('2026-11-21'), { stage: 0, due: '2026-11-22' });
});

test('remembering moves up the ladder 1 → 3 → 7 → 14 → 30 → 60', () => {
  let s = afterStudy('2026-01-01');
  const gaps: number[] = [];
  let today = s.due;
  for (let i = 0; i < 6; i++) {
    const next = afterReview(s.stage, 'good', today);
    gaps.push(daysBetween(today, next.due));
    s = next;
    today = next.due;
  }
  assert.deepEqual(gaps, [3, 7, 14, 30, 60, 60]);
});

test('forgetting resets to the start', () => {
  assert.deepEqual(afterReview(4, 'again', '2026-11-21'), { stage: 0, due: '2026-11-22' });
});

test('hard keeps the stage and waits half the gap (at least one day)', () => {
  assert.deepEqual(afterReview(3, 'hard', '2026-11-21'), { stage: 3, due: '2026-11-28' });
  assert.deepEqual(afterReview(0, 'hard', '2026-11-21'), { stage: 0, due: '2026-11-22' });
});
