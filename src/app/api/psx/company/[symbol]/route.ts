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
  let description = '';
  const descPatterns = [
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

  // Extract website URL
  let website = '';
  const websitePatterns = [
    /Website[:\s]*<[^>]*href="([^"]+)"[^>]*>/i,
    /Website[:\s]*(?:<[^>]*>)*\s*(https?:\/\/[^\s<]+)/i,
    /Website[:\s]*(?:<[^>]*>)*\s*(www\.[^\s<]+)/i,
  ];
  for (const pattern of websitePatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      website = match[1].trim();
      break;
    }
  }
  if (!website) {
    const raw = extractTableValue(html, 'Website');
    if (raw) website = raw;
  }

  return {
    description,
    marketCap: extractNumericValue(html, 'Market Cap') ??
               extractNumericValue(html, 'Market Capitalization') ??
               extractNumericValue(html, 'Mkt Cap'),
    totalShares: extractNumericValue(html, 'Total Shares') ??
                 extractNumericValue(html, 'Shares Outstanding') ??
                 extractNumericValue(html, 'Ordinary Shares'),
    freeFloat: extractNumericValue(html, 'Free Float Shares') ??
               extractNumericValue(html, 'Free Float$'),
    freeFloatPct: extractPctValue(html, 'Free Float %') ??
                  extractPctValue(html, 'Free Float Percentage') ??
                  extractPctValue(html, 'Free Float Ratio'),
    chairperson: extractTableValue(html, 'Chair') ??
                 extractTableValue(html, 'Chairman') ??
                 extractTableValue(html, 'Chairperson') ?? '',
    ceo: extractTableValue(html, 'CEO') ??
         extractTableValue(html, 'Chief Executive') ??
         extractTableValue(html, 'Managing Director') ?? '',
    secretary: extractTableValue(html, 'Secretary') ??
               extractTableValue(html, 'Company Secretary') ?? '',
    address: extractTableValue(html, 'Registered Office') ??
             extractTableValue(html, 'Address') ??
             extractTableValue(html, 'Registered Address') ?? '',
    website,
    registrar: extractTableValue(html, 'Registrar') ??
               extractTableValue(html, 'Share Registrar') ??
               extractTableValue(html, 'Transfer Agent') ?? '',
    auditor: extractTableValue(html, 'Auditor') ??
             extractTableValue(html, 'External Auditor') ?? '',
  };
}

function parseFundamentals(html: string): Fundamentals {
  return {
    eps: {
      annual: extractNumericValue(html, 'EPS \\(Annual\\)') ??
              extractNumericValue(html, 'EPS Annual') ??
              extractNumericValue(html, 'Earnings Per Share'),
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
              extractNumericValue(html, 'Price to Earnings'),
      expected: extractNumericValue(html, 'P/E \\(Expected\\)') ??
                extractNumericValue(html, 'Expected P/E') ??
                extractNumericValue(html, 'Forward P/E'),
    },
    earningGrowth: extractPctValue(html, 'Earning Growth') ??
                   extractPctValue(html, 'Earnings Growth'),
    pegRatio: extractNumericValue(html, 'PEG Ratio') ??
              extractNumericValue(html, 'PEG'),
    forwardPeg: extractNumericValue(html, 'Forward PEG') ??
                extractNumericValue(html, 'Fwd PEG'),
    profitMargins: {
      gross: extractPctValue(html, 'Gross Margin') ??
             extractPctValue(html, 'Gross Profit Margin'),
      operating: extractPctValue(html, 'Operating Margin') ??
                 extractPctValue(html, 'Operating Profit Margin'),
      net: extractPctValue(html, 'Net Margin') ??
           extractPctValue(html, 'Net Profit Margin'),
      ebitda: extractPctValue(html, 'EBITDA Margin'),
    },
    returnOn: {
      roe: extractPctValue(html, 'ROE') ??
           extractPctValue(html, 'Return on Equity'),
      roa: extractPctValue(html, 'ROA') ??
           extractPctValue(html, 'Return on Assets'),
      roce: extractPctValue(html, 'ROCE') ??
            extractPctValue(html, 'Return on Capital Employed'),
    },
    dps: {
      annual: extractNumericValue(html, 'DPS \\(Annual\\)') ??
              extractNumericValue(html, 'Dividend Per Share'),
      lastQuarter: extractNumericValue(html, 'DPS \\(Last Quarter\\)') ??
                   extractNumericValue(html, 'Quarterly DPS'),
      lastInterim: extractNumericValue(html, 'DPS \\(Interim\\)') ??
                   extractNumericValue(html, 'Interim DPS') ??
                   extractNumericValue(html, 'Last Interim'),
    },
    dividendYield: extractPctValue(html, 'Dividend Yield'),
    dividendCover: extractNumericValue(html, 'Dividend Cover'),
    payoutRatio: extractPctValue(html, 'Payout Ratio'),
    bookValue: extractNumericValue(html, 'Book Value') ??
               extractNumericValue(html, 'Book Value Per Share'),
    pbv: extractNumericValue(html, 'P/BV') ??
         extractNumericValue(html, 'Price to Book') ??
         extractNumericValue(html, 'PBV'),
    enterpriseValue: extractNumericValue(html, 'Enterprise Value') ??
                     extractNumericValue(html, 'EV'),
    currentRatio: extractNumericValue(html, 'Current Ratio'),
    quickRatio: extractNumericValue(html, 'Quick Ratio'),
    inventoryTurnover: extractNumericValue(html, 'Inventory Turnover'),
    assetTurnover: extractNumericValue(html, 'Asset Turnover'),
    equityToAssets: extractPctValue(html, 'Equity to Assets') ??
                    extractPctValue(html, 'Equity/Assets'),
    debtToEquity: extractNumericValue(html, 'Debt to Equity') ??
                  extractNumericValue(html, 'D/E Ratio') ??
                  extractNumericValue(html, 'Debt/Equity'),
    debtToAssets: extractNumericValue(html, 'Debt to Assets') ??
                  extractNumericValue(html, 'Debt/Assets'),
  };
}

