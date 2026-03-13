import { NextRequest, NextResponse } from 'next/server';
import { fetchPSXHistory } from '@/lib/psx';

export const dynamic = 'force-dynamic';

// Derivative symbols (XD, NC, WU, etc.) often have no history — try parent symbol
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol is required', history: [] },
      { status: 400 }
    );
  }

  const upperSymbol = symbol.toUpperCase().trim();

  try {
    let history = await fetchPSXHistory(upperSymbol);

    // If no history and it's a derivative symbol, try parent candidates
    if (history.length === 0) {
      for (const parentSymbol of getParentSymbols(upperSymbol)) {
        history = await fetchPSXHistory(parentSymbol);
        if (history.length > 0) break;
      }
    }

    return NextResponse.json({
      symbol: upperSymbol,
      history,
      count: history.length,
    });
  } catch (err) {
    console.error(`Error fetching history for ${upperSymbol}:`, err);
    return NextResponse.json(
      { error: 'Unable to fetch stock history', history: [] },
      { status: 500 }
    );
  }
}
