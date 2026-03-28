// ============================================
// PSX Tracker — Smart Advisor Engine
// Combines: Technical + Sentiment + Trend + Context
// ============================================

import type { SentimentResult } from './sentiment';
import type { TrendAnalysis } from './trend';

export interface AdvisoryScore {
  overall: number;              // -1 to +1
  label: 'Strong Sell' | 'Sell' | 'Hold' | 'Buy' | 'Strong Buy';
  confidence: number;           // 0-1
  technicalScore: number;       // -1 to +1
  sentimentScore: number;       // -1 to +1
  trendScore: number;           // -1 to +1
  reasoning: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestedAction: string;
  targetEntry: number | null;   // suggested buy price
  targetExit: number | null;    // suggested sell/take-profit
  stopLoss: number | null;      // suggested stop-loss
  enhancedScore?: number;       // composite score with all factors (0-100)
  accuracyTier?: string;        // accuracy tier label
}

// ---- Technical Composite Score (TradingView-style) ----

export function computeTechnicalComposite(indicators: {
  rsiValue?: number;
  rsiSignal?: string;
  stochK?: number;
  stochSignal?: string;
  macdSignal?: string;
  smaSignals?: { signal: string }[];
}): number {
  let buyCount = 0;
  let sellCount = 0;
  let total = 0;

  // Oscillators
  if (indicators.rsiSignal) {
    total++;
    if (indicators.rsiSignal === 'BUY') buyCount++;
    else if (indicators.rsiSignal === 'SELL') sellCount++;
  }

  if (indicators.stochSignal) {
    total++;
    if (indicators.stochSignal === 'BUY') buyCount++;
    else if (indicators.stochSignal === 'SELL') sellCount++;
  }

  if (indicators.macdSignal) {
    total++;
    if (indicators.macdSignal === 'BUY') buyCount++;
    else if (indicators.macdSignal === 'SELL') sellCount++;
  }

  // Moving Averages
  if (indicators.smaSignals) {
    for (const sma of indicators.smaSignals) {
      total++;
      if (sma.signal === 'BUY') buyCount++;
      else if (sma.signal === 'SELL') sellCount++;
    }
  }

  if (total === 0) return 0;
  return (buyCount - sellCount) / total;
}

// ---- Advisory Score Calculation ----

const WEIGHTS = {
  technical: 0.35,
  sentiment: 0.25,
  trend: 0.25,
  context: 0.15,
};

