import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, type LineKind } from '../state/store';
import { COMMANDS, runCommand, type WindowId } from './commands';

const TONE: Record<LineKind, string> = {
  launch: 'text-neutral-500',
  migrate: 'text-sky-400',
  entry: 'text-neutral-200',
  exit: 'text-neutral-200',
  system: 'text-neutral-600',
  command: 'text-green-400',
  output: 'text-neutral-300',
  error: 'text-red-400',
};

const PREFIX: Partial<Record<LineKind, string>> = {
  launch: '+',
  migrate: '↑',
  entry: '▸',
  exit: '▾',
  command: '›',
  error: '!',
};

function TokenLink({ mint }: { mint: string }) {
  return (
    <a
      href={`https://pump.fun/coin/${mint}`}
      target="_blank"
      rel="noreferrer noopener"
      onClick={(e) => e.stopPropagation()}
      title={`Open ${mint} on pump.fun`}
      aria-label="Open on pump.fun"
      className="ml-1.5 inline-block align-baseline text-neutral-700 transition-colors hover:text-green-400"
    >
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
        <path d="M3.5 1h5.5v5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
        <path d="M9 1L4 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
        <path d="M7 7.5V9H1V3h1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
      </svg>
    </a>
  );
}

export function Terminal({ openWindow }: { openWindow: (id: WindowId) => void }) {
  const feed = useStore((s) => s.feed);
  const wsStatus = useStore((s) => s.wsStatus);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [feed.length]);

  const submit = () => {
    if (!input.trim()) return;
    runCommand(input, openWindow);
    setHistory((h) => [...h, input]);
    setCursor(-1);
    setInput('');
  };

  const recall = (delta: number) => {
    if (history.length === 0) return;
    const next = Math.min(history.length - 1, Math.max(0, (cursor === -1 ? history.length : cursor) + delta));
    setCursor(next);
    setInput(history[next] ?? '');
  };

  const suggestion =
    input.startsWith('/') && input.length > 1
      ? COMMANDS.find(([name]) => name.startsWith(input.toLowerCase()))?.[0]
      : undefined;

  return (
    <div
      className="flex h-full flex-col bg-neutral-950 font-mono text-[13px] leading-relaxed"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-end space-y-0.5 overflow-y-auto px-4 py-3">
        <AnimatePresence initial={false}>
          {feed.map((line) => (
            <motion.p
              key={line.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className={`break-words whitespace-pre-wrap ${TONE[line.kind]}`}
              style={line.accent ? { color: line.accent } : undefined}
            >
              {PREFIX[line.kind] ? `${PREFIX[line.kind]} ` : '  '}
              {line.text}
              {line.mint && <TokenLink mint={line.mint} />}
            </motion.p>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-neutral-800 px-4 py-2.5">
        <span className={wsStatus === 'open' ? 'text-green-400' : 'text-neutral-600'}>&rsaquo;</span>
        <div className="relative flex-1">
          {suggestion && suggestion !== input && (
            <span className="pointer-events-none absolute inset-0 text-neutral-700">
              <span className="invisible">{input}</span>
              {suggestion.slice(input.length)}
            </span>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              else if (e.key === 'Tab' && suggestion) {
                e.preventDefault();
                setInput(suggestion);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                recall(-1);
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                recall(1);
              }
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="type /help"
            aria-label="Terminal input"
            className="relative w-full bg-transparent text-neutral-100 caret-green-400 outline-none placeholder:text-neutral-700"
          />
        </div>
      </div>
    </div>
  );
}
