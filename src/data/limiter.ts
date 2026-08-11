const MIN_GAP_MS = 3000;
const COOLDOWN_MS = 90_000;

let tail: Promise<unknown> = Promise.resolve();
let earliestNext = 0;
let cooldownUntil = 0;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimited extends Error {
  constructor() {
    super('rate limited, backing off');
  }
}

export function isCoolingDown(): boolean {
  return Date.now() < cooldownUntil;
}

export function scheduled<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(async () => {
    if (isCoolingDown()) throw new RateLimited();

    const delay = earliestNext - Date.now();
    if (delay > 0) await wait(delay);
    earliestNext = Date.now() + MIN_GAP_MS;

    try {
      return await task();
    } catch (error) {
      if (error instanceof RateLimited) cooldownUntil = Date.now() + COOLDOWN_MS;
      throw error;
    }
  });

  tail = run.catch(() => undefined);
  return run;
}
