// ============================================
// PSX Portfolio Tracker — Technical Analysis
// ============================================
// All computations use EOD (End of Day) historical data.
// Functions return null when insufficient data is available.

import type { StockHistoryPoint } from '@/types';

// ---- Return type interfaces ----

export interface TechnicalIndicator {
  name: string;
  params: string;
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export interface PivotPoint {
  label: string;
  description: string;
  value: number;
  type: 'resistance' | 'pivot' | 'support';
}

export interface SMAResult {
  period: number;
  label: string;
  value: number;
  signal: 'BUY' | 'SELL';
}

export interface StockTechnicals {
  indicators: TechnicalIndicator[];
  pivotPoints: PivotPoint[];
  movingAverages: SMAResult[];
  weekRange52: { low: number; high: number } | null;
  circuitBreakers: { lowerLock: number; upperLock: number };
}

// ---- Helper: Exponential Moving Average ----

/**
 * Computes the EMA for a given data array and period.
 * Returns null if there is insufficient data.
 */
function computeEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;

  // Seed the EMA with the SMA of the first `period` values
  let ema = 0;
  for (let i = 0; i < period; i++) {
    ema += values[i];
  }
  ema /= period;

  const multiplier = 2 / (period + 1);

  // Walk forward from `period` to end, updating the EMA
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Computes a full EMA series (one value per input element, starting from index
 * period-1). Used internally where we need the entire EMA trajectory.
 */
function computeEMASeries(values: number[], period: number): number[] {
  if (values.length < period) return [];

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  let ema = sum / period;
  result.push(ema);

  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

// ---- 1. RSI (Relative Strength Index) ----

/**
 * Computes the RSI using the Wilder smoothing method.
 *
 * @param closes - Array of closing prices, oldest first
 * @param period - Lookback period (default 14)
 * @returns RSI value and trading signal, or null if insufficient data
 */
export function computeRSI(
  closes: number[],
  period: number = 14
): { value: number; signal: 'BUY' | 'SELL' | 'NEUTRAL' } | null {
  // Need at least period + 1 data points to compute `period` changes
  if (closes.length < period + 1) return null;

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // First average gain/loss: simple mean of the first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smoothing for subsequent values
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] >= 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  // Avoid division by zero
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (rsi < 30) signal = 'BUY';
  else if (rsi > 70) signal = 'SELL';

  return { value: parseFloat(rsi.toFixed(2)), signal };
}

// ---- 2. Stochastic Oscillator ----

/**
 * Computes %K and %D of the Stochastic Oscillator.
 *
 * %K = SMA(smooth, rawK series)
 * %D = SMA(dPeriod, %K series)
 *
 * @param highs   - Array of high prices, oldest first
 * @param lows    - Array of low prices, oldest first
 * @param closes  - Array of close prices, oldest first
 * @param kPeriod - Lookback for highest-high / lowest-low (default 14)
 * @param dPeriod - Smoothing period for %D (default 3)
 * @param smooth  - Smoothing period for %K (default 3)
 * @returns { k, d } and signal, or null if insufficient data
 */
export function computeSTOCH(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smooth: number = 3
): { k: number; d: number; signal: 'BUY' | 'SELL' | 'NEUTRAL' } | null {
  const len = Math.min(highs.length, lows.length, closes.length);

  // We need kPeriod data points to compute one rawK, then
  // smooth-1 more for %K, then dPeriod-1 more for %D.
  const minRequired = kPeriod + smooth - 1 + dPeriod - 1;
  if (len < minRequired) return null;

  // Step 1: Compute the raw %K series
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < len; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (highs[j] > highestHigh) highestHigh = highs[j];
      if (lows[j] < lowestLow) lowestLow = lows[j];
    }
    const range = highestHigh - lowestLow;
    const value = range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100;
    rawK.push(value);
  }

  // Step 2: Smooth rawK with SMA to get %K series
  const kSeries: number[] = [];
  for (let i = smooth - 1; i < rawK.length; i++) {
    let sum = 0;
    for (let j = i - smooth + 1; j <= i; j++) {
      sum += rawK[j];
    }
    kSeries.push(sum / smooth);
  }

  if (kSeries.length < dPeriod) return null;

  // Step 3: Smooth %K with SMA to get %D series
  const dSeries: number[] = [];
  for (let i = dPeriod - 1; i < kSeries.length; i++) {
    let sum = 0;
    for (let j = i - dPeriod + 1; j <= i; j++) {
      sum += kSeries[j];
    }
    dSeries.push(sum / dPeriod);
  }

  const k = parseFloat(kSeries[kSeries.length - 1].toFixed(2));
  const d = parseFloat(dSeries[dSeries.length - 1].toFixed(2));

  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (k < 20) signal = 'BUY';
  else if (k > 80) signal = 'SELL';

  return { k, d, signal };
}

// ---- 3. MACD (Moving Average Convergence Divergence) ----

