/**
 * Chart Pattern Detection
 * Detects common candlestick and price patterns from historical data
 */

export interface PatternDetection {
  pattern: string;
  confidence: number; // 0-100
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface PatternAnalysis {
  patterns: PatternDetection[];
  overall_score: number; // -50 to +50
  summary: string;
}

interface HistoryPoint {
  date: string;
  close: number;
  high: number;
  low: number;
}

/**
 * Detect common price patterns from historical data
 * Uses simplified detection based on price levels and structure
 */
export function detectPatterns(
  history: HistoryPoint[]
): PatternAnalysis {
  const patterns: PatternDetection[] = [];

  // Use last 60 days for pattern detection
  const recentHistory = history.slice(-60);

  if (recentHistory.length < 10) {
    return {
      patterns: [],
      overall_score: 0,
      summary: 'Insufficient data for pattern detection (need at least 10 days)',
    };
  }

  // Detect each pattern
  const doubleBottom = detectDoubleBottom(recentHistory);
  const doubleTop = detectDoubleTop(recentHistory);
  const higherHighsLows = detectHigherHighsLows(recentHistory);
  const lowerHighsLows = detectLowerHighsLows(recentHistory);
  const consolidation = detectConsolidation(recentHistory);

  if (doubleBottom) patterns.push(doubleBottom);
  if (doubleTop) patterns.push(doubleTop);
  if (higherHighsLows) patterns.push(higherHighsLows);
  if (lowerHighsLows) patterns.push(lowerHighsLows);
  if (consolidation) patterns.push(consolidation);

  // Calculate overall score
  const bullishScore = patterns
    .filter((p) => p.signal === 'bullish')
    .reduce((sum, p) => sum + p.confidence, 0);
  const bearishScore = patterns
    .filter((p) => p.signal === 'bearish')
    .reduce((sum, p) => sum + p.confidence, 0);
  const overall_score = (bullishScore - bearishScore) / 2;

  // Generate summary
  let summary = '';
  if (patterns.length === 0) {
    summary = 'No significant patterns detected';
  } else {
    const topPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0];
    summary = `${topPattern.pattern} pattern detected (${topPattern.confidence}% confidence) - ${topPattern.signal}`;
  }

  return {
    patterns,
    overall_score: parseFloat(overall_score.toFixed(1)),
    summary,
  };
}

/**
 * Double Bottom Pattern (Bullish)
 * Two similar lows with higher middle section
 * Find two lows within 5% of each other with 10+ days gap
 */
function detectDoubleBottom(history: HistoryPoint[]): PatternDetection | null {
  if (history.length < 20) return null;

  const lows = history.map((h) => h.low);
  const indices: number[] = [];

  // Find potential swing lows
  for (let i = 1; i < lows.length - 1; i++) {
    if (lows[i] < lows[i - 1] && lows[i] < lows[i + 1]) {
      indices.push(i);
    }
  }

  if (indices.length < 2) return null;

  // Check pairs of lows
  for (let i = 0; i < indices.length - 1; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      const idx1 = indices[i];
      const idx2 = indices[j];
      const low1 = lows[idx1];
      const low2 = lows[idx2];

      // Check if lows are within 5% of each other
      const lowDiff = Math.abs(low1 - low2) / Math.max(low1, low2);
      if (lowDiff > 0.05) continue;

      // Check if gap between them is at least 10 days
      const dayGap = idx2 - idx1;
      if (dayGap < 10) continue;

      // Check if middle section has higher prices
      const middleHigh = Math.max(...history.slice(idx1 + 1, idx2).map((h) => h.high));
      if (middleHigh < (low1 + low2) / 2) continue;

      // Check if recent price is confirming (above middle section)
      const recentPrice = history[history.length - 1].close;
      if (recentPrice < middleHigh) {
        // Strong confirmation
        const confidence = Math.min(90, 70 + (dayGap - 10) * 2);
        return {
          pattern: 'Double Bottom',
          confidence: Math.round(confidence),
          signal: 'bullish',
          description: `Two lows at ${low1.toFixed(2)} and ${low2.toFixed(2)} with ${dayGap} days between them`,
        };
      }
    }
  }

  return null;
}

