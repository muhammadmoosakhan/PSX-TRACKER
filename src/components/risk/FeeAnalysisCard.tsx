'use client';

import { formatPKR, formatPercent } from '@/lib/formatters';
import { PortfolioFeeAnalysis } from '@/lib/fee-analysis';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface FeeAnalysisCardProps {
  analysis: PortfolioFeeAnalysis;
}

const COLORS = ['#6C5CE7', '#00D2D3', '#FF6B6B', '#FECA57', '#00B894', '#E17055'];

export default function FeeAnalysisCard({ analysis }: FeeAnalysisCardProps) {
  const pieData = [
    { name: 'Commission', value: analysis.feesByType.commission },
    { name: 'CDC', value: analysis.feesByType.cdc },
    { name: 'CVT', value: analysis.feesByType.cvt },
    { name: 'SST', value: analysis.feesByType.sst },
    { name: 'Regulatory', value: analysis.feesByType.regulatory },
    { name: 'Others', value: analysis.feesByType.others },
  ].filter(d => d.value > 0);

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-light)] p-6">
      <h3 
        className="text-lg font-semibold text-[var(--text-primary)] mb-4"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        📊 Trading Costs Analysis
      </h3>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Fees Paid</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {formatPKR(analysis.totalFeesAllTime, 2)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Avg Fee Rate</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {analysis.avgFeeRate.toFixed(3)}%
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Est. Exit Cost</p>
          <p className="text-lg font-bold text-orange-500">
            {formatPKR(analysis.estimatedExitCost, 0)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)]">
          <p className="text-xs text-[var(--text-muted)] mb-1">Fee Drag</p>
          <p className="text-lg font-bold text-red-500">
            -{analysis.feeDragOnReturns.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Fee Breakdown by Type</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-lg p-2 shadow-lg text-sm">
                        <p className="font-medium text-[var(--text-primary)]">{data.name}</p>
                        <p className="text-[var(--text-muted)]">{formatPKR(data.value, 2)}</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                <span className="text-[var(--text-muted)]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Stock Table */}
        <div>
          <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Fees by Stock</h4>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--bg-card)]">
                <tr className="text-left text-[var(--text-muted)]">
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium text-right">Trades</th>
                  <th className="pb-2 font-medium text-right">Fees</th>
                  <th className="pb-2 font-medium text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]">
                {analysis.feesByStock.slice(0, 10).map((stock) => (
                  <tr key={stock.symbol} className="text-[var(--text-primary)]">
                    <td className="py-2 font-medium">{stock.symbol}</td>
                    <td className="py-2 text-right text-[var(--text-muted)]">{stock.tradeCount}</td>
                    <td className="py-2 text-right">{formatPKR(stock.totalFees, 2)}</td>
                    <td className="py-2 text-right text-[var(--text-muted)]">
                      {stock.effectiveFeeRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
