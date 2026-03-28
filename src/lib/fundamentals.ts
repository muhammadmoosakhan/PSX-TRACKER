/**
 * Fundamental Score Calculator for PSX Tracker
 * Analyzes company fundamentals and provides a composite score with signals
 */

interface FundamentalsData {
  peRatio?: number;
  roe?: number;
  debtToEquity?: number;
  currentRatio?: number;
  dividendYield?: number;
  eps?: number;
}

interface FundamentalScore {
  score: number;
  signals: string[];
  breakdown: {
    pe?: number;
    roe?: number;
    debt?: number;
    current?: number;
    dividend?: number;
    eps?: number;
  };
}

/**
 * Score P/E Ratio (lower is typically better)
 * < 10 = 100, 10-15 = 80, 15-25 = 60, 25-35 = 40, > 35 = 20
 */
function scorePERatio(pe: number): { score: number; signal: string } {
  let score: number;
  let assessment: string;

  if (pe < 10) {
    score = 100;
    assessment = "Undervalued";
  } else if (pe < 15) {
    score = 80;
    assessment = "Good value";
  } else if (pe < 25) {
    score = 60;
    assessment = "Fair value";
  } else if (pe < 35) {
    score = 40;
    assessment = "Expensive";
  } else {
    score = 20;
    assessment = "Very expensive";
  }

  return {
    score,
    signal: `P/E Ratio ${assessment} (${pe.toFixed(2)})`,
  };
}

/**
 * Score ROE (Return on Equity) - higher is better
 * > 20% = 100, 15-20% = 80, 10-15% = 60, 5-10% = 40, < 5% = 20
 */
function scoreROE(roe: number): { score: number; signal: string } {
  let score: number;
  let assessment: string;

  const roePercent = roe * 100; // Convert to percentage if needed

  if (roe > 0.2) {
    score = 100;
    assessment = "Strong";
  } else if (roe >= 0.15) {
    score = 80;
    assessment = "Good";
  } else if (roe >= 0.1) {
    score = 60;
    assessment = "Moderate";
  } else if (roe >= 0.05) {
    score = 40;
    assessment = "Weak";
  } else {
    score = 20;
    assessment = "Very weak";
  }

  return {
    score,
    signal: `${assessment} ROE (${roePercent.toFixed(2)}%)`,
  };
}

/**
 * Score Debt-to-Equity Ratio - lower is better (less leveraged)
 * < 0.5 = 100, 0.5-1 = 80, 1-1.5 = 60, 1.5-2 = 40, > 2 = 20
 */
function scoreDebtToEquity(
  debtToEquity: number
): { score: number; signal: string } {
  let score: number;
  let assessment: string;

  if (debtToEquity < 0.5) {
    score = 100;
    assessment = "Excellent";
  } else if (debtToEquity < 1) {
    score = 80;
    assessment = "Good";
  } else if (debtToEquity < 1.5) {
    score = 60;
    assessment = "Moderate";
  } else if (debtToEquity < 2) {
    score = 40;
    assessment = "High";
  } else {
    score = 20;
    assessment = "Very high debt concern";
  }

  return {
    score,
    signal: `${assessment} leverage (D/E: ${debtToEquity.toFixed(2)})`,
  };
}

/**
 * Score Current Ratio - indicates liquidity, 1.5-2 is typically healthy
 * > 2 = 100, 1.5-2 = 80, 1-1.5 = 60, 0.5-1 = 40, < 0.5 = 20
 */
function scoreCurrentRatio(currentRatio: number): {
  score: number;
  signal: string;
} {
  let score: number;
  let assessment: string;

  if (currentRatio > 2) {
    score = 100;
    assessment = "Strong liquidity";
  } else if (currentRatio >= 1.5) {
    score = 80;
    assessment = "Good liquidity";
  } else if (currentRatio >= 1) {
    score = 60;
    assessment = "Moderate liquidity";
  } else if (currentRatio >= 0.5) {
    score = 40;
    assessment = "Weak liquidity";
  } else {
    score = 20;
    assessment = "Critical liquidity concern";
  }

  return {
    score,
    signal: `${assessment} (Current Ratio: ${currentRatio.toFixed(2)})`,
  };
}

