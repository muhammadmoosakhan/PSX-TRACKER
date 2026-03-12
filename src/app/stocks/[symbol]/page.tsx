'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Share2,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  FileText,
  Eye,
  Users,
  Building2,
  BarChart3,
  Activity,
  Globe,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getSectorDisplay } from '@/lib/constants';
import { getStockLogoUrl } from '@/lib/stock-logos';
import { getAllTechnicals } from '@/lib/technicals';
import type { StockCache, StockHistoryPoint } from '@/types';
import type { StockTechnicals } from '@/lib/technicals';

// ============================================
// Constants & Types
// ============================================

const TABS = [
  { key: 'live', label: 'Live', icon: Activity },
  { key: 'fundamentals', label: 'Fundamentals', icon: BarChart3 },
  { key: 'technicals', label: 'Technicals', icon: TrendingUp },
  { key: 'announcements', label: 'Announcements', icon: FileText },
  { key: 'profile', label: 'Profile', icon: Building2 },
  { key: 'competitors', label: 'Competitors', icon: Users },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const CHART_PERIODS = ['1D', '1M', '6M', 'YTD', '1Y', '3Y', '5Y'] as const;
type ChartPeriod = (typeof CHART_PERIODS)[number];

// ============================================
// Helpers
// ============================================

function formatPrice(v: number): string {
  return v.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toString();
}

function formatLargeNumber(v: number): string {
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(2);
}

/** Filter history data by selected chart period */
function filterByPeriod(data: StockHistoryPoint[], period: ChartPeriod): StockHistoryPoint[] {
  if (data.length === 0) return [];
  const now = new Date();
  let cutoff: Date;

  switch (period) {
    case '1D':
      // Show the last 2 trading days
      return data.slice(-2);
    case '1M':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    case '6M':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case 'YTD':
      cutoff = new Date(now.getFullYear(), 0, 1);
      break;
    case '1Y':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    case '3Y':
      cutoff = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      break;
    case '5Y':
      cutoff = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      break;
    default:
      return data;
  }

  return data.filter((d) => new Date(d.date) >= cutoff);
}

/** Compute the position percentage for range sliders */
function rangePosition(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// ============================================
// Skeleton Components
// ============================================

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ''}`} />;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[16px] p-5"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
    >
      <SkeletonBlock className="h-4 w-24 mb-3" />
      <SkeletonBlock className="h-6 w-32 mb-2" />
      <SkeletonBlock className="h-4 w-full" />
    </div>
  );
}

// ============================================
// Sub-Components: Range Slider
// ============================================

function RangeSlider({
  label,
  low,
  high,
  current,
  lowLabel,
  highLabel,
}: {
  label: string;
  low: number;
  high: number;
  current: number;
  lowLabel?: string;
  highLabel?: string;
}) {
  const pct = rangePosition(current, low, high);

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        {/* Gradient bar */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to right, var(--accent-danger), var(--accent-warning), var(--accent-success))',
          }}
        />
        {/* Position marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2"
          style={{
            left: `${pct}%`,
            transform: `translate(-50%, -50%)`,
            background: 'var(--bg-card)',
            borderColor: 'var(--accent-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {lowLabel || formatPrice(low)}
        </span>
        <span className="text-[10px] font-bold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
          {formatPrice(current)}
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {highLabel || formatPrice(high)}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components: Signal Badge
// ============================================

function SignalBadge({ signal }: { signal: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const colors = {
    BUY: { bg: 'rgba(0,184,148,0.12)', text: 'var(--accent-success)' },
    SELL: { bg: 'rgba(255,82,82,0.12)', text: 'var(--accent-danger)' },
    NEUTRAL: { bg: 'var(--bg-secondary)', text: 'var(--text-muted)' },
  };
  const c = colors[signal];

  return (
    <span
      className="text-[10px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {signal}
    </span>
  );
}

// ============================================
// Sub-Components: Stat Grid Item
// ============================================

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="p-3 rounded-[12px]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
    </div>
  );
}

// ============================================
// Sub-Components: Fundamental Row
// ============================================

function FundamentalRow({ label, value, isPositive }: { label: string; value: string; isPositive?: boolean | null }) {
  const valueColor =
    isPositive === true
      ? 'var(--accent-success)'
      : isPositive === false
        ? 'var(--accent-danger)'
        : 'var(--text-primary)';

  return (
    <div
      className="flex items-center justify-between py-2.5 px-1"
      style={{ borderBottom: '1px solid var(--border-light)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span className="text-xs font-bold" style={{ color: valueColor, fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

// ============================================
// Sub-Components: Stock Logo
// ============================================

function StockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const logoUrl = getStockLogoUrl(symbol);
  const [imgError, setImgError] = useState(false);

  // Deterministic color from symbol
  const colors = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393', '#00CEC9', '#636E72'];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  const bg = colors[Math.abs(hash) % colors.length];

  if (logoUrl && !imgError) {
    return (
      <div
        className="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center"
        style={{ width: size, height: size, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
      >
        <img
          src={logoUrl}
          alt={symbol}
          width={size * 0.6}
          height={size * 0.6}
          onError={() => setImgError(true)}
          style={{ objectFit: 'contain' }}
        />
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white text-xs"
      style={{ width: size, height: size, background: bg, fontFamily: 'var(--font-heading)' }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ============================================
// Chart Custom Tooltip
// ============================================

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-[12px] text-xs"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p className="font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="font-bold" style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
        PKR {formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = React.use(params);
  const decodedSymbol = decodeURIComponent(symbol).toUpperCase();

  // ---- State ----
  const [activeTab, setActiveTab] = useState<TabKey>('live');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1M');
  const [stockData, setStockData] = useState<StockCache | null>(null);
  const [history, setHistory] = useState<StockHistoryPoint[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  const [allStocks, setAllStocks] = useState<StockCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [profileExpanded, setProfileExpanded] = useState(false);

  // ---- Fetch market data + history on mount ----
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setHistoryLoading(true);

      try {
        // Fetch market data and history in parallel
        const [marketRes, historyRes] = await Promise.all([
          fetch('/api/psx/market'),
          fetch(`/api/psx/history/${decodedSymbol}`),
        ]);

        if (!cancelled) {
          const marketJson = await marketRes.json();
          const historyJson = await historyRes.json();

          if (marketJson.stocks) {
            setAllStocks(marketJson.stocks);
            const found = marketJson.stocks.find(
              (s: StockCache) => s.symbol.toUpperCase() === decodedSymbol
            );
            setStockData(found || null);
          }

          setHistory(historyJson.history || []);
        }
      } catch (err) {
        console.error('Error fetching stock data:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHistoryLoading(false);
        }
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [decodedSymbol]);

  // ---- Fetch company data when those tabs are selected ----
  useEffect(() => {
    const needsCompany = ['fundamentals', 'announcements', 'profile'].includes(activeTab);
    if (!needsCompany || companyData) return;

    let cancelled = false;

    async function fetchCompany() {
      setCompanyLoading(true);
      try {
        const res = await fetch(`/api/psx/company/${decodedSymbol}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setCompanyData(data);
        }
      } catch (err) {
        console.error('Error fetching company data:', err);
      } finally {
        if (!cancelled) setCompanyLoading(false);
      }
    }

    fetchCompany();
    return () => { cancelled = true; };
  }, [activeTab, decodedSymbol, companyData]);

  // ---- Computed values ----
  const technicals: StockTechnicals | null = useMemo(() => {
    if (!stockData || history.length < 15) return null;
    return getAllTechnicals(history, stockData.current_price, stockData.ldcp);
  }, [history, stockData]);

  const chartData = useMemo(() => {
    const filtered = filterByPeriod(history, chartPeriod);
    return filtered.map((d) => ({
      date: new Date(d.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
      close: d.close,
    }));
  }, [history, chartPeriod]);

  const competitors = useMemo(() => {
    if (!stockData || allStocks.length === 0) return [];
    return allStocks.filter(
      (s) => s.sector === stockData.sector && s.symbol !== stockData.symbol
    );
  }, [allStocks, stockData]);

  const sectorInfo = stockData ? getSectorDisplay(stockData.sector) : null;
  const isPositive = stockData ? stockData.change > 0 : false;
  const isNegative = stockData ? stockData.change < 0 : false;
  const changeColor = isPositive
    ? 'var(--accent-success)'
    : isNegative
      ? 'var(--accent-danger)'
      : 'var(--text-muted)';

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out] max-w-[900px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <SkeletonBlock className="h-8 w-8 rounded-full" />
          <SkeletonBlock className="h-6 w-40" />
        </div>
        <SkeletonBlock className="h-10 w-48 mb-2" />
        <SkeletonBlock className="h-5 w-32 mb-6" />
        <SkeletonBlock className="h-10 w-full mb-6" />
        <SkeletonBlock className="h-[250px] w-full mb-4" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // ---- Stock not found ----
  if (!stockData) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out] max-w-[900px] mx-auto text-center py-20">
        <Building2 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          Stock Not Found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Could not find data for symbol &quot;{decodedSymbol}&quot;
        </p>
        <Link
          href="/stocks"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-semibold text-white transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'var(--accent-primary)' }}
        >
          <ArrowLeft size={16} /> Back to Stocks
        </Link>
      </div>
    );
  }

  // ============================================
  // Render: Header
  // ============================================

  return (
    <div className="animate-[fade-in_0.5s_ease-out] max-w-[900px] mx-auto">
      {/* --- Header --- */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/stocks"
          className="flex items-center gap-2 text-sm font-medium transition-colors duration-150"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back to Stocks</span>
        </Link>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: `${stockData.name} (${stockData.symbol})`, url: window.location.href });
            } else {
              navigator.clipboard.writeText(window.location.href);
            }
          }}
          className="p-2 rounded-full transition-colors duration-150"
          style={{ color: 'var(--text-secondary)' }}
          title="Share"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Stock identity */}
      <div className="flex items-start gap-3 mb-1">
        <StockLogo symbol={stockData.symbol} size={44} />
        <div className="flex-1 min-w-0">
          <h1
            className="text-lg font-bold truncate"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {stockData.name}
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              {stockData.symbol}
            </span>
            {sectorInfo && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
              >
                {sectorInfo.emoji} {sectorInfo.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current price + change */}
      <div className="mt-3 mb-5">
        <p
          className="text-3xl font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        >
          PKR {formatPrice(stockData.current_price)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {isPositive ? <TrendingUp size={16} style={{ color: changeColor }} /> : null}
          {isNegative ? <TrendingDown size={16} style={{ color: changeColor }} /> : null}
          <span className="text-sm font-bold" style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}>
            {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)}
          </span>
          <span className="text-sm font-semibold" style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}>
            ({stockData.change_pct >= 0 ? '+' : ''}{stockData.change_pct.toFixed(2)}%)
          </span>
          <span className="text-[10px] font-medium ml-2" style={{ color: 'var(--text-muted)' }}>
            Updated {new Date(stockData.updated_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ============================================ */}
      {/* Tab Bar                                      */}
      {/* ============================================ */}
      <div
        className="flex gap-1 mb-6 overflow-x-auto hide-scrollbar pb-1"
        style={{ borderBottom: '1px solid var(--border-light)' }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 relative flex-shrink-0"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                background: 'transparent',
              }}
            >
              <Icon size={14} />
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* Tab 1: LIVE                                  */}
      {/* ============================================ */}
      {activeTab === 'live' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {/* Chart period toggles */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto hide-scrollbar">
            {CHART_PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 flex-shrink-0"
                style={{
                  background: chartPeriod === p ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: chartPeriod === p ? '#fff' : 'var(--text-muted)',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Price chart */}
          <div
            className="rounded-[16px] p-4 mb-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
          >
            {historyLoading ? (
              <SkeletonBlock className="h-[220px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D2D3" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D2D3" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(0)}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#00D2D3"
                    strokeWidth={2}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px]">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No chart data available</p>
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <StatItem label="Volume" value={formatVolume(stockData.volume)} />
            <StatItem label="Open Price" value={formatPrice(stockData.open_price)} />
            <StatItem label="Last Day Close (LDCP)" value={formatPrice(stockData.ldcp)} />
          </div>

          {/* Latest Quote */}
          <h3
            className="text-sm font-bold mb-3"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            Latest Quote
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatItem label="High" value={formatPrice(stockData.high)} />
            <StatItem label="Low" value={formatPrice(stockData.low)} />
            <StatItem label="Change" value={`${stockData.change >= 0 ? '+' : ''}${stockData.change.toFixed(2)}`} />
            <StatItem label="Change %" value={`${stockData.change_pct >= 0 ? '+' : ''}${stockData.change_pct.toFixed(2)}%`} />
          </div>

          {/* Day's Range */}
          <RangeSlider
            label="Day's Range"
            low={stockData.low}
            high={stockData.high}
            current={stockData.current_price}
          />

          {/* 52-Week Range */}
          {technicals?.weekRange52 && (
            <RangeSlider
              label="52-Week Range"
              low={technicals.weekRange52.low}
              high={technicals.weekRange52.high}
              current={stockData.current_price}
            />
          )}

          {/* Circuit Breakers */}
          {technicals?.circuitBreakers && (
            <RangeSlider
              label="Circuit Breakers"
              low={technicals.circuitBreakers.lowerLock}
              high={technicals.circuitBreakers.upperLock}
              current={stockData.current_price}
              lowLabel={`Lower Lock ${formatPrice(technicals.circuitBreakers.lowerLock)}`}
              highLabel={`Upper Lock ${formatPrice(technicals.circuitBreakers.upperLock)}`}
            />
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab 2: FUNDAMENTALS                          */}
      {/* ============================================ */}
      {activeTab === 'fundamentals' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {companyLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : companyData?.fundamentals ? (
            <div className="space-y-5">
              {/* Earnings */}
              <FundamentalSection title="Earnings" data={companyData.fundamentals.earnings} />
              {/* Performance */}
              <FundamentalSection title="Performance" data={companyData.fundamentals.performance} />
              {/* Payouts */}
              <FundamentalSection title="Payouts" data={companyData.fundamentals.payouts} />
              {/* Valuations */}
              <FundamentalSection title="Valuations" data={companyData.fundamentals.valuations} />
              {/* Financial Health */}
              <FundamentalSection title="Financial Health" data={companyData.fundamentals.financial_health} />
            </div>
          ) : (
            <EmptyTabState
              icon={BarChart3}
              title="Fundamentals Unavailable"
              message="Fundamental data is not available for this stock at the moment."
            />
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab 3: TECHNICALS                            */}
      {/* ============================================ */}
      {activeTab === 'technicals' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {!technicals ? (
            <EmptyTabState
              icon={Activity}
              title="Insufficient Data"
              message="Not enough historical data to compute technical indicators."
            />
          ) : (
            <div className="space-y-5">
              {/* Technical Indicators */}
              {technicals.indicators.length > 0 && (
                <SectionCard title="Technical Indicators">
                  {technicals.indicators.map((ind, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5 px-1"
                      style={{ borderBottom: i < technicals.indicators.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                    >
                      <div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {ind.name}
                        </span>
                        <span className="text-[10px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                          ({ind.params})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {ind.value.toFixed(2)}
                        </span>
                        <SignalBadge signal={ind.signal} />
                      </div>
                    </div>
                  ))}
                </SectionCard>
              )}

              {/* Pivot Points */}
              {technicals.pivotPoints.length > 0 && (
                <SectionCard title="Pivot Points">
                  {technicals.pivotPoints.map((pp, i) => {
                    const pillColor =
                      pp.type === 'resistance'
                        ? { bg: 'rgba(0,184,148,0.12)', text: 'var(--accent-success)' }
                        : pp.type === 'support'
                          ? { bg: 'rgba(255,82,82,0.12)', text: 'var(--accent-danger)' }
                          : { bg: 'var(--bg-secondary)', text: 'var(--text-muted)' };

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5 px-1"
                        style={{ borderBottom: i < technicals.pivotPoints.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: pillColor.bg, color: pillColor.text }}
                          >
                            {pp.label}
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {pp.description}
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: pillColor.bg, color: pillColor.text, fontFamily: 'var(--font-mono)' }}
                        >
                          {pp.value.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </SectionCard>
              )}

              {/* Moving Averages */}
              {technicals.movingAverages.length > 0 && (
                <SectionCard title="Moving Averages">
                  {technicals.movingAverages.map((ma, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5 px-1"
                      style={{ borderBottom: i < technicals.movingAverages.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                    >
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {ma.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {ma.value.toFixed(2)}
                        </span>
                        <SignalBadge signal={ma.signal} />
                      </div>
                    </div>
                  ))}
                </SectionCard>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab 4: ANNOUNCEMENTS                         */}
      {/* ============================================ */}
      {activeTab === 'announcements' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {companyLoading ? (
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : companyData?.announcements && companyData.announcements.length > 0 ? (
            <div className="space-y-3">
              {companyData.announcements.map((ann: any, i: number) => (
                <div
                  key={i}
                  className="rounded-[16px] p-4 transition-all duration-200"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                        {ann.date || 'N/A'} {ann.time ? `at ${ann.time}` : ''}
                      </p>
                      <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                        {ann.title || ann.description || 'Announcement'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {ann.url && (
                        <a
                          href={ann.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[10px] font-bold transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(108,92,231,0.1)', color: 'var(--accent-primary)' }}
                        >
                          <Eye size={12} /> VIEW
                        </a>
                      )}
                      {ann.pdf_url && (
                        <a
                          href={ann.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[10px] font-bold transition-opacity hover:opacity-80"
                          style={{ background: 'rgba(255,82,82,0.1)', color: 'var(--accent-danger)' }}
                        >
                          <FileText size={12} /> PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTabState
              icon={FileText}
              title="No Announcements"
              message="There are no announcements available for this stock."
            />
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab 5: PROFILE                               */}
      {/* ============================================ */}
      {activeTab === 'profile' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {companyLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : companyData?.profile ? (
            <div className="space-y-5">
              {/* Company header */}
              <div
                className="rounded-[16px] p-5"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <StockLogo symbol={stockData.symbol} size={48} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                      {stockData.symbol}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {stockData.name}
                    </p>
                    {sectorInfo && (
                      <span
                        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                      >
                        {sectorInfo.emoji} {sectorInfo.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Company Background */}
                {companyData.profile.background && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Company Background
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {profileExpanded
                        ? companyData.profile.background
                        : companyData.profile.background.slice(0, 200) +
                          (companyData.profile.background.length > 200 ? '...' : '')}
                    </p>
                    {companyData.profile.background.length > 200 && (
                      <button
                        onClick={() => setProfileExpanded(!profileExpanded)}
                        className="flex items-center gap-1 text-[10px] font-bold mt-1 transition-colors"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {profileExpanded ? 'Show less' : 'Show more'}
                        {profileExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Equity Profile */}
              {companyData.profile.equity && (
                <SectionCard title="Equity Profile">
                  {companyData.profile.equity.market_cap != null && (
                    <FundamentalRow label="Market Cap" value={formatLargeNumber(companyData.profile.equity.market_cap)} />
                  )}
                  {companyData.profile.equity.total_shares != null && (
                    <FundamentalRow label="Total Shares" value={formatLargeNumber(companyData.profile.equity.total_shares)} />
                  )}
                  {companyData.profile.equity.free_float != null && (
                    <FundamentalRow label="Free Float" value={formatLargeNumber(companyData.profile.equity.free_float)} />
                  )}
                  {companyData.profile.equity.free_float_pct != null && (
                    <FundamentalRow label="Free Float %" value={`${companyData.profile.equity.free_float_pct.toFixed(2)}%`} />
                  )}
                </SectionCard>
              )}

              {/* Top Executives */}
              {companyData.profile.executives && (
                <SectionCard title="Top Executives">
                  {companyData.profile.executives.chairperson && (
                    <FundamentalRow label="Chairperson" value={companyData.profile.executives.chairperson} />
                  )}
                  {companyData.profile.executives.ceo && (
                    <FundamentalRow label="CEO" value={companyData.profile.executives.ceo} />
                  )}
                  {companyData.profile.executives.secretary && (
                    <FundamentalRow label="Secretary" value={companyData.profile.executives.secretary} />
                  )}
                </SectionCard>
              )}

              {/* Contact */}
              {companyData.profile.contact && (
                <SectionCard title="Contact">
                  {companyData.profile.contact.address && (
                    <div className="flex items-start gap-2 py-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {companyData.profile.contact.address}
                      </span>
                    </div>
                  )}
                  {companyData.profile.contact.website && (
                    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <div className="flex items-center gap-2">
                        <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {companyData.profile.contact.website}
                        </span>
                      </div>
                      <a
                        href={companyData.profile.contact.website.startsWith('http') ? companyData.profile.contact.website : `https://${companyData.profile.contact.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[10px] font-bold transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(108,92,231,0.1)', color: 'var(--accent-primary)' }}
                      >
                        VISIT <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  {companyData.profile.contact.registrar && (
                    <FundamentalRow label="Registrar" value={companyData.profile.contact.registrar} />
                  )}
                  {companyData.profile.contact.auditor && (
                    <FundamentalRow label="Auditor" value={companyData.profile.contact.auditor} />
                  )}
                </SectionCard>
              )}
            </div>
          ) : (
            <EmptyTabState
              icon={Building2}
              title="Profile Unavailable"
              message="Company profile data is not available for this stock."
            />
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab 6: COMPETITORS                           */}
      {/* ============================================ */}
      {activeTab === 'competitors' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {competitors.length === 0 ? (
            <EmptyTabState
              icon={Users}
              title="No Competitors Found"
              message="No other stocks found in the same sector."
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
                {competitors.length} stocks in {sectorInfo?.name || 'the same sector'}
              </p>
              {competitors.map((comp) => {
                const compPositive = comp.change > 0;
                const compNegative = comp.change < 0;
                const compChangeColor = compPositive
                  ? 'var(--accent-success)'
                  : compNegative
                    ? 'var(--accent-danger)'
                    : 'var(--text-muted)';

                return (
                  <Link
                    key={comp.symbol}
                    href={`/stocks/${comp.symbol}`}
                    className="flex items-center gap-3 p-3 rounded-[12px] transition-all duration-150"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-sm)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <StockLogo symbol={comp.symbol} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                        {comp.symbol}
                      </p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {comp.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {formatPrice(comp.current_price)}
                      </p>
                      <p className="text-[10px] font-semibold" style={{ color: compChangeColor, fontFamily: 'var(--font-mono)' }}>
                        {comp.change_pct >= 0 ? '+' : ''}{comp.change_pct.toFixed(2)}%
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom spacer for mobile nav */}
      <div className="h-24" />
    </div>
  );
}

// ============================================
// Reusable Section Components
// ============================================

/** Card wrapper for content sections */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[16px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}
    >
      <h3
        className="text-sm font-bold mb-3"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

/** Renders a section of fundamental data from the API */
function FundamentalSection({ title, data }: { title: string; data?: Record<string, any> }) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <SectionCard title={title}>
      {Object.entries(data).map(([key, val], i) => {
        // Format the key from snake_case to Title Case
        const label = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        let displayValue: string;
        let isPositive: boolean | null = null;

        if (typeof val === 'number') {
          displayValue = val.toFixed(2);
          if (val > 0) isPositive = true;
          else if (val < 0) isPositive = false;
        } else if (val === null || val === undefined) {
          displayValue = 'N/A';
        } else {
          displayValue = String(val);
        }

        return (
          <FundamentalRow
            key={i}
            label={label}
            value={displayValue}
            isPositive={isPositive}
          />
        );
      })}
    </SectionCard>
  );
}

/** Empty state displayed when tab has no content */
function EmptyTabState({
  icon: Icon,
  title,
  message,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  title: string;
  message: string;
}) {
  return (
    <div className="text-center py-16">
      <Icon size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
        {title}
      </h3>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
    </div>
  );
}
