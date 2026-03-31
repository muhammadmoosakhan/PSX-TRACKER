'use client';

import { useState, useMemo } from 'react';
import { BarChart3, Layers, ShoppingCart, TrendingDown, Percent, Filter, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import KPICard from '@/components/dashboard/KPICard';
import MonthlyView from '@/components/analysis/MonthlyView';
import QuarterlyView from '@/components/analysis/QuarterlyView';
import YearlyView from '@/components/analysis/YearlyView';
import { useTrades } from '@/hooks/useTrades';
import { useAnalysis } from '@/hooks/useAnalysis';
import { getSectorDisplay } from '@/lib/constants';

type Tab = 'monthly' | 'quarterly' | 'yearly';

export default function AnalysisPage() {
  const { trades, loading } = useTrades();
  const [tab, setTab] = useState<Tab>('monthly');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterSector, setFilterSector] = useState('');
  const [filterType, setFilterType] = useState<'' | 'BUY' | 'SELL'>('');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique symbols and sectors for filter dropdowns
  const uniqueSymbols = useMemo(() => {
    return [...new Set(trades.map((t) => t.symbol))].sort();
  }, [trades]);

  const uniqueSectors = useMemo(() => {
    return [...new Set(trades.map((t) => t.sector))].sort();
  }, [trades]);

  // Apply filters
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      if (filterSymbol && t.symbol !== filterSymbol) return false;
      if (filterSector && t.sector !== filterSector) return false;
      if (filterType && t.trade_type !== filterType) return false;
      return true;
    });
  }, [trades, filterSymbol, filterSector, filterType]);

  const hasFilters = filterSymbol || filterSector || filterType;

  const { monthly, quarterly, yearly, totalSharesTraded, buyShares, sellShares, winRate } = useAnalysis(filteredTrades);

  // Stock breakdown: group BUY trades by symbol, sum net_value
  const stockBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTrades) {
      if (t.trade_type === 'BUY') {
        map[t.symbol] = (map[t.symbol] || 0) + t.net_value;
      }
    }
    return Object.entries(map)
      .map(([symbol, value]) => ({ symbol, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTrades]);

  // Sector breakdown: group BUY trades by sector, sum net_value
  const sectorBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of filteredTrades) {
      if (t.trade_type === 'BUY') {
        map[t.sector] = (map[t.sector] || 0) + t.net_value;
      }
    }
    return Object.entries(map)
      .map(([sector, value]) => ({ sector, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTrades]);

  const clearFilters = () => {
    setFilterSymbol('');
    setFilterSector('');
    setFilterType('');
  };

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Analysis" subtitle="Monthly, quarterly, and yearly performance breakdowns" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Analysis" subtitle="Monthly, quarterly, and yearly performance breakdowns" />
        <EmptyState
          icon={BarChart3}
          title="Not enough data"
          description="Add some trades first. Your performance analysis will appear here over time."
          actionLabel="Go to Trades"
          onAction={() => { globalThis.location.href = '/trades'; }}
        />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Analysis" subtitle="Monthly, quarterly, and yearly performance breakdowns" />

      {/* Summary KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          label="Total Shares Traded"
          value={totalSharesTraded}
          format="number"
          icon={Layers}
          color="#6C5CE7"
          delay={0}
        />
        <KPICard
          label="Shares Bought"
          value={buyShares}
          format="number"
          icon={ShoppingCart}
          color="#00B894"
          delay={50}
        />
        <KPICard
          label="Shares Sold"
          value={sellShares}
          format="number"
          icon={TrendingDown}
          color="#FF5252"
          delay={100}
        />
        <KPICard
          label="Win Rate"
          value={winRate}
          format="percent"
          icon={Percent}
          color="#FDCB6E"
          delay={150}
        />
      </div>

      {/* Filters + Tab Navigation */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-[14px] w-fit" style={{ background: 'var(--bg-secondary)' }}>
          {([
            { key: 'monthly' as Tab, label: 'Monthly' },
            { key: 'quarterly' as Tab, label: 'Quarterly' },
            { key: 'yearly' as Tab, label: 'Yearly' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-5 py-2 text-sm font-medium rounded-[12px] transition-all duration-200 cursor-pointer"
              style={{
                background: tab === key ? 'var(--accent-primary)' : 'transparent',
                color: tab === key ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-[12px] transition-all cursor-pointer"
          style={{
            background: hasFilters ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: hasFilters ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <Filter size={14} />
          Filters
          {hasFilters && (
            <span className="ml-1 w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
              {[filterSymbol, filterSector, filterType].filter(Boolean).length}
            </span>
          )}
        </button>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-[14px] animate-[slide-up_0.2s_ease-out]" style={{ background: 'var(--bg-secondary)' }}>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Stock</label>
            <select
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              className="block px-3 py-2 text-sm rounded-[10px] outline-none cursor-pointer min-w-[140px]"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            >
              <option value="">All Stocks</option>
              {uniqueSymbols.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Sector</label>
            <select
              value={filterSector}
              onChange={(e) => setFilterSector(e.target.value)}
              className="block px-3 py-2 text-sm rounded-[10px] outline-none cursor-pointer min-w-[160px]"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            >
              <option value="">All Sectors</option>
              {uniqueSectors.map((s) => (
                <option key={s} value={s}>{getSectorDisplay(s).name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as '' | 'BUY' | 'SELL')}
              className="block px-3 py-2 text-sm rounded-[10px] outline-none cursor-pointer min-w-[120px]"
              style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
            >
              <option value="">All Types</option>
              <option value="BUY">Buy Only</option>
              <option value="SELL">Sell Only</option>
            </select>
          </div>
        </div>
      )}

      {/* Filtered trades count */}
      {hasFilters && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Showing {filteredTrades.length} of {trades.length} trades
        </p>
      )}

      {/* Tab Content */}
      <div className="animate-[fade-in_0.3s_ease-out]">
        {tab === 'monthly' && (
          <MonthlyView
            data={monthly}
            stockBreakdown={stockBreakdown}
            sectorBreakdown={sectorBreakdown}
          />
        )}
        {tab === 'quarterly' && (
          <QuarterlyView
            data={quarterly}
            stockBreakdown={stockBreakdown}
            sectorBreakdown={sectorBreakdown}
          />
        )}
        {tab === 'yearly' && (
          <YearlyView
            data={yearly}
            stockBreakdown={stockBreakdown}
            sectorBreakdown={sectorBreakdown}
          />
        )}
      </div>
    </div>
  );
}
