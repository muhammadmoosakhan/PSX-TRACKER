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
    next: { revalidate: 3600 },
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
    volume: toNum(raw.VOLUME || raw.volume),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Parse HTML table from PSX market watch page
 */
function parseHTMLMarketData(html: string): StockCache[] {
  const stocks: StockCache[] = [];
  // Match table rows — PSX uses a simple HTML table
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

    // PSX table typically has: Symbol, Sector, LDCP, Open, High, Low, Current, Change, Change%, Volume
    if (cells.length >= 8 && cells[0] && !cells[0].includes('Symbol') && !cells[0].includes('SYMBOL')) {
      stocks.push({
        symbol: cells[0],
        name: cells[0], // PSX market-watch may not include full name
        sector: cells[1] || 'Other',
        ldcp: toNum(cells[2]),
        open_price: toNum(cells[3]),
        high: toNum(cells[4]),
        low: toNum(cells[5]),
        current_price: toNum(cells[6]),
        change: toNum(cells[7]),
        change_pct: toNum(cells[8]),
        volume: toNum(cells[9]),
        updated_at: new Date().toISOString(),
      });
    }
  }

  return stocks;
}

/**
 * Fetch EOD history for a specific symbol
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
    return data.map((row: Record<string, unknown>) => ({
      date: String(row.DATE || row.date || row.Date || ''),
      open: toNum(row.OPEN || row.open || row.Open),
      high: toNum(row.HIGH || row.high || row.High),
      low: toNum(row.LOW || row.low || row.Low),
      close: toNum(row.CLOSE || row.close || row.Close),
      volume: toNum(row.VOLUME || row.volume || row.Volume),
    }));
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

    // Indices table: Name, Current, Change, Change%, High, Low
    if (cells.length >= 4 && cells[0] && !cells[0].includes('INDEX') && !cells[0].includes('Name')) {
      const name = cells[0].trim();
      if (name && name.length > 1) {
        indices.push({
          name,
          current: toNum(cells[1]),
          change: toNum(cells[2]),
          change_pct: toNum(cells[3]),
          high: toNum(cells[4]),
          low: toNum(cells[5]),
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
