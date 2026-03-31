'use client';

import type { YearlyAnalysis } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import Card from '@/components/ui/Card';
import BarChartComponent from '@/components/charts/BarChart';
import LineChartComponent from '@/components/charts/LineChart';

interface YearlyViewProps {
  data: YearlyAnalysis[];
  stockBreakdown?: Array<{ symbol: string; value: number }>;
  sectorBreakdown?: Array<{ sector: string; value: number }>;
}

export default function YearlyView({ data, stockBreakdown, sectorBreakdown }: Readonly<YearlyViewProps>) {
  const chartData = data.map((y) => ({
    year: String(y.year),
    net_invested: y.net_invested,
    realized_pl: y.realized_pl,
    capital_deployed: y.capital_deployed,
  }));

  // Pad single data point for line chart
  const lineData = chartData.length === 1
    ? [{ year: 'Start', net_invested: 0 }, ...chartData]
    : chartData;

  const allPLZero = chartData.every((d) => d.realized_pl === 0);

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

      {/* Charts Row 1: Capital Deployed + Realized P&L */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Yearly Net Investment
          </h3>
          <LineChartComponent data={lineData} xKey="year" yKey="net_invested" color="#6C5CE7" height={250} />
        </Card>
        <Card hoverable={false}>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Yearly Realized P&L
          </h3>
          {allPLZero ? (
            <div className="flex flex-col items-center justify-center" style={{ height: 250 }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No realized P&L yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sell stocks to realize profit or loss</p>
            </div>
          ) : (
            <BarChartComponent data={chartData} xKey="year" yKey="realized_pl" conditionalColor height={250} />
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
                data={sectorBreakdown.map((s) => ({ sector: s.sector, value: s.value }))}
                xKey="sector"
                yKey="value"
                color="#00D2D3"
                height={250}
              />
            </Card>
          )}
        </div>
      )}

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
