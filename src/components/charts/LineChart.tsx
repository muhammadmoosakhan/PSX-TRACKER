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

export default function LineChartComponent({
  data,
  xKey,
  yKey,
  color = '#6C5CE7',
  height = 300,
  formatter = 'pkr',
  showArea = true,
}: Readonly<LineChartProps>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id={`gradient-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
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
        {showArea && (
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
          dot={false}
          activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
