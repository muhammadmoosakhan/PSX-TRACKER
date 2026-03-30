'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

interface StochasticChartProps {
  data: Array<{
    date: string;
    k: number;
    d: number;
  }>;
  currentK: number;
  currentD: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

function StochTooltip({ active, payload, label }: any) {
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
          <span>%{p.name}:</span>
          <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
            {p.value?.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function StochasticChart({ data, currentK, currentD, signal }: StochasticChartProps) {
  const signalColor = signal === 'BUY' ? '#00B894' : signal === 'SELL' ? '#FF5252' : '#9CA3C4';
  
  // Determine zone interpretation
  const zoneInterpretation = currentK < 20 
    ? { zone: 'Oversold', color: '#00B894', desc: 'Potential buying opportunity' }
    : currentK > 80 
    ? { zone: 'Overbought', color: '#FF5252', desc: 'Consider taking profits' }
    : { zone: 'Neutral', color: '#9CA3C4', desc: 'Wait for clearer signal' };
  
  // Crossover detection
  const crossover = currentK > currentD ? 'Bullish' : currentK < currentD ? 'Bearish' : 'Neutral';
  
  return (
    <div
      className="p-4 rounded-[12px]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Stochastic Oscillator
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(14, 3, 3)</span>
        </div>
        <div
          className="text-xs font-bold px-3 py-1 rounded-full text-white"
          style={{ background: signalColor }}
        >
          {signal}
        </div>
      </div>
      
      {/* Current values */}
      <div className="flex gap-4 mb-3 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: 'var(--accent-primary)' }} />
          <span style={{ color: 'var(--text-muted)' }}>%K:</span>
          <span className="font-bold" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
            {currentK.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: '#FF9800' }} />
          <span style={{ color: 'var(--text-muted)' }}>%D:</span>
          <span className="font-bold" style={{ color: '#FF9800', fontFamily: 'var(--font-mono)' }}>
            {currentD.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--text-muted)' }}>Zone:</span>
          <span className="font-bold" style={{ color: zoneInterpretation.color }}>
            {zoneInterpretation.zone}
          </span>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            {/* Overbought zone */}
            <ReferenceArea y1={80} y2={100} fill="#FF5252" fillOpacity={0.1} />
            {/* Oversold zone */}
            <ReferenceArea y1={0} y2={20} fill="#00B894" fillOpacity={0.1} />
            
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval={Math.max(1, Math.floor(data.length / 7))}
              tickFormatter={(d: string) => {
                const dt = new Date(d);
                return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis 
              domain={[0, 100]}
              ticks={[0, 20, 50, 80, 100]}
              tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<StochTooltip />} />
            
            {/* Reference lines */}
            <ReferenceLine y={80} stroke="#FF5252" strokeDasharray="3 3" />
            <ReferenceLine y={20} stroke="#00B894" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="var(--border-light)" strokeDasharray="3 3" />
            
            {/* %K line */}
            <Line 
              type="monotone" 
              dataKey="k" 
              name="K"
              stroke="var(--accent-primary)" 
              strokeWidth={2}
              dot={false}
            />
            
            {/* %D line */}
            <Line 
              type="monotone" 
              dataKey="d" 
              name="D"
              stroke="#FF9800" 
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Interpretation */}
      <div className="flex items-center justify-between mt-2 text-[10px] flex-wrap gap-1">
        <span style={{ color: 'var(--text-muted)' }}>
          {zoneInterpretation.desc}
        </span>
        <span style={{ color: crossover === 'Bullish' ? '#00B894' : crossover === 'Bearish' ? '#FF5252' : '#9CA3C4' }}>
          {crossover === 'Bullish' ? '📈 %K crossed above %D' : 
           crossover === 'Bearish' ? '📉 %K crossed below %D' : 
           '➡️ Lines converging'}
        </span>
      </div>
    </div>
  );
}
