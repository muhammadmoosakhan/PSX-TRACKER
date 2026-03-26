// ============================================
// PSX Tracker — News Sentiment Analysis
// Two-tier: keyword scorer (instant) + FinBERT via HuggingFace (optional)
// ============================================

export interface SentimentResult {
  score: number;          // -1.0 (very bearish) to +1.0 (very bullish)
  label: 'bullish' | 'bearish' | 'neutral';
  confidence: number;     // 0-1
  method: 'keyword' | 'finbert';
  positiveHits: string[];
  negativeHits: string[];
}

// ---- Financial Keyword Lexicon ----

const BULLISH_WORDS = new Set([
  'surge', 'surges', 'surged', 'surging', 'rally', 'rallies', 'rallied',
  'gain', 'gains', 'gained', 'profit', 'profits', 'profitable', 'profitability',
  'growth', 'growing', 'grew', 'upgrade', 'upgraded', 'upgrades',
  'outperform', 'outperforms', 'outperformed', 'bullish', 'recovery', 'recovers',
  'recovered', 'recovering', 'dividend', 'dividends', 'earnings', 'beat', 'beats',
  'record', 'high', 'highs', 'strong', 'stronger', 'strongest', 'strength',
  'expand', 'expands', 'expanded', 'expansion', 'boost', 'boosts', 'boosted',
  'optimistic', 'optimism', 'breakthrough', 'upside', 'uptick', 'upturn',
  'positive', 'improve', 'improved', 'improvement', 'improving',
  'increase', 'increased', 'increases', 'rising', 'rises', 'rose',
  'soar', 'soars', 'soared', 'soaring', 'jump', 'jumps', 'jumped',
  'milestone', 'opportunity', 'exceed', 'exceeded', 'exceeds',
  'success', 'successful', 'accelerate', 'accelerated', 'momentum',
  'boom', 'booming', 'buoyant', 'resilient', 'robust', 'robust',
  'rebound', 'rebounds', 'rebounded', 'peak', 'peaked', 'bull',
  'invest', 'investment', 'inflow', 'inflows', 'attract', 'attracted',
  'stable', 'stability', 'confidence', 'confident', 'approve', 'approved',
  'innovation', 'launch', 'launched', 'win', 'wins', 'won', 'award',
  'overweight', 'accumulate', 'buy', 'target', 'upward', 'thrive',
]);

const BEARISH_WORDS = new Set([
  'crash', 'crashes', 'crashed', 'crashing', 'plunge', 'plunges', 'plunged',
  'loss', 'losses', 'lost', 'decline', 'declines', 'declined', 'declining',
  'downgrade', 'downgraded', 'downgrades', 'deficit', 'deficits',
  'bearish', 'default', 'defaults', 'defaulted', 'bankruptcy', 'bankrupt',
  'lawsuit', 'lawsuits', 'fraud', 'fraudulent', 'scandal',
  'selloff', 'sell-off', 'selling', 'weak', 'weaker', 'weakest', 'weakness',
  'slump', 'slumps', 'slumped', 'warning', 'warnings', 'risk', 'risks', 'risky',
  'debt', 'debts', 'indebted', 'pessimistic', 'pessimism',
  'miss', 'missed', 'misses', 'shortfall', 'shortfalls',
  'fall', 'falls', 'fell', 'falling', 'drop', 'drops', 'dropped', 'dropping',
  'cut', 'cuts', 'slash', 'slashed', 'reduce', 'reduced', 'reduction',
  'negative', 'worse', 'worst', 'worsen', 'worsened', 'worsening',
  'decrease', 'decreased', 'decreases', 'shrink', 'shrinks', 'shrunk',
  'tumble', 'tumbles', 'tumbled', 'sink', 'sinks', 'sank', 'sinking',
  'collapse', 'collapsed', 'collapses', 'crisis', 'crises',
  'fail', 'fails', 'failed', 'failure', 'underperform', 'underperformed',
  'layoff', 'layoffs', 'fire', 'fired', 'restructure', 'restructuring',
  'volatile', 'volatility', 'uncertainty', 'uncertain',
  'inflation', 'inflationary', 'recession', 'recessionary',
  'devalue', 'devaluation', 'depreciate', 'depreciation',
  'penalty', 'penalties', 'fine', 'fined', 'sanction', 'sanctions',
  'suspend', 'suspended', 'suspension', 'halt', 'halted',
  'downward', 'bear', 'outflow', 'outflows', 'flee', 'sell',
  'overvalued', 'bubble', 'squeeze', 'threat', 'threaten',
]);

const NEGATION_WORDS = new Set([
  'not', 'no', 'never', "n't", 'neither', 'nor', 'hardly', 'barely',
  'scarcely', 'without', 'lack', 'lacks', 'lacking', 'failed',
]);

const INTENSIFIERS: Record<string, number> = {
  very: 1.5, extremely: 2.0, significantly: 1.5, sharply: 1.8,
  dramatically: 1.8, massive: 1.7, huge: 1.5, major: 1.3,
  slightly: 0.5, marginally: 0.5, somewhat: 0.7, modest: 0.7,
};

