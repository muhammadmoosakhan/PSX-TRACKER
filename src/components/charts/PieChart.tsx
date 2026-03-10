'use client';

import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { formatPKR, formatPercent } from '@/lib/formatters';
import { CHART_COLORS } from '@/lib/constants';

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function PieChartComponent({
  data,
  height = 300,
  centerLabel,
  centerValue,
}: Readonly<PieChartProps>) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const entry = payload[0];
              return (
                <div
                  className="rounded-[12px] px-4 py-3 text-sm"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{entry.name}</p>
                  <p className="font-mono-numbers" style={{ color: 'var(--text-secondary)' }}>
                    {formatPKR(entry.value as number)} ({formatPercent(total > 0 ? (entry.value as number) / total : 0)})
                  </p>
                </div>
              );
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>

      {/* Center text */}
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{centerLabel}</span>
          <span className="font-mono-numbers text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {centerValue}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
            <span className="font-mono-numbers" style={{ color: 'var(--text-muted)' }}>
              {total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
