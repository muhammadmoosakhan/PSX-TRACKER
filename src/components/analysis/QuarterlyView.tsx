'use client';

import type { QuarterlyAnalysis } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Card from '@/components/ui/Card';
import BarChartComponent from '@/components/charts/BarChart';
import LineChartComponent from '@/components/charts/LineChart';

interface QuarterlyViewProps {
  data: QuarterlyAnalysis[];
  stockBreakdown?: Array<{ symbol: string; value: number }>;
  sectorBreakdown?: Array<{ sector: string; value: number }>;
}

export default function QuarterlyView({ data, stockBreakdown, sectorBreakdown }: Readonly<QuarterlyViewProps>) {
  const chartData = data.map((q) => ({
    quarter: q.period,
    realized_pl: q.realized_pl,
    net_investment: q.net_investment,
    portfolio_value: q.portfolio_value,
  }));

  // Pad single data point for line chart
  const lineData = chartData.length === 1
    ? [{ quarter: 'Start', net_investment: 0 }, ...chartData]
    : chartData;

  const allPLZero = chartData.every((d) => d.realized_pl === 0);

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

      {/* Charts Row 1: Net Investment + Realized P&L */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Quarterly Net Investment
          </h3>
          <LineChartComponent data={lineData} xKey="quarter" yKey="net_investment" color="#6C5CE7" height={250} />
        </Card>
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Quarterly Realized P&L
          </h3>
          {allPLZero ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 250 }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No realized P&L yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sell stocks to realize profit or loss</p>
            </div>
          ) : (
            <BarChartComponent data={chartData} xKey="quarter" yKey="realized_pl" conditionalColor height={250} />
          )}
        </Card>
      </div>

      {/* Charts Row 2: Per-stock & Per-sector breakdown */}
      {(stockBreakdown && stockBreakdown.length > 0 || sectorBreakdown && sectorBreakdown.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {stockBreakdown && stockBreakdown.length > 0 && (
            <Card hoverable={false}>
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                Investment by Stock
              </h3>
              <div className="space-y-2.5" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {stockBreakdown.map((s) => {
                  const maxVal = stockBreakdown[0]?.value || 1;
                  const pct = (s.value / maxVal) * 100;
                  return (
                    <div key={s.symbol} className="flex items-center gap-3">
                      <span className="text-xs font-mono-numbers font-semibold w-14 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {s.symbol}
                      </span>
                      <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: `${Math.max(pct, 2)}%`, background: '#6C5CE7' }}
                        />
                      </div>
                      <span className="text-xs font-mono-numbers w-20 text-right flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>
                        {formatPKR(s.value, 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
          {sectorBreakdown && sectorBreakdown.length > 0 && (
            <Card hoverable={false}>
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                Investment by Sector
              </h3>
              <BarChartComponent
                data={sectorBreakdown.map((s) => ({ sector: getSectorDisplay(s.sector).name, value: s.value }))}
                xKey="sector"
                yKey="value"
                color="#00D2D3"
                height={250}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
