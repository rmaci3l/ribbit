import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePumpPortal } from './hooks/usePumpPortal';
import { useTradingLoop } from './hooks/useTradingLoop';
import { useMood } from './hooks/useMood';
import { useStore } from './state/store';
import { strategyById } from './sim/strategies';
import { Ribbit } from './mascot/Ribbit';
import { Terminal } from './ui/Terminal';
import { Window } from './ui/Window';
import { Dock } from './ui/Dock';
import { AboutPanel, HistoryPanel, PositionsPanel, StrategiesPanel } from './ui/panels';
import type { WindowId } from './ui/commands';

const PANELS: Record<WindowId, { title: string; body: React.ReactNode; at: { x: number; y: number } }> = {
  positions: { title: 'Open positions', body: <PositionsPanel />, at: { x: -430, y: -140 } },
  history: { title: 'Trade history', body: <HistoryPanel />, at: { x: 430, y: -80 } },
  strategies: { title: 'Strategies', body: <StrategiesPanel />, at: { x: -400, y: 150 } },
  about: { title: 'About', body: <AboutPanel />, at: { x: 410, y: 170 } },
};

export default function App() {
  usePumpPortal();
  useTradingLoop();

  const mood = useMood();
  const wsStatus = useStore((s) => s.wsStatus);
  const launches = useStore((s) => s.launches);
  const openCount = useStore((s) => s.positions.length);
  const balanceSol = useStore((s) => s.balanceSol);
  const activeStrategy = useStore((s) => s.activeStrategy);
  const push = useStore((s) => s.push);
  const active = strategyById(activeStrategy);

  const [stack, setStack] = useState<WindowId[]>([]);

  useEffect(() => {
    push('system', 'Ribbit online. Watching pump.fun launches, paper-trading new pools.');
    push('system', 'Type /help for commands. Every trade is simulated.');
  }, [push]);

  const openWindow = useCallback((id: WindowId) => {
    setStack((s) => [...s.filter((w) => w !== id), id]);
  }, []);

  const toggleWindow = useCallback((id: WindowId) => {
    setStack((s) => (s.includes(id) ? s.filter((w) => w !== id) : [...s, id]));
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950 text-neutral-300">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(64,64,64,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(64,64,64,0.35) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)',
        }}
      />

      <header className="relative z-20 flex items-center justify-between px-6 py-4 font-mono text-[12px] tracking-widest uppercase">
        <span className="font-black text-green-400">ribbit</span>
        <div className="flex items-center gap-5 text-[10px] text-neutral-500">
          <span>{launches} launches seen</span>
          <span>{openCount} open</span>
          <span className="font-bold text-neutral-300">{balanceSol.toFixed(2)} SOL</span>
          <span className="flex items-center gap-2">
            <i
              className={`h-1.5 w-1.5 rounded-full ${
                wsStatus === 'open' ? 'animate-pulse bg-green-400' : 'bg-neutral-700'
              }`}
            />
            {wsStatus}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-32">
        <Ribbit mood={mood} label={active.name} labelColor={active.color} />

        <Window
          title="ribbit - paper trading terminal"
          draggable={false}
          className="h-[55vh] max-h-[520px] w-full max-w-3xl"
        >
          <Terminal openWindow={openWindow} />
        </Window>
      </main>

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <AnimatePresence>
          {stack.map((id, index) => (
            <Window
              key={id}
              title={PANELS[id].title}
              initial={PANELS[id].at}
              zIndex={40 + index}
              onClose={() => toggleWindow(id)}
              onFocus={() => openWindow(id)}
              className="absolute max-h-[400px] w-[min(92vw,420px)]"
            >
              {PANELS[id].body}
            </Window>
          ))}
        </AnimatePresence>
      </div>

      <footer className="fixed inset-x-0 bottom-5 z-40 flex justify-center">
        <Dock open={stack} onToggle={toggleWindow} />
      </footer>
    </div>
  );
}
