'use client';

import { useMemo } from 'react';
import type { Trade, StockCache, PortfolioHolding, SectorAllocation } from '@/types';
import { calculateHoldings, calculateSectorAllocation } from '@/lib/calculations';

interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalPL: number;
  totalPLPct: number;
}

export function usePortfolio(trades: Trade[], priceMap: Record<string, StockCache>) {
  const holdings = useMemo(
    () => calculateHoldings(trades, priceMap),
    [trades, priceMap]
  );

  const sectorAllocation = useMemo(
    () => calculateSectorAllocation(holdings),
    [holdings]
  );

  const summary: PortfolioSummary = useMemo(() => {
    const totalValue = holdings.reduce((s, h) => s + h.market_value, 0);
    const totalInvested = holdings.reduce((s, h) => s + h.cost_basis, 0);
    const totalPL = totalValue - totalInvested;
    const totalPLPct = totalInvested > 0 ? totalPL / totalInvested : 0;
    return { totalValue, totalInvested, totalPL, totalPLPct };
  }, [holdings]);

  return { holdings, sectorAllocation, summary };
}
