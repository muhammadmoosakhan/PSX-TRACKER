'use client';

import { formatPKR, formatPercent } from '@/lib/formatters';

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: 'pkr' | 'percent' | 'number';
}

export default function ChartTooltip({ active, payload, label, formatter = 'pkr' }: Readonly<ChartTooltipProps>) {
  if (!active || !payload?.length) return null;

  const format = (val: number) => {
    if (formatter === 'pkr') return formatPKR(val, 0);
    if (formatter === 'percent') return formatPercent(val, false);
    return val.toLocaleString();
  };

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
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
          <span className="font-mono-numbers font-semibold" style={{ color: 'var(--text-primary)' }}>
            {format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
