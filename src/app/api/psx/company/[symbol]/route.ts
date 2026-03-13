// ============================================
// PSX Company Data API Route
// Scrapes company profile, fundamentals, and
// announcements from dps.psx.com.pk/company/{symbol}
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const PSX_COMPANY_URL = 'https://dps.psx.com.pk/company';

// ── Helper utilities ──────────────────────────

/** Strip all HTML tags from a string */
function stripHTML(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/** Safely convert a value to a number, returning null for missing/invalid */
function toNum(val: string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '-' || val === 'N/A') {
    return null;
  }
  const cleaned = val.replace(/,/g, '').replace(/\s/g, '').trim();
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

/** Find a value in a table-like structure: label followed by its value in <td>/<dd>/<span> */
function extractTableValue(html: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Pattern 1: <th/td/dt with label> ... <td/dd with value>
  const patterns = [
    // <td>Label</td><td>Value</td>  or  <td>Label</td>\s*<td>Value</td>
    new RegExp(
      `<(?:td|th|dt)[^>]*>[^<]*${escapedLabel}[^<]*</(?:td|th|dt)>\\s*<(?:td|dd)[^>]*>([\\s\\S]*?)</(?:td|dd)>`,
      'i'
    ),
    // <span/strong with label>...<span/div with value>
    new RegExp(
      `<(?:span|strong|b|label)[^>]*>[^<]*${escapedLabel}[^<]*</(?:span|strong|b|label)>\\s*[:\\s]*<(?:span|div|p)[^>]*>([\\s\\S]*?)</(?:span|div|p)>`,
      'i'
    ),
    // Label: Value on same line
    new RegExp(
      `${escapedLabel}[:\\s]+([\\d,.\\-]+(?:\\s*%)?|[A-Za-z][^<]{0,200})`,
      'i'
    ),
    // Label inside a tag followed by value in next sibling
    new RegExp(
      `>${escapedLabel}</[^>]+>\\s*(?:<[^>]+>\\s*)*([^<]+)`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const cleaned = stripHTML(match[1]).trim();
      if (cleaned && cleaned !== '-' && cleaned !== 'N/A') {
        return cleaned;
      }
    }
  }

  return null;
}

/** Extract numeric table value */
function extractNumericValue(html: string, label: string): number | null {
  const raw = extractTableValue(html, label);
  return toNum(raw);
}

/** Extract percentage value (strips trailing %) */
function extractPctValue(html: string, label: string): number | null {
  const raw = extractTableValue(html, label);
  if (!raw) return null;
  const cleaned = raw.replace(/%/g, '').trim();
  return toNum(cleaned);
}

/** Extract value from PSX stats_label/stats_value pattern:
 *  <div class="stats_label">LABEL</div><div class="stats_value">VALUE</div> */
function extractStatsValue(html: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `stats_label[^>]*>[\\s\\S]*?${escapedLabel}[\\s\\S]*?<\\/div>\\s*<div[^>]*class=["']stats_value["'][^>]*>([\\s\\S]*?)<\\/div>`,
    'i'
  );
  const match = regex.exec(html);
  if (match && match[1]) {
    const text = stripHTML(match[1]).trim();
    if (text && text !== '-' && text !== 'N/A') return text;
  }
  return null;
}

/** Extract a person's name from PSX KEY PEOPLE table by role.
 *  PSX uses: <tr><td><strong>Name</strong></td><td>Role</td></tr> */
function extractKeyPerson(html: string, role: string): string | null {
  const escapedRole = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use negative lookahead to prevent crossing </td> boundaries
  const regex = new RegExp(
    `<tr[^>]*>\\s*<td[^>]*>((?:(?!<\\/td>)[\\s\\S])*)<\\/td>\\s*<td[^>]*>[^<]*${escapedRole}[^<]*<\\/td>`,
    'i'
  );
  const match = regex.exec(html);
  if (match && match[1]) {
    const name = stripHTML(match[1]).trim();
    if (name && name.length > 1) return name;
  }
  return null;
}

