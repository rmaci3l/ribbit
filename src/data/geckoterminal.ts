import type { Candle, PoolSnapshot } from '../sim/types';
import { RateLimited, scheduled } from './limiter';

const BASE = 'https://api.geckoterminal.com/api/v2';
const NETWORK = 'solana';

function get<T>(path: string): Promise<T> {
  return scheduled(async () => {
    let response: Response;
    try {
      response = await fetch(`${BASE}${path}`);
    } catch {
      throw new RateLimited();
    }

    if (response.status === 429) throw new RateLimited();
    if (!response.ok) throw new Error(`geckoterminal ${response.status} on ${path}`);
    return response.json() as Promise<T>;
  });
}

interface RawPool {
  attributes: {
    address: string;
    name: string;
    base_token_price_usd: string | null;
    fdv_usd: string | null;
    market_cap_usd: string | null;
    pool_created_at: string;
    transactions: Record<string, { buys?: number; sells?: number } | undefined>;
  };
  relationships?: { base_token?: { data?: { id?: string } } };
}

interface RawToken {
  id: string;
  attributes: { address: string; image_url: string | null };
}

const num = (value: string | null | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const baseSymbol = (name: string): string => name.split('/')[0]!.trim() || name;

const usableImage = (url: string | null | undefined): string | null =>
  url && !url.includes('missing.png') ? url : null;

export async function fetchNewPools(seenAt: number): Promise<PoolSnapshot[]> {
  const body = await get<{ data: RawPool[]; included?: RawToken[] }>(
    `/networks/${NETWORK}/new_pools?page=1&include=base_token`,
  );

  const tokens = new Map((body.included ?? []).map((t) => [t.id, t]));

  return body.data.map((pool) => {
    const a = pool.attributes;
    const tx = a.transactions?.m5;
    const tokenId = pool.relationships?.base_token?.data?.id ?? '';
    const token = tokens.get(tokenId);

    return {
      address: a.address,
      mint: token?.attributes.address ?? tokenId.replace(/^solana_/, ''),
      name: a.name,
      symbol: baseSymbol(a.name),
      imageUrl: usableImage(token?.attributes.image_url),
      priceUsd: num(a.base_token_price_usd),
      fdvUsd: num(a.market_cap_usd) || num(a.fdv_usd),
      createdAt: Math.floor(new Date(a.pool_created_at).getTime() / 1000),
      seenAt,
      txM5: (tx?.buys ?? 0) + (tx?.sells ?? 0),
    };
  });
}

export async function fetchToken(mint: string): Promise<{ symbol: string; imageUrl: string | null }> {
  const body = await get<{ data: { attributes: { symbol: string; image_url: string | null } } }>(
    `/networks/${NETWORK}/tokens/${mint}`,
  );
  return {
    symbol: body.data.attributes.symbol,
    imageUrl: usableImage(body.data.attributes.image_url),
  };
}

interface RawOhlcv {
  data: { attributes: { ohlcv_list: number[][] } };
}

export async function fetchCandles(pool: string, limit = 120): Promise<Candle[]> {
  const body = await get<RawOhlcv>(`/networks/${NETWORK}/pools/${pool}/ohlcv/minute?limit=${limit}`);
  return body.data.attributes.ohlcv_list
    .map(([t, o, h, l, c, v]) => ({ t: t!, o: o!, h: h!, l: l!, c: c!, v: v! }))
    .sort((a, b) => a.t - b.t);
}