export function computeAdvisory(params: {
  technicalScore: number;
  sentimentResult: SentimentResult;
  trendAnalysis: TrendAnalysis;
  currentPrice: number;
  volatilityPct: number;
  sectorContext?: number;  // -1 to +1 from macro factors
}): AdvisoryScore {
  const { technicalScore, sentimentResult, trendAnalysis, currentPrice, volatilityPct } = params;
  const sectorContext = params.sectorContext ?? 0;

  const sentimentScore = sentimentResult.score;
  const trendScore = trendAnalysis.overallScore;

  // Weighted composite
  const overall =
    technicalScore * WEIGHTS.technical +
    sentimentScore * WEIGHTS.sentiment +
    trendScore * WEIGHTS.trend +
    sectorContext * WEIGHTS.context;

  const clampedOverall = Math.max(-1, Math.min(1, overall));

  // Label
  let label: AdvisoryScore['label'] = 'Hold';
  if (clampedOverall > 0.4) label = 'Strong Buy';
  else if (clampedOverall > 0.15) label = 'Buy';
  else if (clampedOverall < -0.4) label = 'Strong Sell';
  else if (clampedOverall < -0.15) label = 'Sell';

  // Confidence = how much signals agree
  const signals = [technicalScore, sentimentScore, trendScore];
  const allPositive = signals.every((s) => s > 0);
  const allNegative = signals.every((s) => s < 0);
  const confidence = allPositive || allNegative
    ? Math.min(1, Math.abs(clampedOverall) + 0.2)
    : Math.abs(clampedOverall);

  // Risk level
  let riskLevel: AdvisoryScore['riskLevel'] = 'Medium';
  if (volatilityPct > 4) riskLevel = 'High';
  else if (volatilityPct < 2) riskLevel = 'Low';

  // Reasoning
  const reasoning: string[] = [];

  if (technicalScore > 0.3) reasoning.push('Technical indicators are mostly bullish');
  else if (technicalScore < -0.3) reasoning.push('Technical indicators are mostly bearish');
  else reasoning.push('Technical indicators are mixed');

  if (sentimentResult.label === 'bullish') reasoning.push(`News sentiment is positive (${sentimentResult.method})`);
  else if (sentimentResult.label === 'bearish') reasoning.push(`News sentiment is negative (${sentimentResult.method})`);
  else reasoning.push('News sentiment is neutral');

  if (trendAnalysis.overallLabel.includes('Up')) reasoning.push(`Price trend: ${trendAnalysis.overallLabel}`);
  else if (trendAnalysis.overallLabel.includes('Down')) reasoning.push(`Price trend: ${trendAnalysis.overallLabel}`);
  else reasoning.push('Price trend is sideways');

  // Only show crossover in reasoning if it's recent (< 60 days)
  const crossDays = trendAnalysis.crossover.daysAgo ?? 999;
  if (trendAnalysis.crossover.type === 'golden_cross' && crossDays < 60) reasoning.push(`Golden Cross detected ${crossDays}d ago — bullish`);
  else if (trendAnalysis.crossover.type === 'death_cross' && crossDays < 60) reasoning.push(`Death Cross detected ${crossDays}d ago — bearish`);

  if (volatilityPct > 4) reasoning.push(`High volatility (${volatilityPct}% ATR) — higher risk`);

  // Suggested action
  let suggestedAction = 'Hold current position. Watch for clearer signals.';
  if (label === 'Strong Buy') suggestedAction = 'Consider buying. Multiple indicators align bullish.';
  else if (label === 'Buy') suggestedAction = 'Lean towards buying. Most signals are positive.';
  else if (label === 'Sell') suggestedAction = 'Consider reducing position. Signals turning bearish.';
  else if (label === 'Strong Sell') suggestedAction = 'Consider selling. Multiple indicators align bearish.';

  // Price targets — use S/R if within ±20% of current price, otherwise derive from current price
  const sr = trendAnalysis.supportResistance;
  const isReasonable = (level: number | null) => level !== null && currentPrice > 0 && Math.abs(level - currentPrice) / currentPrice < 0.2;

  const nearSupport = isReasonable(sr.nearestSupport) ? sr.nearestSupport : null;
  const nearResistance = isReasonable(sr.nearestResistance) ? sr.nearestResistance : null;

  // Entry: nearest support + 0.5% buffer, or current price - 3%
  const targetEntry = nearSupport
    ? parseFloat((nearSupport * 1.005).toFixed(2))
    : currentPrice > 0 ? parseFloat((currentPrice * 0.97).toFixed(2)) : null;

  // Exit: nearest resistance - 0.5% buffer, or current price + 5%
  const targetExit = nearResistance
    ? parseFloat((nearResistance * 0.995).toFixed(2))
    : currentPrice > 0 ? parseFloat((currentPrice * 1.05).toFixed(2)) : null;

  // Stop loss: support - 3%, or current price - 7%
  const stopLoss = nearSupport
    ? parseFloat((nearSupport * 0.97).toFixed(2))
    : currentPrice > 0 ? parseFloat((currentPrice * 0.93).toFixed(2)) : null;

  return {
    overall: parseFloat(clampedOverall.toFixed(3)),
    label,
    confidence: parseFloat(confidence.toFixed(2)),
    technicalScore: parseFloat(technicalScore.toFixed(3)),
    sentimentScore: parseFloat(sentimentScore.toFixed(3)),
    trendScore: parseFloat(trendScore.toFixed(3)),
    reasoning,
    riskLevel,
    suggestedAction,
    targetEntry,
    targetExit,
    stopLoss,
  };
}