/**
 * Score Dividend Yield - higher is better but within reason
 * > 5% = 100, 3-5% = 80, 1-3% = 60, 0-1% = 40, 0 = 20
 */
function scoreDividendYield(
  dividendYield: number
): { score: number; signal: string } {
  let score: number;
  let assessment: string;

  if (dividendYield > 0.05) {
    score = 100;
    assessment = "High yield";
  } else if (dividendYield >= 0.03) {
    score = 80;
    assessment = "Attractive yield";
  } else if (dividendYield >= 0.01) {
    score = 60;
    assessment = "Moderate yield";
  } else if (dividendYield > 0) {
    score = 40;
    assessment = "Low yield";
  } else {
    score = 20;
    assessment = "No dividend";
  }

  const yieldPercent = dividendYield * 100;
  return {
    score,
    signal: `${assessment} (${yieldPercent.toFixed(2)}%)`,
  };
}

/**
 * Score EPS (Earnings Per Share)
 * positive = 80, zero = 50, negative = 20
 */
function scoreEPS(eps: number): { score: number; signal: string } {
  let score: number;
  let assessment: string;

  if (eps > 0) {
    score = 80;
    assessment = "Profitable";
  } else if (eps === 0) {
    score = 50;
    assessment = "Break-even";
  } else {
    score = 20;
    assessment = "Loss-making";
  }

  return {
    score,
    signal: `${assessment} (EPS: ${eps.toFixed(2)})`,
  };
}

/**
 * Calculate comprehensive fundamental score
 * Returns weighted score, signals, and detailed breakdown
 */
export function calculateFundamentalScore(
  fundamentals: FundamentalsData
): FundamentalScore {
  const breakdown: FundamentalScore["breakdown"] = {};
  const signals: string[] = [];
  const scores: { weight: number; score: number }[] = [];

  // Score P/E Ratio if available
  if (fundamentals.peRatio !== null && fundamentals.peRatio !== undefined) {
    const { score, signal } = scorePERatio(fundamentals.peRatio);
    breakdown.pe = score;
    signals.push(signal);
    scores.push({ weight: 1, score });
  }

  // Score ROE if available
  if (fundamentals.roe !== null && fundamentals.roe !== undefined) {
    const { score, signal } = scoreROE(fundamentals.roe);
    breakdown.roe = score;
    signals.push(signal);
    scores.push({ weight: 1, score });
  }

  // Score Debt-to-Equity if available
  if (
    fundamentals.debtToEquity !== null &&
    fundamentals.debtToEquity !== undefined
  ) {
    const { score, signal } = scoreDebtToEquity(fundamentals.debtToEquity);
    breakdown.debt = score;
    signals.push(signal);
    scores.push({ weight: 1, score });
  }

  // Score Current Ratio if available
  if (
    fundamentals.currentRatio !== null &&
    fundamentals.currentRatio !== undefined
  ) {
    const { score, signal } = scoreCurrentRatio(fundamentals.currentRatio);
    breakdown.current = score;
    signals.push(signal);
    scores.push({ weight: 1, score });
  }

  // Score Dividend Yield if available
  if (
    fundamentals.dividendYield !== null &&
    fundamentals.dividendYield !== undefined
  ) {
    const { score, signal } = scoreDividendYield(fundamentals.dividendYield);
    breakdown.dividend = score;
    signals.push(signal);
    scores.push({ weight: 1, score });
  }

  // Score EPS if available
  if (fundamentals.eps !== null && fundamentals.eps !== undefined) {
    const { score, signal } = scoreEPS(fundamentals.eps);
    breakdown.eps = score;
    signals.push(signal);
    scores.push({ weight: 1, score });
  }

  // Calculate weighted average
  let finalScore = 0;
  if (scores.length > 0) {
    const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = scores.reduce(
      (sum, item) => sum + item.score * item.weight,
      0
    );
    finalScore = Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  // Ensure score is between 0-100
  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    score: finalScore,
    signals,
    breakdown,
  };
}

export type { FundamentalsData, FundamentalScore };
