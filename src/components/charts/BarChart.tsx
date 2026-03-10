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

export default function BarChartComponent({
  data,
  xKey,
  yKey,
  color = '#6C5CE7',
  height = 300,
  formatter = 'pkr',
  conditionalColor = false,
}: Readonly<BarChartProps>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
        <Bar dataKey={yKey} radius={[6, 6, 0, 0]} maxBarSize={40}>
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
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
