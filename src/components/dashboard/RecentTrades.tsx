'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Trade } from '@/types';
import { formatPKR, formatDate } from '@/lib/formatters';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

export default function RecentTrades({ trades }: Readonly<{ trades: Trade[] }>) {
  const recent = trades.slice(0, 5);

  return (
    <Card hoverable={false}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          Recent Trades
        </h3>
        <Link
          href="/trades"
          className="flex items-center gap-1 text-xs font-medium transition-colors"
          style={{ color: 'var(--accent-primary)' }}
        >
          View All <ArrowRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {recent.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between py-2 border-b last:border-0"
            style={{ borderColor: 'var(--border-light)' }}
          >
            <div className="flex items-center gap-3">
              <Badge variant={t.trade_type === 'BUY' ? 'buy' : 'sell'}>{t.trade_type}</Badge>
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>{t.symbol}</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(t.trade_date)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono-numbers text-sm" style={{ color: 'var(--text-primary)' }}>
                {t.quantity} x {formatPKR(t.rate_per_share, 2)}
              </p>
              <p className="font-mono-numbers text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatPKR(t.net_value, 0)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