/** Extract value from PSX item__head pattern: <div class="item__head">LABEL</div><p>VALUE</p> */
function extractItemHeadValue(html: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `item__head[^>]*>\\s*${escapedLabel}\\s*<\\/div>\\s*<p[^>]*>([\\s\\S]*?)<\\/p>`,
    'i'
  );
  const match = regex.exec(html);
  if (match && match[1]) {
    const text = stripHTML(match[1]).trim();
    if (text && text !== '-' && text !== 'N/A') return text;
  }
  return null;
}

/** Extract the first numeric value from a multi-year table row.
 *  PSX company pages use rows like: <td>EPS</td><td>12.5</td><td>10.3</td><td>8.1</td>
 *  This finds the row by its first-cell label and returns the value from the
 *  second cell (most recent year).
 *  NOTE: `label` is treated as a raw regex pattern (not escaped) so callers
 *  can use lookaheads, e.g. 'EPS(?!\\s*Growth)'. */
function extractRowFirstValue(html: string, label: string): number | null {
  // Label is used as-is — callers may pass regex patterns like negative lookaheads
  // Match a <tr> whose first <td> contains the label
  const rowRegex = new RegExp(
    `<tr[^>]*>[\\s\\S]*?<td[^>]*>[^<]*${label}[^<]*</td>([\\s\\S]*?)</tr>`,
    'i'
  );
  const rowMatch = rowRegex.exec(html);
  if (!rowMatch) return null;

  // Extract all subsequent <td> values and return the first numeric one
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const rowContent = rowMatch[1];
  let cellMatch;
  while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
    const cellText = stripHTML(cellMatch[1]).trim();
    if (cellText && cellText !== '-' && cellText !== 'N/A' && cellText !== '') {
      const num = toNum(cellText.replace(/%/g, ''));
      if (num !== null) return num;
    }
  }
  return null;
}

// ── Response interfaces ───────────────────────

interface CompanyProfile {
  description: string;
  marketCap: number | null;
  totalShares: number | null;
  freeFloat: number | null;
  freeFloatPct: number | null;
  chairperson: string;
  ceo: string;
  secretary: string;
  address: string;
  website: string;
  registrar: string;
  auditor: string;
}

interface EPS {
  annual: number | null;
  lastQuarter: number | null;
  ytd: number | null;
  expected: number | null;
}

interface PE {
  annual: number | null;
  expected: number | null;
}

interface ProfitMargins {
  gross: number | null;
  operating: number | null;
  net: number | null;
  ebitda: number | null;
}

interface ReturnOn {
  roe: number | null;
  roa: number | null;
  roce: number | null;
}

interface DPS {
  annual: number | null;
  lastQuarter: number | null;
  lastInterim: number | null;
}

interface Fundamentals {
  eps: EPS;
  pe: PE;
  earningGrowth: number | null;
  pegRatio: number | null;
  forwardPeg: number | null;
  profitMargins: ProfitMargins;
  returnOn: ReturnOn;
  dps: DPS;
  dividendYield: number | null;
  dividendCover: number | null;
  payoutRatio: number | null;
  marketCap: number | null;
  bookValue: number | null;
  pbv: number | null;
  enterpriseValue: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  inventoryTurnover: number | null;
  assetTurnover: number | null;
  equityToAssets: number | null;
  debtToEquity: number | null;
  debtToAssets: number | null;
}

interface Announcement {
  date: string;
  title: string;
  viewUrl: string | null;
  pdfUrl: string | null;
}

interface CompanyData {
  symbol: string;
  name: string;
  sector: string;
  profile: CompanyProfile;
  fundamentals: Fundamentals;
  announcements: Announcement[];
}

// ── Parsers ───────────────────────────────────