/**
 * Double Top Pattern (Bearish)
 * Two similar highs with lower middle section
 */
function detectDoubleTop(history: HistoryPoint[]): PatternDetection | null {
  if (history.length < 20) return null;

  const highs = history.map((h) => h.high);
  const indices: number[] = [];

  // Find potential swing highs
  for (let i = 1; i < highs.length - 1; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i + 1]) {
      indices.push(i);
    }
  }

  if (indices.length < 2) return null;

  // Check pairs of highs
  for (let i = 0; i < indices.length - 1; i++) {
    for (let j = i + 1; j < indices.length; j++) {
      const idx1 = indices[i];
      const idx2 = indices[j];
      const high1 = highs[idx1];
      const high2 = highs[idx2];

      // Check if highs are within 5% of each other
      const highDiff = Math.abs(high1 - high2) / Math.max(high1, high2);
      if (highDiff > 0.05) continue;

      // Check if gap between them is at least 10 days
      const dayGap = idx2 - idx1;
      if (dayGap < 10) continue;

      // Check if middle section has lower prices
      const middleLow = Math.min(...history.slice(idx1 + 1, idx2).map((h) => h.low));
      if (middleLow > (high1 + high2) / 2) continue;

      // Check if recent price is confirming (below middle section)
      const recentPrice = history[history.length - 1].close;
      if (recentPrice < middleLow) {
        // Strong confirmation
        const confidence = Math.min(90, 70 + (dayGap - 10) * 2);
        return {
          pattern: 'Double Top',
          confidence: Math.round(confidence),
          signal: 'bearish',
          description: `Two highs at ${high1.toFixed(2)} and ${high2.toFixed(2)} with ${dayGap} days between them`,
        };
      }
    }
  }

  return null;
}

/**
 * Higher Highs & Higher Lows Pattern (Bullish Uptrend)
 * Compare last 5 swing highs/lows with previous 5
 */
