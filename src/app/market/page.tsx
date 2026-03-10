'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Activity } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import type { PSXIndex, IndexTickPoint } from '@/types';
import { formatNumber } from '@/lib/formatters';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChartPoint {
  time: string;
  value: number;
}

interface IndicesResponse {
  indices: PSXIndex[];
  count: number;
  updated_at: string;
}

interface TimeseriesResponse {
  index: string;
  data: IndexTickPoint[];
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatIndexValue(value: number): string {
  return value.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatChangePct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return formatNumber(vol);
}

function transformTickData(data: IndexTickPoint[]): ChartPoint[] {
  return data.map((point) => {
    const d = new Date(point.timestamp);
    const time = d.toLocaleTimeString('en-PK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return { time, value: point.value };
  });
}

// ---------------------------------------------------------------------------
// Custom Chart Tooltip
// ---------------------------------------------------------------------------

function MarketTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-[12px] px-4 py-3 text-sm"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {label && (
        <p className="text-xs mb-1.5 font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
      )}
      <span
        className="font-mono-numbers font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {formatIndexValue(payload[0].value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero Chart (KSE 100)
// ---------------------------------------------------------------------------

function HeroChart({
  data,
  isPositive,
}: {
  data: ChartPoint[];
  isPositive: boolean;
}) {
  const color = isPositive ? 'var(--accent-success)' : 'var(--accent-danger)';
  const gradientId = 'hero-gradient';

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isPositive ? '#00B894' : '#FF5252'} stopOpacity={0.25} />
            <stop offset="100%" stopColor={isPositive ? '#00B894' : '#FF5252'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          domain={['dataMin - 50', 'dataMax + 50']}
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={60}
          tickFormatter={(v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
            return String(v);
          }}
        />
        <Tooltip content={<MarketTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 5,
            fill: isPositive ? '#00B894' : '#FF5252',
            stroke: '#fff',
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Index Card
// ---------------------------------------------------------------------------

function IndexCard({
  index,
  delay,
}: {
  index: PSXIndex;
  delay: number;
}) {
  const isPositive = index.change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const changeColor = isPositive ? 'var(--accent-success)' : 'var(--accent-danger)';

  return (
    <Card
      className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3
            className="text-sm font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            {index.name}
          </h3>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-[8px]"
          style={{
            background: isPositive
              ? 'rgba(0, 184, 148, 0.1)'
              : 'rgba(255, 82, 82, 0.1)',
            color: changeColor,
          }}
        >
          <Icon size={12} />
          <span className="text-xs font-semibold">
            {formatChangePct(index.change_pct)}
          </span>
        </div>
      </div>

      {/* Value */}
      <p
        className="text-xl font-bold mb-2"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
        }}
      >
        {formatIndexValue(index.current)}
      </p>

      {/* Change */}
      <p className="text-sm mb-3" style={{ color: changeColor }}>
        {formatChange(index.change)}
      </p>

      {/* High / Low range */}
      <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div>
          <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>
            High
          </span>
          <span
            className="text-xs font-semibold"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
          >
            {formatIndexValue(index.high)}
          </span>
        </div>
        <div>
          <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>
            Low
          </span>
          <span
            className="text-xs font-semibold"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
          >
            {formatIndexValue(index.low)}
          </span>
        </div>
        {index.volume > 0 && (
          <div className="ml-auto">
            <span className="text-xs block text-right" style={{ color: 'var(--text-muted)' }}>
              Volume
            </span>
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
            >
              {formatVolume(index.volume)}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Market" subtitle="PSX Market Indices" />
      {/* Hero skeleton */}
      <div className="mb-6">
        <SkeletonCard />
      </div>
      {/* Grid skeletons */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Market" subtitle="PSX Market Indices" />
      <Card hoverable={false} className="text-center py-12">
        <Activity size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
        <h3
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Unable to Load Market Data
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
        <Button variant="primary" size="md" onClick={onRetry}>
          <RefreshCw size={14} /> Try Again
        </Button>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Market Page
// ---------------------------------------------------------------------------

export default function MarketPage() {
  const [indices, setIndices] = useState<PSXIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // KSE100 intraday chart data
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  // -----------------------------------------------------------------------
  // Fetch indices
  // -----------------------------------------------------------------------

  const fetchIndices = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      setError(null);

      const res = await fetch('/api/psx/indices');
      if (!res.ok) throw new Error(`Server error (${res.status})`);

      const json: IndicesResponse = await res.json();
      setIndices(json.indices ?? []);
      setUpdatedAt(json.updated_at ?? null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch market data';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fetch KSE100 intraday timeseries
  // -----------------------------------------------------------------------

  const fetchKSE100Chart = useCallback(async () => {
    try {
      setChartLoading(true);
      const res = await fetch('/api/psx/indices/KSE100');
      if (!res.ok) return;

      const json: TimeseriesResponse = await res.json();
      if (json.data?.length > 0) {
        setChartData(transformTickData(json.data));
      }
    } catch {
      // Chart failure is non-critical; silently degrade
    } finally {
      setChartLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Initial fetch
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchIndices();
    fetchKSE100Chart();
  }, [fetchIndices, fetchKSE100Chart]);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const kse100 = indices.find(
    (idx) => idx.name.toUpperCase().includes('KSE100') || idx.name.toUpperCase().includes('KSE 100')
  );
  const otherIndices = indices.filter((idx) => idx !== kse100);
  const kse100Positive = (kse100?.change ?? 0) >= 0;

  const timeSince = updatedAt
    ? `Updated ${Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000)} min ago`
    : '';

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => fetchIndices()} />;

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader
        title="Market"
        subtitle="PSX Market Indices"
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
              onClick={() => {
                fetchIndices(true);
                fetchKSE100Chart();
              }}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>
        }
      />

      {/* ================================================================= */}
      {/* Hero — KSE 100 Index                                              */}
      {/* ================================================================= */}
      {kse100 && (
        <Card
          hoverable={false}
          className="mb-6 animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8">
            {/* Left: Value info */}
            <div className="flex-shrink-0 mb-4 lg:mb-0 lg:min-w-[260px]">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
                <h2
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
                >
                  {kse100.name}
                </h2>
              </div>

              {/* Current value */}
              <p
                className="text-3xl sm:text-4xl font-bold mt-2 mb-2"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              >
                {formatIndexValue(kse100.current)}
              </p>

              {/* Change badge */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px]"
                  style={{
                    background: kse100Positive
                      ? 'rgba(0, 184, 148, 0.12)'
                      : 'rgba(255, 82, 82, 0.12)',
                    color: kse100Positive ? 'var(--accent-success)' : 'var(--accent-danger)',
                  }}
                >
                  {kse100Positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span className="text-sm font-bold">
                    {formatChange(kse100.change)}
                  </span>
                  <span className="text-sm font-semibold">
                    ({formatChangePct(kse100.change_pct)})
                  </span>
                </div>
              </div>

              {/* High / Low / Volume */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                    High
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                  >
                    {formatIndexValue(kse100.high)}
                  </span>
                </div>
                <div>
                  <span className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                    Low
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                  >
                    {formatIndexValue(kse100.low)}
                  </span>
                </div>
                {kse100.volume > 0 && (
                  <div>
                    <span className="text-xs block mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Volume
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}
                    >
                      {formatVolume(kse100.volume)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Intraday chart */}
            <div className="flex-1 min-w-0">
              {chartLoading ? (
                <div
                  className="flex items-center justify-center rounded-[12px]"
                  style={{
                    height: 200,
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw
                      size={20}
                      className="animate-spin"
                      style={{ color: 'var(--text-muted)' }}
                    />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Loading chart...
                    </span>
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <HeroChart data={chartData} isPositive={kse100Positive} />
              ) : (
                <div
                  className="flex items-center justify-center rounded-[12px]"
                  style={{
                    height: 200,
                    background: 'var(--bg-secondary)',
                  }}
                >
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Intraday chart unavailable
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ================================================================= */}
      {/* Other Indices Grid                                                 */}
      {/* ================================================================= */}
      {otherIndices.length > 0 && (
        <>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            All Indices
          </h2>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {otherIndices.map((idx, i) => (
              <IndexCard key={idx.name} index={idx} delay={100 + i * 60} />
            ))}
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* Empty state — no indices returned                                  */}
      {/* ================================================================= */}
      {indices.length === 0 && (
        <Card hoverable={false} className="text-center py-12">
          <Activity size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3
            className="text-lg font-semibold mb-2"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            No Index Data Available
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Market data is currently unavailable. The PSX may be closed or data feeds may be offline.
          </p>
        </Card>
      )}
    </div>
  );
}
