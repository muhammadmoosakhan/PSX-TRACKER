'use client';

import { useMemo } from 'react';
import { Briefcase, RefreshCw, Wallet, TrendingUp, PiggyBank, Percent, Layers } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import KPICard from '@/components/dashboard/KPICard';
import HoldingsTable from '@/components/portfolio/HoldingsTable';
import Button from '@/components/ui/Button';
import { useTrades } from '@/hooks/useTrades';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { formatPKRCompact } from '@/lib/formatters';

export default function PortfolioPage() {
  const { trades, loading: tradesLoading } = useTrades();
  const { loading: marketLoading, lastUpdated, fetchMarketData, getPriceMap } = useMarketData();
  const priceMap = getPriceMap();
  const { holdings, summary } = usePortfolio(trades, priceMap);

  const loading = tradesLoading || marketLoading;

  // Calculate total shares held
  const totalSharesHeld = useMemo(() => {
    return holdings.reduce((sum, h) => sum + h.quantity_held, 0);
  }, [holdings]);

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Portfolio" subtitle="Your current holdings with live market prices" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Portfolio" subtitle="Your current holdings with live market prices" />
        <EmptyState
          icon={Briefcase}
          title="No holdings yet"
          description="Once you add buy trades, your portfolio will appear here with live prices and P&L tracking."
          actionLabel="Go to Trades"
          onAction={() => { globalThis.location.href = '/trades'; }}
        />
      </div>
    );
  }

  const timeSince = lastUpdated
    ? `Updated ${Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000)} min ago`
    : '';

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader
        title="Portfolio"
        subtitle="Your current holdings with live market prices"
        action={
          <div className="flex items-center gap-3">
            {timeSince && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{timeSince}</span>}
            <Button variant="secondary" size="sm" onClick={() => fetchMarketData(true)}>
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      {/* KPI Summary */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 mb-6">
        <KPICard label="Portfolio Value" value={summary.totalValue} format="pkr" icon={Wallet} color="#6C5CE7" delay={0} />
        <KPICard label="Total Invested" value={summary.totalInvested} format="pkr" icon={PiggyBank} color="#00D2D3" delay={50} />
        <KPICard label="Total Shares" value={totalSharesHeld} format="number" icon={Layers} color="#FDCB6E" delay={75} />
        <KPICard label="Unrealized P&L" value={summary.totalPL} format="pkr" icon={TrendingUp} color={summary.totalPL >= 0 ? '#00B894' : '#FF5252'} change={summary.totalPLPct * 100} delay={100} />
        <KPICard label="Return" value={summary.totalPLPct} format="percent" icon={Percent} color={summary.totalPLPct >= 0 ? '#00B894' : '#FF5252'} delay={150} />
      </div>

      {/* Holdings badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{holdings.length} holdings</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{totalSharesHeld.toLocaleString()} shares</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Value: {formatPKRCompact(summary.totalValue)}</span>
      </div>

      <HoldingsTable holdings={holdings} />
    </div>
  );
}
