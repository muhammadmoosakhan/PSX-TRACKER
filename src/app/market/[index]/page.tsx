'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatNumber } from '@/lib/formatters';
import type { PSXIndex, IndexTickPoint } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChartPoint {
  time: string;
  value: number;
  volume: number;
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
    return { time, value: point.value, volume: point.volume };
  });
}

/** Check whether PSX is currently open (Mon-Fri, 9:30 - 15:30 PKT) */
function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to PKT (UTC+5)
  const utc = now.getTime() + now.getTimezoneOffset() * 60_000;
  const pkt = new Date(utc + 5 * 60 * 60_000);

  const day = pkt.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hours = pkt.getHours();
  const minutes = pkt.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // 9:30 = 570 min, 15:30 = 930 min
  return timeInMinutes >= 570 && timeInMinutes <= 930;
}

// ---------------------------------------------------------------------------
// Custom Chart Tooltip
// ---------------------------------------------------------------------------

function DetailTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
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
        <p
          className="text-xs mb-1.5 font-medium"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </p>
      )}
      <span
        className="font-mono-numbers font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
      >
        {formatIndexValue(payload[0].value)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intraday Chart
// ---------------------------------------------------------------------------

function IntradayChart({
  data,
  isPositive,
}: {
  data: ChartPoint[];
  isPositive: boolean;
}) {
  const color = isPositive ? 'var(--accent-success)' : 'var(--accent-danger)';
  const gradientId = 'detail-gradient';

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isPositive ? '#00B894' : '#FF5252'}
              stopOpacity={0.25}
            />
            <stop
              offset="100%"
              stopColor={isPositive ? '#00B894' : '#FF5252'}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        <YAxis
          domain={['dataMin - 50', 'dataMax + 50']}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
            return String(v);
          }}
        />
        <Tooltip content={<DetailTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{
            r: 6,
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
// Market Status Badge
// ---------------------------------------------------------------------------

function MarketStatusBadge() {
  const open = isMarketOpen();

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] text-xs font-semibold"
      style={{
        background: open
          ? 'rgba(0, 184, 148, 0.1)'
          : 'rgba(255, 82, 82, 0.1)',
        color: open ? 'var(--accent-success)' : 'var(--accent-danger)',
      }}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: open ? 'var(--accent-success)' : 'var(--accent-danger)',
          boxShadow: open
            ? '0 0 6px rgba(0, 184, 148, 0.5)'
            : '0 0 6px rgba(255, 82, 82, 0.5)',
        }}
      />
      {open ? 'Market Open' : 'Market Closed'}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day Range Bar
// ---------------------------------------------------------------------------

function DayRangeBar({
  low,
  high,
  current,
}: {
  low: number;
  high: number;
  current: number;
}) {
  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;
  const clampedPosition = Math.max(0, Math.min(100, position));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Day Low
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
        >
          Day&apos;s Range
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Day High
        </span>
      </div>

      {/* Range bar container */}
      <div className="relative w-full h-2 rounded-full overflow-hidden mb-2"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {/* Filled portion up to current */}
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            width: `${clampedPosition}%`,
            background: 'linear-gradient(90deg, var(--accent-danger), var(--accent-primary), var(--accent-success))',
            transition: 'width 0.6s ease-out',
          }}
        />
        {/* Current position marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2"
          style={{
            left: `${clampedPosition}%`,
            transform: `translate(-50%, -50%)`,
            background: 'var(--bg-card)',
            borderColor: 'var(--accent-primary)',
            boxShadow: 'var(--shadow-md)',
            transition: 'left 0.6s ease-out',
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-danger)' }}
        >
          {formatIndexValue(low)}
        </span>
        <span
          className="text-sm font-bold"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}
        >
          {formatIndexValue(current)}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-success)' }}
        >
          {formatIndexValue(high)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  valueColor,
  delay,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  valueColor?: string;
  delay: number;
}) {
  return (
    <Card
      className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <Icon size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p
        className="text-lg font-bold"
        style={{
          fontFamily: 'var(--font-mono)',
          color: valueColor ?? 'var(--text-primary)',
        }}
      >
        {value}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      {/* Back button skeleton */}
      <div className="mb-4">
        <div
          className="w-24 h-8 rounded-[10px]"
          style={{ background: 'var(--bg-secondary)' }}
        />
      </div>
      <PageHeader title="Loading..." subtitle="Fetching index data" />
      {/* Chart skeleton */}
      <div className="mb-6">
        <SkeletonCard />
        <div className="mt-4">
          <SkeletonCard />
        </div>
      </div>
      {/* Stats skeletons */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <div className="mb-4">
        <Link href="/market">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} /> Back to Market
          </Button>
        </Link>
      </div>
      <Card hoverable={false} className="text-center py-12">
        <Activity
          size={40}
          className="mx-auto mb-4"
          style={{ color: 'var(--text-muted)' }}
        />
        <h3
          className="text-lg font-semibold mb-2"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
          }}
        >
          Unable to Load Index Data
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
// Index Detail Page
// ---------------------------------------------------------------------------

