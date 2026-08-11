import type { PoolMemory, PoolSnapshot, Position, StrategyId } from './types';

/**
 * Exits are identical across all three strategies on purpose. Only the entry rule
 * differs, so the comparison between them measures entry timing and nothing else.
 */
const TARGET_MULT = 2.0;
const STOP_MULT = 0.7;
const MAX_HOLD_SEC = 60 * 60;

/** Pools older than this are never entered, whatever the rule says. */
const MAX_POOL_AGE_SEC = 30 * 60;

/** Trailing-five-minute transaction count that counts as momentum. */
const MOMENTUM_TX_M5 = 40;

/** Drawdown from first-seen price that counts as a dip. */
const DIP_FRACTION = 0.8;

export interface StrategyDef {
  id: StrategyId;
  name: string;
  blurb: string;
  /** Terminal accent colour, Tailwind-free so `sim/` stays pure. */
  color: string;
  decide(snapshot: PoolSnapshot, memory: PoolMemory, isFirstSighting: boolean): boolean;
}

export const STRATEGIES: StrategyDef[] = [
  {
    id: 'fresh',
    name: 'FRESH',
    blurb: 'Buys the moment a pool appears. No filter, no patience.',
    color: '#6ee7a8',
    decide: (_snapshot, _memory, isFirstSighting) => isFirstSighting,
  },
  {
    id: 'dip',
    name: 'DIP',
    blurb: `Waits for a ${Math.round((1 - DIP_FRACTION) * 100)}% drawdown from first sight, then buys.`,
    color: '#7dd3fc',
    decide: (snapshot, memory, isFirstSighting) =>
      !isFirstSighting && snapshot.priceUsd <= memory.firstPriceUsd * DIP_FRACTION,
  },
  {
    id: 'momentum',
    name: 'MOMENTUM',
    blurb: `Buys only when the pool clears ${MOMENTUM_TX_M5} trades in five minutes.`,
    color: '#fbbf24',
    decide: (snapshot) => snapshot.txM5 >= MOMENTUM_TX_M5,
  },
];

export const strategyById = (id: StrategyId): StrategyDef => STRATEGIES.find((s) => s.id === id)!;

export function isTradeable(snapshot: PoolSnapshot): boolean {
  return snapshot.priceUsd > 0 && snapshot.seenAt - snapshot.createdAt <= MAX_POOL_AGE_SEC;
}

export function openPosition(
  strategy: StrategyId,
  snapshot: PoolSnapshot,
  at: number,
  stakeSol: number,
): Position {
  return {
    id: `${strategy}:${snapshot.address}:${at}`,
    strategy,
    pool: snapshot.address,
    mint: snapshot.mint,
    label: snapshot.symbol,
    imageUrl: snapshot.imageUrl,
    entryPrice: snapshot.priceUsd,
    entryTime: at,
    stopPrice: snapshot.priceUsd * STOP_MULT,
    targetPrice: snapshot.priceUsd * TARGET_MULT,
    maxHoldSec: MAX_HOLD_SEC,
    stakeSol,
    entryFdv: snapshot.fdvUsd,
    stopFdv: snapshot.fdvUsd * STOP_MULT,
    targetFdv: snapshot.fdvUsd * TARGET_MULT,
  };
}

export const RULES = {
  TARGET_MULT,
  STOP_MULT,
  MAX_HOLD_SEC,
  MAX_POOL_AGE_SEC,
  MOMENTUM_TX_M5,
  DIP_FRACTION,
};

/** The shared exit rule in words, so the terminal and the panel cannot disagree. */
export const EXIT_RULE = `${TARGET_MULT}× target, −${Math.round((1 - STOP_MULT) * 100)}% stop, ${
  MAX_HOLD_SEC / 60
}-minute cap`;
