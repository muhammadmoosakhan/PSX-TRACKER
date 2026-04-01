'use client';

import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  PiggyBank,
  Trophy,
  Banknote,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import KPICard from '@/components/dashboard/KPICard';
import RecentTrades from '@/components/dashboard/RecentTrades';
import TopHoldings from '@/components/dashboard/TopHoldings';
import BrokerageAccount from '@/components/dashboard/BrokerageAccount';
import Card from '@/components/ui/Card';
import PieChartComponent from '@/components/charts/PieChart';
import LineChartComponent from '@/components/charts/LineChart';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useAnalysis } from '@/hooks/useAnalysis';
import { formatPKRCompact } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';

export default function DashboardPage() {
  const { trades, loading: tradesLoading } = useTrades();
  const { settings, loading: settingsLoading } = useSettings();
  const { loading: marketLoading, getPriceMap } = useMarketData();
  const priceMap = getPriceMap();
  const { holdings, sectorAllocation, summary } = usePortfolio(trades, priceMap);
  const { winRate, totalRealizedPL } = useAnalysis(trades);

  const loading = tradesLoading || settingsLoading || marketLoading;

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Dashboard" subtitle="Your portfolio at a glance" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Dashboard" subtitle="Your portfolio at a glance" />
        <EmptyState
          icon={LayoutDashboard}
          title="Welcome to PSX Tracker!"
          description="Add your first trade to see your dashboard come alive with charts, KPIs, and insights."
          actionLabel="Go to Trades"
          onAction={() => { globalThis.location.href = '/trades'; }}
        />
      </div>
    );
  }

  // Available cash = capital deposited - money spent on buys + money received from sells
  const totalBuyValue = trades.filter(t => t.trade_type === 'BUY').reduce((s, t) => s + t.net_value, 0);
  const totalSellValue = trades.filter(t => t.trade_type === 'SELL').reduce((s, t) => s + t.net_value, 0);
  const cashRemaining = settings.capital_available > 0
    ? settings.capital_available - totalBuyValue + totalSellValue
    : 0;

  // Monthly portfolio values for chart
  const monthlyData = buildMonthlyPortfolioData(trades, summary.totalValue);

  // Sector data for pie chart
  const sectorPieData = sectorAllocation.map((s) => ({
    name: getSectorDisplay(s.sector).name,
    value: s.current_value,
  }));

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Dashboard" subtitle="Your portfolio at a glance" />

      {/* KPI Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mb-6 overflow-x-auto hide-scrollbar">
        <KPICard label="Portfolio Value" value={summary.totalValue} format="pkr" icon={Wallet} color="#6C5CE7" delay={0} />
        <KPICard label="Total Invested" value={summary.totalInvested} format="pkr" icon={PiggyBank} color="#00D2D3" delay={50} />
        <KPICard
          label="Unrealized P&L"
          value={summary.totalPL}
          format="pkr"
          icon={TrendingUp}
          color={summary.totalPL >= 0 ? '#00B894' : '#FF5252'}
          change={summary.totalPLPct * 100}
          delay={100}
        />
        <KPICard label="Realized P&L" value={totalRealizedPL} format="pkr" icon={Banknote} color="#E17055" delay={150} />
        <KPICard label="Win Rate" value={winRate} format="percent" icon={Trophy} color="#FECA57" delay={200} />
        {(settings.capital_available > 0 || settings.broker_available_cash > 0) && (
          <KPICard label="Available Cash" value={cashRemaining} format="pkr" icon={Wallet} color="#74B9FF" delay={250} />
        )}
      </div>

      {/* Brokerage Account */}
      <div className="mb-6">
        <BrokerageAccount settings={settings} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Portfolio Value Over Time */}
        <Card hoverable={false} className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '300ms' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Portfolio Value Trend
          </h3>
          {monthlyData.length > 1 ? (
            <LineChartComponent
              data={monthlyData}
              xKey="month"
              yKey="value"
              color="#6C5CE7"
              height={250}
            />
          ) : (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
              More data needed for chart
            </p>
          )}
        </Card>

        {/* Sector Allocation */}
        <Card hoverable={false} className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '350ms' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Sector Allocation
          </h3>
          {sectorPieData.length > 0 ? (
            <PieChartComponent
              data={sectorPieData}
              height={250}
              centerLabel="Total"
              centerValue={formatPKRCompact(summary.totalValue)}
            />
          ) : (
            <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
              No sector data yet
            </p>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '400ms' }}>
          <RecentTrades trades={trades} />
        </div>
        <div className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '450ms' }}>
          <TopHoldings holdings={holdings} />
        </div>
      </div>
    </div>
  );
}

/**
 * Build simple monthly portfolio value data for chart
 * Uses cumulative net investment as a proxy
 */
function buildMonthlyPortfolioData(trades: import('@/types').Trade[], currentValue: number) {
  const monthMap: Record<string, number> = {};

  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  let cumulative = 0;
  for (const t of sorted) {
    const d = new Date(t.trade_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });

    if (t.trade_type === 'BUY') cumulative += t.net_value;
    else cumulative -= t.net_value;

    monthMap[key] = cumulative;
  }

  const entries = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b));

  // Add current value as last point
  const data = entries.map(([key, value]) => {
    const [y, m] = key.split('-');
    const d = new Date(Number(y), Number(m) - 1);
    return {
      month: d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }),
      value,
    };
  });

  // Replace last point with actual portfolio value
  if (data.length > 0 && currentValue > 0) {
    data[data.length - 1].value = currentValue;
  }

  return data;
}
