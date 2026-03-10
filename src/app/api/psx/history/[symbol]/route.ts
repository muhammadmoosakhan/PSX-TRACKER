import { NextRequest, NextResponse } from 'next/server';
import { fetchPSXHistory } from '@/lib/psx';

export const dynamic = 'force-dynamic';

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

  try {
    const history = await fetchPSXHistory(symbol);
    return NextResponse.json({
      symbol,
      history,
      count: history.length,
    });
  } catch (err) {
    console.error(`Error fetching history for ${symbol}:`, err);
    return NextResponse.json(
      { error: 'Unable to fetch stock history', history: [] },
      { status: 500 }
    );
  }
}