/**
 * Computes the MACD line, signal line, and histogram.
 *
 * MACD Line   = EMA(fast) - EMA(slow)
 * Signal Line = EMA(signalPeriod) of MACD Line
 * Histogram   = MACD Line - Signal Line
 *
 * @param closes       - Array of close prices, oldest first
 * @param fastPeriod   - Fast EMA period (default 12)
 * @param slowPeriod   - Slow EMA period (default 26)
 * @param signalPeriod - Signal line EMA period (default 9)
 * @returns { macd, signal, histogram } and trading signal, or null
 */
export function computeMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: number;
  signal: number;
  histogram: number;
  tradeSignal: 'BUY' | 'SELL' | 'NEUTRAL';
} | null {
  // We need enough data for the slow EMA plus signal smoothing
  if (closes.length < slowPeriod + signalPeriod - 1) return null;

  // Compute full EMA series for fast and slow
  const fastEMA = computeEMASeries(closes, fastPeriod);
  const slowEMA = computeEMASeries(closes, slowPeriod);

  if (fastEMA.length === 0 || slowEMA.length === 0) return null;

  // The MACD line exists where both EMAs overlap.
  // fastEMA starts at index fastPeriod-1 of closes.
  // slowEMA starts at index slowPeriod-1 of closes.
  // The overlap starts at index slowPeriod-1 of closes.
  // In fastEMA's indexing, that corresponds to offset = slowPeriod - fastPeriod.
  const offset = slowPeriod - fastPeriod;
  const macdLine: number[] = [];
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  if (macdLine.length < signalPeriod) return null;

  // Signal line = EMA of the MACD line
  const signalLine = computeEMASeries(macdLine, signalPeriod);
  if (signalLine.length === 0) return null;

  const latestMACD = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];
  const histogram = latestMACD - latestSignal;

  let tradeSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (latestMACD > latestSignal) tradeSignal = 'BUY';
  else if (latestMACD < latestSignal) tradeSignal = 'SELL';

  return {
    macd: parseFloat(latestMACD.toFixed(4)),
    signal: parseFloat(latestSignal.toFixed(4)),
    histogram: parseFloat(histogram.toFixed(4)),
    tradeSignal,
  };
}

// ---- 4. Pivot Points (Standard / Floor) ----

/**
 * Computes standard (floor) pivot points from the previous session's data.
 *
 * PP = (H + L + C) / 3
 * R1 = 2*PP - L,  S1 = 2*PP - H
 * R2 = PP + (H - L),  S2 = PP - (H - L)
 * R3 = H + 2*(PP - L),  S3 = L - 2*(H - PP)
 */
export function computePivotPoints(
  prevHigh: number,
  prevLow: number,
  prevClose: number
): {
  pivots: {
    r3: number;
    r2: number;
    r1: number;
    pp: number;
    s1: number;
    s2: number;
    s3: number;
  };
  formatted: PivotPoint[];
} {
  const pp = (prevHigh + prevLow + prevClose) / 3;
  const r1 = 2 * pp - prevLow;
  const s1 = 2 * pp - prevHigh;
  const r2 = pp + (prevHigh - prevLow);
  const s2 = pp - (prevHigh - prevLow);
  const r3 = prevHigh + 2 * (pp - prevLow);
  const s3 = prevLow - 2 * (prevHigh - pp);

  const round = (v: number) => parseFloat(v.toFixed(2));

  const pivots = {
    r3: round(r3),
    r2: round(r2),
    r1: round(r1),
    pp: round(pp),
    s1: round(s1),
    s2: round(s2),
    s3: round(s3),
  };

  const formatted: PivotPoint[] = [
    {
      label: 'R3',
      description: 'Third Resistance',
      value: pivots.r3,
      type: 'resistance',
    },
    {
      label: 'R2',
      description: 'Second Resistance',
      value: pivots.r2,
      type: 'resistance',
    },
    {
      label: 'R1',
      description: 'First Resistance',
      value: pivots.r1,
      type: 'resistance',
    },
    {
      label: 'PP',
      description: 'Pivot Point',
      value: pivots.pp,
      type: 'pivot',
    },
    {
      label: 'S1',
      description: 'First Support',
      value: pivots.s1,
      type: 'support',
    },
    {
      label: 'S2',
      description: 'Second Support',
      value: pivots.s2,
      type: 'support',
    },
    {
      label: 'S3',
      description: 'Third Support',
      value: pivots.s3,
      type: 'support',
    },
  ];

  return { pivots, formatted };
}

// ---- 5. Simple Moving Average ----

/**
 * Computes a Simple Moving Average for a given period.
 * Returns null if there is insufficient data.
 */
export function computeSMA(
  closes: number[],
  period: number
): number | null {
  if (closes.length < period) return null;

  let sum = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    sum += closes[i];
  }

  return parseFloat((sum / period).toFixed(2));
}

/**
 * Standard SMA periods used in PSX analysis.
 */
