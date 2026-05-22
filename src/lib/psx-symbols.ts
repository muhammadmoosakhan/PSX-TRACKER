import type { StockCache } from '@/types';

const DERIVATIVE_SUFFIXES = [
  'ETFXD',
  'NLXB',
  'TETF',
  'PETF',
  'CPS',
  'PS',
  'XD',
  'NC',
  'WU',
  'XB',
  'XR',
  'ETF',
  'IM',
  'H',
] as const;

export function getCanonicalSymbol(symbol: string): string {
  const upper = symbol.toUpperCase();
  for (const suffix of DERIVATIVE_SUFFIXES) {
    if (upper.endsWith(suffix)) {
      return upper.slice(0, -suffix.length);
    }
  }
  return upper;
}

export function isExDividendSymbol(symbol: string): boolean {
  return symbol.toUpperCase().endsWith('XD');
}

function isBaseSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper === getCanonicalSymbol(upper);
}

export function choosePreferredStock(
  current: StockCache | undefined,
  candidate: StockCache
): StockCache {
  if (!current) return candidate;

  const currentHasLive = (current.current_price || 0) > 0;
  const candidateHasLive = (candidate.current_price || 0) > 0;
  if (candidateHasLive && !currentHasLive) return candidate;
  if (!candidateHasLive && currentHasLive) return current;

  const currentIsXD = isExDividendSymbol(current.symbol);
  const candidateIsXD = isExDividendSymbol(candidate.symbol);
  if (candidateIsXD && !currentIsXD) return candidate;
  if (!candidateIsXD && currentIsXD) return current;

  const currentIsBase = isBaseSymbol(current.symbol);
  const candidateIsBase = isBaseSymbol(candidate.symbol);
  if (candidateIsBase && !currentIsBase) return candidate;
  if (!candidateIsBase && currentIsBase) return current;

  return candidate;
}
