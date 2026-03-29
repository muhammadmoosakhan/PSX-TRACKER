'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface MACDChartProps {
  data: Array<{
    date: string;
    macd: number;
    signal: number;
    histogram: number;
  }>;
  currentMACD: number;
  currentSignal: number;
  currentHistogram: number;
  tradeSignal: 'BUY' | 'SELL' | 'NEUTRAL';
}

function MACDTooltip({ active, payload, label }: any) {
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
            {p.value?.toFixed(4)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function MACDChart({ 
  data, 
  currentMACD, 
  currentSignal, 
  currentHistogram, 
  tradeSignal 
}: MACDChartProps) {
  const signalColor = tradeSignal === 'BUY' ? '#00B894' : tradeSignal === 'SELL' ? '#FF5252' : '#9CA3C4';
  
  // Calculate min/max for Y axis
  const allValues = data.flatMap(d => [d.macd, d.signal, d.histogram]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.1;
  
  return (
    <div
      className="p-4 rounded-[12px]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      {/* Header with current values */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>MACD</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(12, 26, 9)</span>
        </div>
        <div
          className="text-xs font-bold px-3 py-1 rounded-full text-white"
          style={{ background: signalColor }}
        >
          {tradeSignal}
        </div>
      </div>
      
      {/* Current values */}
      <div className="flex gap-4 mb-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-muted)' }}>MACD:</span>
          <span className="font-bold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
            {currentMACD.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: '#FF9800' }} />
          <span style={{ color: 'var(--text-muted)' }}>Signal:</span>
          <span className="font-bold" style={{ color: '#FF9800', fontFamily: 'var(--font-mono)' }}>
            {currentSignal.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-sm" style={{ background: currentHistogram >= 0 ? '#00B894' : '#FF5252' }} />
          <span style={{ color: 'var(--text-muted)' }}>Hist:</span>
          <span 
            className="font-bold" 
            style={{ 
              color: currentHistogram >= 0 ? '#00B894' : '#FF5252',
              fontFamily: 'var(--font-mono)' 
            }}
          >
            {currentHistogram.toFixed(4)}
          </span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v.toFixed(2)}
            />
            <Tooltip content={<MACDTooltip />} />
            <ReferenceLine y={0} stroke="var(--border-light)" strokeDasharray="3 3" />
            
            {/* Histogram bars */}
            <Bar 
              dataKey="histogram" 
              name="Histogram"
              fill="#6C5CE7"
              opacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            
            {/* MACD line */}
            <Line 
              type="monotone" 
              dataKey="macd" 
              name="MACD"
              stroke="var(--accent-primary)" 
              strokeWidth={2}
              dot={false}
            />
            
            {/* Signal line */}
            <Line 
              type="monotone" 
              dataKey="signal" 
              name="Signal"
              stroke="#FF9800" 
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Interpretation */}
      <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
        {tradeSignal === 'BUY' 
          ? '📈 MACD above signal line indicates bullish momentum'
          : tradeSignal === 'SELL'
          ? '📉 MACD below signal line indicates bearish momentum'
          : '➡️ MACD and signal line are close, neutral momentum'}
      </p>
    </div>
  );
}
