'use client';

import type { YearlyAnalysis } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import Card from '@/components/ui/Card';

export default function YearlyView({ data }: Readonly<{ data: YearlyAnalysis[] }>) {
  return (
    <div className="space-y-6">
      <Card hoverable={false} padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              {['Year', 'Deployed', 'Recovered', 'Net', 'Realized P&L', 'ROI', 'Trades', 'Win Rate', 'Best Trade', 'Worst Trade'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((y, i) => (
              <tr key={y.year} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{y.year}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(y.capital_deployed, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(y.capital_recovered, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(y.net_invested, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers font-semibold ${plColor(y.realized_pl)}`}>{formatPKR(y.realized_pl, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers font-semibold ${plColor(y.roi_pct)}`}>{formatPercent(y.roi_pct)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-secondary)' }}>{y.trade_count}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-secondary)' }}>{(y.win_rate * 100).toFixed(0)}%</td>
                <td className={`px-4 py-3 font-mono-numbers ${plColor(y.best_trade_pl)}`}>{formatPKR(y.best_trade_pl, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers ${plColor(y.worst_trade_pl)}`}>{formatPKR(y.worst_trade_pl, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Yearly Highlights */}
      {data.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {data.map((y) => (
            <Card key={y.year} hoverable={false}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{y.year} ROI</p>
              <p className={`font-mono-numbers text-2xl font-bold ${plColor(y.roi_pct)}`}>
                {formatPercent(y.roi_pct)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {y.trade_count} trades, {(y.win_rate * 100).toFixed(0)}% win rate
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
