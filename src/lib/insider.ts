/**
 * Insider Activity Parser for PSX Announcements
 * Detects director, CEO, CFO, and chairman transactions from announcement titles
 */

export interface InsiderActivity {
  date: string;
  insider_type: 'director' | 'ceo' | 'cfo' | 'chairman' | 'sponsor';
  action: 'buy' | 'sell';
  shares?: number;
  raw_title: string;
  signal_score: number; // +5 for buy, -5 for sell
}

export interface InsiderSignal {
  score: number;
  activities: InsiderActivity[];
  period_days: number;
  activity_count: number;
}

/**
 * Parse announcement title for insider activity patterns
 * Handles:
 * - Director/CEO/CFO/Chairman mentions
 * - Buy/acquire/purchased actions
 * - Sell/disposed/sold actions
 * - Share quantities
 */
export function parseInsiderActivity(
  announcements: Array<{ title: string; date: string }>
): InsiderActivity[] {
  if (!announcements || announcements.length === 0) {
    return [];
  }

  const activities: InsiderActivity[] = [];

  for (const announcement of announcements) {
    const title = announcement.title || '';
    const date = announcement.date || '';

    if (!title || !date) continue;

    const lowerTitle = title.toLowerCase();

    // Detect insider type with pattern matching
    let insiderType: 'director' | 'ceo' | 'cfo' | 'chairman' | 'sponsor' | null = null;

    if (/\b(chairman|ceo|chief executive officer)\b/i.test(title)) {
      insiderType = /chairman/i.test(title) ? 'chairman' : 'ceo';
    } else if (/\b(cfo|chief financial officer)\b/i.test(title)) {
      insiderType = 'cfo';
    } else if (/\b(director)\b/i.test(title)) {
      insiderType = 'director';
    } else if (/\b(sponsor|major shareholder|substantial shareholder)\b/i.test(title)) {
      insiderType = 'sponsor';
    }

    // If no insider type detected, skip
    if (!insiderType) continue;

    // Detect action: buy or sell
    let action: 'buy' | 'sell' | null = null;

    // Buy patterns
    if (/\b(acquire|acquired|purchase|purchased|buy|bought|sell-off aborted|cancelled sale)\b/i.test(title)) {
      action = 'buy';
    }
    // Sell patterns
    else if (/\b(sell|sold|dispose|disposed|disposal|sale|transfer out)\b/i.test(title)) {
      action = 'sell';
    }

    // If no action detected, skip
    if (!action) continue;

    // Extract share quantity
    let shares: number | undefined;
    const sharePattern = /(\d{1,3}(?:,\d{3})*)\s*(?:shares?|share)/i;
    const shareMatch = title.match(sharePattern);
    if (shareMatch) {
      const shareStr = shareMatch[1].replace(/,/g, '');
      shares = parseInt(shareStr, 10);
    }

    // Calculate signal score
    const signalScore = action === 'buy' ? 5 : -5;

    activities.push({
      date,
      insider_type: insiderType,
      action,
      shares,
      raw_title: title,
      signal_score: signalScore,
    });
  }

  return activities;
}

/**
 * Get insider signal for a stock over a specific period
 * Aggregates signal scores from insider activities
 */
export function getInsiderSignal(
  symbol: string,
  announcements: any[] = [],
  periodDays: number = 30
): InsiderSignal {
  // Parse all insider activities
  const allActivities = parseInsiderActivity(announcements);

  if (allActivities.length === 0) {
    return {
      score: 0,
      activities: [],
      period_days: periodDays,
      activity_count: 0,
    };
  }

  // Filter activities within the period (if date is available)
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const recentActivities = allActivities.filter((activity) => {
    try {
      const actDate = new Date(activity.date);
      return actDate >= cutoffDate;
    } catch {
      // If date parsing fails, include the activity (assume recent)
      return true;
    }
  });

  // Sum up signal scores
  const totalScore = recentActivities.reduce((sum, activity) => sum + activity.signal_score, 0);

  // Sort activities by date (newest first)
  recentActivities.sort((a, b) => {
    try {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } catch {
      return 0;
    }
  });

  return {
    score: totalScore,
    activities: recentActivities,
    period_days: periodDays,
    activity_count: recentActivities.length,
  };
}

/**
 * Get interpreted insider sentiment based on signal score
 */
export function getInsiderSentiment(score: number): 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' {
  if (score >= 10) return 'strong_buy';
  if (score >= 5) return 'buy';
  if (score > -5) return 'neutral';
  if (score > -10) return 'sell';
  return 'strong_sell';
}

/**
 * Get insider interpretation text for advisory
 */
export function getInsiderInterpretation(signal: InsiderSignal): string {
  const { score, activity_count } = signal;

  if (activity_count === 0) {
    return 'No insider activity detected in the period.';
  }

  const sentiment = getInsiderSentiment(score);
  const buyCount = signal.activities.filter((a) => a.action === 'buy').length;
  const sellCount = signal.activities.filter((a) => a.action === 'sell').length;

  let interpretation = '';

  if (sentiment === 'strong_buy') {
    interpretation = `Strong insider buying: ${buyCount} buy(s) vs ${sellCount} sell(s). Insiders are accumulating.`;
  } else if (sentiment === 'buy') {
    interpretation = `Insider buying: ${buyCount} buy(s) vs ${sellCount} sell(s). Positive insider confidence.`;
  } else if (sentiment === 'neutral') {
    interpretation = `Mixed insider activity: ${buyCount} buy(s) vs ${sellCount} sell(s). No clear signal.`;
  } else if (sentiment === 'sell') {
    interpretation = `Insider selling: ${sellCount} sell(s) vs ${buyCount} buy(s). Possible profit-taking.`;
  } else {
    interpretation = `Strong insider selling: ${sellCount} sell(s) vs ${buyCount} buy(s). Insiders are exiting.`;
  }

  return interpretation;
}
