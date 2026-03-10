'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import type { RiskMetric, PortfolioHolding, SectorAllocation } from '@/types';
import Card from '@/components/ui/Card';

interface ConcentrationAlertProps {
  metrics: RiskMetric[];
  holdings: PortfolioHolding[];
  sectorAllocation: SectorAllocation[];
}

export default function ConcentrationAlert({
  metrics,
  holdings,
  sectorAllocation,
}: Readonly<ConcentrationAlertProps>) {
  const alerts: { message: string; severity: 'warning' | 'danger' }[] = [];

  // Check risk metrics
  for (const m of metrics) {
    if (m.status === 'danger') {
      alerts.push({ message: `${m.label} is critically high`, severity: 'danger' });
    } else if (m.status === 'warning') {
      alerts.push({ message: `${m.label} is approaching danger threshold`, severity: 'warning' });
    }
  }

  // Check individual stock concentration
  for (const h of holdings) {
    if (h.weight_pct > 0.25) {
      alerts.push({
        message: `${h.symbol} is ${(h.weight_pct * 100).toFixed(1)}% of your portfolio. Consider diversifying.`,
        severity: h.weight_pct > 0.35 ? 'danger' : 'warning',
      });
    }
  }

  // Check sector concentration
  for (const s of sectorAllocation) {
    if (s.weight_pct > 0.40) {
      alerts.push({
        message: `${s.sector} sector is ${(s.weight_pct * 100).toFixed(1)}% of your portfolio.`,
        severity: 'danger',
      });
    }
  }

  if (alerts.length === 0) {
    return (
      <Card hoverable={false} className="border-l-4" style={{ borderLeftColor: 'var(--accent-success)' }}>
        <div className="flex items-center gap-3">
          <CheckCircle size={20} style={{ color: 'var(--accent-success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>All Clear!</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Your portfolio is within healthy risk parameters.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Card
          key={i}
          hoverable={false}
          padding="sm"
          className="border-l-4"
          style={{
            borderLeftColor: alert.severity === 'danger' ? 'var(--accent-danger)' : 'var(--accent-warning)',
          }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={16}
              className="flex-shrink-0 mt-0.5"
              style={{
                color: alert.severity === 'danger' ? 'var(--accent-danger)' : 'var(--accent-warning)',
              }}
            />
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{alert.message}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
