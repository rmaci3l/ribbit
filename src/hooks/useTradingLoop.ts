import { useEffect } from 'react';
import { fetchCandles, fetchNewPools } from '../data/geckoterminal';
import { RateLimited, isCoolingDown } from '../data/limiter';
import { settle } from '../sim/settle';
import { useStore } from '../state/store';

const POLL_MS = 60_000;
const MAX_SETTLEMENTS_PER_CYCLE = 4;

let cursor = 0;

async function scanForEntries() {
  const { observe, markPolled, push } = useStore.getState();
  try {
    const snapshots = await fetchNewPools(Math.floor(Date.now() / 1000));
    observe(snapshots);
    markPolled();
  } catch (error) {
    if (error instanceof RateLimited) {
      push('system', 'Price API rate limit hit. Pausing scans for 90 seconds.');
    } else {
      push('error', `Pool scan failed: ${(error as Error).message}`);
    }
  }
}

async function settleOpenPositions() {
  if (isCoolingDown()) return;

  const state = useStore.getState();
  const pools = [...new Set(state.positions.map((p) => p.pool))];
  if (pools.length === 0) return;

  const slice = pools.slice(cursor, cursor + MAX_SETTLEMENTS_PER_CYCLE);
  cursor = cursor + MAX_SETTLEMENTS_PER_CYCLE >= pools.length ? 0 : cursor + MAX_SETTLEMENTS_PER_CYCLE;

  const now = Math.floor(Date.now() / 1000);

  for (const pool of slice) {
    let candles;
    try {
      candles = await fetchCandles(pool);
    } catch {
      continue;
    }

    for (const position of useStore.getState().positions.filter((p) => p.pool === pool)) {
      const result = settle(position, candles, now);

      if (result.status === 'open') {
        useStore.getState().markPosition(position.id, result.pnlPct);
        continue;
      }

      useStore.getState().closePosition(position, {
        status: result.status,
        exitPrice: result.exitPrice!,
        exitTime: result.exitTime!,
        pnlPct: result.pnlPct,
      });
    }
  }
}

const ROTATE_EVERY_CYCLES = 4;

let cycles = 0;

async function cycle() {
  if (cycles > 0 && cycles % ROTATE_EVERY_CYCLES === 0) useStore.getState().rotateStrategy();
  cycles += 1;

  await scanForEntries();
  await settleOpenPositions();
}

export function useTradingLoop() {
  useEffect(() => {
    void cycle();
    const interval = setInterval(() => void cycle(), POLL_MS);
    return () => clearInterval(interval);
  }, []);
}
