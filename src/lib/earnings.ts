/**
 * Earnings tracking module
 * Parses and analyzes earnings announcements from PSX
 */

export interface EarningsData {
  period: string;
  eps?: number;
  profit_type: 'profit' | 'loss' | 'unknown';
  raw_title: string;
}

export interface EarningsAnalysis {
  trend: 'growth' | 'decline' | 'stable' | 'unknown';
  score: number;
  latest?: EarningsData;
  previous?: EarningsData;
  details: string;
}

/**
 * Parse earnings announcement title to extract key metrics
 * Looks for patterns like EPS, profit, loss, Rs., quarterly results
 */
export function parseEarningsAnnouncement(title: string): EarningsData | null {
  if (!title || title.trim().length === 0) {
    return null;
  }

  const lowerTitle = title.toLowerCase();

  // Check if this is an earnings/results announcement
  const earningsPatterns = [
    'earnings',
    'results',
    'eps',
    'profit',
    'loss',
    'quarterly',
    'q1',
    'q2',
    'q3',
    'q4',
    'nine months',
    'nine-month',
    'six months',
    'six-month',
    'annual results',
    'year-end',
  ];

  const isEarningsAnnouncement = earningsPatterns.some((pattern) =>
    lowerTitle.includes(pattern)
  );

  if (!isEarningsAnnouncement) {
    return null;
  }

  // Extract period (Q1, Q2, Q3, Q4, or annual)
  let period = 'unknown';
  if (lowerTitle.includes('q1')) period = 'Q1';
  else if (lowerTitle.includes('q2')) period = 'Q2';
  else if (lowerTitle.includes('q3')) period = 'Q3';
  else if (lowerTitle.includes('q4')) period = 'Q4';
  else if (
    lowerTitle.includes('nine month') ||
    lowerTitle.includes('9m') ||
    lowerTitle.includes('9-month')
  )
    period = '9M';
  else if (
    lowerTitle.includes('six month') ||
    lowerTitle.includes('6m') ||
    lowerTitle.includes('6-month')
  )
    period = '6M';
  else if (
    lowerTitle.includes('annual') ||
    lowerTitle.includes('year-end') ||
    lowerTitle.includes('fy')
  )
    period = 'Annual';
  else if (lowerTitle.includes('half year') || lowerTitle.includes('h1'))
    period = 'H1';

  // Extract profit/loss type
  let profit_type: 'profit' | 'loss' | 'unknown' = 'unknown';
  if (lowerTitle.includes('loss')) profit_type = 'loss';
  else if (lowerTitle.includes('profit')) profit_type = 'profit';

  // Try to extract EPS value (look for patterns like "EPS X.XX", "EPS: X.XX", "X.XX per share")
  let eps: number | undefined;
  const epsPattern = /eps[:\s]+([0-9]+\.?[0-9]*)/i;
  const epsMatch = title.match(epsPattern);
  if (epsMatch && epsMatch[1]) {
    eps = parseFloat(epsMatch[1]);
  }

  return {
    period,
    eps,
    profit_type,
    raw_title: title,
  };
}

/**
 * Analyze earnings trend from array of announcements
 * Compares current vs previous earnings if available
 * Returns trend analysis with score and details
 */
export function analyzeEarningsTrend(announcements: any[]): EarningsAnalysis {
  if (!announcements || announcements.length === 0) {
    return {
      trend: 'unknown',
      score: 0,
      details: 'No earnings announcements found',
    };
  }

  // Find earnings announcements
  const earningsAnnouncements: EarningsData[] = [];

  for (const announcement of announcements) {
    const title = announcement.title || announcement.subject || '';
    const parsed = parseEarningsAnnouncement(title);
    if (parsed) {
      earningsAnnouncements.push(parsed);
    }
  }

  if (earningsAnnouncements.length === 0) {
    return {
      trend: 'unknown',
      score: 0,
      details: 'No earnings data found in announcements',
    };
  }

  // Get latest and previous earnings
  const latest = earningsAnnouncements[0]; // First in list (usually most recent)
  const previous = earningsAnnouncements.length > 1 ? earningsAnnouncements[1] : undefined;

  let trend: 'growth' | 'decline' | 'stable' | 'unknown' = 'unknown';
  let score = 0;
  let details = '';

  // Determine trend based on profit/loss type
  if (latest.profit_type === 'profit') {
    if (previous) {
      if (previous.profit_type === 'loss') {
        // Recovered from loss
        trend = 'growth';
        score = 10;
        details = `Strong recovery: Latest period shows profit (${latest.period}) vs loss in previous period`;
      } else if (previous.profit_type === 'profit') {
        // Both profitable - need EPS comparison
        if (latest.eps && previous.eps) {
          if (latest.eps > previous.eps) {
            trend = 'growth';
            score = 10;
            details = `EPS improved from ${previous.eps} to ${latest.eps} (${latest.period})`;
          } else if (latest.eps < previous.eps) {
            trend = 'decline';
            score = -10;
            details = `EPS declined from ${previous.eps} to ${latest.eps} (${latest.period})`;
          } else {
            trend = 'stable';
            score = 0;
            details = `EPS stable at ${latest.eps} (${latest.period})`;
          }
        } else {
          trend = 'stable';
          score = 0;
          details = `Consistent profitability (${latest.period})`;
        }
      } else {
        trend = 'growth';
        score = 10;
        details = `Profitable in ${latest.period}`;
      }
    } else {
      trend = 'growth';
      score = 10;
      details = `Latest period (${latest.period}) shows profit`;
    }
  } else if (latest.profit_type === 'loss') {
    trend = 'decline';
    score = -10;
    if (previous && previous.profit_type === 'profit') {
      details = `Loss in ${latest.period}, down from profit in previous period`;
    } else {
      details = `Loss reported in ${latest.period}`;
    }
  } else {
    trend = 'stable';
    score = 0;
    details = `No clear profit/loss indicator in latest announcement (${latest.period})`;
  }

  return {
    trend,
    score,
    latest,
    previous,
    details,
  };
}
