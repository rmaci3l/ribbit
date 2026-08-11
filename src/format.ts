/** Display helpers shared by the terminal commands and the panels. */

/** Compact USD valuation, e.g. `$12.4K`. */
export function fdv(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/** Signed percentage to one decimal, e.g. `+12.4%`. */
export const pct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

/** Signed SOL amount to two decimals, e.g. `-1.20`. Does not append the unit. */
export const sol = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
