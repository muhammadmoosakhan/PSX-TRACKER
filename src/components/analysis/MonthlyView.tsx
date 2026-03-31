'use client';

import type { MonthlyAnalysis } from '@/types';
import { formatPKR, plColor } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Card from '@/components/ui/Card';
import LineChartComponent from '@/components/charts/LineChart';
import BarChartComponent from '@/components/charts/BarChart';

interface MonthlyViewProps {
  data: MonthlyAnalysis[];
  /** Optional per-stock buy breakdown for the current period */
  stockBreakdown?: Array<{ symbol: string; value: number }>;
  /** Optional per-sector buy breakdown for the current period */
  sectorBreakdown?: Array<{ sector: string; value: number }>;
}

export default function MonthlyView({ data, stockBreakdown, sectorBreakdown }: Readonly<MonthlyViewProps>) {
  const chartData = data.map((m) => ({
    month: m.period.split(' ')[0]?.slice(0, 3) + ' ' + String(m.year).slice(2),
    net_investment: m.net_investment,
    realized_pl: m.realized_pl,
    trades: m.trade_count,
  }));

  // For single data point: pad with a zero origin so line chart shows a slope
  const lineData = chartData.length === 1
    ? [{ month: 'Start', net_investment: 0 }, ...chartData]
    : chartData;

  // Check if all realized P&L values are zero
  const allPLZero = chartData.every((d) => d.realized_pl === 0);

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

      {/* Charts Row 1: Net Investment + Realized P&L */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Net Investment Trend
          </h3>
          <LineChartComponent data={lineData} xKey="month" yKey="net_investment" color="#6C5CE7" height={250} />
        </Card>
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Monthly Realized P&L
          </h3>
          {allPLZero ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 250 }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No realized P&L yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sell stocks to realize profit or loss</p>
            </div>
          ) : (
            <BarChartComponent data={chartData} xKey="month" yKey="realized_pl" conditionalColor height={250} />
          )}
        </Card>
      </div>

      {/* Charts Row 2: Per-stock & Per-sector breakdown (useful even with 1 month) */}
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
