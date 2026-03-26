// ============================================
// PSX Tracker — Trend Analysis & Forecasting
// Pure math — no ML training required
// ============================================

export interface TrendResult {
  direction: 'up' | 'down' | 'sideways';
  strength: number;       // 0-1
  slope: number;          // price change per day
  r2: number;             // goodness of fit (0-1)
  predictedNext: number;  // next-day price estimate
  confidenceLow: number;  // lower bound of prediction
  confidenceHigh: number; // upper bound of prediction
}

export interface CrossoverSignal {
  type: 'golden_cross' | 'death_cross' | 'none';
  description: string;
  daysAgo: number | null;
}

export interface SupportResistance {
  supports: number[];
  resistances: number[];
  nearestSupport: number | null;
  nearestResistance: number | null;
}

export interface TrendAnalysis {
  shortTerm: TrendResult;   // 5-day
  mediumTerm: TrendResult;  // 30-day
  longTerm: TrendResult;    // 90-day
  crossover: CrossoverSignal;
  supportResistance: SupportResistance;
  volatility: number;       // Average True Range %
  overallScore: number;     // -1 to +1
  overallLabel: string;
}

// ---- Linear Regression ----

export function linearRegression(prices: number[]): TrendResult {
  const n = prices.length;
  if (n < 3) {
    return { direction: 'sideways', strength: 0, slope: 0, r2: 0, predictedNext: prices[n - 1] || 0, confidenceLow: 0, confidenceHigh: 0 };
  }

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += prices[i];
    sumXY += i * prices[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) {
    return { direction: 'sideways', strength: 0, slope: 0, r2: 0, predictedNext: prices[n - 1], confidenceLow: prices[n - 1], confidenceHigh: prices[n - 1] };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const mean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (prices[i] - predicted) ** 2;
    ssTot += (prices[i] - mean) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);

  // Next-day prediction
  const predictedNext = intercept + slope * n;

  // Standard error for confidence interval
  const se = Math.sqrt(ssRes / Math.max(1, n - 2));
  const confidenceLow = predictedNext - 1.96 * se;
  const confidenceHigh = predictedNext + 1.96 * se;

  // Normalize slope to percentage of price
  const lastPrice = prices[n - 1];
  const slopePct = lastPrice > 0 ? Math.abs(slope / lastPrice) : 0;

  let direction: TrendResult['direction'] = 'sideways';
  if (slope > 0 && slopePct > 0.001) direction = 'up';
  else if (slope < 0 && slopePct > 0.001) direction = 'down';

  const strength = Math.min(1, r2 * Math.min(1, slopePct * 100));

  return {
    direction,
    strength: parseFloat(strength.toFixed(3)),
    slope: parseFloat(slope.toFixed(4)),
    r2: parseFloat(r2.toFixed(3)),
    predictedNext: parseFloat(predictedNext.toFixed(2)),
    confidenceLow: parseFloat(Math.max(0, confidenceLow).toFixed(2)),
    confidenceHigh: parseFloat(confidenceHigh.toFixed(2)),
  };
}

// ---- Moving Average Crossover ----

function computeSMAArray(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += prices[j];
    result.push(sum / period);
  }
  return result;
}

export function detectCrossover(closes: number[]): CrossoverSignal {
  if (closes.length < 200) {
    return { type: 'none', description: 'Insufficient data for crossover detection', daysAgo: null };
  }

  const sma50 = computeSMAArray(closes, 50);
  const sma200 = computeSMAArray(closes, 200);

  // Align: sma200 starts 150 days after sma50
  const offset = 150;
  const alignedLen = Math.min(sma50.length - offset, sma200.length);

  if (alignedLen < 2) {
    return { type: 'none', description: 'Insufficient aligned data', daysAgo: null };
  }

  // Scan backwards for most recent crossover
  for (let i = alignedLen - 1; i > 0; i--) {
    const curr50 = sma50[i + offset];
    const prev50 = sma50[i + offset - 1];
    const curr200 = sma200[i];
    const prev200 = sma200[i - 1];

    if (prev50 <= prev200 && curr50 > curr200) {
      return {
        type: 'golden_cross',
        description: 'SMA50 crossed above SMA200 — bullish signal',
        daysAgo: alignedLen - 1 - i,
      };
    }
    if (prev50 >= prev200 && curr50 < curr200) {
      return {
        type: 'death_cross',
        description: 'SMA50 crossed below SMA200 — bearish signal',
        daysAgo: alignedLen - 1 - i,
      };
    }
  }

  // No crossover found, report current relationship
  const latest50 = sma50[sma50.length - 1];
  const latest200 = sma200[sma200.length - 1];
  return {
    type: 'none',
    description: latest50 > latest200
      ? 'SMA50 is above SMA200 — existing bullish trend'
      : 'SMA50 is below SMA200 — existing bearish trend',
    daysAgo: null,
  };
}

