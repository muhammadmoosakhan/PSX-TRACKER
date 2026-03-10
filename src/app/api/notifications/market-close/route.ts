import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendBulkEmails } from '@/lib/email';
import { marketCloseEmailHTML, dailyReportEmailHTML } from '@/lib/email-templates';
import { fetchPSXMarketData, fetchPSXIndices } from '@/lib/psx';
import { calculateHoldings } from '@/lib/calculations';
import type { StockCache, Trade } from '@/types';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch market data once (shared across all users)
    const [stocks, indices] = await Promise.all([
      fetchPSXMarketData(),
      fetchPSXIndices(),
    ]);

    // Build price map
    const priceMap: Record<string, StockCache> = {};
    for (const s of stocks) {
      priceMap[s.symbol] = s;
    }

    // Sort stocks by change_pct for top movers
    const sorted = [...stocks].filter((s) => s.change_pct !== 0).sort((a, b) => b.change_pct - a.change_pct);
    const topGainers = sorted.filter((s) => s.change_pct > 0).slice(0, 5);
    const topLosers = sorted.filter((s) => s.change_pct < 0).slice(-5).reverse();

    const today = new Date().toLocaleDateString('en-PK', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Get all opted-in users
    const supabaseAdmin = getSupabaseAdmin();
    const { data: prefs, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, email, market_close, daily_report')
      .eq('enabled', true);

    if (error) throw error;
    if (!prefs || prefs.length === 0) {
      return NextResponse.json({ message: 'No subscribers', sent: 0 });
    }

    const recipients: Array<{ email: string; subject: string; html: string }> = [];

    for (const pref of prefs) {
      if (!pref.email) continue;

      let html = '';

      // Market close section
      if (pref.market_close) {
        html += marketCloseEmailHTML({ date: today, indices });
      }

      // Daily report section (needs per-user portfolio data)
      if (pref.daily_report) {
        const { data: trades } = await supabaseAdmin
          .from('trades')
          .select('*')
          .eq('user_id', pref.user_id)
          .order('trade_date', { ascending: true });

        const userTrades = (trades || []) as Trade[];
        const holdings = calculateHoldings(userTrades, priceMap);
        const totalValue = holdings.reduce((s, h) => s + h.market_value, 0);
        const totalCost = holdings.reduce((s, h) => s + h.cost_basis, 0);
        const pl = totalValue - totalCost;
        const plPct = totalCost > 0 ? (pl / totalCost) * 100 : 0;

        html += dailyReportEmailHTML({
          date: today,
          portfolioValue: totalValue,
          portfolioPL: pl,
          portfolioPLPct: plPct,
          holdingsCount: holdings.length,
          topGainers,
          topLosers,
          indices,
        });
      }

      if (html) {
        recipients.push({
          email: pref.email,
          subject: `PSX Daily Report - ${today}`,
          html,
        });
      }
    }

    const result = await sendBulkEmails(recipients);
    return NextResponse.json({ ...result, total: recipients.length });
  } catch (err) {
    console.error('Market close notification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
