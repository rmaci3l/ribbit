import { fdv, pct, sol } from '../format';
import { useNow } from '../hooks/useNow';
import { strategyStats } from '../sim/settle';
import { EXIT_RULE, STRATEGIES, strategyById } from '../sim/strategies';
import { useStore } from '../state/store';

const tone = (value: number) =>
  value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-neutral-400';

function TokenCell({ symbol, mint, imageUrl }: { symbol: string; mint: string; imageUrl: string | null }) {
  return (
    <span className="flex items-center gap-2">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          className="h-4 w-4 shrink-0 rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full bg-neutral-800" />
      )}
      <a
        href={`https://pump.fun/coin/${mint}`}
        target="_blank"
        rel="noreferrer noopener"
        title={mint}
        className="truncate text-neutral-200 underline-offset-2 hover:text-green-400 hover:underline"
      >
        {symbol}
      </a>
    </span>
  );
}

export function PositionsPanel() {
  const positions = useStore((s) => s.positions);
  const marks = useStore((s) => s.marks);
  const now = useNow(30_000);

  if (positions.length === 0) {
    return <Empty>Nothing open. Ribbit is waiting for a pool worth touching.</Empty>;
  }

  const openPnlSol = positions.reduce(
    (sum, p) => sum + (marks[p.id] ? p.stakeSol * (marks[p.id]!.pnlPct / 100) : 0),
    0,
  );

  return (
    <div>
      <table className="w-full font-mono text-[12px]">
        <thead className="text-[10px] tracking-widest text-neutral-600 uppercase">
          <tr>
            <Th>Token</Th>
            <Th right>Entry / stop</Th>
            <Th right>Now</Th>
            <Th right>Target</Th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const def = strategyById(p.strategy);
            const heldMin = Math.floor((now / 1000 - p.entryTime) / 60);
            const mark = marks[p.id];
            return (
              <tr key={p.id} className="border-t border-neutral-900 align-top">
                <Td>
                  <TokenCell symbol={p.label} mint={p.mint} imageUrl={p.imageUrl} />
                  <span className="mt-0.5 block text-[10px]" style={{ color: def.color }}>
                    {def.name} · {p.stakeSol} SOL · {heldMin}m
                  </span>
                </Td>
                <Td right>
                  {fdv(p.entryFdv)}
                  <span className="mt-0.5 block text-[10px] text-red-400/70">{fdv(p.stopFdv)}</span>
                </Td>
                <Td right>
                  {mark ? (
                    <>
                      <span className={tone(mark.pnlPct)}>{fdv(p.entryFdv * (1 + mark.pnlPct / 100))}</span>
                      <span className={`mt-0.5 block text-[10px] ${tone(mark.pnlPct)}`}>
                        {pct(mark.pnlPct)}
                      </span>
                    </>
                  ) : (
                    <span className="text-neutral-700">-</span>
                  )}
                </Td>
                <Td right className="text-green-400/70">
                  {fdv(p.targetFdv)}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-neutral-900 px-3 py-2 font-mono text-[10px] text-neutral-600">
        Unrealized <span className={tone(openPnlSol)}>{sol(openPnlSol)} SOL</span> · marks refresh as the
        settlement pass reaches each pool, so a row can be a couple of minutes stale.
      </p>
    </div>
  );
}

export function HistoryPanel() {
  const closed = useStore((s) => s.closed);

  if (closed.length === 0) return <Empty>No trade has closed yet.</Empty>;

  return (
    <table className="w-full font-mono text-[12px]">
      <thead className="text-[10px] tracking-widest text-neutral-600 uppercase">
        <tr>
          <Th>Token</Th>
          <Th>Out</Th>
          <Th right>SOL</Th>
          <Th right>P&L</Th>
        </tr>
      </thead>
      <tbody>
        {[...closed].reverse().map((t) => {
          const def = strategyById(t.strategy);
          return (
            <tr key={t.id} className="border-t border-neutral-900">
              <Td>
                <TokenCell symbol={t.label} mint={t.mint} imageUrl={t.imageUrl} />
                <span className="mt-0.5 block text-[10px]" style={{ color: def.color }}>
                  {def.name} · {fdv(t.entryFdv)}
                </span>
              </Td>
              <Td>{t.status}</Td>
              <Td right className={tone(t.pnlSol)}>
                {sol(t.pnlSol)}
              </Td>
              <Td right className={tone(t.pnlPct)}>
                {pct(t.pnlPct)}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function StrategiesPanel() {
  const closed = useStore((s) => s.closed);
  const active = useStore((s) => s.activeStrategy);

  return (
    <div className="space-y-4 p-4 font-mono text-[12px]">
      {STRATEGIES.map((def) => {
        const { stats, pnlSol } = strategyStats(closed, def.id);
        return (
          <div key={def.id} className={`space-y-1.5 ${def.id === active ? '' : 'opacity-60'}`}>
            <div className="flex items-baseline justify-between gap-3">
              <span style={{ color: def.color }}>
                {def.name}
                {def.id === active && <span className="ml-2 text-[10px] text-neutral-500">trading now</span>}
              </span>
              <span className={tone(pnlSol)}>{sol(pnlSol)} SOL</span>
            </div>
            <p className="text-neutral-500">{def.blurb}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-neutral-900">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${stats.winRatePct}%`, background: def.color }}
              />
            </div>
            <p className="text-[11px] text-neutral-600">
              {stats.trades} trades · {stats.wins}W / {stats.losses}L · avg {pct(stats.avgPnlPct)}
              {stats.trades > 0 && (
                <>
                  {' '}
                  · best {pct(stats.bestPnlPct)} · worst {pct(stats.worstPnlPct)}
                </>
              )}
            </p>
          </div>
        );
      })}
      <p className="border-t border-neutral-900 pt-3 text-[11px] text-neutral-600">
        One strategy trades at a time and they rotate every four minutes, sharing a single balance. Identical
        exits everywhere: {EXIT_RULE}. Only the entry rule differs, so the comparison measures entry timing
        and nothing else.
      </p>
    </div>
  );
}

export function AboutPanel() {
  return (
    <div className="space-y-3 p-4 text-[12px] leading-relaxed text-neutral-400">
      <p>
        <span className="text-green-400">Ribbit</span> watches real Solana token launches over PumpPortal's
        public websocket, and paper-trades newly created pools using price data from GeckoTerminal's public
        API. Three fixed strategies run in parallel on every candidate.
      </p>
      <p>
        <span className="text-neutral-200">This is a proof-of-concept.</span> Three strategy implementations
        driven by real-time data, rendered through a dynamic interface. Every trade is simulated.
      </p>
      <p>
        Positions are not watched by a running process. They settle by replaying one-minute candle history
        from the entry timestamp forward, which is deterministic and reproducible. Entry prices come from an
        API polled once a minute, so a real bot would fill differently, and worse.
      </p>
      <p className="text-neutral-600">
        Token names and symbols come straight from the launch feed, which is unmoderated. Some of them are
        offensive.
      </p>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center font-mono text-[12px] text-neutral-600">{children}</p>;
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-3 py-2 font-normal ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function Td({
  children,
  right,
  className = '',
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return <td className={`px-3 py-1.5 ${right ? 'text-right' : 'text-left'} ${className}`}>{children}</td>;
}