function detectHigherHighsLows(history: HistoryPoint[]): PatternDetection | null {
  if (history.length < 20) return null;

  // Find swing highs and lows in recent data
  const highs = history.map((h) => h.high);
  const lows = history.map((h) => h.low);

  // Get swing points from second half of data
  const midPoint = Math.floor(history.length / 2);
  const swingIndices = getSwingIndices(history, midPoint);

  if (swingIndices.length < 10) return null;

  // Split into two halves
  const halfPoint = Math.floor(swingIndices.length / 2);
  const firstHalf = swingIndices.slice(0, halfPoint);
  const secondHalf = swingIndices.slice(halfPoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return null;

  // Get high/low values for each half
  const firstHighs = firstHalf.map((i) => highs[i]);
  const secondHighs = secondHalf.map((i) => highs[i]);
  const firstLows = firstHalf.map((i) => lows[i]);
  const secondLows = secondHalf.map((i) => lows[i]);

  const avgFirstHigh = firstHighs.reduce((a, b) => a + b) / firstHighs.length;
  const avgSecondHigh = secondHighs.reduce((a, b) => a + b) / secondHighs.length;
  const avgFirstLow = firstLows.reduce((a, b) => a + b) / firstLows.length;
  const avgSecondLow = secondLows.reduce((a, b) => a + b) / secondLows.length;

  // Check if highs are higher and lows are higher
  if (avgSecondHigh > avgFirstHigh && avgSecondLow > avgFirstLow) {
    const highIncrease = ((avgSecondHigh - avgFirstHigh) / avgFirstHigh) * 100;
    const lowIncrease = ((avgSecondLow - avgFirstLow) / avgFirstLow) * 100;
    const avgIncrease = (highIncrease + lowIncrease) / 2;

    // Confidence based on magnitude of increase
    const confidence = Math.min(85, 60 + avgIncrease * 5);

    return {
      pattern: 'Higher Highs & Lows',
      confidence: Math.round(confidence),
      signal: 'bullish',
      description: `Uptrend detected: highs +${highIncrease.toFixed(1)}%, lows +${lowIncrease.toFixed(1)}%`,
    };
  }

  return null;
}

/**
 * Lower Highs & Lower Lows Pattern (Bearish Downtrend)
 * Opposite of Higher Highs & Lows
 */
function detectLowerHighsLows(history: HistoryPoint[]): PatternDetection | null {
  if (history.length < 20) return null;

  // Find swing highs and lows in recent data
  const highs = history.map((h) => h.high);
  const lows = history.map((h) => h.low);

  // Get swing points from second half of data
  const midPoint = Math.floor(history.length / 2);
  const swingIndices = getSwingIndices(history, midPoint);

  if (swingIndices.length < 10) return null;

  // Split into two halves
  const halfPoint = Math.floor(swingIndices.length / 2);
  const firstHalf = swingIndices.slice(0, halfPoint);
  const secondHalf = swingIndices.slice(halfPoint);

  if (firstHalf.length === 0 || secondHalf.length === 0) return null;

  // Get high/low values for each half
  const firstHighs = firstHalf.map((i) => highs[i]);
  const secondHighs = secondHalf.map((i) => highs[i]);
  const firstLows = firstHalf.map((i) => lows[i]);
  const secondLows = secondHalf.map((i) => lows[i]);

  const avgFirstHigh = firstHighs.reduce((a, b) => a + b) / firstHighs.length;
  const avgSecondHigh = secondHighs.reduce((a, b) => a + b) / secondHighs.length;
  const avgFirstLow = firstLows.reduce((a, b) => a + b) / firstLows.length;
  const avgSecondLow = secondLows.reduce((a, b) => a + b) / secondLows.length;

  // Check if highs are lower and lows are lower
  if (avgSecondHigh < avgFirstHigh && avgSecondLow < avgFirstLow) {
    const highDecrease = ((avgFirstHigh - avgSecondHigh) / avgFirstHigh) * 100;
    const lowDecrease = ((avgFirstLow - avgSecondLow) / avgFirstLow) * 100;
    const avgDecrease = (highDecrease + lowDecrease) / 2;

    // Confidence based on magnitude of decrease
    const confidence = Math.min(85, 60 + avgDecrease * 5);

    return {
      pattern: 'Lower Highs & Lows',
      confidence: Math.round(confidence),
      signal: 'bearish',
      description: `Downtrend detected: highs -${highDecrease.toFixed(1)}%, lows -${lowDecrease.toFixed(1)}%`,
    };
  }

  return null;
}

/**
 * Consolidation Pattern (Neutral)
 * Price range within 5% for last 20 days
 */
function detectConsolidation(history: HistoryPoint[]): PatternDetection | null {
  if (history.length < 20) return null;

  // Check last 20 days
  const recent = history.slice(-20);
  const highs = recent.map((h) => h.high);
  const lows = recent.map((h) => h.low);

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);

  // Range as percentage of average price
  const avgPrice = (maxHigh + minLow) / 2;
  const rangePercent = ((maxHigh - minLow) / avgPrice) * 100;

  // Consolidation if range is less than 5%
  if (rangePercent < 5) {
    return {
      pattern: 'Consolidation',
      confidence: Math.round(Math.max(60, 100 - rangePercent * 10)),
      signal: 'neutral',
      description: `Price range: ${rangePercent.toFixed(2)}% over last 20 days (${minLow.toFixed(2)} - ${maxHigh.toFixed(2)})`,
    };
  }

  return null;
}

/**
 * Helper: Find swing highs and lows
 */
function getSwingIndices(history: HistoryPoint[], fromIndex: number = 0): number[] {
  const highs = history.map((h) => h.high);
  const lows = history.map((h) => h.low);
  const indices: number[] = [];

  // Look for alternating highs and lows
  for (let i = fromIndex + 1; i < history.length - 1; i++) {
    const isSwingHigh =
      highs[i] > highs[i - 1] &&
      highs[i] > highs[i + 1] &&
      highs[i] > lows[i - 1] &&
      highs[i] > lows[i + 1];

    const isSwingLow =
      lows[i] < lows[i - 1] &&
      lows[i] < lows[i + 1] &&
      lows[i] < highs[i - 1] &&
      lows[i] < highs[i + 1];

    if (isSwingHigh || isSwingLow) {
      indices.push(i);
    }
  }

  return indices;
}
