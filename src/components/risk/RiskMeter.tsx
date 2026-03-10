'use client';

import type { RiskMetric } from '@/types';
import { formatPercent } from '@/lib/formatters';
import Card from '@/components/ui/Card';

const statusColors = {
  safe: { bg: '#00B89420', text: '#00B894', ring: '#00B894' },
  warning: { bg: '#FECA5720', text: '#E17055', ring: '#FECA57' },
  danger: { bg: '#FF525220', text: '#FF5252', ring: '#FF5252' },
};

export default function RiskMeter({ metric }: Readonly<{ metric: RiskMetric }>) {
  const colors = statusColors[metric.status];
  const displayValue = metric.unit === '%'
    ? formatPercent(metric.value, false)
    : metric.unit === 'ratio'
      ? metric.value.toFixed(2)
      : String(metric.value);

  // Progress for gauge (0-100)
  const progress = metric.unit === '%'
    ? Math.min(metric.value * 100, 100)
    : metric.unit === 'ratio'
      ? Math.min(metric.value * 100, 100)
      : Math.min((metric.value / 10) * 100, 100); // sectors scale

  return (
    <Card hoverable={false} className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{metric.label}</p>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: colors.bg, color: colors.text }}
        >
          {metric.status.toUpperCase()}
        </span>
      </div>

      <p className="font-mono-numbers text-3xl font-bold mb-3" style={{ color: colors.text }}>
        {displayValue}
      </p>

      {/* Progress bar with threshold markers */}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: colors.ring,
          }}
        />
        {/* Warning threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${metric.warning_threshold * 100}%`,
            background: '#FECA57',
          }}
        />
        {/* Danger threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${Math.min(metric.danger_threshold * 100, 100)}%`,
            background: '#FF5252',
          }}
        />
      </div>
    </Card>
  );
}
