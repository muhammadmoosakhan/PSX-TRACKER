export interface VolumeAnalysis {
  score: number;
  signal: string;
  interpretation: string;
}

/**
 * Analyzes trading volume to generate a bullish/bearish signal
 * @param currentVolume - Current trading volume
 * @param avgVolume - Average historical volume
 * @param priceChange - Price change percentage (positive for up, negative for down)
 * @returns VolumeAnalysis with score, signal, and interpretation
 */
export function analyzeVolume(
  currentVolume: number,
  avgVolume: number,
  priceChange: number
): VolumeAnalysis {
  // Handle edge cases: invalid data
  if (avgVolume <= 0 || currentVolume < 0) {
    return {
      score: 50,
      signal: "Normal Trading",
      interpretation: "Insufficient data for volume analysis"
    };
  }

  // Calculate volume ratio
  const volumeRatio = currentVolume / avgVolume;

  // Determine price direction
  const priceUp = priceChange > 0;
  const priceDown = priceChange < 0;

  let score: number;
  let signal: string;
  let interpretation: string;

  // Score based on volume + price action combinations
  if (volumeRatio > 1.5) {
    // High volume (>1.5x)
    if (priceUp) {
      // High volume + price up = accumulation, bullish
      score = 90;
      signal = "Strong Accumulation";
      interpretation = `Volume ${volumeRatio.toFixed(1)}x above average with +${priceChange.toFixed(2)}% price gain suggests institutional buying`;
    } else if (priceDown) {
      // High volume + price down = distribution, bearish
      score = 30;
      signal = "Distribution Warning";
      interpretation = `Volume ${volumeRatio.toFixed(1)}x above average with ${priceChange.toFixed(2)}% price decline suggests institutional selling`;
    } else {
      // High volume + no price change
      score = 70;
      signal = "Strong Accumulation";
      interpretation = `Volume ${volumeRatio.toFixed(1)}x above average indicates strong interest despite no price movement`;
    }

    // Very high volume (>3x) bonus/penalty based on direction
    if (volumeRatio > 3) {
      if (priceUp) {
        score = Math.min(100, score + 10); // Add bonus for bullish
      } else if (priceDown) {
        score = Math.max(0, score - 10); // Apply penalty for bearish
      }
    }
  } else if (volumeRatio >= 0.8 && volumeRatio <= 1.5) {
    // Normal volume (0.8-1.5x)
    if (priceUp) {
      score = 70;
      signal = "Normal Trading";
      interpretation = `Normal volume (${volumeRatio.toFixed(1)}x average) with +${priceChange.toFixed(2)}% price gain indicates steady buying`;
    } else if (priceDown) {
      score = 50;
      signal = "Normal Trading";
      interpretation = `Normal volume (${volumeRatio.toFixed(1)}x average) with ${priceChange.toFixed(2)}% price decline indicates moderate selling`;
    } else {
      score = 60;
      signal = "Normal Trading";
      interpretation = `Normal volume (${volumeRatio.toFixed(1)}x average) with no price movement indicates market consolidation`;
    }
  } else {
    // Low volume (<0.8x) - no conviction regardless of direction
    score = 50;
    signal = "Low Conviction";
    interpretation = `Low volume (${volumeRatio.toFixed(1)}x average) indicates weak conviction regardless of price direction`;
  }

  // Ensure score is within bounds [0, 100]
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    signal,
    interpretation
  };
}
