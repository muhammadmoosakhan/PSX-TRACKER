'use client';

import type { MonthlyAnalysis } from '@/types';
import { formatPKR, plColor } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Card from '@/components/ui/Card';
import LineChartComponent from '@/components/charts/LineChart';
import BarChartComponent from '@/components/charts/BarChart';

export default function MonthlyView({ data }: Readonly<{ data: MonthlyAnalysis[] }>) {
  const chartData = data.map((m) => ({
    month: m.period.split(' ')[0]?.slice(0, 3) + ' ' + String(m.year).slice(2),
    net_investment: m.net_investment,
    realized_pl: m.realized_pl,
    trades: m.trade_count,
  }));

  return (
    <div className="space-y-6">
      {/* Table */}
      <Card hoverable={false} padding="none" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
              {['Period', 'Buys', 'Sells', 'Net Investment', 'Realized P&L', 'Trades', 'Top Sector'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((m, i) => (
              <tr key={m.period} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{m.period}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(m.total_buys, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(m.total_sells, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(m.net_investment, 0)}</td>
                <td className={`px-4 py-3 font-mono-numbers font-semibold ${plColor(m.realized_pl)}`}>{formatPKR(m.realized_pl, 0)}</td>
                <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-secondary)' }}>{m.trade_count}</td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{getSectorDisplay(m.most_active_sector).name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Net Investment Trend
            {chartData.length === 1 && <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>(single data point)</span>}
          </h3>
          <LineChartComponent data={chartData} xKey="month" yKey="net_investment" color="#6C5CE7" height={250} />
        </Card>
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Monthly Realized P&L
            {chartData.length === 1 && <span className="text-xs font-normal ml-2" style={{ color: 'var(--text-muted)' }}>(single data point)</span>}
          </h3>
          <BarChartComponent data={chartData} xKey="month" yKey="realized_pl" conditionalColor height={250} />
        </Card>
      </div>
    </div>
  );
}
