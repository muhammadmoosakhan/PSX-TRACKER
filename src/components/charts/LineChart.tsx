'use client';

import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  LabelList,
} from 'recharts';
import ChartTooltip from './ChartTooltip';

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  formatter?: 'pkr' | 'percent' | 'number';
  showArea?: boolean;
}

function formatValue(v: number, formatter: 'pkr' | 'percent' | 'number'): string {
  if (formatter === 'percent') return `${v.toFixed(1)}%`;
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function LineChartComponent({
  data,
  xKey,
  yKey,
  color = '#6C5CE7',
  height = 300,
  formatter = 'pkr',
  showArea = true,
}: Readonly<LineChartProps>) {
  const hasLimitedData = data.length <= 1;
  const hasNoData = data.length === 0;

  if (hasNoData) {
    return (
      <div className="flex items-center justify-center" style={{ height, color: 'var(--text-muted)' }}>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: hasLimitedData ? 30 : 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id={`gradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--text-muted)" strokeWidth={0.6} opacity={0.35} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--border-light)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={65}
          tickFormatter={(v: number) => {
            if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
            if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
            return String(v);
          }}
        />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        {showArea && !hasLimitedData && (
          <Area
            type="monotone"
            dataKey={yKey}
            stroke="none"
            fill={`url(#gradient-${yKey})`}
          />
        )}
        <Line
          type="monotone"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2.5}
          dot={hasLimitedData ? { r: 8, fill: color, stroke: '#fff', strokeWidth: 3 } : false}
          activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
        >
          {hasLimitedData && (
            <LabelList
              dataKey={yKey}
              position="top"
              offset={12}
              formatter={(v) => formatValue(Number(v), formatter)}
              style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
            />
          )}
        </Line>
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
