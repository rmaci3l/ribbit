import { useEffect, useState } from 'react';

/**
 * Wall-clock milliseconds, refreshed on an interval. Anything that renders elapsed
 * time needs the clock to be state: reading `Date.now()` during render is impure and,
 * more practically, produces a number that never changes until something else happens
 * to trigger a re-render.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
