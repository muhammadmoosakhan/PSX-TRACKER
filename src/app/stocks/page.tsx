'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Filter,
  ArrowUpDown,
  ChevronDown,
  Minus,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useMarketData } from '@/hooks/useMarketData';
import { getStockLogoUrl } from '@/lib/stock-logos';
import { getSectorDisplay } from '@/lib/constants';
import { getCompanyName } from '@/lib/psx-companies';
import type { StockCache } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOGO_COLORS = [
  '#6C5CE7', '#00B894', '#E17055', '#0984E3',
  '#FDCB6E', '#E84393', '#00CEC9', '#636E72',
  '#A29BFE', '#55EFC4',
];

const SORT_OPTIONS = [
  { value: 'change_pct_desc', label: 'Change % \u2193' },
  { value: 'change_pct_asc', label: 'Change % \u2191' },
  { value: 'volume_desc', label: 'Volume \u2193' },
  { value: 'price_desc', label: 'Price \u2193' },
  { value: 'price_asc', label: 'Price \u2191' },
  { value: 'name_asc', label: 'A\u2013Z' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];

const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLogoColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toString();
}

function formatPrice(v: number): string {
  return v.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getLogoInitials(symbol: string): string {
  return symbol.slice(0, 2).toUpperCase();
}

function sortStocks(stocks: StockCache[], sortBy: SortKey): StockCache[] {
  const sorted = [...stocks];
  switch (sortBy) {
    case 'change_pct_desc':
      return sorted.sort((a, b) => b.change_pct - a.change_pct);
    case 'change_pct_asc':
      return sorted.sort((a, b) => a.change_pct - b.change_pct);
    case 'volume_desc':
      return sorted.sort((a, b) => b.volume - a.volume);
    case 'price_desc':
      return sorted.sort((a, b) => b.current_price - a.current_price);
    case 'price_asc':
      return sorted.sort((a, b) => a.current_price - b.current_price);
    case 'name_asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] min-w-[110px]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <div className="flex flex-col">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </span>
        <span
          className="text-sm font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        >
          {count}
        </span>
      </div>
    </div>
  );
}

function StockLogo({ symbol }: { symbol: string }) {
  const bg = getLogoColor(symbol);
  const logoUrl = getStockLogoUrl(symbol);
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <div
        className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
        }}
      >
        <img
          src={logoUrl}
          alt={symbol}
          width={24}
          height={24}
          onError={() => setImgError(true)}
          style={{ objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white text-xs"
      style={{
        width: 36,
        height: 36,
        background: bg,
        fontFamily: 'var(--font-heading)',
      }}
    >
      {getLogoInitials(symbol)}
    </div>
  );
}

function StockRow({ stock }: { stock: StockCache }) {
  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;

  const changeColor = isPositive
    ? 'var(--accent-success)'
    : isNegative
      ? 'var(--accent-danger)'
      : 'var(--text-muted)';

  return (
    <div
      className="flex items-center gap-3 sm:gap-4 px-4 py-3 transition-colors duration-150"
      style={{
        borderBottom: '1px solid var(--border-light)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      {/* Logo */}
      <StockLogo symbol={stock.symbol} />

      {/* Symbol + Name + Sector */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {stock.symbol}
          </span>
          <span
            className="hidden sm:inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
            }}
          >
            {getSectorDisplay(stock.sector).emoji} {getSectorDisplay(stock.sector).name}
          </span>
        </div>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {getCompanyName(stock.symbol, stock.name !== stock.symbol ? stock.name : undefined)}
        </p>
      </div>

      {/* Price */}
      <div className="text-right flex-shrink-0">
        <div
          className="text-sm font-bold"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatPrice(stock.current_price)}
        </div>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          {isPositive && <TrendingUp size={12} style={{ color: changeColor }} />}
          {isNegative && <TrendingDown size={12} style={{ color: changeColor }} />}
          {!isPositive && !isNegative && (
            <Minus size={12} style={{ color: changeColor }} />
          )}
          <span
            className="text-xs font-semibold"
            style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}
          >
            {stock.change >= 0 ? '+' : ''}
            {stock.change.toFixed(2)}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}
          >
            ({stock.change_pct >= 0 ? '+' : ''}
            {stock.change_pct.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Volume — hidden on very small screens */}
      <div className="hidden md:block text-right flex-shrink-0 w-[80px]">
        <span
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          Vol
        </span>
        <div
          className="text-xs font-semibold"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatVolume(stock.volume)}
        </div>
      </div>
    </div>
  );
}