const SMA_PERIODS = [5, 15, 30, 50, 100, 150] as const;

/**
 * Computes SMAs for multiple standard periods and generates BUY/SELL
 * signals by comparing the current price against each SMA.
 *
 * @param closes       - Array of close prices, oldest first
 * @param currentPrice - The latest (or live) price to compare against
 * @returns Array of SMA results, one per period that has enough data
 */
export function computeSMAs(
  closes: number[],
  currentPrice: number
): SMAResult[] {
  const results: SMAResult[] = [];

  for (const period of SMA_PERIODS) {
    const value = computeSMA(closes, period);
    if (value === null) continue;

    results.push({
      period,
      label: `SMA ${period}`,
      value,
      signal: currentPrice > value ? 'BUY' : 'SELL',
    });
  }

  return results;
}

// ---- 6. 52-Week Range ----

/**
 * Computes the 52-week high and low from historical data.
 * Uses the last 252 trading days (approx. 1 year on PSX).
 * Returns null if no data is available.
 *
 * @param data - Array of { high, low } objects, oldest first
 */
export function compute52WeekRange(
  data: { high: number; low: number }[]
): { low: number; high: number } | null {
  if (data.length === 0) return null;

  // Take the last 252 data points (1 trading year)
  const slice = data.slice(-252);

  let low = Infinity;
  let high = -Infinity;

  for (const point of slice) {
    if (point.high > high) high = point.high;
    if (point.low < low) low = point.low;
  }

  return {
    low: parseFloat(low.toFixed(2)),
    high: parseFloat(high.toFixed(2)),
  };
}

// ---- 7. Circuit Breakers ----

/**
 * Computes the circuit breaker (price lock) limits for PSX.
 * PSX default is +/- 7.5% from the Last Day Closing Price (LDCP).
 *
 * @param ldcp - Last Day Closing Price
 * @param pct  - Circuit breaker percentage (default 0.075 = 7.5%)
 */
export function computeCircuitBreakers(
  ldcp: number,
  pct: number = 0.075
): { lowerLock: number; upperLock: number } {
  return {
    lowerLock: parseFloat((ldcp * (1 - pct)).toFixed(2)),
    upperLock: parseFloat((ldcp * (1 + pct)).toFixed(2)),
  };
}

// ---- 8. Master Function ----

/**
 * Computes all technical indicators for a stock from its historical data.
 *
 * @param data         - EOD history array, oldest first
 * @param currentPrice - Latest or live price
 * @param ldcp         - Last Day Closing Price (for circuit breakers)
 * @returns Complete StockTechnicals object
 */
export function getAllTechnicals(
  data: StockHistoryPoint[],
  currentPrice: number,
  ldcp: number
): StockTechnicals {
  const closes = data.map((d) => d.close);
  const highs = data.map((d) => d.high);
  const lows = data.map((d) => d.low);

  // ---- Indicators ----
  const indicators: TechnicalIndicator[] = [];

  // RSI
  const rsi = computeRSI(closes);
  if (rsi) {
    indicators.push({
      name: 'RSI',
      params: '14',
      value: rsi.value,
      signal: rsi.signal,
    });
  }

  // Stochastic Oscillator
  const stoch = computeSTOCH(highs, lows, closes);
  if (stoch) {
    indicators.push({
      name: 'Stochastic %K',
      params: '14, 3, 3',
      value: stoch.k,
      signal: stoch.signal,
    });
    indicators.push({
      name: 'Stochastic %D',
      params: '14, 3, 3',
      value: stoch.d,
      signal: stoch.signal,
    });
  }

  // MACD
  const macd = computeMACD(closes);
  if (macd) {
    indicators.push({
      name: 'MACD Line',
      params: '12, 26, 9',
      value: macd.macd,
      signal: macd.tradeSignal,
    });
    indicators.push({
      name: 'MACD Signal',
      params: '12, 26, 9',
      value: macd.signal,
      signal: macd.tradeSignal,
    });
    indicators.push({
      name: 'MACD Histogram',
      params: '12, 26, 9',
      value: macd.histogram,
      signal: macd.tradeSignal,
    });
  }

  // ---- Pivot Points ----
  let pivotPoints: PivotPoint[] = [];
  if (data.length >= 1) {
    // Use the last complete session (the final data point) as "previous"
    const prev = data[data.length - 1];
    const result = computePivotPoints(prev.high, prev.low, prev.close);
    pivotPoints = result.formatted;
  }

  // ---- Moving Averages ----
  const movingAverages = computeSMAs(closes, currentPrice);

  // ---- 52-Week Range ----
  const weekRange52 = compute52WeekRange(
    data.map((d) => ({ high: d.high, low: d.low }))
  );

  // ---- Circuit Breakers ----
  const circuitBreakers = computeCircuitBreakers(ldcp);

  return {
    indicators,
    pivotPoints,
    movingAverages,
    weekRange52,
    circuitBreakers,
  };
}
