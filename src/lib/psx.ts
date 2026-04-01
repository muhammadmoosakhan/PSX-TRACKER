// ============================================
// PSX Data Portal — Parser & Fetcher
// Fetches data from dps.psx.com.pk server-side
// ============================================

import type { StockCache, StockHistoryPoint, PSXIndex, IndexTickPoint } from '@/types';

const PSX_MARKET_URL = 'https://dps.psx.com.pk/market-watch';
const PSX_HISTORY_URL = 'https://dps.psx.com.pk/timeseries/eod';
const PSX_INDICES_URL = 'https://dps.psx.com.pk/indices';
const PSX_INDEX_TIMESERIES_URL = 'https://dps.psx.com.pk/timeseries/int';

/**
 * Fetch and parse market watch data from PSX
 * Returns normalized StockCache array
 */
export async function fetchPSXMarketData(): Promise<StockCache[]> {
  const res = await fetch(PSX_MARKET_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
      'Accept': 'text/html,application/json',
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`PSX returned ${res.status}`);
  }

  const text = await res.text();

  // Try JSON parse first
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json.map(normalizeStock);
    }
    if (json.data && Array.isArray(json.data)) {
      return json.data.map(normalizeStock);
    }
  } catch {
    // Not JSON — parse as HTML
  }

  return parseHTMLMarketData(text);
}

/**
 * Normalize a stock object from PSX JSON
 */
function normalizeStock(raw: Record<string, unknown>): StockCache {
  return {
    symbol: String(raw.SYMBOL || raw.symbol || ''),
    name: String(raw.COMPANY || raw.LDCP_NAME || raw.name || raw.company || ''),
    sector: String(raw.SECTOR || raw.sector || 'Other'),
    ldcp: toNum(raw.LDCP || raw.ldcp),
    open_price: toNum(raw.OPEN || raw.open || raw.open_price),
    high: toNum(raw.HIGH || raw.high),
    low: toNum(raw.LOW || raw.low),
    current_price: toNum(raw.CURRENT || raw.current || raw.current_price || raw.CLOSE || raw.close),
    change: toNum(raw.CHANGE || raw.change),
    change_pct: toNum(raw.CHANGE_PER || raw.change_pct || raw['CHANGE%'] || raw.changePer),
    volume: toNum(raw.VOLUME || raw.volume || raw.TURNOVER || raw.turnover || raw.VOL || raw.vol || raw.TRADED_VOLUME || raw.traded_volume),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Parse HTML table from PSX market watch page
 * PSX table has 11 columns: Symbol, Sector, Listed In, LDCP, Open, High, Low, Current, Change, Change%, Volume
 */
function parseHTMLMarketData(html: string): StockCache[] {
  const stocks: StockCache[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    let cellMatch;
    const rowContent = rowMatch[1];
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(stripHTML(cellMatch[1]).trim());
    }

    // Skip header rows and empty rows
    if (cells.length < 8 || !cells[0] || cells[0].includes('Symbol') || cells[0].includes('SYMBOL')) {
      continue;
    }

    // PSX has 11 columns: Symbol(0), Sector(1), ListedIn(2), LDCP(3), Open(4), High(5), Low(6), Current(7), Change(8), Change%(9), Volume(10)
    // Handle both 11-column (with "Listed In") and 10-column (without) formats
    const hasListedIn = cells.length >= 11;
    const offset = hasListedIn ? 1 : 0; // shift indices if "Listed In" column exists

    stocks.push({
      symbol: cells[0],
      name: cells[0],
      sector: cells[1] || 'Other',
      ldcp: toNum(cells[2 + offset]),
      open_price: toNum(cells[3 + offset]),
      high: toNum(cells[4 + offset]),
      low: toNum(cells[5 + offset]),
      current_price: toNum(cells[6 + offset]),
      change: toNum(cells[7 + offset]),
      change_pct: toNum(cells[8 + offset]),
      volume: toNum(cells[9 + offset]),
      updated_at: new Date().toISOString(),
    });
  }

  return stocks;
}

/**
 * Fetch EOD history for a specific symbol
 * PSX returns { status, message, data: [[timestamp, open, volume, close], ...] }
 */
export async function fetchPSXHistory(symbol: string): Promise<StockHistoryPoint[]> {
  const res = await fetch(`${PSX_HISTORY_URL}/${encodeURIComponent(symbol)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
      'Accept': 'application/json,text/html',
    },
  });

  if (!res.ok) {
    throw new Error(`PSX history returned ${res.status}`);
  }

  const text = await res.text();

  try {
    const json = JSON.parse(text);
    const data = Array.isArray(json) ? json : (json.data || []);

    const parsed = data.map((row: unknown) => {
      // PSX returns arrays: [timestamp, open, volume, close]
      if (Array.isArray(row)) {
        const timestamp = Number(row[0]);
        const open = toNum(row[1]);
        const volume = toNum(row[2]);
        const close = toNum(row[3]);
        const high = Math.max(open, close);
        const low = Math.min(open, close);
        const date = new Date(timestamp * 1000).toISOString().split('T')[0]; // "YYYY-MM-DD"
        return { date, open, high, low, close, volume };
      }

      // Fallback: named object fields
      const obj = row as Record<string, unknown>;
      return {
        date: String(obj.DATE || obj.date || obj.Date || ''),
        open: toNum(obj.OPEN || obj.open || obj.Open),
        high: toNum(obj.HIGH || obj.high || obj.High),
        low: toNum(obj.LOW || obj.low || obj.Low),
        close: toNum(obj.CLOSE || obj.close || obj.Close),
        volume: toNum(obj.VOLUME || obj.volume || obj.Volume),
      };
    });

    // Sort ascending by date (oldest first) so charts read left→right
    return parsed.sort((a: StockHistoryPoint, b: StockHistoryPoint) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/**
 * Fetch all PSX indices from the indices page
 */
export async function fetchPSXIndices(): Promise<PSXIndex[]> {
  const res = await fetch(PSX_INDICES_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
      'Accept': 'text/html',
    },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`PSX indices returned ${res.status}`);
  }

  const html = await res.text();
  return parseHTMLIndices(html);
}

/**
 * Parse HTML from PSX indices page
 */
function parseHTMLIndices(html: string): PSXIndex[] {
  const indices: PSXIndex[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const cells: string[] = [];
    let cellMatch;
    const rowContent = rowMatch[1];
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(stripHTML(cellMatch[1]).trim());
    }

    // PSX indices table columns: Name, High, Low, Current, Change, Change%
    if (cells.length >= 4 && cells[0] && !cells[0].includes('INDEX') && !cells[0].includes('Name')) {
      const name = cells[0].trim();
      if (name && name.length > 1) {
        indices.push({
          name,
          high: toNum(cells[1]),
          low: toNum(cells[2]),
          current: toNum(cells[3]),
          change: toNum(cells[4]),
          change_pct: toNum(cells[5]),
          volume: 0,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  return indices;
}

/**
 * Fetch intraday timeseries for an index
 */
export async function fetchPSXIndexTimeseries(indexName: string): Promise<IndexTickPoint[]> {
  const res = await fetch(`${PSX_INDEX_TIMESERIES_URL}/${encodeURIComponent(indexName)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`PSX index timeseries returned ${res.status}`);
  }

  const json = await res.json();
  const data = json.data || [];
  return data.map((point: [number, number, number]) => ({
    timestamp: point[0],
    value: point[1],
    volume: point[2],
  }));
}

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(String(val).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function stripHTML(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}