function parseCompanyName(html: string, symbol: string): string {
  // Try <h1>, <h2>, or title patterns
  const namePatterns = [
    /<h1[^>]*>([\s\S]*?)<\/h1>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
    new RegExp(`${symbol}\\s*[-|:]\\s*([^<]+)`, 'i'),
    /<h2[^>]*>([\s\S]*?)<\/h2>/i,
  ];

  for (const pattern of namePatterns) {
    const match = pattern.exec(html);
    if (match && match[1]) {
      let name = stripHTML(match[1]).trim();
      // Remove "PSX" or "Pakistan Stock Exchange" suffix/prefix
      name = name
        .replace(/\s*[-|]\s*PSX.*$/i, '')
        .replace(/\s*[-|]\s*Pakistan Stock Exchange.*$/i, '')
        .replace(/^PSX\s*[-|]\s*/i, '')
        .trim();
      // If the name starts with the symbol, try to extract the company name
      if (name.toUpperCase().startsWith(symbol.toUpperCase())) {
        const rest = name.slice(symbol.length).replace(/^\s*[-|:]\s*/, '').trim();
        if (rest.length > 2) return rest;
      }
      if (name.length > 1 && name.length < 200) return name;
    }
  }

  return symbol;
}

function parseSector(html: string): string {
  const sectorPatterns = [
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

  // Try table rows first (most common for PSX)
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  // Check if there is an announcements section
  const announceSectionIndex = html.search(/announcements?|notices?/i);
  const announcementHtml = announceSectionIndex >= 0
    ? html.slice(announceSectionIndex)
    : '';

  if (announcementHtml) {
    while ((rowMatch = tableRowRegex.exec(announcementHtml)) !== null) {
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
        // Try to extract date from first cell
        const dateStr = stripHTML(cells[0]).trim();
        // Try to extract title from second cell
        const titleStr = stripHTML(cells[1] || cells[0]).trim();

        if (!dateStr && !titleStr) continue;
        if (titleStr.toLowerCase().includes('date') && titleStr.length < 10) continue;

        // Extract any links
        let viewUrl: string | null = null;
        let pdfUrl: string | null = null;

        const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch;
        const fullRow = rowMatch[0];
        while ((linkMatch = linkRegex.exec(fullRow)) !== null) {
          const href = linkMatch[1];
          const linkText = stripHTML(linkMatch[2]).toLowerCase();

          if (href.endsWith('.pdf') || linkText.includes('pdf') || linkText.includes('download')) {
            pdfUrl = href.startsWith('http') ? href : `https://dps.psx.com.pk${href}`;
          } else if (linkText.includes('view') || linkText.includes('detail')) {
            viewUrl = href.startsWith('http') ? href : `https://dps.psx.com.pk${href}`;
          } else if (!viewUrl) {
            viewUrl = href.startsWith('http') ? href : `https://dps.psx.com.pk${href}`;
          }
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

  // If no table-based announcements found, try generic link pattern
  if (announcements.length === 0) {
    const announceLinkRegex =
      /<a[^>]*href="([^"]*(?:announcement|notice|circular)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = announceLinkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      const title = stripHTML(linkMatch[2]).trim();
      if (title && title.length > 2) {
        const url = href.startsWith('http') ? href : `https://dps.psx.com.pk${href}`;
        announcements.push({
          date: '',
          title,
          viewUrl: url,
          pdfUrl: href.endsWith('.pdf') ? url : null,
        });
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
    // Fetch company page and announcements endpoint in parallel
    const [companyRes, announcementsFromEndpoint] = await Promise.all([
      fetch(`${PSX_COMPANY_URL}/${encodeURIComponent(upperSymbol)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PSXTracker/1.0)',
          Accept: 'text/html,application/json',
        },
        next: { revalidate: 3600 },
      }),
      fetchAnnouncementsEndpoint(upperSymbol),
    ]);

    if (!companyRes.ok) {
      if (companyRes.status === 404) {
        return NextResponse.json(
          { error: `Company not found: ${upperSymbol}` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `PSX returned status ${companyRes.status}` },
        { status: 502 }
      );
    }

    const html = await companyRes.text();

    // Verify we got actual content (not an error page or redirect)
    if (html.length < 200) {
      return NextResponse.json(
        { error: `No data available for symbol: ${upperSymbol}` },
        { status: 404 }
      );
    }

    // Parse all sections from HTML
    const name = parseCompanyName(html, upperSymbol);
    const sector = parseSector(html);
    const profile = parseProfile(html);
    const fundamentals = parseFundamentals(html);
    const announcementsFromPage = parseAnnouncements(html);

    // Merge announcements: prefer dedicated endpoint, supplement with page data
    const seenTitles = new Set(
      announcementsFromEndpoint.map((a) => a.title.toLowerCase().trim())
    );
    const mergedAnnouncements = [
      ...announcementsFromEndpoint,
      ...announcementsFromPage.filter(
        (a) => !seenTitles.has(a.title.toLowerCase().trim())
      ),
    ];

    const companyData: CompanyData = {
      symbol: upperSymbol,
      name,
      sector,
      profile,
      fundamentals,
      announcements: mergedAnnouncements,
    };

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
