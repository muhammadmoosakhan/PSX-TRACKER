import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { fetchPSXMarketData } from '@/lib/psx';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try fetching fresh data from PSX
    const stocks = await fetchPSXMarketData();

    if (stocks.length > 0) {
      // Upsert into Supabase cache
      try {
        const supabase = await createClient();
        await supabase
          .from('stocks_cache')
          .upsert(stocks, { onConflict: 'symbol' });
      } catch {
        // Cache write failed, continue anyway
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
    try {
      const supabase = await createClient();
      const { data: cached, error: cacheErr } = await supabase
        .from('stocks_cache')
        .select('*')
        .order('symbol');

      if (!cacheErr && cached) {
        return NextResponse.json({
          stocks: cached,
          cached: true,
          count: cached.length,
          updated_at: cached[0]?.updated_at || null,
        });
      }
    } catch {
      // Cache read failed
    }

    return NextResponse.json(
      { error: 'Unable to fetch market data', stocks: [] },
      { status: 500 }
    );
  }
}
