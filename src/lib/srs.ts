/**
 * Spaced-repetition scheduling.
 *
 * A page is studied once, then reviewed after growing gaps (in days).
 * `stage` is the index into INTERVALS of the gap the page is currently waiting out.
 */
export const INTERVALS = [1, 3, 7, 14, 30, 60] as const;

export const LAST_STAGE = INTERVALS.length - 1;

export type Grade = 'good' | 'hard' | 'again';

export type Schedule = { stage: number; due: string };

/** Local calendar date as YYYY-MM-DD. */
export function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  // Noon avoids DST edges shifting the date.
  const dt = new Date(y, m - 1, d, 12);
  dt.setDate(dt.getDate() + days);
  return todayStr(dt);
}

export function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

/** Schedule for a page that was just studied for the first time. */
export function afterStudy(today: string): Schedule {
  return { stage: 0, due: addDays(today, INTERVALS[0]) };
}

/** Schedule for a page after a review with the given self-grade. */
export function afterReview(stage: number, grade: Grade, today: string): Schedule {
  const current = Math.min(Math.max(stage, 0), LAST_STAGE);
  if (grade === 'again') {
    return { stage: 0, due: addDays(today, INTERVALS[0]) };
  }
  if (grade === 'hard') {
    return { stage: current, due: addDays(today, Math.max(1, Math.round(INTERVALS[current] / 2))) };
  }
  const next = Math.min(current + 1, LAST_STAGE);
  return { stage: next, due: addDays(today, INTERVALS[next]) };
}
