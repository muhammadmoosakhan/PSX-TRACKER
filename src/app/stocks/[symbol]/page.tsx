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
  { key: 'announcements', label: 'News', icon: FileText },
  { key: 'profile', label: 'Profile', icon: Building2 },
  { key: 'competitors', label: 'Peers', icon: Users },
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

function filterByPeriod(data: StockHistoryPoint[], period: ChartPeriod): StockHistoryPoint[] {
  if (data.length === 0) return [];
  const now = new Date();
  let cutoff: Date;

  switch (period) {
    case '1D':
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

function rangePosition(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// ============================================
// Skeleton
// ============================================

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`skeleton ${className || ''}`} />;
}

// ============================================
// Sub-Components
// ============================================

/** Section header with accent underline divider */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 mt-1">
      <h3
        className="text-[13px] font-bold uppercase tracking-wide pb-2"
        style={{
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-heading)',
          borderBottom: '2.5px solid var(--accent-primary)',
          display: 'inline-block',
        }}
      >
        {title}
      </h3>
    </div>
  );
}

/** Flat stat row — label on left, value on right */
function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px dashed var(--border-light)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <span
        className="text-xs font-bold"
        style={{ color: valueColor || 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
      >
        {value}
      </span>
    </div>
  );
}

/** Dotted range slider with circle dot indicator */
function RangeSlider({
  label,
  low,
  high,
  current,
}: {
  label: string;
  low: number;
  high: number;
  current: number;
}) {
  const pct = rangePosition(current, low, high);

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <div className="relative" style={{ height: 32 }}>
        {/* Current value label above dot */}
        <div
          className="absolute text-[10px] font-bold"
          style={{
            left: `${pct}%`,
            transform: 'translateX(-50%)',
            top: 0,
            color: 'var(--accent-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatPrice(current)}
        </div>

        {/* Dotted line */}
        <div
          className="absolute w-full"
          style={{
            top: 20,
            height: 2,
            backgroundImage: 'radial-gradient(circle, var(--text-muted) 1px, transparent 1px)',
            backgroundSize: '8px 2px',
            backgroundRepeat: 'repeat-x',
            opacity: 0.5,
          }}
        />

        {/* Dot indicator */}
        <div
          className="absolute rounded-full"
          style={{
            left: `${pct}%`,
            top: 16,
            width: 10,
            height: 10,
            transform: 'translateX(-50%)',
            background: 'var(--accent-primary)',
            boxShadow: '0 0 0 3px rgba(108, 92, 231, 0.2)',
          }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {formatPrice(low)}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {formatPrice(high)}
        </span>
      </div>
    </div>
  );
}

/** Solid filled signal badge */
function SignalBadge({ signal }: { signal: 'BUY' | 'SELL' | 'NEUTRAL' }) {
  const styles = {
    BUY: { bg: '#00B894', color: '#fff' },
    SELL: { bg: '#FF5252', color: '#fff' },
    NEUTRAL: { bg: '#9CA3C4', color: '#fff' },
  };
  const s = styles[signal];

  return (
    <span
      className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {signal}
    </span>
  );
}

/** Stock logo with fallback */
function StockLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const logoUrl = getStockLogoUrl(symbol);
  const [imgError, setImgError] = useState(false);

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

/** Chart tooltip */
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
      <p className="font-bold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
        PKR {formatPrice(payload[0].value)}
      </p>
    </div>
  );
}

