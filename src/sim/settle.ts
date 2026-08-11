import type { Candle, ClosedTrade, Position, Settlement, StrategyId } from './types';

const pnl = (entry: number, exit: number) => ((exit - entry) / entry) * 100;

/**
 * Resolve a position against the candle history that followed its entry.
 *
 * Candles must be ascending by `t`. The walk stops at `entryTime + maxHoldSec`.
 *
 * When a single candle's range touches both the stop and the target, the stop is
 * taken. A one-minute candle records no ordering within itself, so the outcome is
 * genuinely unknown; resolving it against the position is the standard backtest
 * convention and keeps reported results from drifting optimistic.
 */
export function settle(position: Position, candles: Candle[], nowSec: number): Settlement {
  const { entryPrice, entryTime, stopPrice, targetPrice, maxHoldSec } = position;
  const deadline = entryTime + maxHoldSec;

  let lastClose = entryPrice;
  let lastTime = entryTime;

  for (const candle of candles) {
    if (candle.t < entryTime) continue;
    if (candle.t > deadline) break;

    if (candle.l <= stopPrice) {
      return {
        status: 'stop',
        exitPrice: stopPrice,
        exitTime: candle.t,
        pnlPct: pnl(entryPrice, stopPrice),
      };
    }

    if (candle.h >= targetPrice) {
      return {
        status: 'target',
        exitPrice: targetPrice,
        exitTime: candle.t,
        pnlPct: pnl(entryPrice, targetPrice),
      };
    }

    lastClose = candle.c;
    lastTime = candle.t;
  }

  if (nowSec >= deadline) {
    return {
      status: 'expired',
      exitPrice: lastClose,
      exitTime: Math.max(lastTime, deadline),
      pnlPct: pnl(entryPrice, lastClose),
    };
  }

  return {
    status: 'open',
    exitPrice: null,
    exitTime: null,
    pnlPct: pnl(entryPrice, lastClose),
  };
}

export interface Stats {
  trades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  /** Mean of the per-trade percentages, which models a constant stake rather than a
   * compounding balance - every position here is the same size, so the two agree. */
  avgPnlPct: number;
  bestPnlPct: number;
  worstPnlPct: number;
}

const EMPTY: Stats = {
  trades: 0,
  wins: 0,
  losses: 0,
  winRatePct: 0,
  avgPnlPct: 0,
  bestPnlPct: 0,
  worstPnlPct: 0,
};

/** Aggregate closed trades. */
export function summarize(trades: { pnlPct: number }[]): Stats {
  if (trades.length === 0) return { ...EMPTY };

  const pnls = trades.map((t) => t.pnlPct);
  const total = pnls.reduce((a, b) => a + b, 0);
  const wins = trades.filter((t) => t.pnlPct > 0).length;

  return {
    trades: trades.length,
    wins,
    losses: trades.filter((t) => t.pnlPct <= 0).length,
    winRatePct: (wins / trades.length) * 100,
    avgPnlPct: total / trades.length,
    bestPnlPct: Math.max(...pnls),
    worstPnlPct: Math.min(...pnls),
  };
}

/**
 * Everything the UI shows about one strategy's record. Both the terminal command and
 * the panel need exactly this, and used to compute it separately.
 */
export function strategyStats(closed: ClosedTrade[], strategy: StrategyId) {
  const trades = closed.filter((t) => t.strategy === strategy);
  return {
    stats: summarize(trades),
    pnlSol: trades.reduce((sum, t) => sum + t.pnlSol, 0),
  };
}
