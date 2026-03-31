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
  Maximize2,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { getSectorDisplay } from '@/lib/constants';
import { getCompanyName } from '@/lib/psx-companies';
import { getStockLogoUrl } from '@/lib/stock-logos';
import { 
  getAllTechnicals, 
  getMACDChartData, 
  getStochasticChartData, 
  getPriceWithSMAs,
  getPivotPointsRaw,
  computeRSI,
  computeMACD,
  computeSTOCH,
} from '@/lib/technicals';
import type { StockCache, StockHistoryPoint } from '@/types';
import type { StockTechnicals } from '@/lib/technicals';
import { 
  RSIGauge, 
  MACDChart, 
  StochasticChart, 
  PriceMAChart, 
  SupportResistanceChart 
} from '@/components/technicals';

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

/** Clean range slider with thin track and dot indicator */
function RangeSlider({
  low,
  high,
  current,
}: {
  low: number;
  high: number;
  current: number;
}) {
  const pct = rangePosition(current, low, high);
  // Clamp label position so it doesn't overflow at edges
  const labelPct = Math.max(8, Math.min(92, pct));

  return (
    <div className="mb-5 px-1">
      {/* Current value label */}
      <div className="relative mb-2" style={{ height: 16 }}>
        <div
          className="absolute text-[11px] font-bold whitespace-nowrap"
          style={{
            left: `${labelPct}%`,
            transform: 'translateX(-50%)',
            color: 'var(--accent-primary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {formatPrice(current)}
        </div>
      </div>

      {/* Track + dot */}
      <div className="relative" style={{ height: 12 }}>
        {/* Track line */}
        <div
          className="absolute w-full rounded-full"
          style={{
            top: 5,
            height: 3,
            background: 'var(--border-light)',
          }}
        />
        {/* Filled portion */}
        <div
          className="absolute rounded-full"
          style={{
            top: 5,
            height: 3,
            width: `${pct}%`,
            background: 'var(--accent-primary)',
            opacity: 0.4,
          }}
        />
        {/* Dot */}
        <div
          className="absolute rounded-full"
          style={{
            left: `${pct}%`,
            top: 1,
            width: 12,
            height: 12,
            transform: 'translateX(-50%)',
            background: 'var(--accent-primary)',
            boxShadow: '0 0 0 3px rgba(108, 92, 231, 0.2)',
          }}
        />
      </div>

      {/* Low / High labels */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {formatPrice(low)}
        </span>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
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

/** Format a fundamental value for display */
function fmtVal(v: number | null, pct?: boolean): string {
  if (v === null || v === undefined) return '-';
  if (pct) return `${v.toFixed(2)}%`;
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  return v.toFixed(2);
}

/** Color for a numeric value: green positive, red negative */
function valColor(v: number | null): string {
  if (v === null || v === undefined || v === 0) return 'var(--text-primary)';
  return v > 0 ? 'var(--accent-success)' : 'var(--accent-danger)';
}

/** Multi-column metric grid (like EPS 4-col, P/E 2-col, Margins 4-col, etc.) */
function MetricGrid({ items }: { items: { header: string; value: number | null; pct?: boolean }[] }) {
  const valid = items.filter((it) => it.value !== null && it.value !== undefined);
  if (valid.length === 0) return null;

  return (
    <div
      className="grid gap-0 mb-3"
      style={{
        gridTemplateColumns: `repeat(${Math.min(valid.length, 4)}, 1fr)`,
        borderTop: '1px dashed var(--border-light)',
        borderBottom: '1px dashed var(--border-light)',
      }}
    >
      {valid.map((it, i) => (
        <div key={i} className="text-center py-2.5" style={{ borderRight: i < valid.length - 1 ? '1px dashed var(--border-light)' : 'none' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            {it.header}
          </p>
          <p
            className="text-sm font-bold"
            style={{ color: valColor(it.value), fontFamily: 'var(--font-mono)' }}
          >
            {fmtVal(it.value, it.pct)}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Single metric row: label | description | value (right aligned) */
function FundRow({ label, desc, value, pct }: { label: string; desc?: string; value: number | null; pct?: boolean }) {
  if (value === null || value === undefined) return null;
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px dashed var(--border-light)' }}
    >
      <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      {desc && (
        <span className="text-[10px] flex-1 mx-3 text-right" style={{ color: 'var(--text-muted)' }}>
          {desc}
        </span>
      )}
      <span
        className="text-xs font-bold"
        style={{ color: valColor(value), fontFamily: 'var(--font-mono)' }}
      >
        {fmtVal(value, pct)}
      </span>
    </div>
  );
}

/** Fundamentals content matching Investify's multi-column layout */
function FundamentalsContent({ fundamentals: f, announcements }: { fundamentals: any; announcements?: any[] }) {
  // Check if any section has data
  const hasEarnings = f.eps?.annual != null || f.eps?.lastQuarter != null || f.eps?.ytd != null || f.eps?.expected != null;
  const hasPE = f.pe?.annual != null || f.pe?.expected != null;
  const hasMargins = f.profitMargins?.gross != null || f.profitMargins?.operating != null || f.profitMargins?.net != null || f.profitMargins?.ebitda != null;
  const hasReturns = f.returnOn?.roe != null || f.returnOn?.roa != null || f.returnOn?.roce != null;
  const hasDPS = f.dps?.annual != null || f.dps?.lastQuarter != null || f.dps?.lastInterim != null;
  const hasValuations = f.marketCap != null || f.bookValue != null || f.pbv != null || f.enterpriseValue != null;
  const hasHealth = f.currentRatio != null || f.quickRatio != null || f.debtToEquity != null || f.equityToAssets != null;

  // Extract dividend history from announcements
  const dividendHistory = useMemo(() => {
    if (!announcements || announcements.length === 0) return [];
    return announcements
      .filter((a: any) => 
        /dividend|bonus|cash\s+dividend|interim\s+dividend|final\s+dividend/i.test(a.title)
      )
      .slice(0, 10)
      .map((a: any) => {
        // Try to extract dividend amount from title
        const amountMatch = a.title.match(/(?:Rs\.?|PKR)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*%|\(D-?(\d+)\)|dividend\s*@?\s*(\d+(?:\.\d+)?)/i);
        const amount = amountMatch ? (amountMatch[1] || amountMatch[2] || amountMatch[3] || amountMatch[4]) : null;
        
        // Determine dividend type
        let type = 'Cash';
        if (/bonus/i.test(a.title)) type = 'Bonus';
        else if (/interim/i.test(a.title)) type = 'Interim';
        else if (/final/i.test(a.title)) type = 'Final';
        
        return {
          date: a.date,
          title: a.title,
          type,
          amount: amount ? parseFloat(amount) : null,
        };
      });
  }, [announcements]);
  
  const hasDividendHistory = dividendHistory.length > 0;

  const hasAnyData = hasEarnings || hasPE || hasMargins || hasReturns || hasDPS || hasValuations || hasHealth ||
    f.earningGrowth != null || f.pegRatio != null || f.dividendYield != null || hasDividendHistory;

  if (!hasAnyData) return null;

  return (
    <div>
      {/* ---- EARNINGS ---- */}
      {(hasEarnings || hasPE || f.earningGrowth != null || f.pegRatio != null) && (
        <div className="mb-6">
          <SectionHeader title="Earnings" />

          {/* EPS Grid */}
          {hasEarnings && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Earnings Per Share (EPS in Rs.)
              </p>
              <MetricGrid items={[
                { header: 'Annual', value: f.eps?.annual },
                { header: 'Last Quarter', value: f.eps?.lastQuarter },
                { header: 'Year-to-Date', value: f.eps?.ytd },
                { header: 'Expected', value: f.eps?.expected },
              ]} />
            </>
          )}

          {/* P/E Grid */}
          {hasPE && (
            <>
              <p className="text-xs font-semibold mb-1 mt-3" style={{ color: 'var(--text-primary)' }}>
                Price to Earnings Ratio (P/E)
              </p>
              <MetricGrid items={[
                { header: 'Annual', value: f.pe?.annual },
                { header: 'Expected', value: f.pe?.expected },
              ]} />
            </>
          )}

          {/* Single rows */}
          <FundRow label="Exp Earning Growth (%)" value={f.earningGrowth} pct />
          <FundRow label="PEG Ratio" value={f.pegRatio} />
          <FundRow label="Forward PEG Ratio" value={f.forwardPeg} />
        </div>
      )}

      {/* ---- PERFORMANCE ---- */}
      {(hasMargins || hasReturns) && (
        <div className="mb-6">
          <SectionHeader title="Performance" />

          {/* Profit Margins Grid */}
          {hasMargins && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Profit Margin (%)
              </p>
              <MetricGrid items={[
                { header: 'Gross Profit', value: f.profitMargins?.gross, pct: true },
                { header: 'Operating Profit', value: f.profitMargins?.operating, pct: true },
                { header: 'Net Profit', value: f.profitMargins?.net, pct: true },
                { header: 'EBITDA', value: f.profitMargins?.ebitda, pct: true },
              ]} />
            </>
          )}

          {/* Returns Grid */}
          {hasReturns && (
            <>
              <p className="text-xs font-semibold mb-1 mt-3" style={{ color: 'var(--text-primary)' }}>
                Return On (%)
              </p>
              <MetricGrid items={[
                { header: 'Equity (ROE)', value: f.returnOn?.roe, pct: true },
                { header: 'Assets (ROA)', value: f.returnOn?.roa, pct: true },
                { header: 'Cap Employed (ROCE)', value: f.returnOn?.roce, pct: true },
              ]} />
            </>
          )}
        </div>
      )}

      {/* ---- PAYOUTS ---- */}
      {(hasDPS || f.dividendYield != null || f.payoutRatio != null) && (
        <div className="mb-6">
          <SectionHeader title="Payouts" />

          {/* DPS Grid */}
          {hasDPS && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Dividend Per Share (DPS in Rs.)
              </p>
              <MetricGrid items={[
                { header: 'Annual', value: f.dps?.annual },
                { header: 'Last Quarter', value: f.dps?.lastQuarter },
                { header: 'Last Interim', value: f.dps?.lastInterim },
              ]} />
            </>
          )}

          <FundRow label="Dividend Yield (%)" value={f.dividendYield} pct />
          <FundRow label="Dividend Cover" value={f.dividendCover} />
          <FundRow label="Payout Ratio (%)" value={f.payoutRatio} pct />
        </div>
      )}

      {/* ---- DIVIDEND HISTORY ---- */}
      {hasDividendHistory && (
        <div className="mb-6">
          <SectionHeader title="Dividend History" />
          <div className="space-y-2">
            {dividendHistory.map((d: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 px-3 rounded-[10px]"
                style={{ 
                  background: i % 2 === 0 ? 'var(--bg-secondary)' : 'transparent',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: d.type === 'Bonus' ? 'var(--accent-warning)' : 
                                   d.type === 'Final' ? 'var(--accent-success)' :
                                   d.type === 'Interim' ? 'var(--accent-primary)' : 'var(--accent-tertiary)',
                        color: 'white'
                      }}
                    >
                      {d.type}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {d.date}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {d.title.length > 60 ? d.title.slice(0, 60) + '...' : d.title}
                  </p>
                </div>
                {d.amount && (
                  <div className="flex-shrink-0 ml-3 text-right">
                    <span
                      className="text-sm font-bold"
                      style={{ color: 'var(--accent-success)', fontFamily: 'var(--font-mono)' }}
                    >
                      {d.type === 'Bonus' ? `${d.amount}%` : `Rs. ${d.amount}`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            Showing last {dividendHistory.length} dividend announcements
          </p>
        </div>
      )}

      {/* ---- VALUATIONS ---- */}
      {hasValuations && (
        <div className="mb-6">
          <SectionHeader title="Valuations" />
          <FundRow label="Market Cap (Rs.)" value={f.marketCap} />
          <FundRow label="Book Value Per Share (Rs.)" value={f.bookValue} />
          <FundRow label="Price-to-Book Value (PBV)" value={f.pbv} />
          <FundRow label="Enterprise Value (Rs.)" value={f.enterpriseValue} />
        </div>
      )}

      {/* ---- FINANCIAL HEALTH ---- */}
      {hasHealth && (
        <div className="mb-6">
          <SectionHeader title="Financial Health" />
          <FundRow label="Current Ratio" value={f.currentRatio} />
          <FundRow label="Quick Ratio" value={f.quickRatio} />
          <FundRow label="Inventory Turnover (times)" value={f.inventoryTurnover} />
          <FundRow label="Asset Turnover (times)" value={f.assetTurnover} />
          <FundRow label="Equity-to-Assets" value={f.equityToAssets} pct />
          <FundRow label="Debt-to-Equity" value={f.debtToEquity} pct />
          <FundRow label="Debt-to-Assets" value={f.debtToAssets} pct />
        </div>
      )}
    </div>
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
  const [chartExpanded, setChartExpanded] = useState(false);
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
            
            // Try exact match first
            let found = marketJson.stocks.find(
              (s: StockCache) => s.symbol.toUpperCase() === decodedSymbol
            );
            
            if (!found) {
              // Try with common PSX suffixes (XD=ex-dividend, NC=new cert, H=holding, etc.)
              const suffixes = ['XD', 'NC', 'XB', 'XR', 'WU', 'H', 'IM', 'ETF', 'TETF', 'PETF'];
              for (const suffix of suffixes) {
                found = marketJson.stocks.find(
                  (s: StockCache) => s.symbol.toUpperCase() === `${decodedSymbol}${suffix}`
                );
                if (found) break;
              }
            }
            
            if (!found) {
              // Reverse lookup: check if requested symbol is a variant, find base
              // e.g., user requests "HBLXD" but we should match it
              const suffixPattern = /(XD|NC|XB|XR|WU|H|IM|ETF|TETF|PETF)$/i;
              if (suffixPattern.test(decodedSymbol)) {
                found = marketJson.stocks.find(
                  (s: StockCache) => s.symbol.toUpperCase() === decodedSymbol
                );
              }
              // Also try: find any stock that starts with the base symbol
              if (!found) {
                found = marketJson.stocks.find(
                  (s: StockCache) => {
                    const base = s.symbol.replace(suffixPattern, '').toUpperCase();
                    return base === decodedSymbol || s.symbol.toUpperCase().startsWith(decodedSymbol);
                  }
                );
              }
            }
            
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

  // ---- Chart data for enhanced technical visualizations ----
  const macdChartData = useMemo(() => {
    if (history.length < 35) return [];
    return getMACDChartData(history);
  }, [history]);

  const stochChartData = useMemo(() => {
    if (history.length < 20) return [];
    return getStochasticChartData(history);
  }, [history]);

  const priceMAData = useMemo(() => {
    if (history.length < 50) return [];
    return getPriceWithSMAs(history);
  }, [history]);

  const srChartData = useMemo(() => {
    return history.slice(-60).map(d => ({
      date: new Date(d.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
      close: d.close,
      high: d.high,
      low: d.low,
    }));
  }, [history]);

  const pivotPointsRaw = useMemo(() => {
    if (history.length < 1) return null;
    const lastDay = history[history.length - 1];
    return getPivotPointsRaw(lastDay.high, lastDay.low, lastDay.close);
  }, [history]);

  // Individual indicator values for charts
  const rsiData = useMemo(() => {
    if (history.length < 15) return null;
    return computeRSI(history.map(d => d.close));
  }, [history]);

  const macdData = useMemo(() => {
    if (history.length < 35) return null;
    return computeMACD(history.map(d => d.close));
  }, [history]);

  const stochData = useMemo(() => {
    if (history.length < 20) return null;
    return computeSTOCH(
      history.map(d => d.high),
      history.map(d => d.low),
      history.map(d => d.close)
    );
  }, [history]);

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
              navigator.share({ title: `${getCompanyName(stockData.symbol, stockData.name)} (${stockData.symbol})`, url: window.location.href });
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
              {getCompanyName(stockData.symbol, stockData.name !== stockData.symbol ? stockData.name : undefined)}
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
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
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
            <button
              onClick={() => setChartExpanded(true)}
              className="ml-auto p-1.5 rounded-lg transition-all duration-200 flex-shrink-0"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
              title="Expand chart"
            >
              <Maximize2 size={14} />
            </button>
          </div>

          {/* Chart */}
          <div
            className="mb-5 cursor-pointer"
            style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}
            onClick={() => setChartExpanded(true)}
          >
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} />
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
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Chart data not available on PSX Data Portal</p>
              </div>
            )}
          </div>

          {/* Expanded Chart Modal */}
          {chartExpanded && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center animate-[fade-in_0.15s_ease-out]"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setChartExpanded(false)}
            >
              <div
                className="w-[95vw] max-w-[900px] rounded-2xl p-4 sm:p-6"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-lg)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                      {decodedSymbol} Price Chart
                    </h3>
                    {stockData && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        PKR {formatPrice(stockData.current_price)}
                        <span className="ml-2" style={{ color: stockData.change >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                          {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.change_pct.toFixed(2)}%)
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setChartExpanded(false)}
                    className="p-2 rounded-xl transition-all duration-200 hover:opacity-80"
                    style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Period pills */}
                <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
                  {CHART_PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      className="px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 flex-shrink-0"
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

                {/* Expanded chart */}
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="chartGradientExpanded" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.4} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={{ stroke: 'var(--border-light)' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                        axisLine={{ stroke: 'var(--border-light)' }}
                        tickLine={false}
                        tickFormatter={(v) => `${v.toFixed(0)}`}
                        width={55}
                      />
                      <Tooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="var(--accent-primary)"
                        strokeWidth={2}
                        fill="url(#chartGradientExpanded)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[400px]">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No chart data available</p>
                  </div>
                )}
              </div>
            </div>
          )}

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
            low={stockData.low}
            high={stockData.high}
            current={stockData.current_price}
          />

          {/* 52-Week Range */}
          {technicals?.weekRange52 && (
            <>
              <SectionHeader title="52-Week Range" />
              <RangeSlider
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
            <FundamentalsContent fundamentals={companyData.fundamentals} announcements={companyData.announcements} />
          ) : (
            <EmptyTabState
              icon={BarChart3}
              title="Fundamentals Unavailable"
              message="This data is not published on the PSX Data Portal for this stock."
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
              message="Not enough historical data available on PSX to compute technical indicators."
            />
          ) : (
            <div className="space-y-6">
              {/* RSI Gauge */}
              {rsiData && (
                <div className="p-4 rounded-[12px]" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                  <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>RSI (Relative Strength Index)</h3>
                  <RSIGauge value={rsiData.value} signal={rsiData.signal} />
                </div>
              )}

              {/* MACD Chart */}
              {macdData && macdChartData.length > 0 && (
                <MACDChart 
                  data={macdChartData}
                  currentMACD={macdData.macd}
                  currentSignal={macdData.signal}
                  currentHistogram={macdData.histogram}
                  tradeSignal={macdData.tradeSignal}
                />
              )}

              {/* Stochastic Chart */}
              {stochData && stochChartData.length > 0 && (
                <StochasticChart 
                  data={stochChartData}
                  currentK={stochData.k}
                  currentD={stochData.d}
                  signal={stochData.signal}
                />
              )}

              {/* Price vs Moving Averages */}
              {priceMAData.length > 0 && technicals.movingAverages.length > 0 && (
                <PriceMAChart 
                  data={priceMAData.map(d => ({
                    ...d,
                    date: new Date(d.date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' }),
                  }))}
                  currentPrice={stockData.current_price}
                  movingAverages={technicals.movingAverages}
                />
              )}

              {/* Support & Resistance */}
              {pivotPointsRaw && srChartData.length > 0 && (
                <SupportResistanceChart 
                  data={srChartData}
                  currentPrice={stockData.current_price}
                  pivotPoints={pivotPointsRaw}
                  week52={technicals.weekRange52 || undefined}
                />
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
            <div className="space-y-3">
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
              <SkeletonBlock className="h-12 w-full" />
            </div>
          ) : companyData?.announcements && companyData.announcements.length > 0 ? (
            <div>
              {/* Header bar */}
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-t-[8px] mb-0"
                style={{ background: 'var(--accent-primary)' }}
              >
                <span className="text-xs font-bold text-white uppercase tracking-wide">
                  All Announcements
                </span>
              </div>

              {/* Announcement list */}
              {companyData.announcements.map((ann: any, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-3 px-1"
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                >
                  {/* Date + Time */}
                  <div className="flex-shrink-0 w-[80px]">
                    <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {ann.date || 'N/A'}
                    </p>
                    {ann.time && (
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {ann.time}
                      </p>
                    )}
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--accent-primary)' }}>
                      {ann.title || ann.description || 'Announcement'}
                    </p>
                  </div>

                  {/* Action icons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(ann.viewUrl || ann.url) && (
                      <a
                        href={ann.viewUrl || ann.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
                        title="View"
                      >
                        <Eye size={18} style={{ color: '#3B82F6' }} />
                        <span className="text-[8px] font-bold" style={{ color: '#3B82F6' }}>VIEW</span>
                      </a>
                    )}
                    {(ann.pdfUrl || ann.pdf_url) && (
                      <a
                        href={ann.pdfUrl || ann.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
                        title="Download PDF"
                      >
                        <FileText size={18} style={{ color: '#EF4444' }} />
                        <span className="text-[8px] font-bold" style={{ color: '#EF4444' }}>PDF</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        const url = ann.viewUrl || ann.pdfUrl || ann.url || ann.pdf_url;
                        if (url) {
                          if (navigator.share) {
                            navigator.share({ title: ann.title, url });
                          } else {
                            navigator.clipboard.writeText(url);
                          }
                        }
                      }}
                      className="flex flex-col items-center gap-0.5 transition-opacity hover:opacity-70"
                      title="Share"
                    >
                      <Share2 size={16} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTabState
              icon={FileText}
              title="No Announcements"
              message="No announcements published on the PSX Data Portal for this stock."
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
            <div className="space-y-3">
              <SkeletonBlock className="h-16 w-full" />
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-3/4" />
            </div>
          ) : companyData?.profile ? (() => {
            const p = companyData.profile;
            const desc = p.description || p.background || '';
            return (
              <div>
                {/* Company header card */}
                <div className="flex items-start gap-4 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <StockLogo symbol={stockData.symbol} size={56} />
                  <div className="flex-1">
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                      <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Symbol</span>
                      <span className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>{stockData.symbol}</span>
                      <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Name</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>{getCompanyName(stockData.symbol, stockData.name !== stockData.symbol ? stockData.name : undefined)}</span>
                      <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Sector</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                        {sectorInfo ? `${sectorInfo.emoji} ${sectorInfo.name}` : stockData.sector}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Company Background */}
                {desc && (
                  <div className="mb-6">
                    <SectionHeader title="Company Background" />
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {profileExpanded
                        ? desc
                        : desc.slice(0, 200) + (desc.length > 200 ? ' ...' : '')}
                      {desc.length > 200 && !profileExpanded && (
                        <button
                          onClick={() => setProfileExpanded(true)}
                          className="inline text-[11px] font-bold ml-1 transition-colors"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          more
                        </button>
                      )}
                    </p>
                    {desc.length > 200 && profileExpanded && (
                      <button
                        onClick={() => setProfileExpanded(false)}
                        className="flex items-center gap-1 text-[11px] font-bold mt-2 transition-colors"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        Show less <ChevronUp size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Equity Profile */}
                {(p.marketCap != null || p.totalShares != null || p.freeFloat != null || p.freeFloatPct != null) && (
                  <div className="mb-6">
                    <SectionHeader title="Equity Profile" />
                    {p.marketCap != null && (
                      <StatRow label="Market Cap (Rs.)" value={Number(p.marketCap).toLocaleString('en-PK')} valueColor="var(--accent-primary)" />
                    )}
                    {p.totalShares != null && (
                      <StatRow label="Total Shares" value={Number(p.totalShares).toLocaleString('en-PK')} valueColor="var(--accent-primary)" />
                    )}
                    {p.freeFloat != null && (
                      <StatRow label="Free Float" value={Number(p.freeFloat).toLocaleString('en-PK')} valueColor="var(--accent-primary)" />
                    )}
                    {p.freeFloatPct != null && (
                      <StatRow label="Free Float (%)" value={`${Number(p.freeFloatPct).toFixed(0)}%`} valueColor="var(--accent-primary)" />
                    )}
                  </div>
                )}

                {/* Top Executives */}
                {(p.chairperson || p.ceo || p.secretary) && (
                  <div className="mb-6">
                    <SectionHeader title="Top Executives" />
                    {p.chairperson && <StatRow label="Chairperson" value={p.chairperson} />}
                    {p.ceo && <StatRow label="CEO" value={p.ceo} />}
                    {p.secretary && <StatRow label="Company Secretary" value={p.secretary} />}
                  </div>
                )}

                {/* Contact Information */}
                {(p.address || p.website || p.registrar || p.auditor) && (
                  <div className="mb-6">
                    <SectionHeader title="Contact Information" />
                    {p.address && (
                      <div
                        className="flex items-start gap-3 py-2.5"
                        style={{ borderBottom: '1px dashed var(--border-light)' }}
                      >
                        <span className="text-xs font-bold flex-shrink-0 min-w-[60px]" style={{ color: 'var(--text-primary)' }}>Address</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.address}
                        </span>
                      </div>
                    )}
                    {p.website && /^(https?:\/\/|www\.)/i.test(p.website) && (
                      <div
                        className="flex items-center justify-between py-2.5"
                        style={{ borderBottom: '1px dashed var(--border-light)' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>Website</span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {p.website}
                          </span>
                        </div>
                        <a
                          href={p.website.startsWith('http') ? p.website : `https://${p.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[11px] font-bold transition-opacity hover:opacity-80 flex-shrink-0"
                          style={{ background: 'var(--accent-primary)', color: '#fff' }}
                        >
                          VISIT WEBSITE
                        </a>
                      </div>
                    )}
                    {p.registrar && (
                      <div
                        className="flex items-start gap-3 py-2.5"
                        style={{ borderBottom: '1px dashed var(--border-light)' }}
                      >
                        <span className="text-xs font-bold flex-shrink-0 min-w-[60px]" style={{ color: 'var(--text-primary)' }}>Registrar</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.registrar}
                        </span>
                      </div>
                    )}
                    {p.auditor && (
                      <div
                        className="flex items-start gap-3 py-2.5"
                        style={{ borderBottom: '1px dashed var(--border-light)' }}
                      >
                        <span className="text-xs font-bold flex-shrink-0 min-w-[60px]" style={{ color: 'var(--text-primary)' }}>Auditor</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {p.auditor}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })() : (
            <EmptyTabState
              icon={Building2}
              title="Profile Unavailable"
              message="Company profile data is not available on the PSX Data Portal for this stock."
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
              message="No other stocks found in the same sector on PSX."
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
                        {getCompanyName(comp.symbol, comp.name !== comp.symbol ? comp.name : undefined)}
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
