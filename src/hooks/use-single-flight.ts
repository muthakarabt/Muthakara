import { useRef } from 'react';

/**
 * Wraps an async handler so a second tap is ignored while the first one is
 * still running. Without it a quick double tap on "next" or "create" runs the
 * handler twice: a review is recorded twice, a page is skipped, or a subject
 * is created twice.
 */
export function useSingleFlight<A extends unknown[]>(fn: (...args: A) => Promise<void>): (...args: A) => Promise<void> {
  const busy = useRef(false);
  return async (...args: A) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn(...args);
    } finally {
      busy.current = false;
    }
  };
}