/** Empty state */
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

  // ---- Loading ----
  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out] max-w-[900px] mx-auto">
        <SkeletonBlock className="h-8 w-8 rounded-full mb-4" />
        <SkeletonBlock className="h-5 w-48 mb-2" />
        <SkeletonBlock className="h-8 w-36 mb-2" />
        <SkeletonBlock className="h-4 w-28 mb-6" />
        <SkeletonBlock className="h-10 w-full mb-4" />
        <SkeletonBlock className="h-[200px] w-full mb-4" />
        <SkeletonBlock className="h-4 w-full mb-2" />
        <SkeletonBlock className="h-4 w-full mb-2" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>
    );
  }

  // ---- Not found ----
  if (!stockData) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out] max-w-[900px] mx-auto text-center py-20">
        <Building2 size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
          Stock Not Found
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Could not find data for &quot;{decodedSymbol}&quot;
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
  // Render
  // ============================================

  return (
    <div className="animate-[fade-in_0.5s_ease-out] max-w-[900px] mx-auto">
      {/* ---- Back + Share ---- */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/stocks"
          className="flex items-center gap-2 text-sm font-medium transition-colors duration-150"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back</span>
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

      {/* ---- Stock Identity ---- */}
      <div className="flex items-center gap-3 mb-2">
        <StockLogo symbol={stockData.symbol} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="text-base font-bold truncate"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
            >
              {stockData.name}
            </h1>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              {stockData.symbol}
            </span>
          </div>
          {sectorInfo && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {sectorInfo.emoji} {sectorInfo.name}
            </span>
          )}
        </div>
      </div>

      {/* ---- Price ---- */}
      <div className="mb-4">
        <p
          className="text-[28px] font-bold leading-tight"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        >
          PKR {formatPrice(stockData.current_price)}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {isPositive && <TrendingUp size={14} style={{ color: changeColor }} />}
          {isNegative && <TrendingDown size={14} style={{ color: changeColor }} />}
          <span className="text-sm font-bold" style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}>
            {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)}
          </span>
          <span className="text-sm font-semibold" style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}>
            ({stockData.change_pct >= 0 ? '+' : ''}{stockData.change_pct.toFixed(2)}%)
          </span>
          <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>
            {new Date(stockData.updated_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ---- Tab Bar ---- */}
      <div
        className="flex gap-0 mb-5 overflow-x-auto hide-scrollbar"
        style={{ borderBottom: '2px solid var(--border-light)' }}
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
                background: isActive ? 'rgba(108, 92, 231, 0.06)' : 'transparent',
                borderRadius: '8px 8px 0 0',
              }}
            >
              <Icon size={13} />
              {tab.label}
              {isActive && (
                <div
                  className="absolute bottom-[-2px] left-0 right-0 h-[2px]"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================ */}
      {/* Tab: LIVE                                    */}
      {/* ============================================ */}
      {activeTab === 'live' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {/* Chart period pills */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
            {CHART_PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className="px-3 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 flex-shrink-0"
                style={{
                  background: chartPeriod === p ? 'var(--accent-primary)' : 'transparent',
                  color: chartPeriod === p ? '#fff' : 'var(--text-muted)',
                  border: chartPeriod === p ? 'none' : '1px solid var(--border-light)',
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="mb-5" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
            {historyLoading ? (
              <SkeletonBlock className="h-[200px] w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
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
                    stroke="var(--accent-primary)"
                    strokeWidth={2}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No chart data</p>
              </div>
            )}
          </div>

          {/* Market Stats */}
          <SectionHeader title="Market Stats" />
          <div className="mb-5">
            <StatRow label="Volume" value={formatVolume(stockData.volume)} />
            <StatRow label="Open" value={formatPrice(stockData.open_price)} />
            <StatRow label="LDCP" value={formatPrice(stockData.ldcp)} />
            <StatRow label="High" value={formatPrice(stockData.high)} />
            <StatRow label="Low" value={formatPrice(stockData.low)} />
            <StatRow
              label="Change"
              value={`${stockData.change >= 0 ? '+' : ''}${stockData.change.toFixed(2)}`}
              valueColor={changeColor}
            />
            <StatRow
              label="Change %"
              value={`${stockData.change_pct >= 0 ? '+' : ''}${stockData.change_pct.toFixed(2)}%`}
              valueColor={changeColor}
            />
          </div>

          {/* Day's Range */}
          <SectionHeader title="Day's Range" />
          <RangeSlider
            label=""
            low={stockData.low}
            high={stockData.high}
            current={stockData.current_price}
          />

          {/* 52-Week Range */}
          {technicals?.weekRange52 && (
            <>
              <SectionHeader title="52-Week Range" />
              <RangeSlider
                label=""
                low={technicals.weekRange52.low}
                high={technicals.weekRange52.high}
                current={stockData.current_price}
              />
            </>
          )}

          {/* Circuit Breakers */}
          {technicals?.circuitBreakers && (
            <>
              <SectionHeader title="Circuit Breakers" />
              <div className="mb-5">
                <StatRow label="Upper Lock" value={formatPrice(technicals.circuitBreakers.upperLock)} valueColor="var(--accent-success)" />
                <StatRow label="Lower Lock" value={formatPrice(technicals.circuitBreakers.lowerLock)} valueColor="var(--accent-danger)" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab: FUNDAMENTALS                            */}
      {/* ============================================ */}
      {activeTab === 'fundamentals' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {companyLoading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-4 w-32 mb-2" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
          ) : companyData?.fundamentals ? (
            <div>
              {/* Render each fundamental section */}
              {[
                { key: 'earnings', title: 'Earnings' },
                { key: 'performance', title: 'Performance' },
                { key: 'payouts', title: 'Payouts' },
                { key: 'valuations', title: 'Valuations' },
                { key: 'financial_health', title: 'Financial Health' },
              ].map(({ key, title }) => {
                const data = companyData.fundamentals[key] as Record<string, any> | undefined;
                if (!data || Object.keys(data).length === 0) return null;

                return (
                  <div key={key} className="mb-5">
                    <SectionHeader title={title} />
                    {Object.entries(data).map(([k, val], i) => {
                      const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                      let displayValue: string;
                      let valueColor: string | undefined;

                      if (typeof val === 'number') {
                        displayValue = val.toFixed(2);
                        if (val > 0) valueColor = 'var(--accent-success)';
                        else if (val < 0) valueColor = 'var(--accent-danger)';
                      } else if (val === null || val === undefined) {
                        displayValue = 'N/A';
                      } else {
                        displayValue = String(val);
                      }

                      return <StatRow key={i} label={label} value={displayValue} valueColor={valueColor} />;
                    })}
                  </div>
                );
              })}
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
      {/* Tab: TECHNICALS                              */}
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
            <div>
              {/* Technical Indicators */}
              {technicals.indicators.length > 0 && (
                <div className="mb-5">
                  <SectionHeader title="Technical Indicators" />
                  {technicals.indicators.map((ind, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: '1px dashed var(--border-light)' }}
                    >
                      <div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {ind.name}
                        </span>
                        <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>
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
                </div>
              )}

              {/* Pivot Points */}
              {technicals.pivotPoints.length > 0 && (
                <div className="mb-5">
                  <SectionHeader title="Pivot Points" />
                  {technicals.pivotPoints.map((pp, i) => {
                    const pillBg =
                      pp.type === 'resistance' ? '#00B894'
                      : pp.type === 'support' ? '#FF5252'
                      : '#9CA3C4';

                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2.5"
                        style={{ borderBottom: '1px dashed var(--border-light)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: pillBg }}
                          >
                            {pp.label}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {pp.description}
                          </span>
                        </div>
                        <span
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white"
                          style={{ background: pillBg, fontFamily: 'var(--font-mono)' }}
                        >
                          {pp.value.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Moving Averages */}
              {technicals.movingAverages.length > 0 && (
                <div className="mb-5">
                  <SectionHeader title="Moving Averages" />
                  {technicals.movingAverages.map((ma, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: '1px dashed var(--border-light)' }}
                    >
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {ma.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {ma.value.toFixed(2)}
                        </span>
                        <SignalBadge signal={ma.signal} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* Tab: ANNOUNCEMENTS (News)                    */}
      {/* ============================================ */}
      {activeTab === 'announcements' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {companyLoading ? (
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
          ) : companyData?.announcements && companyData.announcements.length > 0 ? (
            <div>
              <SectionHeader title="Announcements" />
              {/* Flat list */}
              {companyData.announcements.map((ann: any, i: number) => (
                <div
                  key={i}
                  className="py-3"
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold leading-relaxed mb-1" style={{ color: 'var(--text-primary)' }}>
                        {ann.title || ann.description || 'Announcement'}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {ann.date || 'N/A'} {ann.time ? `at ${ann.time}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {ann.url && (
                        <a
                          href={ann.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-bold transition-opacity hover:opacity-80"
                          style={{ background: 'var(--accent-primary)', color: '#fff' }}
                        >
                          <Eye size={11} /> VIEW
                        </a>
                      )}
                      {ann.pdf_url && (
                        <a
                          href={ann.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-bold transition-opacity hover:opacity-80"
                          style={{ background: 'var(--accent-danger)', color: '#fff' }}
                        >
                          <FileText size={11} /> PDF
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
      {/* Tab: PROFILE                                 */}
      {/* ============================================ */}
      {activeTab === 'profile' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {companyLoading ? (
            <div className="space-y-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
          ) : companyData?.profile ? (
            <div>
              {/* Company Background */}
              {companyData.profile.background && (
                <div className="mb-5">
                  <SectionHeader title="About" />
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
                      className="flex items-center gap-1 text-[11px] font-bold mt-2 transition-colors"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {profileExpanded ? 'Show less' : 'Read more'}
                      {profileExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              )}

              {/* Equity */}
              {companyData.profile.equity && (
                <div className="mb-5">
                  <SectionHeader title="Equity Profile" />
                  {companyData.profile.equity.market_cap != null && (
                    <StatRow label="Market Cap" value={formatLargeNumber(companyData.profile.equity.market_cap)} />
                  )}
                  {companyData.profile.equity.total_shares != null && (
                    <StatRow label="Total Shares" value={formatLargeNumber(companyData.profile.equity.total_shares)} />
                  )}
                  {companyData.profile.equity.free_float != null && (
                    <StatRow label="Free Float" value={formatLargeNumber(companyData.profile.equity.free_float)} />
                  )}
                  {companyData.profile.equity.free_float_pct != null && (
                    <StatRow label="Free Float %" value={`${companyData.profile.equity.free_float_pct.toFixed(2)}%`} />
                  )}
                </div>
              )}

              {/* Executives */}
              {companyData.profile.executives && (
                <div className="mb-5">
                  <SectionHeader title="Executives" />
                  {companyData.profile.executives.chairperson && (
                    <StatRow label="Chairperson" value={companyData.profile.executives.chairperson} />
                  )}
                  {companyData.profile.executives.ceo && (
                    <StatRow label="CEO" value={companyData.profile.executives.ceo} />
                  )}
                  {companyData.profile.executives.secretary && (
                    <StatRow label="Secretary" value={companyData.profile.executives.secretary} />
                  )}
                </div>
              )}

              {/* Contact */}
              {companyData.profile.contact && (
                <div className="mb-5">
                  <SectionHeader title="Contact" />
                  {companyData.profile.contact.address && (
                    <div
                      className="flex items-start gap-2 py-2.5"
                      style={{ borderBottom: '1px dashed var(--border-light)' }}
                    >
                      <MapPin size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {companyData.profile.contact.address}
                      </span>
                    </div>
                  )}
                  {companyData.profile.contact.website && (
                    <div
                      className="flex items-center justify-between py-2.5"
                      style={{ borderBottom: '1px dashed var(--border-light)' }}
                    >
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
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-bold transition-opacity hover:opacity-80"
                        style={{ background: 'var(--accent-primary)', color: '#fff' }}
                      >
                        VISIT <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  {companyData.profile.contact.registrar && (
                    <StatRow label="Registrar" value={companyData.profile.contact.registrar} />
                  )}
                  {companyData.profile.contact.auditor && (
                    <StatRow label="Auditor" value={companyData.profile.contact.auditor} />
                  )}
                </div>
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
      {/* Tab: COMPETITORS (Peers)                     */}
      {/* ============================================ */}
      {activeTab === 'competitors' && (
        <div className="animate-[fade-in_0.3s_ease-out]">
          {competitors.length === 0 ? (
            <EmptyTabState
              icon={Users}
              title="No Peers Found"
              message="No other stocks found in the same sector."
            />
          ) : (
            <div>
              <SectionHeader title={`${sectorInfo?.name || 'Sector'} Peers`} />
              <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
                {competitors.length} stocks in same sector
              </p>
              {competitors.map((comp) => {
                const compPositive = comp.change > 0;
                const compNegative = comp.change < 0;
                const compColor = compPositive
                  ? 'var(--accent-success)'
                  : compNegative
                    ? 'var(--accent-danger)'
                    : 'var(--text-muted)';

                return (
                  <Link
                    key={comp.symbol}
                    href={`/stocks/${comp.symbol}`}
                    className="flex items-center gap-3 py-3 transition-colors duration-150"
                    style={{ borderBottom: '1px solid var(--border-light)' }}
                  >
                    <StockLogo symbol={comp.symbol} size={32} />
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
                      <p className="text-[10px] font-semibold" style={{ color: compColor, fontFamily: 'var(--font-mono)' }}>
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
