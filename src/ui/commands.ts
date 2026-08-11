import { fdv, pct, sol } from '../format';
import { strategyStats } from '../sim/settle';
import { EXIT_RULE, STRATEGIES, strategyById } from '../sim/strategies';
import { INITIAL_BALANCE_SOL, STAKE_SOL, useStore } from '../state/store';

export type WindowId = 'positions' | 'history' | 'strategies' | 'about';

const pad = (value: string, width: number) => value.padEnd(width).slice(0, width);

export const COMMANDS = [
  ['/help', 'this list'],
  ['/status', 'stream, scan and mood'],
  ['/positions', 'open paper positions'],
  ['/history', 'closed trades'],
  ['/strategies', 'the three rules and their records'],
  ['/reset', 'wipe this session'],
] as const;

export function runCommand(raw: string, openWindow: (id: WindowId) => void): void {
  const { push } = useStore.getState();
  const input = raw.trim();
  if (!input) return;

  push('command', input);
  const [command] = input.toLowerCase().split(/\s+/);

  switch (command) {
    case '/help':
      push('output', 'Commands:');
      for (const [name, blurb] of COMMANDS) push('output', `  ${pad(name, 14)}${blurb}`);
      break;

    case '/status': {
      const s = useStore.getState();
      const ago = s.lastPollAt ? `${Math.round((Date.now() - s.lastPollAt) / 1000)}s ago` : 'never';
      const staked = s.positions.reduce((sum, p) => sum + p.stakeSol, 0);
      push('output', `stream         ${s.wsStatus}`);
      push('output', `trading now    ${strategyById(s.activeStrategy).name}`);
      push('output', `balance        ${s.balanceSol.toFixed(2)} SOL of ${INITIAL_BALANCE_SOL}`);
      push('output', `staked         ${staked.toFixed(2)} SOL in ${s.positions.length} positions`);
      push('output', `launches seen  ${s.launches}`);
      push('output', `graduations    ${s.migrations}`);
      push('output', `last pool scan ${ago}`);
      push('output', `closed         ${s.closed.length}`);
      break;
    }

    case '/positions': {
      const { positions } = useStore.getState();
      if (positions.length === 0) {
        push('output', 'No open positions. Ribbit is being picky.');
        break;
      }
      const { marks } = useStore.getState();
      push(
        'output',
        `${pad('STRATEGY', 11)}${pad('TOKEN', 12)}${pad('ENTRY', 10)}${pad('NOW', 10)}${pad('P&L', 9)}HELD`,
      );
      for (const p of positions) {
        const held = Math.round(Date.now() / 1000 - p.entryTime);
        const mark = marks[p.id];
        const now = mark ? fdv(p.entryFdv * (1 + mark.pnlPct / 100)) : '-';
        const change = mark ? pct(mark.pnlPct) : '-';
        push(
          'output',
          `${pad(p.strategy.toUpperCase(), 11)}${pad(p.label, 12)}${pad(fdv(p.entryFdv), 10)}${pad(
            now,
            10,
          )}${pad(change, 9)}${Math.floor(held / 60)}m`,
        );
      }
      openWindow('positions');
      break;
    }

    case '/history': {
      const { closed } = useStore.getState();
      if (closed.length === 0) {
        push('output', 'Nothing has closed yet.');
        break;
      }
      for (const t of closed.slice(-12)) {
        push(
          'output',
          `${pad(t.strategy.toUpperCase(), 11)}${pad(t.label, 12)}${pad(t.status, 9)}${pad(
            `${sol(t.pnlSol)} SOL`,
            12,
          )}${pct(t.pnlPct)}`,
        );
      }
      openWindow('history');
      break;
    }

    case '/strategies': {
      const { closed, activeStrategy } = useStore.getState();
      for (const def of STRATEGIES) {
        const { stats, pnlSol } = strategyStats(closed, def.id);
        push('output', `${def.name}${def.id === activeStrategy ? '  ← trading now' : ''}`, def.color);
        push('output', `  ${def.blurb}`);
        push('output', `  ${stats.trades} trades · ${stats.winRatePct.toFixed(0)}% win · ${sol(pnlSol)} SOL`);
      }
      push(
        'output',
        `One trades at a time, rotating every 4 minutes, ${STAKE_SOL} SOL a position from a shared balance.`,
      );
      push('output', `All three exit the same way: ${EXIT_RULE}.`);
      openWindow('strategies');
      break;
    }

    case '/reset':
      useStore.getState().reset();
      break;

    default:
      push('error', `Unknown command: ${command}. Try /help`);
  }
}
