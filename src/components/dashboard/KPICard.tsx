'use client';

import { LucideIcon } from 'lucide-react';
import { formatPKR, formatPercent, formatNumber } from '@/lib/formatters';
import Card from '@/components/ui/Card';

interface KPICardProps {
  label: string;
  value: number;
  format: 'pkr' | 'percent' | 'number';
  icon: LucideIcon;
  color: string;
  change?: number;
  changeLabel?: string;
  delay?: number;
}

export default function KPICard({
  label,
  value,
  format,
  icon: Icon,
  color,
  change,
  changeLabel,
  delay = 0,
}: Readonly<KPICardProps>) {
  const formatted = format === 'pkr'
    ? formatPKR(value, 0)
    : format === 'percent'
      ? formatPercent(value)
      : formatNumber(value);

  return (
    <Card
      className="relative overflow-hidden animate-[slide-up_0.5s_ease-out_forwards] opacity-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top color strip */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[16px]" style={{ background: color }} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
          <p className="font-mono-numbers text-xl sm:text-2xl font-bold truncate animate-[count-up_0.8s_ease-out]" style={{ color: 'var(--text-primary)' }}>
            {formatted}
          </p>
          {change !== undefined && (
            <p className={`text-xs font-medium mt-1 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {change >= 0 ? '+' : ''}{change.toFixed(2)}% {changeLabel || ''}
            </p>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ml-3"
          style={{ background: `${color}20`, color }}
        >
          <Icon size={20} />
        </div>
      </div>
    </Card>
  );
}
