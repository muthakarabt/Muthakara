import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildIcs, googleCalendarUrl } from './calendar.ts';

test('buildIcs makes one weekly event per weekday with its own message', () => {
  const ics = buildIcs({
    hour: 19,
    minute: 30,
    title: 'وقت المذاكرة',
    bodies: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    now: new Date(2026, 10, 22, 12, 0), // Sunday
  });
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 7);
  assert.match(ics, /DTSTART:20261122T193000/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=SU/);
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=SA/);
  assert.match(ics, /TRIGGER:PT0M/);
});

test('reminder starts tomorrow when today\'s time has passed', () => {
  const url = googleCalendarUrl({ hour: 9, minute: 0, title: 't', body: 'b', now: new Date(2026, 10, 22, 12, 0) });
  assert.match(decodeURIComponent(url), /dates=20261123T090000\/20261123T091500/);
  assert.match(decodeURIComponent(url), /recur=RRULE:FREQ=DAILY/);
});

test('buildIcs escapes text characters that have a meaning in .ics files', () => {
  const ics = buildIcs({ hour: 9, minute: 0, title: 'a;b,c', bodies: ['x;y\nz'], now: new Date(2026, 10, 22, 12, 0) });
  assert.match(ics, /SUMMARY:a\\;b\\,c\r\n/);
  assert.match(ics, /DESCRIPTION:x\\;y\\nz\r\n/);
});