// Mobile card variant for small screens
function StockCard({ stock }: { stock: StockCache }) {
  const isPositive = stock.change > 0;
  const isNegative = stock.change < 0;

  const changeColor = isPositive
    ? 'var(--accent-success)'
    : isNegative
      ? 'var(--accent-danger)'
      : 'var(--text-muted)';

  return (
    <div
      className="p-4 transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-start gap-3">
        <StockLogo symbol={stock.symbol} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-sm font-bold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {stock.symbol}
            </span>
            <span
              className="text-sm font-bold flex-shrink-0"
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {formatPrice(stock.current_price)}
            </span>
          </div>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          >
            {getCompanyName(stock.symbol, stock.name !== stock.symbol ? stock.name : undefined)}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span
              className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
              }}
            >
              {getSectorDisplay(stock.sector).emoji} {getSectorDisplay(stock.sector).name}
            </span>
            <div className="flex items-center gap-1.5">
              {isPositive && <TrendingUp size={12} style={{ color: changeColor }} />}
              {isNegative && <TrendingDown size={12} style={{ color: changeColor }} />}
              {!isPositive && !isNegative && (
                <Minus size={12} style={{ color: changeColor }} />
              )}
              <span
                className="text-xs font-semibold"
                style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}
              >
                {stock.change_pct >= 0 ? '+' : ''}
                {stock.change_pct.toFixed(2)}%
              </span>
              <span
                className="text-[10px] ml-1"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                Vol {formatVolume(stock.volume)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function StocksPage() {
  const { stocks, loading, error, lastUpdated, fetchMarketData } = useMarketData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('change_pct_desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  // Derive unique sectors from stock data, sorted by display name
  const sectors = useMemo(() => {
    const sectorSet = new Set<string>();
    for (const s of stocks) {
      if (s.sector) sectorSet.add(s.sector);
    }
    return Array.from(sectorSet).sort((a, b) =>
      getSectorDisplay(a).name.localeCompare(getSectorDisplay(b).name)
    );
  }, [stocks]);

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    let result = stocks;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      result = result.filter(
        (s) =>
          s.symbol.toUpperCase().includes(q) ||
          s.name.toUpperCase().includes(q)
      );
    }

    // Sector filter
    if (selectedSector !== 'all') {
      result = result.filter((s) => s.sector === selectedSector);
    }

    // Sort
    result = sortStocks(result, sortBy);

    return result;
  }, [stocks, searchQuery, selectedSector, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredStocks.length;
    let gainers = 0;
    let losers = 0;
    let unchanged = 0;

    for (const s of filteredStocks) {
      if (s.change > 0) gainers++;
      else if (s.change < 0) losers++;
      else unchanged++;
    }

    return { total, gainers, losers, unchanged };
  }, [filteredStocks]);

  // Visible slice for virtualization-like approach
  const visibleStocks = useMemo(
    () => filteredStocks.slice(0, visibleCount),
    [filteredStocks, visibleCount]
  );

  const hasMore = visibleCount < filteredStocks.length;

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMarketData(true);
    setRefreshing(false);
  }, [fetchMarketData]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  // Reset visible count when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSectorChange = useCallback((value: string) => {
    setSelectedSector(value);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value as SortKey);
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Time since last update
  const timeSince = lastUpdated
    ? `Updated ${Math.round(
        (Date.now() - new Date(lastUpdated).getTime()) / 60000
      )} min ago`
    : '';

  // ---- Loading state ----
  if (loading && stocks.length === 0) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader
          title="Stocks"
          subtitle="PSX Listed Securities"
        />
        <SkeletonTable rows={10} />
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      {/* Header */}
      <PageHeader
        title="Stocks"
        subtitle="PSX Listed Securities"
        action={
          <div className="flex items-center gap-3">
            {timeSince && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {timeSince}
              </span>
            )}
            <Button
              variant="secondary"
              size="sm"
              loading={refreshing}
              onClick={handleRefresh}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-[12px] text-sm font-medium"
          style={{
            background: 'rgba(255,82,82,0.08)',
            color: 'var(--accent-danger)',
            border: '1px solid rgba(255,82,82,0.2)',
          }}
        >
          {error}
        </div>
      )}

      {/* Search + Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by symbol or company name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm font-medium rounded-[12px] outline-none transition-all duration-200"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--accent-primary)';
              (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(108,92,231,0.1)';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--border-light)';
              (e.target as HTMLInputElement).style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Sector filter */}
        <div className="relative">
          <Filter
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <select
            value={selectedSector}
            onChange={(e) => handleSectorChange(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2.5 text-sm font-medium rounded-[12px] outline-none cursor-pointer transition-all duration-200"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              minWidth: 160,
            }}
          >
            <option value="all">All Sectors</option>
            {sectors.map((code) => {
              const { name, emoji } = getSectorDisplay(code);
              return (
                <option key={code} value={code}>
                  {emoji} {name}
                </option>
              );
            })}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <ArrowUpDown
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2.5 text-sm font-medium rounded-[12px] outline-none cursor-pointer transition-all duration-200"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              minWidth: 140,
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <StatPill
          label="Total"
          count={stats.total}
          color="var(--accent-primary)"
        />
        <StatPill
          label="Gainers"
          count={stats.gainers}
          color="var(--accent-success)"
        />
        <StatPill
          label="Losers"
          count={stats.losers}
          color="var(--accent-danger)"
        />
        <StatPill
          label="Unchanged"
          count={stats.unchanged}
          color="var(--text-muted)"
        />
      </div>

      {/* Stock list — Desktop */}
      {filteredStocks.length === 0 ? (
        <Card hoverable={false} padding="lg">
          <div className="text-center py-8">
            <Search
              size={40}
              className="mx-auto mb-3"
              style={{ color: 'var(--text-muted)', opacity: 0.5 }}
            />
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              No stocks found matching your criteria
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Try adjusting your search or filters
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop list view */}
          <div className="hidden sm:block">
            <Card hoverable={false} padding="none">
              {/* Table header */}
              <div
                className="flex items-center gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
                style={{
                  color: 'var(--text-muted)',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                <div className="w-[36px] flex-shrink-0" />
                <div className="flex-1">Stock</div>
                <div className="text-right w-[180px] flex-shrink-0">Price / Change</div>
                <div className="hidden md:block text-right w-[80px] flex-shrink-0">Volume</div>
              </div>

              {/* Stock rows */}
              {visibleStocks.map((stock) => (
                <Link key={stock.symbol} href={`/stocks/${encodeURIComponent(stock.symbol)}`} className="block">
                  <StockRow stock={stock} />
                </Link>
              ))}
            </Card>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden flex flex-col gap-3">
            {visibleStocks.map((stock) => (
              <Link key={stock.symbol} href={`/stocks/${encodeURIComponent(stock.symbol)}`}>
                <StockCard stock={stock} />
              </Link>
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center mt-6 mb-2">
              <Button
                variant="secondary"
                size="md"
                onClick={handleLoadMore}
              >
                Load More ({filteredStocks.length - visibleCount} remaining)
              </Button>
            </div>
          )}

          {/* Showing count */}
          <div className="text-center mt-3 mb-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Showing {Math.min(visibleCount, filteredStocks.length)} of{' '}
              {filteredStocks.length} stocks
              {stocks.length !== filteredStocks.length &&
                ` (filtered from ${stocks.length} total)`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
