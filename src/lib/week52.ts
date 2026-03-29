/**
 * PSX Portfolio Tracker — 52-Week Range Analysis
 * 
 * Analyzes how close a stock's current price is to its 52-week highs and lows.
 * Used for identifying support/resistance zones and reversal opportunities.
 */

export interface Week52Analysis {
  score: number;
  signal: 'near_high' | 'near_low' | 'mid_range';
  proximity_high_pct: number;  // How far from 52W high (0% = at high, 100% = at low)
  proximity_low_pct: number;   // How far from 52W low (0% = at low, 100% = at high)
  interpretation: string;
}

/**
 * Analyzes 52-week high/low proximity to generate opportunity/risk scoring.
 * 
 * Scoring logic:
 * - At 52W high (near_high): score 20, caution signal
 * - Within 5% of high: score 20-30, exercise caution
 * - Near 52W low (near_low): score 90, opportunity signal
 * - Within 10% of low: score 70-90, potential opportunity
 * - Mid-range: score 50-60, neutral
 * 
 * @param currentPrice - Current stock price (PKR)
 * @param high52 - 52-week high price
 * @param low52 - 52-week low price
 * @returns Week52Analysis with score, signal, and interpretation
 */
export function analyze52WeekRange(
  currentPrice: number,
  high52: number,
  low52: number
): Week52Analysis {
  // Validate inputs
  if (high52 <= low52 || currentPrice <= 0 || high52 <= 0 || low52 <= 0) {
    return {
      score: 50,
      signal: 'mid_range',
      proximity_high_pct: 50,
      proximity_low_pct: 50,
      interpretation: 'Insufficient or invalid 52-week data',
    };
  }

  // Calculate the range (52W high - 52W low)
  const range = high52 - low52;

  // Calculate distance from low and high
  const distanceFromLow = currentPrice - low52;
  const distanceFromHigh = high52 - currentPrice;

  // Calculate proximity percentages
  // proximity_low_pct: 0% = at low, 100% = at high
  // proximity_high_pct: 0% = at high, 100% = at low
  const proximity_low_pct = parseFloat(((distanceFromLow / range) * 100).toFixed(1));
  const proximity_high_pct = parseFloat((100 - proximity_low_pct).toFixed(1));

  // Determine signal and score based on proximity
  let signal: 'near_high' | 'near_low' | 'mid_range';
  let score: number;
  let interpretation: string;

  // Near 52W high (within 5% of high): Caution, potential correction
  if (proximity_high_pct <= 5) {
    score = 20;
    signal = 'near_high';
    interpretation = `At 52W high (PKR ${high52}) - Exercise caution, potential correction risk`;
  }
  // Near 52W high (within 5-10% of high)
  else if (proximity_high_pct <= 10) {
    score = 25;
    signal = 'near_high';
    interpretation = `Near 52W high (${proximity_high_pct}% away) - Caution advised`;
  }
  // Mid-range upper (10-40% from high)
  else if (proximity_high_pct <= 40) {
    score = 45;
    signal = 'mid_range';
    interpretation = `Upper mid-range (${proximity_high_pct}% from high)`;
  }
  // True mid-range (40-60%)
  else if (proximity_high_pct <= 60) {
    score = 50;
    signal = 'mid_range';
    interpretation = `Mid-range - Neutral positioning`;
  }
  // Mid-range lower (60-90% from high, 10-40% from low)
  else if (proximity_high_pct <= 90) {
    score = 55;
    signal = 'mid_range';
    interpretation = `Lower mid-range (${proximity_high_pct}% from high)`;
  }
  // Near 52W low (within 10% of low)
  else if (proximity_high_pct <= 95) {
    score = 80;
    signal = 'near_low';
    interpretation = `Near 52W low (${proximity_high_pct}% from high) - Potential buying opportunity`;
  }
  // At 52W low (within 5% of low): Strong opportunity
  else {
    score = 90;
    signal = 'near_low';
    interpretation = `At 52W low (PKR ${low52}) - Strong buying opportunity`;
  }

  return {
    score,
    signal,
    proximity_high_pct,
    proximity_low_pct,
    interpretation,
  };
}
