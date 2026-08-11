import { describe, expect, it } from 'vitest';
import { RULES, isTradeable, openPosition, strategyById } from './strategies';
import type { PoolMemory, PoolSnapshot } from './types';

const snapshot = (over: Partial<PoolSnapshot> = {}): PoolSnapshot => ({
  address: 'POOL',
  mint: 'MINT',
  name: 'Frog / SOL',
  symbol: 'FROG',
  imageUrl: null,
  priceUsd: 100,
  fdvUsd: 10_000,
  createdAt: 1000,
  seenAt: 1060,
  txM5: 5,
  ...over,
});

const memory: PoolMemory = { firstPriceUsd: 100 };

describe('isTradeable', () => {
  it('accepts a young pool with a price', () => {
    expect(isTradeable(snapshot())).toBe(true);
  });

  it('rejects a pool with no price', () => {
    expect(isTradeable(snapshot({ priceUsd: 0 }))).toBe(false);
  });

  it('rejects a pool older than the age ceiling', () => {
    expect(isTradeable(snapshot({ seenAt: 1000 + RULES.MAX_POOL_AGE_SEC + 1 }))).toBe(false);
  });
});

describe('fresh', () => {
  const fresh = strategyById('fresh');

  it('enters on first sighting', () => {
    expect(fresh.decide(snapshot(), memory, true)).toBe(true);
  });

  it('never enters the same pool twice', () => {
    expect(fresh.decide(snapshot(), memory, false)).toBe(false);
  });
});

describe('dip', () => {
  const dip = strategyById('dip');

  it('does not enter on first sighting, however low the price', () => {
    expect(dip.decide(snapshot({ priceUsd: 1 }), memory, true)).toBe(false);
  });

  it('enters once price falls to the dip fraction', () => {
    expect(dip.decide(snapshot({ priceUsd: 80 }), memory, false)).toBe(true);
  });

  it('waits while the drawdown is shallower than the threshold', () => {
    expect(dip.decide(snapshot({ priceUsd: 81 }), memory, false)).toBe(false);
  });
});

describe('momentum', () => {
  const momentum = strategyById('momentum');

  it('enters at the transaction threshold', () => {
    expect(momentum.decide(snapshot({ txM5: RULES.MOMENTUM_TX_M5 }), memory, true)).toBe(true);
  });

  it('stays out below the threshold', () => {
    expect(momentum.decide(snapshot({ txM5: RULES.MOMENTUM_TX_M5 - 1 }), memory, true)).toBe(false);
  });
});

describe('openPosition', () => {
  it('derives stop and target from the entry price', () => {
    const position = openPosition('fresh', snapshot(), 2000, 2);
    expect(position.entryPrice).toBe(100);
    expect(position.targetPrice).toBeCloseTo(200);
    expect(position.stopPrice).toBeCloseTo(70);
    expect(position.entryTime).toBe(2000);
    expect(position.maxHoldSec).toBe(RULES.MAX_HOLD_SEC);
    expect(position.stakeSol).toBe(2);
  });

  it('scales the valuation levels by the same multiples as price', () => {
    const position = openPosition('fresh', snapshot({ fdvUsd: 30_000 }), 2000, 2);
    expect(position.entryFdv).toBe(30_000);
    expect(position.targetFdv).toBeCloseTo(60_000);
    expect(position.stopFdv).toBeCloseTo(21_000);
    expect(position.targetFdv / position.entryFdv).toBeCloseTo(position.targetPrice / position.entryPrice);
  });

  it('carries the mint and artwork through for linking', () => {
    const position = openPosition('fresh', snapshot({ mint: 'ABC', imageUrl: 'x.png' }), 2000, 2);
    expect(position.mint).toBe('ABC');
    expect(position.imageUrl).toBe('x.png');
  });

  it('gives every strategy the same exits for the same entry', () => {
    const a = openPosition('fresh', snapshot(), 2000, 2);
    const b = openPosition('momentum', snapshot(), 2000, 2);
    expect(a.stopPrice).toBe(b.stopPrice);
    expect(a.targetPrice).toBe(b.targetPrice);
    expect(a.id).not.toBe(b.id);
  });

  it('keeps max hold well inside the candle history window', () => {
    // GeckoTerminal serves 1000 one-minute candles, roughly 16.6 hours.
    expect(RULES.MAX_HOLD_SEC).toBeLessThan(1000 * 60);
  });
});
