import { useEffect } from 'react';
import { useStore } from '../state/store';
import { fetchToken } from '../data/geckoterminal';
import { isCoolingDown } from '../data/limiter';

const URL = 'wss://pumpportal.fun/api/data';

/**
 * PumpPortal bans clients that open several sockets at once, so the connection is a
 * module singleton rather than component state. React StrictMode mounts effects
 * twice in development and would otherwise trip that.
 */
let socket: WebSocket | null = null;
let retry = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

interface PumpEvent {
  message?: string;
  signature?: string;
  txType?: 'create' | 'migrate';
  mint?: string;
  name?: string;
  symbol?: string;
  marketCapSol?: number;
  solAmount?: number;
  pool?: string;
}

/** The stream repeats a signature occasionally; the feed should not. */
const seen = new Set<string>();

function isDuplicate(signature: string | undefined): boolean {
  if (!signature) return false;
  if (seen.has(signature)) return true;
  seen.add(signature);
  if (seen.size > 4000) seen.clear();
  return false;
}

/**
 * A migration event carries only a mint, so the ticker is looked up before the line
 * is written. If the lookup fails the mint stands in rather than blocking the line.
 */
function announceGraduation(mint: string | undefined) {
  const { push } = useStore.getState();
  if (!mint) return;

  if (isCoolingDown()) {
    push('migrate', `${mint.slice(0, 6)} graduated on pump.fun!`, undefined, mint);
    return;
  }

  void fetchToken(mint)
    .then(({ symbol }) => push('migrate', `${symbol} graduated on pump.fun!`, undefined, mint))
    .catch(() => push('migrate', `${mint.slice(0, 6)} graduated on pump.fun!`, undefined, mint));
}

function connect() {
  if (socket && socket.readyState <= WebSocket.OPEN) return;

  const { push, setWsStatus, setMood, countLaunch } = useStore.getState();
  setWsStatus('connecting');
  socket = new WebSocket(URL);

  socket.onopen = () => {
    retry = 0;
    setWsStatus('open');
    push('system', 'Connected to pump.fun launch stream.');
    socket?.send(JSON.stringify({ method: 'subscribeNewToken' }));
    socket?.send(JSON.stringify({ method: 'subscribeMigration' }));
  };

  socket.onmessage = (event) => {
    let data: PumpEvent;
    try {
      data = JSON.parse(event.data as string);
    } catch {
      return;
    }
    if (data.message || !data.txType) return;
    if (isDuplicate(data.signature)) return;

    if (data.txType === 'create') {
      const dev =
        data.solAmount && data.solAmount >= 0.005
          ? `dev bought ${data.solAmount.toFixed(2)} SOL`
          : 'no dev buy';
      push('launch', `${data.symbol ?? '???'} - ${data.name ?? 'unnamed'} · ${dev}`, undefined, data.mint);
      countLaunch(false);
      useStore.getState().setMood('watching');
    } else if (data.txType === 'migrate') {
      countLaunch(true);
      setMood('excited');
      announceGraduation(data.mint);
    }
  };

  socket.onclose = () => {
    setWsStatus('closed');
    setMood('sleeping', true);
    const delay = Math.min(30_000, 1000 * 2 ** retry++);
    push('system', `Stream closed. Reconnecting in ${Math.round(delay / 1000)}s.`);
    timer = setTimeout(connect, delay);
  };

  socket.onerror = () => socket?.close();
}

export function usePumpPortal() {
  useEffect(() => {
    connect();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);
}
