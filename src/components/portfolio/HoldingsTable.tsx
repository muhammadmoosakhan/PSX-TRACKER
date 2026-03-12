'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { PortfolioHolding } from '@/types';
import { formatPKR, formatPercent, plColor } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Card from '@/components/ui/Card';

interface HoldingsTableProps {
  holdings: PortfolioHolding[];
  onSelectStock?: (symbol: string) => void;
}

export default function HoldingsTable({ holdings, onSelectStock }: Readonly<HoldingsTableProps>) {
  const totals = {
    costBasis: holdings.reduce((s, h) => s + h.cost_basis, 0),
    marketValue: holdings.reduce((s, h) => s + h.market_value, 0),
    pl: holdings.reduce((s, h) => s + h.unrealized_pl, 0),
  };
  const totalPLPct = totals.costBasis > 0 ? totals.pl / totals.costBasis : 0;

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Card hoverable={false} padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['Symbol', 'Sector', 'Qty', 'Avg Buy', 'Current', 'Cost', 'Value', 'P&L', 'P&L %', 'Weight'].map(
                  (h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium text-xs" style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => (
                <tr
                  key={h.symbol}
                  className="transition-colors cursor-pointer hover:bg-[var(--bg-card-hover)]"
                  onClick={() => onSelectStock?.(h.symbol)}
                  style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
                >
                  <td className="px-3 py-3">
                    <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{h.symbol}</span>
                    <p className="text-xs truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{h.stock_name}</p>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{getSectorDisplay(h.sector).name}</td>
                  <td className="px-3 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{h.quantity_held.toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.avg_buy_price, 2)}</td>
                  <td className="px-3 py-3">
                    <span className="font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.current_price, 2)}</span>
                    <span className={`ml-1 text-xs inline-flex items-center gap-0.5 ${h.change_today >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {h.change_today >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(h.change_today_pct).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono-numbers" style={{ color: 'var(--text-secondary)' }}>{formatPKR(h.cost_basis, 0)}</td>
                  <td className="px-3 py-3 font-mono-numbers font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.market_value, 0)}</td>
                  <td className={`px-3 py-3 font-mono-numbers font-semibold ${plColor(h.unrealized_pl)}`}>{formatPKR(h.unrealized_pl, 0)}</td>
                  <td className={`px-3 py-3 font-mono-numbers font-semibold ${plColor(h.unrealized_pl_pct)}`}>{formatPercent(h.unrealized_pl_pct)}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(h.weight_pct * 100, 100)}%`, background: 'var(--accent-primary)' }}
                        />
                      </div>
                      <span className="font-mono-numbers text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(h.weight_pct * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summary Row */}
            <tfoot>
              <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-light)' }}>
                <td colSpan={5} className="px-3 py-3 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Total</td>
                <td className="px-3 py-3 font-mono-numbers font-bold" style={{ color: 'var(--text-primary)' }}>{formatPKR(totals.costBasis, 0)}</td>
                <td className="px-3 py-3 font-mono-numbers font-bold" style={{ color: 'var(--text-primary)' }}>{formatPKR(totals.marketValue, 0)}</td>
                <td className={`px-3 py-3 font-mono-numbers font-bold ${plColor(totals.pl)}`}>{formatPKR(totals.pl, 0)}</td>
                <td className={`px-3 py-3 font-mono-numbers font-bold ${plColor(totalPLPct)}`}>{formatPercent(totalPLPct)}</td>
                <td className="px-3 py-3 font-mono-numbers font-bold" style={{ color: 'var(--text-muted)' }}>100%</td>
              </tr>
            </tfoot>
          </table>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {holdings.map((h) => (
          <Card key={h.symbol} padding="sm" className="cursor-pointer" onClick={() => onSelectStock?.(h.symbol)}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{h.symbol}</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{getSectorDisplay(h.sector).name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono-numbers font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.market_value, 0)}</p>
                <p className={`font-mono-numbers text-xs font-medium ${plColor(h.unrealized_pl)}`}>{formatPercent(h.unrealized_pl_pct)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span style={{ color: 'var(--text-muted)' }}>Qty</span><p className="font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{h.quantity_held}</p></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Avg Buy</span><p className="font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.avg_buy_price, 2)}</p></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Current</span><p className="font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(h.current_price, 2)}</p></div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
