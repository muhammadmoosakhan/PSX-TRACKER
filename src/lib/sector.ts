/**
 * Sector Analysis Module
 * Provides functions to analyze stock performance relative to sector benchmarks
 */

export interface SectorStock {
  symbol: string;
  change: number;
}

export interface SectorAnalysisResult {
  score: number;
  signal: 'Sector Leader' | 'Outperforming' | 'In Line' | 'Underperforming' | 'Sector Laggard';
  rank: number;
  interpretation: string;
}

/**
 * Analyzes a stock's performance relative to its sector
 * @param stockChange - The percentage change of the individual stock
 * @param sectorStocks - Array of stocks in the sector with their performance
 * @returns Analysis result with score, signal, rank, and interpretation
 */
export function analyzeSectorPerformance(
  stockChange: number,
  sectorStocks: Array<SectorStock>
): SectorAnalysisResult {
  // Handle edge cases
  if (!sectorStocks || sectorStocks.length === 0) {
    return {
      score: 60,
      signal: 'In Line',
      rank: 1,
      interpretation: 'Insufficient sector data for comparison',
    };
  }

  // Handle single stock in sector (the stock itself)
  if (sectorStocks.length === 1) {
    return {
      score: 60,
      signal: 'In Line',
      rank: 1,
      interpretation: 'Only stock in sector - no peers for comparison',
    };
  }

  // Calculate sector average change
  const sectorAverage =
    sectorStocks.reduce((sum, stock) => sum + stock.change, 0) / sectorStocks.length;

  // Calculate performance difference
  const performanceDifference = stockChange - sectorAverage;

  // Determine score and signal based on performance difference
  let score: number;
  let signal: SectorAnalysisResult['signal'];

  if (performanceDifference > 3) {
    score = 90;
    signal = 'Sector Leader';
  } else if (performanceDifference > 1) {
    score = 75;
    signal = 'Outperforming';
  } else if (performanceDifference >= -1) {
    score = 60;
    signal = 'In Line';
  } else if (performanceDifference >= -3) {
    score = 40;
    signal = 'Underperforming';
  } else {
    score = 25;
    signal = 'Sector Laggard';
  }

  // Calculate rank among sector peers
  // Sort stocks by performance change (descending)
  const rankedStocks = [...sectorStocks].sort((a, b) => b.change - a.change);

  // Find where this stock ranks
  // Note: We count how many stocks have better performance
  let rank = 1;
  for (let i = 0; i < rankedStocks.length; i++) {
    if (rankedStocks[i].change < stockChange) {
      rank = i + 1;
      break;
    }
  }
  // Handle case where stock is worst performing
  if (rank === 1 && rankedStocks.length > 0 && rankedStocks[0].change < stockChange) {
    rank = rankedStocks.length;
  }

  // Build interpretation string
  const totalStocks = sectorStocks.length;
  const sectorAvgFormatted = sectorAverage.toFixed(2);
  const stockChangeFormatted = stockChange.toFixed(2);

  const interpretation =
    `Rank #${rank} of ${totalStocks} in sector, ` +
    `${stockChangeFormatted > '0' ? '+' : ''}${stockChangeFormatted}% vs sector avg of ` +
    `${parseFloat(sectorAvgFormatted) > 0 ? '+' : ''}${sectorAvgFormatted}%`;

  return {
    score,
    signal,
    rank,
    interpretation,
  };
}
