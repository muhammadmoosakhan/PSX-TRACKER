'use client';

import { useMemo } from 'react';
import { Trade } from '@/types';
import { analyzePortfolioFees, PortfolioFeeAnalysis } from '@/lib/fee-analysis';

export function useFeeAnalysis(
  trades: Trade[],
  portfolioValue: number,
  totalPnL: number
): PortfolioFeeAnalysis | null {
  return useMemo(() => {
    if (!trades || trades.length === 0) {
      return null;
    }
    
    return analyzePortfolioFees(trades, portfolioValue, totalPnL);
  }, [trades, portfolioValue, totalPnL]);
}