export default function IndexDetailPage({
  params,
}: {
  params: Promise<{ index: string }>;
}) {
  const { index: indexParam } = React.use(params);
  const indexName = decodeURIComponent(indexParam);

  const [indexData, setIndexData] = useState<PSXIndex | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch index summary data
  // -----------------------------------------------------------------------

  const fetchIndexData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        setError(null);

        const res = await fetch('/api/psx/indices');
        if (!res.ok) throw new Error(`Server error (${res.status})`);

        const json: IndicesResponse = await res.json();
        const found = json.indices?.find(
          (idx) => idx.name.toUpperCase() === indexName.toUpperCase()
        );

        if (!found) {
          throw new Error(`Index "${indexName}" not found`);
        }

        setIndexData(found);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch index data';
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [indexName]
  );

  // -----------------------------------------------------------------------
  // Fetch intraday timeseries
  // -----------------------------------------------------------------------

  const fetchChart = useCallback(async () => {
    try {
      setChartLoading(true);
      const res = await fetch(`/api/psx/indices/${encodeURIComponent(indexName)}`);
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
  }, [indexName]);

  // -----------------------------------------------------------------------
  // Initial fetch
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchIndexData();
    fetchChart();
  }, [fetchIndexData, fetchChart]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const isPositive = (indexData?.change ?? 0) >= 0;
  const changeColor = isPositive
    ? 'var(--accent-success)'
    : 'var(--accent-danger)';

  // -----------------------------------------------------------------------
  // Refresh handler
  // -----------------------------------------------------------------------

  const handleRefresh = () => {
    fetchIndexData(true);
    fetchChart();
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => fetchIndexData()} />;
  if (!indexData) return <ErrorState message="No data available" onRetry={() => fetchIndexData()} />;

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      {/* ================================================================= */}
      {/* Navigation & Header                                                */}
      {/* ================================================================= */}
      <div className="mb-4">
        <Link href="/market">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} /> Back to Market
          </Button>
        </Link>
      </div>

      <PageHeader
        title={indexData.name}
        subtitle="Pakistan Stock Exchange"
        action={
          <div className="flex items-center gap-3">
            <MarketStatusBadge />
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

      {/* ================================================================= */}
      {/* Hero: Current Value & Change                                       */}
      {/* ================================================================= */}
      <Card
        hoverable={false}
        className="mb-6 animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          {/* Value */}
          <div>
            <p
              className="text-xs font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Current Value
            </p>
            <p
              className="text-3xl sm:text-4xl lg:text-5xl font-bold"
              style={{
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
              }}
            >
              {formatIndexValue(indexData.current)}
            </p>
          </div>

          {/* Change badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-[10px]"
              style={{
                background: isPositive
                  ? 'rgba(0, 184, 148, 0.12)'
                  : 'rgba(255, 82, 82, 0.12)',
                color: changeColor,
              }}
            >
              {isPositive ? (
                <ArrowUpRight size={18} />
              ) : (
                <ArrowDownRight size={18} />
              )}
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatChange(indexData.change)}
              </span>
            </div>
            <div
              className="flex items-center gap-1 px-3 py-2 rounded-[10px]"
              style={{
                background: isPositive
                  ? 'rgba(0, 184, 148, 0.12)'
                  : 'rgba(255, 82, 82, 0.12)',
                color: changeColor,
              }}
            >
              {isPositive ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span className="text-sm font-bold">
                {formatChangePct(indexData.change_pct)}
              </span>
            </div>
          </div>
        </div>

        {/* Intraday chart */}
        {chartLoading ? (
          <div
            className="flex items-center justify-center rounded-[12px]"
            style={{
              height: 320,
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
          <IntradayChart data={chartData} isPositive={isPositive} />
        ) : (
          <div
            className="flex items-center justify-center rounded-[12px]"
            style={{
              height: 320,
              background: 'var(--bg-secondary)',
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <BarChart3
                size={24}
                style={{ color: 'var(--text-muted)' }}
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Intraday chart data unavailable
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ================================================================= */}
      {/* Index Stats Grid                                                   */}
      {/* ================================================================= */}
      <h2
        className="text-lg font-semibold mb-4 animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
        style={{
          fontFamily: 'var(--font-heading)',
          color: 'var(--text-primary)',
          animationDelay: '100ms',
        }}
      >
        Index Statistics
      </h2>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 mb-6">
        <StatCard
          label="Current Value"
          value={formatIndexValue(indexData.current)}
          icon={Activity}
          delay={150}
        />
        <StatCard
          label="Change"
          value={formatChange(indexData.change)}
          icon={isPositive ? TrendingUp : TrendingDown}
          valueColor={changeColor}
          delay={200}
        />
        <StatCard
          label="Change %"
          value={formatChangePct(indexData.change_pct)}
          icon={isPositive ? ArrowUpRight : ArrowDownRight}
          valueColor={changeColor}
          delay={250}
        />
        <StatCard
          label="Day High"
          value={formatIndexValue(indexData.high)}
          icon={TrendingUp}
          valueColor="var(--accent-success)"
          delay={300}
        />
        <StatCard
          label="Day Low"
          value={formatIndexValue(indexData.low)}
          icon={TrendingDown}
          valueColor="var(--accent-danger)"
          delay={350}
        />
        {indexData.volume > 0 && (
          <StatCard
            label="Volume"
            value={formatVolume(indexData.volume)}
            icon={BarChart3}
            delay={400}
          />
        )}
      </div>

      {/* ================================================================= */}
      {/* Day's Range                                                        */}
      {/* ================================================================= */}
      <Card
        hoverable={false}
        className="mb-6 animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
        style={{ animationDelay: '450ms' }}
      >
        <h3
          className="text-sm font-semibold mb-4"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
          }}
        >
          Day&apos;s Range
        </h3>
        <DayRangeBar
          low={indexData.low}
          high={indexData.high}
          current={indexData.current}
        />
      </Card>

      {/* ================================================================= */}
      {/* Last Updated                                                       */}
      {/* ================================================================= */}
      {indexData.updated_at && (
        <p
          className="text-xs text-center mt-4 mb-2 animate-[fade-in_0.5s_ease-out]"
          style={{ color: 'var(--text-muted)' }}
        >
          Last updated:{' '}
          {new Date(indexData.updated_at).toLocaleString('en-PK', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}
    </div>
  );
}