function parseProfile(html: string): CompanyProfile {
  // Try to find the company description / about section
  // PSX uses: <div class="item__head">BUSINESS DESCRIPTION</div><p>...</p>
  let description = '';
  const descPatterns = [
    /item__head[^>]*>\s*BUSINESS DESCRIPTION\s*<\/div>\s*<p[^>]*>([\s\S]*?)<\/p>/i,
    /<div[^>]*class="[^"]*about[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<p[^>]*class="[^"]*company[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i,
    /About\s*(?:the\s*)?Company[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
    /Company\s*Profile[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i,
  ];
  for (const pattern of descPatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const text = stripHTML(match[1]).trim();
      if (text.length > 20) {
        description = text;
        break;
      }
    }
  }

  // Extract website URL — only accept values that look like actual URLs
  // PSX uses: <div class="item__head">WEBSITE</div><p><a href="http://...">...</a></p>
  let website = '';
  const websitePatterns = [
    // PSX item__head pattern (most common on dps.psx.com.pk company pages)
    /item__head[^>]*>\s*WEBSITE\s*<\/div>\s*<p[^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>/i,
    /WEBSITE<\/div>\s*[\s\S]{0,100}?<a[^>]*href=["']([^"']+)["'][^>]*>/i,
    // Generic patterns
    /Website[\s\S]{0,200}?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i,
    /Website[:\s]*<[^>]*href="([^"]+)"[^>]*>/i,
    /Website[:\s]*(?:<[^>]*>)*\s*(https?:\/\/[^\s<"]+)/i,
    /Website[:\s]*(?:<[^>]*>)*\s*(www\.[\w.-]+\.[a-z]{2,}[^\s<"]*)/i,
    /website[\s\S]{0,100}?(https?:\/\/[\w.-]+\.[a-z]{2,}[^\s<"]*)/i,
    /website[\s\S]{0,100}?(www\.[\w.-]+\.[a-z]{2,}[^\s<"]*)/i,
  ];
  for (const pattern of websitePatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Accept http/https/www URLs, reject javascript: and internal PSX links
      if (
        /^(https?:\/\/|www\.)/i.test(candidate) &&
        candidate.length < 200 &&
        !candidate.includes('psx.com.pk')
      ) {
        website = candidate;
        break;
      }
    }
  }
  if (!website) {
    const raw = extractTableValue(html, 'Website');
    if (raw && /^(https?:\/\/|www\.)/i.test(raw.trim()) && raw.trim().length < 200) {
      website = raw.trim();
    }
  }

  return {
    description,
    marketCap: toNum(extractStatsValue(html, 'Market Cap')) ??
               extractNumericValue(html, 'Market Cap') ??
               extractNumericValue(html, 'Market Capitalization') ??
               extractNumericValue(html, 'Mkt Cap'),
    totalShares: toNum(extractStatsValue(html, 'Shares')) ??
                 extractNumericValue(html, 'Total Shares') ??
                 extractNumericValue(html, 'Shares Outstanding') ??
                 extractNumericValue(html, 'Ordinary Shares'),
    freeFloat: (() => {
      // PSX shows two "Free Float" stats — one is the number, the other is the percentage
      // Get the non-percentage one
      const statsRegex = /stats_label[^>]*>[\s\S]*?Free Float[\s\S]*?<\/div>\s*<div[^>]*class=["']stats_value["'][^>]*>([\s\S]*?)<\/div>/gi;
      let m;
      while ((m = statsRegex.exec(html)) !== null) {
        const val = stripHTML(m[1]).trim();
        if (!val.includes('%')) return toNum(val);
      }
      return null;
    })() ??
    extractNumericValue(html, 'Free Float Shares') ??
    extractNumericValue(html, 'Free Float$'),
    freeFloatPct: (() => {
      // Get the percentage "Free Float" stat
      const statsRegex = /stats_label[^>]*>[\s\S]*?Free Float[\s\S]*?<\/div>\s*<div[^>]*class=["']stats_value["'][^>]*>([\s\S]*?)<\/div>/gi;
      let m;
      while ((m = statsRegex.exec(html)) !== null) {
        const val = stripHTML(m[1]).trim();
        if (val.includes('%')) return toNum(val.replace(/%/g, ''));
      }
      return null;
    })() ??
    extractPctValue(html, 'Free Float %') ??
    extractPctValue(html, 'Free Float Percentage') ??
    extractPctValue(html, 'Free Float Ratio'),
    chairperson: extractKeyPerson(html, 'Chairperson') ??
                 extractKeyPerson(html, 'Chairman') ??
                 extractItemHeadValue(html, 'CHAIRPERSON') ??
                 extractItemHeadValue(html, 'CHAIRMAN') ??
                 extractTableValue(html, 'Chair') ??
                 extractTableValue(html, 'Chairman') ??
                 extractTableValue(html, 'Chairperson') ?? '',
    ceo: extractKeyPerson(html, 'CEO') ??
         extractKeyPerson(html, 'Chief Executive') ??
         extractItemHeadValue(html, 'CEO') ??
         extractItemHeadValue(html, 'CHIEF EXECUTIVE') ??
         extractTableValue(html, 'CEO') ??
         extractTableValue(html, 'Chief Executive') ??
         extractTableValue(html, 'Managing Director') ?? '',
    secretary: extractKeyPerson(html, 'Company Secretary') ??
               extractKeyPerson(html, 'Secretary') ??
               extractItemHeadValue(html, 'SECRETARY') ??
               extractItemHeadValue(html, 'COMPANY SECRETARY') ??
               extractTableValue(html, 'Secretary') ??
               extractTableValue(html, 'Company Secretary') ?? '',
    address: extractItemHeadValue(html, 'REGISTERED OFFICE') ??
             extractItemHeadValue(html, 'ADDRESS') ??
             extractTableValue(html, 'Registered Office') ??
             extractTableValue(html, 'Address') ??
             extractTableValue(html, 'Registered Address') ?? '',
    website,
    registrar: extractItemHeadValue(html, 'REGISTRAR') ??
               extractItemHeadValue(html, 'SHARE REGISTRAR') ??
               extractTableValue(html, 'Registrar') ??
               extractTableValue(html, 'Share Registrar') ??
               extractTableValue(html, 'Transfer Agent') ?? '',
    auditor: extractItemHeadValue(html, 'AUDITOR') ??
             extractItemHeadValue(html, 'EXTERNAL AUDITOR') ??
             extractTableValue(html, 'Auditor') ??
             extractTableValue(html, 'External Auditor') ?? '',
  };
}

function parseFundamentals(html: string): Fundamentals {
  return {
    eps: {
      annual: extractNumericValue(html, 'EPS \\(Annual\\)') ??
              extractNumericValue(html, 'EPS Annual') ??
              extractNumericValue(html, 'Earnings Per Share') ??
              // Fallback: multi-year table row labelled "EPS" (but not "EPS Growth")
              extractRowFirstValue(html, 'EPS(?!\\s*Growth)'),
      lastQuarter: extractNumericValue(html, 'EPS \\(Last Quarter\\)') ??
                   extractNumericValue(html, 'EPS Last Quarter') ??
                   extractNumericValue(html, 'Quarterly EPS'),
      ytd: extractNumericValue(html, 'EPS \\(YTD\\)') ??
           extractNumericValue(html, 'EPS YTD') ??
           extractNumericValue(html, 'YTD EPS'),
      expected: extractNumericValue(html, 'Expected EPS') ??
                extractNumericValue(html, 'EPS \\(Expected\\)'),
    },
    pe: {
      annual: extractNumericValue(html, 'P/E \\(Annual\\)') ??
              extractNumericValue(html, 'PE Ratio') ??
              extractNumericValue(html, 'P/E Ratio') ??
              extractNumericValue(html, 'Price to Earnings') ??
              // Fallback: multi-year table row for P/E
              extractRowFirstValue(html, 'P/E Ratio') ??
              extractRowFirstValue(html, 'P/E \\(TTM\\)'),
      expected: extractNumericValue(html, 'P/E \\(Expected\\)') ??
                extractNumericValue(html, 'Expected P/E') ??
                extractNumericValue(html, 'Forward P/E') ??
                extractRowFirstValue(html, 'Forward P/E'),
    },
    earningGrowth: extractPctValue(html, 'Earning Growth') ??
                   extractPctValue(html, 'Earnings Growth') ??
                   // Fallback: "EPS Growth" row in RATIOS table
                   extractRowFirstValue(html, 'EPS Growth'),
    pegRatio: extractNumericValue(html, 'PEG Ratio') ??
              extractNumericValue(html, 'PEG') ??
              extractRowFirstValue(html, 'PEG'),
    forwardPeg: extractNumericValue(html, 'Forward PEG') ??
                extractNumericValue(html, 'Fwd PEG'),
    profitMargins: {
      gross: extractPctValue(html, 'Gross Margin') ??
             extractPctValue(html, 'Gross Profit Margin') ??
             extractRowFirstValue(html, 'Gross Profit Margin'),
      operating: extractPctValue(html, 'Operating Margin') ??
                 extractPctValue(html, 'Operating Profit Margin') ??
                 extractRowFirstValue(html, 'Operating Profit Margin') ??
                 extractRowFirstValue(html, 'Operating Margin'),
      net: extractPctValue(html, 'Net Margin') ??
           extractPctValue(html, 'Net Profit Margin') ??
           extractRowFirstValue(html, 'Net Profit Margin'),
      ebitda: extractPctValue(html, 'EBITDA Margin') ??
              extractRowFirstValue(html, 'EBITDA Margin') ??
              extractRowFirstValue(html, 'EBITDA'),
    },
    returnOn: {
      roe: extractPctValue(html, 'ROE') ??
           extractPctValue(html, 'Return on Equity') ??
           extractRowFirstValue(html, 'Return on Equity') ??
           extractRowFirstValue(html, 'ROE'),
      roa: extractPctValue(html, 'ROA') ??
           extractPctValue(html, 'Return on Assets') ??
           extractRowFirstValue(html, 'Return on Assets') ??
           extractRowFirstValue(html, 'ROA'),
      roce: extractPctValue(html, 'ROCE') ??
            extractPctValue(html, 'Return on Capital Employed') ??
            extractRowFirstValue(html, 'ROCE'),
    },
    dps: {
      annual: extractNumericValue(html, 'DPS \\(Annual\\)') ??
              extractNumericValue(html, 'Dividend Per Share') ??
              extractRowFirstValue(html, 'DPS'),
      lastQuarter: extractNumericValue(html, 'DPS \\(Last Quarter\\)') ??
                   extractNumericValue(html, 'Quarterly DPS'),
      lastInterim: extractNumericValue(html, 'DPS \\(Interim\\)') ??
                   extractNumericValue(html, 'Interim DPS') ??
                   extractNumericValue(html, 'Last Interim'),
    },
    dividendYield: extractPctValue(html, 'Dividend Yield') ??
                   extractRowFirstValue(html, 'Dividend Yield'),
    dividendCover: extractNumericValue(html, 'Dividend Cover') ??
                   extractRowFirstValue(html, 'Dividend Cover'),
    payoutRatio: extractPctValue(html, 'Payout Ratio') ??
                 extractRowFirstValue(html, 'Payout Ratio'),
    marketCap: extractNumericValue(html, 'Market Cap') ??
               extractNumericValue(html, 'Market Capitalization') ??
               extractNumericValue(html, 'Mkt Cap') ??
               extractRowFirstValue(html, 'Market Cap'),
    bookValue: extractNumericValue(html, 'Book Value') ??
               extractNumericValue(html, 'Book Value Per Share') ??
               extractRowFirstValue(html, 'Book Value'),
    pbv: extractNumericValue(html, 'P/BV') ??
         extractNumericValue(html, 'Price to Book') ??
         extractNumericValue(html, 'PBV') ??
         extractRowFirstValue(html, 'P/BV') ??
         extractRowFirstValue(html, 'Price to Book'),
    enterpriseValue: extractNumericValue(html, 'Enterprise Value') ??
                     extractNumericValue(html, 'EV') ??
                     extractRowFirstValue(html, 'Enterprise Value'),
    currentRatio: extractNumericValue(html, 'Current Ratio') ??
                  extractRowFirstValue(html, 'Current Ratio'),
    quickRatio: extractNumericValue(html, 'Quick Ratio') ??
                extractRowFirstValue(html, 'Quick Ratio'),
    inventoryTurnover: extractNumericValue(html, 'Inventory Turnover') ??
                       extractRowFirstValue(html, 'Inventory Turnover'),
    assetTurnover: extractNumericValue(html, 'Asset Turnover') ??
                   extractRowFirstValue(html, 'Asset Turnover'),
    equityToAssets: extractPctValue(html, 'Equity to Assets') ??
                    extractPctValue(html, 'Equity/Assets') ??
                    extractRowFirstValue(html, 'Equity to Assets'),
    debtToEquity: extractNumericValue(html, 'Debt to Equity') ??
                  extractNumericValue(html, 'D/E Ratio') ??
                  extractNumericValue(html, 'Debt/Equity') ??
                  extractRowFirstValue(html, 'Debt to Equity') ??
                  extractRowFirstValue(html, 'D/E Ratio'),
    debtToAssets: extractNumericValue(html, 'Debt to Assets') ??
                  extractNumericValue(html, 'Debt/Assets') ??
                  extractRowFirstValue(html, 'Debt to Assets'),
  };
}

function parseCompanyName(html: string, symbol: string): string {
  // PSX title format: "ENGRO - Stock quote for Engro Corporation Limited - Pakistan Stock Exchange (PSX)"
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch && titleMatch[1]) {
    const title = stripHTML(titleMatch[1]).trim();
    // Extract "Stock quote for COMPANY NAME"
    const sqMatch = /Stock quote for\s+(.+?)\s*[-–]\s*Pakistan/i.exec(title);
    if (sqMatch && sqMatch[1]) {
      return sqMatch[1].trim();
    }
    // Try "SYMBOL - COMPANY NAME - PSX" format
    const dashMatch = new RegExp(`^${symbol}\\s*[-–]\\s*(.+?)\\s*[-–]\\s*(?:PSX|Pakistan)`, 'i').exec(title);
    if (dashMatch && dashMatch[1]) {
      const candidate = dashMatch[1].replace(/Stock quote for\s*/i, '').trim();
      if (candidate.length > 2) return candidate;
    }
  }

  // PSX og:description: "...about the Engro Corporation Limited (ENGRO)..."
  const ogMatch = /about the\s+(.+?)\s*\(/i.exec(html);
  if (ogMatch && ogMatch[1]) {
    return ogMatch[1].trim();
  }

  // Fallback: h1 tags (skip generic ones like "Company Profile")
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let h1Match;
  while ((h1Match = h1Regex.exec(html)) !== null) {
    const text = stripHTML(h1Match[1]).trim();
    if (text.length > 2 && text.length < 200 &&
        !text.includes('Profile') && !text.includes('Financials') &&
        !text.includes('Ratios') && !text.includes('Announcements') &&
        !text.includes('Reports')) {
      return text;
    }
  }

  return symbol;
}

function parseSector(html: string): string {
  const sectorPatterns = [
    // PSX uses: <div class="quote__sector"><span>FERTILIZER</span></div>
    /quote__sector[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i,
    /quote__sector[^>]*>([\s\S]*?)<\/div>/i,
    /Sector[:\s]*(?:<[^>]*>)*\s*([^<]+)/i,
    /Industry[:\s]*(?:<[^>]*>)*\s*([^<]+)/i,
    /<span[^>]*class="[^"]*sector[^"]*"[^>]*>([^<]+)<\/span>/i,
  ];

  for (const pattern of sectorPatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      const sector = stripHTML(match[1]).trim();
      if (sector.length > 1 && sector.length < 100 && sector !== '-') {
        return sector;
      }
    }
  }

  return 'Other';
}

function parseAnnouncements(html: string): Announcement[] {
  const announcements: Announcement[] = [];

  /** Normalise relative URLs to absolute dps.psx.com.pk URLs */
  const toAbsolute = (url: string): string =>
    url.startsWith('http') ? url : `https://dps.psx.com.pk${url.startsWith('/') ? '' : '/'}${url}`;

  // Find the announcements section — prefer the id="announcements" anchor (most reliable on PSX)
  let announceSectionIndex = html.search(/id=["']announcements["']/i);
  // Only fall back to broader search if the exact id isn't found
  if (announceSectionIndex < 0) {
    announceSectionIndex = html.search(/section__title[^>]*>Announcements</i);
  }
  const announcementHtml = announceSectionIndex >= 0
    ? html.slice(announceSectionIndex)
    : '';

  if (announcementHtml) {
    // PSX uses table rows: <tr><td>Date</td><td>Title</td><td>View/PDF</td></tr>
    const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;

    while ((rowMatch = tableRowRegex.exec(announcementHtml)) !== null) {
      const fullRow = rowMatch[0];
      const rowContent = rowMatch[1];

      // Skip header rows
      if (/<th/i.test(rowContent)) continue;

      const cells: string[] = [];
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        cells.push(cellMatch[1]);
      }

      if (cells.length >= 2) {
        const dateStr = stripHTML(cells[0]).trim();
        const titleStr = stripHTML(cells[1] || cells[0]).trim();

        if (!dateStr && !titleStr) continue;
        if (titleStr.toLowerCase().includes('date') && titleStr.length < 10) continue;

        // Skip rows where the first cell doesn't look like a date (e.g. KEY PEOPLE rows)
        // PSX dates look like "Oct 29, 2024" or "Apr 4, 2024"
        if (dateStr && !/\d{4}|\d{1,2}[,\s]+\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(dateStr)) {
          continue;
        }

        let viewUrl: string | null = null;
        let pdfUrl: string | null = null;

        // Extract PDF links: <a href="/download/document/XXXXX.pdf">PDF</a>
        const pdfLinkRegex = /<a[^>]*href=["']([^"']*\.pdf)["'][^>]*>/gi;
        let pdfMatch;
        while ((pdfMatch = pdfLinkRegex.exec(fullRow)) !== null) {
          pdfUrl = toAbsolute(pdfMatch[1].trim());
        }

        // Extract View image links: <a href="javascript:" data-images="XXXXX-1.gif">View</a>
        // Build viewable image URL from data-images attribute
        const dataImagesRegex = /data-images=["']([^"']+)["']/i;
        const dataImagesMatch = dataImagesRegex.exec(fullRow);
        if (dataImagesMatch && dataImagesMatch[1]) {
          // PSX serves announcement images at the same /download/document/ path
          viewUrl = toAbsolute(`/download/document/${dataImagesMatch[1]}`);
        }

        // If no data-images, try regular href links (skip javascript: links)
        if (!viewUrl) {
          const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
          let linkMatch;
          while ((linkMatch = linkRegex.exec(fullRow)) !== null) {
            const href = linkMatch[1].trim();
            const linkText = stripHTML(linkMatch[2]).toLowerCase();
            // Skip javascript: links and PDF links (already captured)
            if (href.startsWith('javascript:') || href.endsWith('.pdf')) continue;
            if (href && (linkText.includes('view') || linkText.includes('detail'))) {
              viewUrl = toAbsolute(href);
              break;
            }
          }
        }

        // If we only have PDF and no view URL, use PDF as view URL too
        if (!viewUrl && pdfUrl) {
          viewUrl = pdfUrl;
        }

        if (dateStr || titleStr) {
          announcements.push({
            date: dateStr,
            title: titleStr,
            viewUrl,
            pdfUrl,
          });
        }
      }
    }
  }

  // Deduplicate by title
  const seen = new Set<string>();
  return announcements.filter((a) => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key) || !key) return false;
    seen.add(key);
    return true;
  });
}

// ── Fetch announcements from a dedicated endpoint ──

async function fetchAnnouncementsEndpoint(
  symbol: string
): Promise<Announcement[]> {
  try {
    const res = await fetch(
      `${PSX_COMPANY_URL}/${encodeURIComponent(symbol)}/announcements`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
          Accept: 'text/html,application/json',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) return [];

    const text = await res.text();

    // Try JSON first
    try {
      const json = JSON.parse(text);
      const data = Array.isArray(json) ? json : json.data || json.announcements || [];
      return data.map((item: Record<string, unknown>) => ({
        date: String(item.date || item.DATE || item.created_at || ''),
        title: String(item.title || item.TITLE || item.subject || item.description || ''),
        viewUrl: item.url ? String(item.url) : null,
        pdfUrl: item.pdf_url || item.pdfUrl ? String(item.pdf_url || item.pdfUrl) : null,
      }));
    } catch {
      // Parse as HTML
      return parseAnnouncements(text);
    }
  } catch {
    return [];
  }
}

// ── Derivative symbol handling ─────────────────
// PSX lists derivative symbols (XD=ex-dividend, NC=non-cumulative, WU=warrants, etc.)
// that don't have their own company pages. Strip the suffix to get the parent symbol.
// Try shortest suffix first so JSGBETFXD → JSGBETF (not JSGB)
const DERIVATIVE_SUFFIX_LIST = ['XD', 'NC', 'WU', 'XB', 'XR', 'PS', 'CPS', 'ETFXD', 'NLXB'];

function getParentSymbols(symbol: string): string[] {
  const candidates: string[] = [];
  for (const suffix of DERIVATIVE_SUFFIX_LIST) {
    if (symbol.endsWith(suffix) && symbol.length > suffix.length) {
      candidates.push(symbol.slice(0, -suffix.length));
    }
  }
  return candidates;
}

// ── Fetch + parse company HTML ────────────────

async function fetchAndParseCompany(
  fetchSymbol: string,
  displaySymbol: string,
  announcementsFromEndpoint: Announcement[]
): Promise<CompanyData | null> {
  const res = await fetch(`${PSX_COMPANY_URL}/${encodeURIComponent(fetchSymbol)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
      Accept: 'text/html,application/json',
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok || res.status === 404) return null;

  const html = await res.text();
  if (html.length < 200) return null;

  const name = parseCompanyName(html, fetchSymbol);
  const sector = parseSector(html);
  const profile = parseProfile(html);
  const fundamentals = parseFundamentals(html);
  const announcementsFromPage = parseAnnouncements(html);

  // Merge announcements
  const seenTitles = new Set(
    announcementsFromEndpoint.map((a) => a.title.toLowerCase().trim())
  );
  const mergedAnnouncements = [
    ...announcementsFromEndpoint,
    ...announcementsFromPage.filter(
      (a) => !seenTitles.has(a.title.toLowerCase().trim())
    ),
  ];

  return {
    symbol: displaySymbol,
    name,
    sector,
    profile,
    fundamentals,
    announcements: mergedAnnouncements,
  };
}

// ── Main route handler ────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  if (!symbol || symbol.trim().length === 0) {
    return NextResponse.json(
      { error: 'Symbol parameter is required' },
      { status: 400 }
    );
  }

  const upperSymbol = symbol.toUpperCase().trim();

  try {
    const announcementsFromEndpoint = await fetchAnnouncementsEndpoint(upperSymbol);

    // Try the exact symbol first
    let companyData = await fetchAndParseCompany(upperSymbol, upperSymbol, announcementsFromEndpoint);

    // If exact symbol fails, try stripping derivative suffixes (XD, NC, WU, etc.)
    if (!companyData) {
      const parentCandidates = getParentSymbols(upperSymbol);
      for (const parentSymbol of parentCandidates) {
        const parentAnnouncements = await fetchAnnouncementsEndpoint(parentSymbol);
        const allAnnouncements = [...announcementsFromEndpoint, ...parentAnnouncements];
        companyData = await fetchAndParseCompany(parentSymbol, upperSymbol, allAnnouncements);
        if (companyData) break;
      }
    }

    if (!companyData) {
      return NextResponse.json(
        { error: `Company not found: ${upperSymbol}` },
        { status: 404 }
      );
    }

    return NextResponse.json(companyData);
  } catch (err) {
    console.error(`Error fetching company data for ${upperSymbol}:`, err);
    return NextResponse.json(
      {
        error: 'Unable to fetch company data from PSX',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
