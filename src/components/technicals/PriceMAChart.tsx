'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PriceMAChartProps {
  data: Array<{
    date: string;
    close: number;
    sma5?: number;
    sma15?: number;
    sma30?: number;
    sma50?: number;
  }>;
  currentPrice: number;
  movingAverages: Array<{
    period: number;
    label: string;
    value: number;
    signal: 'BUY' | 'SELL';
  }>;
}

function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  
  return (
    <div
      className="px-3 py-2 rounded-[8px] text-xs"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p className="font-medium mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-3">
          <span>{p.name}:</span>
          <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
            PKR {p.value?.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

const MA_COLORS: Record<number, string> = {
  5: '#00B894',
  15: '#00CEC9',
  30: '#FF9800',
  50: '#FF5252',
  100: '#9B59B6',
  150: '#E91E63',
};

export function PriceMAChart({ data, currentPrice, movingAverages }: PriceMAChartProps) {
  // Count buy vs sell signals
  const buyCount = movingAverages.filter(ma => ma.signal === 'BUY').length;
  const sellCount = movingAverages.filter(ma => ma.signal === 'SELL').length;
  const overallSignal = buyCount > sellCount ? 'BULLISH' : buyCount < sellCount ? 'BEARISH' : 'NEUTRAL';
  const signalColor = overallSignal === 'BULLISH' ? '#00B894' : overallSignal === 'BEARISH' ? '#FF5252' : '#9CA3C4';
  
  return (
    <div
      className="p-4 rounded-[12px]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Price vs Moving Averages
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {buyCount} BUY / {sellCount} SELL
          </span>
          <div
            className="text-xs font-bold px-3 py-1 rounded-full text-white"
            style={{ background: signalColor }}
          >
            {overallSignal}
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval={Math.max(1, Math.floor(data.length / 7))}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(0)}
            />
            <Tooltip content={<PriceTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 10 }}
              iconType="line"
            />
            
            {/* Price line */}
            <Line 
              type="monotone" 
              dataKey="close" 
              name="Price"
              stroke="var(--accent-primary)" 
              strokeWidth={2.5}
              dot={false}
            />
            
            {/* MA lines - only show if data exists */}
            {data.some(d => d.sma5) && (
              <Line 
                type="monotone" 
                dataKey="sma5" 
                name="SMA 5"
                stroke={MA_COLORS[5]} 
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
              />
            )}
            {data.some(d => d.sma15) && (
              <Line 
                type="monotone" 
                dataKey="sma15" 
                name="SMA 15"
                stroke={MA_COLORS[15]} 
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {data.some(d => d.sma30) && (
              <Line 
                type="monotone" 
                dataKey="sma30" 
                name="SMA 30"
                stroke={MA_COLORS[30]} 
                strokeWidth={1.5}
                dot={false}
              />
            )}
            {data.some(d => d.sma50) && (
              <Line 
                type="monotone" 
                dataKey="sma50" 
                name="SMA 50"
                stroke={MA_COLORS[50]} 
                strokeWidth={1.5}
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* MA Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {movingAverages.slice(0, 6).map((ma) => (
          <div
            key={ma.period}
            className="p-2 rounded-[8px] text-center"
            style={{ 
              background: ma.signal === 'BUY' ? 'rgba(0, 184, 148, 0.1)' : 'rgba(255, 82, 82, 0.1)',
              border: `1px solid ${ma.signal === 'BUY' ? 'rgba(0, 184, 148, 0.3)' : 'rgba(255, 82, 82, 0.3)'}`
            }}
          >
            <p className="text-[10px] font-bold" style={{ color: MA_COLORS[ma.period] || 'var(--text-muted)' }}>
              {ma.label}
            </p>
            <p className="text-xs font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
              {ma.value.toFixed(2)}
            </p>
            <p 
              className="text-[9px] font-bold"
              style={{ color: ma.signal === 'BUY' ? '#00B894' : '#FF5252' }}
            >
              {ma.signal}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
