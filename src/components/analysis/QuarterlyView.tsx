'use client';

import type { QuarterlyAnalysis } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Card from '@/components/ui/Card';
import BarChartComponent from '@/components/charts/BarChart';

export default function QuarterlyView({ data }: Readonly<{ data: QuarterlyAnalysis[] }>) {
  const chartData = data.map((q) => ({
    quarter: q.period,
    realized_pl: q.realized_pl,
    portfolio_value: q.portfolio_value,
  }));

  return (
    <div className="space-y-6">
      <Card hoverable={false} padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              {['Period', 'Buys', 'Sells', 'Net', 'Realized P&L', 'QoQ Growth', 'Best Sector', 'Worst Sector'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((q, i) => (
              <tr key={q.period} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{q.period}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(q.total_buys, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(q.total_sells, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(q.net_investment, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers font-semibold ${plColor(q.realized_pl)}`}>{formatPKR(q.realized_pl, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers ${plColor(q.qoq_growth_pct)}`}>{formatPercent(q.qoq_growth_pct)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--accent-success)' }}>{getSectorDisplay(q.best_sector).name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--accent-danger)' }}>{getSectorDisplay(q.worst_sector).name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card hoverable={false}>
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          Quarterly Realized P&L
        </h3>
        <BarChartComponent data={chartData} xKey="quarter" yKey="realized_pl" conditionalColor height={250} />
      </Card>
    </div>
  );
}
