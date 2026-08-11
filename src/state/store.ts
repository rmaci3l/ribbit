import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClosedTrade, PoolMemory, PoolSnapshot, Position, StrategyId } from '../sim/types';
import { STRATEGIES, isTradeable, openPosition, strategyById } from '../sim/strategies';
import { fdv } from '../format';

export type LineKind = 'launch' | 'migrate' | 'entry' | 'exit' | 'system' | 'command' | 'output' | 'error';

interface FeedLine {
  id: string;
  kind: LineKind;
  text: string;
  at: number;
  accent?: string;
  mint?: string;
}

export type Mood = 'idle' | 'watching' | 'excited' | 'happy' | 'sad' | 'sleeping';
type WsStatus = 'connecting' | 'open' | 'closed';

const MAX_FEED = 250;
const MOOD_HOLD_MS = 3200;

export const INITIAL_BALANCE_SOL = 50;
export const STAKE_SOL = 2;

const MAX_OPEN_POSITIONS = 6;
const MAX_ENTRIES_PER_SCAN = 2;

/**
 * Latest observation of an open position, taken from the candles the settlement pass
 * already downloads. Not persisted - a mark is only meaningful as long as it is fresh.
 */
interface Mark {
  pnlPct: number;
  at: number;
}

interface State {
  feed: FeedLine[];
  marks: Record<string, Mark>;
  memory: Record<string, PoolMemory>;
  entered: Record<string, true>;
  positions: Position[];
  closed: ClosedTrade[];
  balanceSol: number;
  activeStrategy: StrategyId;
  launches: number;
  migrations: number;
  wsStatus: WsStatus;
  mood: Mood;
  moodUntil: number;
  lastPollAt: number | null;

  push(kind: LineKind, text: string, accent?: string, mint?: string): void;
  setWsStatus(status: WsStatus): void;
  setMood(mood: Mood, sticky?: boolean): void;
  countLaunch(migration: boolean): void;
  markPosition(id: string, pnlPct: number): void;
  rotateStrategy(): void;
  observe(snapshots: PoolSnapshot[]): void;
  closePosition(position: Position, outcome: Omit<ClosedTrade, keyof Position | 'pnlSol'>): void;
  markPolled(): void;
  reset(): void;
}

const id = () => Math.random().toString(36).slice(2, 10);
const key = (strategy: StrategyId, pool: string) => `${strategy}:${pool}`;

const fresh = {
  feed: [] as FeedLine[],
  marks: {} as Record<string, Mark>,
  memory: {} as Record<string, PoolMemory>,
  entered: {} as Record<string, true>,
  positions: [] as Position[],
  closed: [] as ClosedTrade[],
  balanceSol: INITIAL_BALANCE_SOL,
  activeStrategy: 'fresh' as StrategyId,
  launches: 0,
  migrations: 0,
  lastPollAt: null,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...fresh,
      wsStatus: 'connecting',
      mood: 'idle',
      moodUntil: 0,

      push(kind, text, accent, mint) {
        set((s) => ({
          feed: [...s.feed, { id: id(), kind, text, at: Date.now(), accent, mint }].slice(-MAX_FEED),
        }));
      },

      setWsStatus(wsStatus) {
        set({ wsStatus });
      },

      setMood(mood, sticky = false) {
        set({ mood, moodUntil: sticky ? 0 : Date.now() + MOOD_HOLD_MS });
      },

      countLaunch(migration) {
        set((s) => (migration ? { migrations: s.migrations + 1 } : { launches: s.launches + 1 }));
      },

      markPosition(id, pnlPct) {
        set((s) => ({ marks: { ...s.marks, [id]: { pnlPct, at: Date.now() } } }));
      },

      rotateStrategy() {
        const current = get().activeStrategy;
        const index = STRATEGIES.findIndex((s) => s.id === current);
        const next = STRATEGIES[(index + 1) % STRATEGIES.length]!;
        set({ activeStrategy: next.id });
        get().push('system', `Shift change. ${next.name} is trading now.`, next.color);
      },

      observe(snapshots) {
        const { memory, entered, activeStrategy, balanceSol, positions } = get();
        const strategy = strategyById(activeStrategy);
        const nextMemory = { ...memory };
        const nextEntered = { ...entered };
        const opened: Position[] = [];

        let budget = balanceSol;
        let slots = MAX_OPEN_POSITIONS - positions.length;

        for (const snapshot of snapshots) {
          if (!isTradeable(snapshot)) continue;

          const isFirstSighting = !nextMemory[snapshot.address];
          const poolMemory = nextMemory[snapshot.address] ?? { firstPriceUsd: snapshot.priceUsd };
          nextMemory[snapshot.address] = poolMemory;

          if (opened.length >= MAX_ENTRIES_PER_SCAN || slots <= 0 || budget < STAKE_SOL) continue;

          const k = key(strategy.id, snapshot.address);
          if (nextEntered[k]) continue;
          if (!strategy.decide(snapshot, poolMemory, isFirstSighting)) continue;

          nextEntered[k] = true;
          budget -= STAKE_SOL;
          slots -= 1;
          opened.push(openPosition(strategy.id, snapshot, snapshot.seenAt, STAKE_SOL));
        }

        set((s) => ({
          memory: nextMemory,
          entered: nextEntered,
          positions: [...s.positions, ...opened],
          balanceSol: s.balanceSol - opened.length * STAKE_SOL,
        }));

        for (const position of opened) {
          get().push(
            'entry',
            `${strategy.name} bought ${position.label} with ${STAKE_SOL} SOL at ${fdv(position.entryFdv)}`,
            strategy.color,
            position.mint,
          );
        }
        if (opened.length > 0) get().setMood('excited');
      },

      closePosition(position, outcome) {
        const pnlSol = position.stakeSol * (outcome.pnlPct / 100);
        const trade: ClosedTrade = { ...position, ...outcome, pnlSol };

        set((s) => {
          const { [position.id]: _closed, ...marks } = s.marks;
          return {
            positions: s.positions.filter((p) => p.id !== position.id),
            closed: [...s.closed, trade].slice(-500),
            balanceSol: s.balanceSol + position.stakeSol + pnlSol,
            marks,
          };
        });

        const def = strategyById(position.strategy);
        const sign = pnlSol >= 0 ? '+' : '';
        get().push(
          'exit',
          `${def.name} sold ${position.label} - ${trade.status} ${sign}${pnlSol.toFixed(2)} SOL (${sign}${trade.pnlPct.toFixed(1)}%)`,
          def.color,
          position.mint,
        );
        get().setMood(pnlSol > 0 ? 'happy' : 'sad');
      },

      markPolled() {
        set({ lastPollAt: Date.now() });
      },

      reset() {
        set({ ...fresh });
        get().push('system', `Session cleared. Balance back to ${INITIAL_BALANCE_SOL} SOL.`);
      },
    }),
    {
      name: 'ribbit-session-v2',
      partialize: (s) => ({
        memory: s.memory,
        entered: s.entered,
        positions: s.positions,
        closed: s.closed,
        balanceSol: s.balanceSol,
        activeStrategy: s.activeStrategy,
        launches: s.launches,
        migrations: s.migrations,
      }),
    },
  ),
);