// ---- Support / Resistance Detection ----

function clusterLevels(levels: number[], threshold: number = 0.02): number[] {
  if (levels.length === 0) return [];
  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: number[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const lastCluster = clusters[clusters.length - 1];
    const clusterAvg = lastCluster.reduce((s, v) => s + v, 0) / lastCluster.length;
    if (Math.abs(sorted[i] - clusterAvg) / clusterAvg < threshold) {
      lastCluster.push(sorted[i]);
    } else {
      clusters.push([sorted[i]]);
    }
  }

  return clusters
    .map((c) => parseFloat((c.reduce((s, v) => s + v, 0) / c.length).toFixed(2)))
    .slice(-5); // Top 5 levels
}

export function findSupportResistance(prices: number[], windowSize: number = 5): SupportResistance {
  if (prices.length < windowSize * 2 + 1) {
    return { supports: [], resistances: [], nearestSupport: null, nearestResistance: null };
  }

  const supports: number[] = [];
  const resistances: number[] = [];

  for (let i = windowSize; i < prices.length - windowSize; i++) {
    const window = prices.slice(i - windowSize, i + windowSize + 1);
    const center = prices[i];
    if (center <= Math.min(...window)) supports.push(center);
    if (center >= Math.max(...window)) resistances.push(center);
  }

  const clusteredSupports = clusterLevels(supports);
  const clusteredResistances = clusterLevels(resistances);

  const currentPrice = prices[prices.length - 1];
  const nearestSupport = clusteredSupports.filter((s) => s < currentPrice).pop() ?? null;
  const nearestResistance = clusteredResistances.find((r) => r > currentPrice) ?? null;

  return {
    supports: clusteredSupports,
    resistances: clusteredResistances,
    nearestSupport,
    nearestResistance,
  };
}

// ---- Volatility (ATR-based) ----

export function computeVolatility(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < period + 1) return 0;

  let atrSum = 0;
  for (let i = len - period; i < len; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atrSum += tr;
  }

  const atr = atrSum / period;
  const lastPrice = closes[closes.length - 1];
  return lastPrice > 0 ? parseFloat(((atr / lastPrice) * 100).toFixed(2)) : 0;
}

// ---- Master Trend Analysis ----

export function analyzeTrend(
  closes: number[],
  highs: number[],
  lows: number[]
): TrendAnalysis {
  const shortTerm = linearRegression(closes.slice(-5));
  const mediumTerm = linearRegression(closes.slice(-30));
  const longTerm = linearRegression(closes.slice(-90));
  const crossover = detectCrossover(closes);
  const supportResistance = findSupportResistance(closes.slice(-120));
  const volatility = computeVolatility(highs, lows, closes);

  // Composite trend score
  let score = 0;
  const weights = { short: 0.3, medium: 0.35, long: 0.2, crossover: 0.15 };

  // Direction scores
  const dirScore = (t: TrendResult) =>
    t.direction === 'up' ? t.strength : t.direction === 'down' ? -t.strength : 0;

  score += dirScore(shortTerm) * weights.short;
  score += dirScore(mediumTerm) * weights.medium;
  score += dirScore(longTerm) * weights.long;

  // Only count crossovers within last 60 days as active signals
  if (crossover.type === 'golden_cross' && (crossover.daysAgo ?? 999) < 60) score += weights.crossover;
  else if (crossover.type === 'death_cross' && (crossover.daysAgo ?? 999) < 60) score -= weights.crossover;

  score = Math.max(-1, Math.min(1, score));

  let overallLabel = 'Sideways';
  if (score > 0.4) overallLabel = 'Strong Uptrend';
  else if (score > 0.15) overallLabel = 'Uptrend';
  else if (score < -0.4) overallLabel = 'Strong Downtrend';
  else if (score < -0.15) overallLabel = 'Downtrend';

  return {
    shortTerm,
    mediumTerm,
    longTerm,
    crossover,
    supportResistance,
    volatility,
    overallScore: parseFloat(score.toFixed(3)),
    overallLabel,
  };
}
