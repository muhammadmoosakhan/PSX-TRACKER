'use client';

import { useMemo } from 'react';
import type { Trade } from '@/types';
import {
  calculateMonthlyAnalysis,
  calculateQuarterlyAnalysis,
  calculateYearlyAnalysis,
  calculateRealizedPL,
} from '@/lib/calculations';

export function useAnalysis(trades: Trade[]) {
  const monthly = useMemo(() => calculateMonthlyAnalysis(trades), [trades]);
  const quarterly = useMemo(() => calculateQuarterlyAnalysis(trades), [trades]);
  const yearly = useMemo(() => calculateYearlyAnalysis(trades), [trades]);
  const realizedTrades = useMemo(() => calculateRealizedPL(trades), [trades]);

  const totalRealizedPL = useMemo(
    () => realizedTrades.reduce((s, r) => s + r.realized_pl, 0),
    [realizedTrades]
  );

  const winRate = useMemo(() => {
    if (realizedTrades.length === 0) return 0;
    const wins = realizedTrades.filter((r) => r.realized_pl > 0).length;
    return wins / realizedTrades.length;
  }, [realizedTrades]);

  return {
    monthly,
    quarterly,
    yearly,
    realizedTrades,
    totalRealizedPL,
    winRate,
  };
}
