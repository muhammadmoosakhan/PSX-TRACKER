'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface NewsTickerProps {
  indexName: string;
  value: number;
  change: number;
}

export default function NewsTicker({ indexName, value, change }: NewsTickerProps) {
  const isPositive = change >= 0;

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}
    >
      <span
        className="text-sm font-bold"
        style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}
      >
        {indexName}
      </span>

      <span
        className="text-sm font-bold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
      >
        {value.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>

      <span
        className="flex items-center gap-1 text-sm font-bold"
        style={{ color: isPositive ? 'var(--accent-success)' : 'var(--accent-danger)' }}
      >
        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {isPositive ? '+' : ''}{change.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}
