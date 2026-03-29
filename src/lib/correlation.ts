/**
 * Correlation Analysis Module
 * Analyzes cross-stock and sector correlation patterns
 */

export interface CorrelationAnalysis {
  sector_performance: {
    sector: string;
    avg_change_1d: number;
    avg_change_5d: number;
    trend: 'up' | 'down' | 'flat';
  };
  vs_sector: {
    relative_strength: number;  // How stock performs vs sector avg
    divergence: 'outperforming' | 'underperforming' | 'inline';
    score: number;  // +20 outperforming, -20 underperforming, 0 inline
  };
  vs_market: {
    relative_strength: number;  // vs KSE100
    correlation: number;  // 0-1 correlation coefficient
    beta: number;  // Volatility vs market
  };
  signal: string;  // Summary interpretation
}

export interface SectorStock {
  symbol: string;
  change: number;
  change5d?: number;
}

/**
 * Analyzes stock correlation with sector and market
 * @param stockChange1d - Stock's 1-day change percentage
 * @param stockChange5d - Stock's 5-day change percentage
 * @param sector - Sector name
 * @param sectorStocks - Array of sector peer stocks
 * @param marketChange1d - Market (KSE100) 1-day change (optional)
 * @param marketChange5d - Market (KSE100) 5-day change (optional)
 * @returns Correlation analysis with signals
 */
export function analyzeCorrelation(
  stockChange1d: number,
  stockChange5d: number,
  sector: string,
  sectorStocks: Array<SectorStock>,
  marketChange1d: number = 0,
  marketChange5d: number = 0
): CorrelationAnalysis {
  // Calculate sector averages
  const sectorAvg1d = sectorStocks.length > 0
    ? sectorStocks.reduce((sum, s) => sum + s.change, 0) / sectorStocks.length
    : 0;

  const sectorAvg5d = sectorStocks.length > 0 && sectorStocks.some(s => s.change5d !== undefined)
    ? sectorStocks
        .filter(s => s.change5d !== undefined)
        .reduce((sum, s) => sum + (s.change5d || 0), 0) / 
      sectorStocks.filter(s => s.change5d !== undefined).length
    : 0;

  // Determine sector trend
  const sectorTrend = sectorAvg1d > 0.5 ? 'up' : sectorAvg1d < -0.5 ? 'down' : 'flat';

  // Calculate relative strength vs sector
  const relativeStrengthVsSector = stockChange1d - sectorAvg1d;

  // Determine divergence signal
  let divergence: 'outperforming' | 'underperforming' | 'inline';
  let vsectorScore: number;

  if (relativeStrengthVsSector > 1.5) {
    divergence = 'outperforming';
    vsectorScore = 20;
  } else if (relativeStrengthVsSector < -1.5) {
    divergence = 'underperforming';
    vsectorScore = -20;
  } else if (relativeStrengthVsSector > 0.5) {
    divergence = 'outperforming';
    vsectorScore = 10;
  } else if (relativeStrengthVsSector < -0.5) {
    divergence = 'underperforming';
    vsectorScore = -10;
  } else {
    divergence = 'inline';
    vsectorScore = 0;
  }

  // Calculate market correlation
  // Beta calculation: how volatile is stock movement vs market movement
  let beta = 1.0;
  let correlation = 0.5;
  let relativeStrengthVsMarket = stockChange1d - marketChange1d;

  if (marketChange1d !== 0) {
    // Simple beta: stock volatility / market volatility
    beta = Math.abs(stockChange1d) / (Math.abs(marketChange1d) + 0.001); // Avoid division by zero
    
    // Correlation: directional alignment
    // If both move in same direction: positive correlation
    // If opposite directions: negative correlation
    if ((stockChange1d > 0 && marketChange1d > 0) || (stockChange1d < 0 && marketChange1d < 0)) {
      correlation = Math.min(1.0, Math.abs(relativeStrengthVsMarket) / (Math.abs(marketChange1d) + 1));
    } else if ((stockChange1d > 0 && marketChange1d < 0) || (stockChange1d < 0 && marketChange1d > 0)) {
      // Inverse relationship
      correlation = Math.max(0, 0.3 - Math.abs(relativeStrengthVsMarket) / 10);
    }
  }

  // Generate interpretation signal
  const signals: string[] = [];

  // Sector signal
  if (sectorStocks.length >= 2) {
    if (divergence === 'outperforming') {
      signals.push(`Strong outperformance vs ${sector} (+${relativeStrengthVsSector.toFixed(2)}%)`);
    } else if (divergence === 'underperforming') {
      signals.push(`Underperformance vs ${sector} (${relativeStrengthVsSector.toFixed(2)}%)`);
    } else {
      signals.push(`Moving in line with ${sector} avg (${sectorAvg1d.toFixed(2)}%)`);
    }
  }

  // Market correlation signal
  if (Math.abs(marketChange1d) > 0.1) {
    if (correlation > 0.7) {
      signals.push(`High correlation with market (β=${beta.toFixed(2)})`);
    } else if (correlation < 0.3) {
      signals.push(`Low correlation with market - defensive move`);
    } else {
      signals.push(`Moderate market correlation`);
    }

    if (relativeStrengthVsMarket > 1) {
      signals.push(`Outperforming KSE-100 by +${relativeStrengthVsMarket.toFixed(2)}%`);
    } else if (relativeStrengthVsMarket < -1) {
      signals.push(`Lagging KSE-100 by ${relativeStrengthVsMarket.toFixed(2)}%`);
    }
  }

  // Multi-period trend signal
  if (Math.abs(stockChange5d) > 2 * Math.abs(stockChange1d)) {
    if (stockChange5d > 0) {
      signals.push('Momentum building - 5-day trend stronger than 1-day');
    } else {
      signals.push('Momentum fading - 5-day decline more significant');
    }
  }

  const signalText = signals.length > 0
    ? signals.slice(0, 2).join(' | ')
    : 'Neutral positioning - awaiting directional signal';

  return {
    sector_performance: {
      sector,
      avg_change_1d: sectorAvg1d,
      avg_change_5d: sectorAvg5d,
      trend: sectorTrend,
    },
    vs_sector: {
      relative_strength: relativeStrengthVsSector,
      divergence,
      score: vsectorScore,
    },
    vs_market: {
      relative_strength: relativeStrengthVsMarket,
      correlation: parseFloat(Math.max(0, Math.min(1, correlation)).toFixed(3)),
      beta: parseFloat(beta.toFixed(2)),
    },
    signal: signalText,
  };
}

/**
 * Calculates simple Pearson correlation coefficient between two arrays
 * @param x - First array of values
 * @param y - Second array of values
 * @returns Correlation coefficient (-1 to 1)
 */
export function pearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;

  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
  const denominatorX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
  const denominatorY = Math.sqrt(y.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));

  if (denominatorX === 0 || denominatorY === 0) return 0;

  return numerator / (denominatorX * denominatorY);
}
