'use client';

import type { PortfolioHolding } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import Card from '@/components/ui/Card';
import { CHART_COLORS } from '@/lib/constants';

export default function TopHoldings({ holdings }: Readonly<{ holdings: PortfolioHolding[] }>) {
  const top5 = holdings.slice(0, 5);
  const maxValue = top5.length > 0 ? top5[0].market_value : 1;

  return (
    <Card hoverable={false}>
      <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
        Top Holdings
      </h3>
      <div className="space-y-3">
        {top5.map((h, i) => (
          <div key={h.symbol}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{h.symbol}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-numbers text-xs" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.market_value, 0)}</span>
                <span className={`font-mono-numbers text-xs font-medium ${plColor(h.unrealized_pl_pct)}`}>
                  {formatPercent(h.unrealized_pl_pct)}
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(h.market_value / maxValue) * 100}%`,
                  background: CHART_COLORS[i],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
