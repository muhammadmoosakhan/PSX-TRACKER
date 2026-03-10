import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchPSXMarketData } from '@/lib/psx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try fetching fresh data from PSX
    const stocks = await fetchPSXMarketData();

    if (stocks.length > 0) {
      // Upsert into Supabase cache
      const { error: upsertErr } = await supabase
        .from('stocks_cache')
        .upsert(stocks, { onConflict: 'symbol' });

      if (upsertErr) {
        console.error('Cache upsert error:', upsertErr);
      }

      return NextResponse.json({
        stocks,
        cached: false,
        count: stocks.length,
        updated_at: new Date().toISOString(),
      });
    }

    // If PSX returned empty, fall through to cache
    throw new Error('No stocks returned from PSX');
  } catch (err) {
    console.error('PSX fetch failed, serving from cache:', err);

    // Serve from Supabase cache as fallback
    const { data: cached, error: cacheErr } = await supabase
      .from('stocks_cache')
      .select('*')
      .order('symbol');

    if (cacheErr || !cached) {
      return NextResponse.json(
        { error: 'Unable to fetch market data', stocks: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      stocks: cached,
      cached: true,
      count: cached.length,
      updated_at: cached[0]?.updated_at || null,
    });
  }
}
