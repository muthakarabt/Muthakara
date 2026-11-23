/**
 * In the browser the database is a file that only one tab can open at a time:
 * a second tab used to stay blank. Now the newest tab wins: it asks the other
 * tab to step aside (that tab moves to /elsewhere.html, which closes the
 * database), waits for it to let go, then opens the app.
 */
import { useEffect, useState } from 'react';

const LOCK = 'muthakara-app';
const CHANNEL = 'muthakara-tab';

let claimed: Promise<void> | null = null;

function claim(): Promise<void> {
  if (claimed) return claimed;
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  if (!locks || typeof BroadcastChannel === 'undefined') return (claimed = Promise.resolve());
  const channel = new BroadcastChannel(CHANNEL);
  claimed = new Promise<void>((resolve) => {
    const hold = () => {
      // Another tab opened the app: let it have the database.
      channel.onmessage = (e) => {
        if (e.data === 'take-over') window.location.replace('/elsewhere.html');
      };
      resolve();
      return new Promise<void>(() => {}); // keep the lock while this tab is open
    };
    locks.request(LOCK, { ifAvailable: true }, (lock) => {
      if (lock) return hold();
      // Someone else has it: ask them to step aside, and wait for the lock.
      channel.postMessage('take-over');
      locks.request(LOCK, () =>
        // Give the other tab a moment to close the database file after it lets go.
        new Promise<void>((r) => setTimeout(r, 400)).then(hold),
      );
      return undefined;
    });
  });
  return claimed;
}

export function useSingleTab(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    claim().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}
