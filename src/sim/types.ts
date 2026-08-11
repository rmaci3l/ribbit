/** All times are epoch seconds. All prices are USD per base token. */

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type StrategyId = 'fresh' | 'dip' | 'momentum';

export interface PoolSnapshot {
  address: string;
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  priceUsd: number;
  fdvUsd: number;
  createdAt: number;
  seenAt: number;
  txM5: number;
}

export interface PoolMemory {
  firstPriceUsd: number;
}

export interface Position {
  id: string;
  strategy: StrategyId;
  pool: string;
  mint: string;
  label: string;
  imageUrl: string | null;
  entryPrice: number;
  entryTime: number;
  stopPrice: number;
  targetPrice: number;
  maxHoldSec: number;
  stakeSol: number;
  entryFdv: number;
  stopFdv: number;
  targetFdv: number;
}

export type TradeStatus = 'open' | 'target' | 'stop' | 'expired';

export interface Settlement {
  status: TradeStatus;
  exitPrice: number | null;
  exitTime: number | null;
  pnlPct: number;
}

export interface ClosedTrade extends Position {
  status: Exclude<TradeStatus, 'open'>;
  exitPrice: number;
  exitTime: number;
  pnlPct: number;
  pnlSol: number;
}
