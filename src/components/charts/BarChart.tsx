'use client';

import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import ChartTooltip from './ChartTooltip';

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  color?: string;
  height?: number;
  formatter?: 'pkr' | 'percent' | 'number';
  conditionalColor?: boolean; // green for positive, red for negative
}

function formatValue(v: number, formatter: 'pkr' | 'percent' | 'number'): string {
  if (formatter === 'percent') return `${v.toFixed(1)}%`;
  if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}K`;
  return String(Math.round(v));
}

export default function BarChartComponent({
  data,
  xKey,
  yKey,
  color = '#6C5CE7',
  height = 300,
  formatter = 'pkr',
  conditionalColor = false,
}: Readonly<BarChartProps>) {
  const hasLimitedData = data.length <= 3;
  const hasNoData = data.length === 0;

  if (hasNoData) {
    return (
      <div className="flex items-center justify-center" style={{ height, color: 'var(--text-muted)' }}>
        <p className="text-sm">No data available</p>
      </div>
    );
  }

  // Dynamic bar sizing: larger bars when fewer data points
  const barSize = data.length === 1 ? 80 : data.length <= 3 ? 60 : undefined;
  const maxBarSize = data.length <= 3 ? 100 : 40;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: hasLimitedData ? 25 : 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} />
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
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]} barSize={barSize} maxBarSize={maxBarSize}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                conditionalColor
                  ? Number(entry[yKey]) >= 0
                    ? '#00B894'
                    : '#FF5252'
                  : color
              }
            />
          ))}
          {hasLimitedData && (
            <LabelList
              dataKey={yKey}
              position="top"
              offset={8}
              formatter={(v) => formatValue(Number(v), formatter)}
              style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }}
            />
          )}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
