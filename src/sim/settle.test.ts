import { describe, expect, it } from 'vitest';
import { settle, summarize } from './settle';
import type { Candle, Position } from './types';

const position: Position = {
  id: 'p1',
  strategy: 'fresh',
  pool: 'POOL',
  mint: 'MINT',
  label: 'FROG',
  imageUrl: null,
  entryPrice: 100,
  entryTime: 1000,
  stopPrice: 70,
  targetPrice: 200,
  maxHoldSec: 600,
  stakeSol: 2,
  entryFdv: 10_000,
  stopFdv: 7_000,
  targetFdv: 20_000,
};

const candle = (t: number, l: number, h: number, c = (l + h) / 2): Candle => ({
  t,
  o: c,
  h,
  l,
  c,
  v: 1,
});

describe('settle', () => {
  it('stays open while nothing is touched and the deadline has not passed', () => {
    const result = settle(position, [candle(1060, 90, 110, 105)], 1200);
    expect(result.status).toBe('open');
    expect(result.exitPrice).toBeNull();
    expect(result.pnlPct).toBeCloseTo(5);
  });

  it('closes at the target price, not the candle high', () => {
    const result = settle(position, [candle(1060, 150, 260)], 1200);
    expect(result.status).toBe('target');
    expect(result.exitPrice).toBe(200);
    expect(result.exitTime).toBe(1060);
    expect(result.pnlPct).toBeCloseTo(100);
  });

  it('closes at the stop price, not the candle low', () => {
    const result = settle(position, [candle(1060, 40, 90)], 1200);
    expect(result.status).toBe('stop');
    expect(result.exitPrice).toBe(70);
    expect(result.pnlPct).toBeCloseTo(-30);
  });

  it('takes the stop when one candle touches both', () => {
    const result = settle(position, [candle(1060, 40, 260)], 1200);
    expect(result.status).toBe('stop');
  });

  it('resolves on the earliest qualifying candle', () => {
    const candles = [candle(1060, 90, 110), candle(1120, 40, 90), candle(1180, 150, 260)];
    const result = settle(position, candles, 1300);
    expect(result.status).toBe('stop');
    expect(result.exitTime).toBe(1120);
  });

  it('expires at the last close once max hold elapses', () => {
    const result = settle(position, [candle(1060, 100, 140, 130)], 2000);
    expect(result.status).toBe('expired');
    expect(result.exitPrice).toBe(130);
    expect(result.pnlPct).toBeCloseTo(30);
  });

  it('ignores candles before entry', () => {
    const result = settle(position, [candle(500, 10, 20), candle(1060, 90, 110, 105)], 1200);
    expect(result.status).toBe('open');
    expect(result.pnlPct).toBeCloseTo(5);
  });

  it('ignores candles past the deadline', () => {
    const result = settle(position, [candle(9000, 10, 500)], 1200);
    expect(result.status).toBe('open');
  });

  it('handles an empty history', () => {
    const result = settle(position, [], 1200);
    expect(result.status).toBe('open');
    expect(result.pnlPct).toBe(0);
  });

  it('expires flat when the deadline passes with no candles at all', () => {
    const result = settle(position, [], 5000);
    expect(result.status).toBe('expired');
    expect(result.exitPrice).toBe(100);
    expect(result.pnlPct).toBe(0);
  });
});

describe('summarize', () => {
  it('returns zeroes for no trades', () => {
    expect(summarize([]).trades).toBe(0);
    expect(summarize([]).winRatePct).toBe(0);
  });

  it('counts wins, losses and extremes', () => {
    const stats = summarize([{ pnlPct: 100 }, { pnlPct: -30 }, { pnlPct: -30 }, { pnlPct: 12 }]);
    expect(stats.trades).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(2);
    expect(stats.winRatePct).toBeCloseTo(50);
    expect(stats.avgPnlPct).toBeCloseTo(13);
    expect(stats.bestPnlPct).toBe(100);
    expect(stats.worstPnlPct).toBe(-30);
  });

  it('treats a flat trade as a loss rather than a win', () => {
    expect(summarize([{ pnlPct: 0 }]).wins).toBe(0);
    expect(summarize([{ pnlPct: 0 }]).losses).toBe(1);
  });
});
