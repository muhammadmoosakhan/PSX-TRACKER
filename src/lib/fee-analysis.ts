// Fee Analysis Library
// Calculates actual trading costs from trade history

import { Trade } from '@/types';

export interface StockFeeAnalysis {
  symbol: string;
  tradeCount: number;
  totalTradeValue: number;
  totalFees: number;
  effectiveFeeRate: number;
  avgCommission: number;
  avgCdc: number;
  avgCvt: number;
}

export interface FeeBreakdown {
  commission: number;
  sst: number;
  cdc: number;
  cvt: number;
  regulatory: number; // laga + secp + ncs
  others: number;
  total: number;
}

export interface PortfolioFeeAnalysis {
  totalFeesAllTime: number;
  avgFeeRate: number;
  totalTradeValue: number;
  tradeCount: number;
  feesByType: FeeBreakdown;
  feesByStock: StockFeeAnalysis[];
  estimatedExitCost: number;
  feeDragOnReturns: number;
}

// Get total fees from a single trade
export function getTradeFees(trade: Trade): number {
  const commission = trade.commission || trade.brokerage || 0;
  const sst = trade.sst || 0;
  const cdc = trade.cdc_fee || 0;
  const cvt = trade.cvt || 0;
  const laga = trade.laga || 0;
  const secp = trade.secp || 0;
  const ncs = trade.ncs || 0;
  const others = trade.others || 0;
  
  return commission + sst + cdc + cvt + laga + secp + ncs + others;
}

// Calculate fee breakdown from trades
export function calculateFeeBreakdown(trades: Trade[]): FeeBreakdown {
  const breakdown: FeeBreakdown = {
    commission: 0,
    sst: 0,
    cdc: 0,
    cvt: 0,
    regulatory: 0,
    others: 0,
    total: 0,
  };
  
  for (const trade of trades) {
    breakdown.commission += trade.commission || trade.brokerage || 0;
    breakdown.sst += trade.sst || 0;
    breakdown.cdc += trade.cdc_fee || 0;
    breakdown.cvt += trade.cvt || 0;
    breakdown.regulatory += (trade.laga || 0) + (trade.secp || 0) + (trade.ncs || 0);
    breakdown.others += trade.others || 0;
  }
  
  breakdown.total = breakdown.commission + breakdown.sst + breakdown.cdc + 
                    breakdown.cvt + breakdown.regulatory + breakdown.others;
  
  return breakdown;
}

// Calculate per-stock fee analysis
export function calculateStockFees(trades: Trade[]): StockFeeAnalysis[] {
  const stockMap = new Map<string, {
    trades: Trade[];
    totalValue: number;
    totalFees: number;
  }>();
  
  for (const trade of trades) {
    if (!stockMap.has(trade.symbol)) {
      stockMap.set(trade.symbol, { trades: [], totalValue: 0, totalFees: 0 });
    }
    
    const data = stockMap.get(trade.symbol)!;
    data.trades.push(trade);
    data.totalValue += trade.gross_value || (trade.quantity * trade.rate_per_share);
    data.totalFees += getTradeFees(trade);
  }
  
  const result: StockFeeAnalysis[] = [];
  
  for (const [symbol, data] of stockMap) {
    const breakdown = calculateFeeBreakdown(data.trades);
    
    result.push({
      symbol,
      tradeCount: data.trades.length,
      totalTradeValue: data.totalValue,
      totalFees: data.totalFees,
      effectiveFeeRate: data.totalValue > 0 ? (data.totalFees / data.totalValue) * 100 : 0,
      avgCommission: breakdown.commission / data.trades.length,
      avgCdc: breakdown.cdc / data.trades.length,
      avgCvt: breakdown.cvt / data.trades.length,
    });
  }
  
  // Sort by total fees descending
  return result.sort((a, b) => b.totalFees - a.totalFees);
}

// Main portfolio fee analysis
export function analyzePortfolioFees(
  trades: Trade[],
  currentPortfolioValue: number,
  totalPnL: number
): PortfolioFeeAnalysis {
  const feesByType = calculateFeeBreakdown(trades);
  const feesByStock = calculateStockFees(trades);
  
  const totalTradeValue = trades.reduce((sum, t) => 
    sum + (t.gross_value || t.quantity * t.rate_per_share), 0
  );
  
  const avgFeeRate = totalTradeValue > 0 
    ? (feesByType.total / totalTradeValue) * 100 
    : 0;
  
  // Estimate exit cost based on average fee rate
  const estimatedExitCost = currentPortfolioValue * (avgFeeRate / 100);
  
  // Fee drag = how much fees reduced your returns
  const feeDragOnReturns = totalPnL !== 0 
    ? (feesByType.total / Math.abs(totalPnL)) * 100 
    : 0;
  
  return {
    totalFeesAllTime: feesByType.total,
    avgFeeRate,
    totalTradeValue,
    tradeCount: trades.length,
    feesByType,
    feesByStock,
    estimatedExitCost,
    feeDragOnReturns,
  };
}
