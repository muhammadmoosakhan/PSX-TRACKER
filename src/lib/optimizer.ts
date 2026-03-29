// Current default weights
export const DEFAULT_WEIGHTS = {
  technical: 0.25,
  fundamental: 0.25,
  sentiment: 0.15,
  trend: 0.15,
  volume: 0.10,
  sector: 0.10
};

// Optimized weights based on PSX market characteristics
export const OPTIMIZED_WEIGHTS = {
  technical: 0.20,     // Lower - PSX less technically efficient
  fundamental: 0.30,   // Higher - Value matters more in PSX
  sentiment: 0.15,     // Same - News impacts sentiment
  trend: 0.15,         // Same - Trends are reliable
  volume: 0.12,        // Slightly higher - Volume signals matter
  sector: 0.08         // Lower - Individual stocks vary within sector
};

// Market condition-based weights
export function getOptimalWeights(marketCondition: 'bull' | 'bear' | 'sideways') {
  switch (marketCondition) {
    case 'bull':
      return { ...OPTIMIZED_WEIGHTS, trend: 0.20, fundamental: 0.25 };
    case 'bear':
      return { ...OPTIMIZED_WEIGHTS, fundamental: 0.35, sentiment: 0.20 };
    case 'sideways':
      return { ...OPTIMIZED_WEIGHTS, technical: 0.25, volume: 0.15 };
  }
}

export function detectMarketCondition(kse100Change30d: number): 'bull' | 'bear' | 'sideways' {
  if (kse100Change30d > 5) return 'bull';
  if (kse100Change30d < -5) return 'bear';
  return 'sideways';
}
