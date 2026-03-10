'use client';

import type { SectorAllocation } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import Card from '@/components/ui/Card';
import PieChartComponent from '@/components/charts/PieChart';
import { formatPKRCompact } from '@/lib/formatters';

export default function SectorBreakdown({ data }: Readonly<{ data: SectorAllocation[] }>) {
  const pieData = data.map((s) => ({ name: s.sector, value: s.current_value }));
  const totalValue = data.reduce((sum, s) => sum + s.current_value, 0);

  return (
    <div className="space-y-6">
      {/* Donut Chart */}
      <Card hoverable={false}>
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          Sector Allocation
        </h3>
        <PieChartComponent
          data={pieData}
          height={280}
          centerLabel="Total"
          centerValue={formatPKRCompact(totalValue)}
        />
      </Card>

      {/* Table */}
      <Card hoverable={false} padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              {['Sector', 'Stocks', 'Invested', 'Current', 'P&L', 'P&L %', 'Weight'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((s, i) => (
              <tr key={s.sector} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{s.sector}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-secondary)' }}>{s.stock_count}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(s.total_invested, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPKR(s.current_value, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers font-semibold ${plColor(s.pl)}`}>{formatPKR(s.pl, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers ${plColor(s.pl_pct)}`}>{formatPercent(s.pl_pct)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(s.weight_pct * 100, 100)}%`, background: 'var(--accent-primary)' }} />
                    </div>
                    <span className="font-mono-numbers text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(s.weight_pct * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
