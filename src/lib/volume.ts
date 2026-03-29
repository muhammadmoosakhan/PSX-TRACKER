export interface VolumeAnalysis {
  score: number;
  signal: string;
  interpretation: string;
}

export interface EnhancedVolumeAnalysis {
  // Existing fields
  avg_volume_20d: number;
  current_vs_avg: number;
  signal: 'accumulation' | 'distribution' | 'normal';
  
  // New fields
  volume_trend: 'increasing' | 'decreasing' | 'stable';  // 5-day trend
  price_volume_divergence: {
    detected: boolean;
    type: 'bullish' | 'bearish' | null;  // Price down + volume down = bullish, etc.
    description: string;
  };
  volume_breakout: {
    detected: boolean;
    strength: number;  // How many std devs above avg
  };
  enhanced_score: number;  // Combined volume score
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

/**
 * Enhanced volume analysis with trend, divergence, and breakout detection
 * @param history - Array of historical data with date, close, and volume
 * @returns EnhancedVolumeAnalysis with advanced volume metrics
 */
export function analyzeVolumeEnhanced(
  history: Array<{date: string; close: number; volume: number}>
): EnhancedVolumeAnalysis {
  if (!history || history.length < 10) {
    return {
      avg_volume_20d: 0,
      current_vs_avg: 0,
      signal: 'normal',
      volume_trend: 'stable',
      price_volume_divergence: { detected: false, type: null, description: 'Insufficient data' },
      volume_breakout: { detected: false, strength: 0 },
      enhanced_score: 50,
    };
  }

  // 1. Calculate 20-day average volume
  const last20 = history.slice(-20);
  const avg_volume_20d = last20.reduce((sum, h) => sum + h.volume, 0) / last20.length;
  
  const currentVolume = history[history.length - 1].volume;
  const current_vs_avg = currentVolume / avg_volume_20d;

  // 2. Volume Trend (5-day comparison)
  const last10 = history.slice(-10);
  const last5 = last10.slice(-5);
  const prev5 = last10.slice(0, 5);
  
  const avg_last5 = last5.reduce((sum, h) => sum + h.volume, 0) / last5.length;
  const avg_prev5 = prev5.reduce((sum, h) => sum + h.volume, 0) / prev5.length;
  
  let volume_trend: 'increasing' | 'decreasing' | 'stable';
  if (avg_last5 > avg_prev5 * 1.1) {
    volume_trend = 'increasing';
  } else if (avg_last5 < avg_prev5 * 0.9) {
    volume_trend = 'decreasing';
  } else {
    volume_trend = 'stable';
  }

  // 3. Price-Volume Divergence Detection
  let price_volume_divergence: EnhancedVolumeAnalysis['price_volume_divergence'] = {
    detected: false,
    type: null,
    description: 'No divergence detected'
  };

  if (history.length >= 5) {
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const prevPrev = history[history.length - 3];
    
    const priceDirection = last.close > prev.close ? 'up' : last.close < prev.close ? 'down' : 'flat';
    const volumeDirection = last.volume > prev.volume ? 'up' : last.volume < prev.volume ? 'down' : 'flat';
    
    // Price down + volume down = selling exhaustion (bullish divergence)
    if (priceDirection === 'down' && volumeDirection === 'down') {
      price_volume_divergence = {
        detected: true,
        type: 'bullish',
        description: 'Selling exhaustion: Price falling on decreasing volume suggests weakness is ending'
      };
    }
    // Price up + volume down = distribution (bearish divergence)
    else if (priceDirection === 'up' && volumeDirection === 'down') {
      price_volume_divergence = {
        detected: true,
        type: 'bearish',
        description: 'Distribution warning: Price rising on decreasing volume suggests conviction is lacking'
      };
    }
    // Price down + volume up = capitulation (potential reversal - bullish)
    else if (priceDirection === 'down' && volumeDirection === 'up') {
      price_volume_divergence = {
        detected: true,
        type: 'bullish',
        description: 'Capitulation: Heavy selling pressure may indicate bottom formation'
      };
    }
    // Price up + volume up = strong accumulation (bullish)
    else if (priceDirection === 'up' && volumeDirection === 'up') {
      price_volume_divergence = {
        detected: false,
        type: null,
        description: 'Strong conviction: Price rising on increasing volume confirms buying momentum'
      };
    }
  }

  // 4. Volume Breakout Detection (2 std devs above 20-day avg)
  const volumes = last20.map(h => h.volume);
  const mean = volumes.reduce((a, b) => a + b) / volumes.length;
  const variance = volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  
  const zScore = stdDev > 0 ? (currentVolume - mean) / stdDev : 0;
  const volume_breakout = {
    detected: zScore > 2,
    strength: Math.max(0, zScore)
  };

  // 5. Calculate Enhanced Score
  let enhanced_score = 50;

  // Base signal determination
  const signal: 'accumulation' | 'distribution' | 'normal' = 
    current_vs_avg > 1.5 ? 'accumulation' : current_vs_avg < 0.8 ? 'distribution' : 'normal';

  // Score adjustments
  if (signal === 'accumulation') {
    enhanced_score = 75;
  } else if (signal === 'distribution') {
    enhanced_score = 35;
  }

  // Volume trend adjustment
  if (volume_trend === 'increasing') {
    enhanced_score += 10;
  } else if (volume_trend === 'decreasing') {
    enhanced_score -= 10;
  }

  // Divergence adjustment
  if (price_volume_divergence.detected) {
    if (price_volume_divergence.type === 'bullish') {
      enhanced_score += 15;
    } else if (price_volume_divergence.type === 'bearish') {
      enhanced_score -= 15;
    }
  }

  // Breakout adjustment
  if (volume_breakout.detected) {
    enhanced_score += Math.min(15, volume_breakout.strength * 5);
  }

  // Clamp score to [0, 100]
  enhanced_score = Math.max(0, Math.min(100, enhanced_score));

  return {
    avg_volume_20d,
    current_vs_avg: parseFloat(current_vs_avg.toFixed(2)),
    signal,
    volume_trend,
    price_volume_divergence,
    volume_breakout: {
      detected: volume_breakout.detected,
      strength: parseFloat(volume_breakout.strength.toFixed(2))
    },
    enhanced_score: parseFloat(enhanced_score.toFixed(1)),
  };
}
