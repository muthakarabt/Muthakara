/**
 * Daily study reminder for the web version. Browsers can't wake a closed page
 * without a push server, so instead the reminder is added to the user's own
 * calendar, which alerts them every day at the chosen time.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Next date (today or tomorrow) at hour:minute, as a local "floating" time YYYYMMDDTHHMMSS. */
function nextStart(hour: number, minute: number, now = new Date()): { start: string; end: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
  if (d <= now) d.setDate(d.getDate() + 1);
  const end = new Date(d.getTime() + 15 * 60 * 1000);
  const fmt = (x: Date) =>
    `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  return { start: fmt(d), end: fmt(end) };
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** An .ics file with one weekly event per weekday, each with its own encouraging message and an alert. */
export function buildIcs(opts: { hour: number; minute: number; title: string; bodies: string[]; now?: Date }): string {
  const now = opts.now ?? new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const events: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const { start, end } = nextStart(opts.hour, opts.minute, new Date(day.getFullYear(), day.getMonth(), day.getDate()));
    const body = opts.bodies[day.getDay() % opts.bodies.length];
    events.push(
      [
        'BEGIN:VEVENT',
        `UID:muthakara-reminder-${DAYS[day.getDay()]}@muthakara.app`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${DAYS[day.getDay()]}`,
        `SUMMARY:${escapeIcs(opts.title)}`,
        `DESCRIPTION:${escapeIcs(body)}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcs(body)}`,
        'TRIGGER:PT0M',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n'),
    );
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Muthakara//Reminder//AR', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

/** A Google Calendar link that creates a daily repeating event. */
export function googleCalendarUrl(opts: { hour: number; minute: number; title: string; body: string; now?: Date }): string {
  const { start, end } = nextStart(opts.hour, opts.minute, opts.now);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    details: opts.body,
    dates: `${start}/${end}`,
    recur: 'RRULE:FREQ=DAILY',
  });
  try {
    params.set('ctz', Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    // without a time zone Google uses the account's own
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Web only: saves the .ics file so the phone or computer opens it in its calendar. */
export function downloadIcs(content: string, filename = 'muthakara-reminder.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