// ---- Tier 1: Keyword Sentiment ----

export function keywordSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/);
  const positiveHits: string[] = [];
  const negativeHits: string[] = [];

  let bullishScore = 0;
  let bearishScore = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const intensity = INTENSIFIERS[words[i - 1]] || 1.0;

    // Check for negation in a 3-word window before
    let negated = false;
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATION_WORDS.has(words[j]) || words[j].endsWith("n't")) {
        negated = true;
        break;
      }
    }

    if (BULLISH_WORDS.has(word)) {
      if (negated) {
        bearishScore += intensity;
        negativeHits.push(`not ${word}`);
      } else {
        bullishScore += intensity;
        positiveHits.push(word);
      }
    } else if (BEARISH_WORDS.has(word)) {
      if (negated) {
        bullishScore += intensity;
        positiveHits.push(`not ${word}`);
      } else {
        bearishScore += intensity;
        negativeHits.push(word);
      }
    }
  }

  const total = bullishScore + bearishScore;
  const score = total === 0 ? 0 : (bullishScore - bearishScore) / (total + 1);
  const clampedScore = Math.max(-1, Math.min(1, score));
  const confidence = Math.min(1, total / 10);

  let label: SentimentResult['label'] = 'neutral';
  if (clampedScore > 0.15) label = 'bullish';
  else if (clampedScore < -0.15) label = 'bearish';

  return {
    score: parseFloat(clampedScore.toFixed(3)),
    label,
    confidence: parseFloat(confidence.toFixed(2)),
    method: 'keyword',
    positiveHits: positiveHits.slice(0, 5),
    negativeHits: negativeHits.slice(0, 5),
  };
}

// ---- Tier 2: HuggingFace FinBERT ----

interface HFResult {
  label: string;
  score: number;
}

export async function finbertSentiment(text: string): Promise<SentimentResult | null> {
  const token = process.env.HF_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text.slice(0, 512) }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    // HF returns [[{label, score}, ...]] or [{label, score}, ...]
    const results: HFResult[] = Array.isArray(data[0]) ? data[0] : data;
    if (!results || results.length === 0) return null;

    const positive = results.find((r) => r.label === 'positive')?.score || 0;
    const negative = results.find((r) => r.label === 'negative')?.score || 0;
    const neutral = results.find((r) => r.label === 'neutral')?.score || 0;

    const score = positive - negative;
    const confidence = Math.max(positive, negative, neutral);

    let label: SentimentResult['label'] = 'neutral';
    if (score > 0.15) label = 'bullish';
    else if (score < -0.15) label = 'bearish';

    return {
      score: parseFloat(score.toFixed(3)),
      label,
      confidence: parseFloat(confidence.toFixed(2)),
      method: 'finbert',
      positiveHits: positive > 0.3 ? ['FinBERT: positive'] : [],
      negativeHits: negative > 0.3 ? ['FinBERT: negative'] : [],
    };
  } catch {
    return null;
  }
}

// ---- Combined: try FinBERT, fallback to keywords ----

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const finbert = await finbertSentiment(text);
  if (finbert) return finbert;
  return keywordSentiment(text);
}

// ---- Batch: analyze multiple headlines, return average ----

export async function batchSentiment(
  headlines: string[]
): Promise<{ average: SentimentResult; individual: SentimentResult[] }> {
  if (headlines.length === 0) {
    return {
      average: { score: 0, label: 'neutral', confidence: 0, method: 'keyword', positiveHits: [], negativeHits: [] },
      individual: [],
    };
  }

  // Try FinBERT for first 10 headlines (API budget), keyword for rest
  const individual: SentimentResult[] = [];

  for (let i = 0; i < headlines.length; i++) {
    if (i < 10) {
      individual.push(await analyzeSentiment(headlines[i]));
    } else {
      individual.push(keywordSentiment(headlines[i]));
    }
  }

  const avgScore = individual.reduce((sum, r) => sum + r.score, 0) / individual.length;
  const avgConf = individual.reduce((sum, r) => sum + r.confidence, 0) / individual.length;

  let label: SentimentResult['label'] = 'neutral';
  if (avgScore > 0.15) label = 'bullish';
  else if (avgScore < -0.15) label = 'bearish';

  const allPositive = individual.flatMap((r) => r.positiveHits);
  const allNegative = individual.flatMap((r) => r.negativeHits);
  const method = individual.some((r) => r.method === 'finbert') ? 'finbert' : 'keyword';

  return {
    average: {
      score: parseFloat(avgScore.toFixed(3)),
      label,
      confidence: parseFloat(avgConf.toFixed(2)),
      method: method as 'keyword' | 'finbert',
      positiveHits: [...new Set(allPositive)].slice(0, 5),
      negativeHits: [...new Set(allNegative)].slice(0, 5),
    },
    individual,
  };
}
