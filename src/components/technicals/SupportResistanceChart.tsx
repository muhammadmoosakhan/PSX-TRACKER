'use client';

import React from 'react';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface SupportResistanceChartProps {
  data: Array<{
    date: string;
    close: number;
    high: number;
    low: number;
  }>;
  currentPrice: number;
  pivotPoints: {
    r3: number;
    r2: number;
    r1: number;
    pp: number;
    s1: number;
    s2: number;
    s3: number;
  };
  week52?: {
    high: number;
    low: number;
  };
}

function SRTooltip({ active, payload, label }: any) {
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
        <p key={i} style={{ color: p.color || 'var(--text-primary)' }} className="flex justify-between gap-3">
          <span>{p.name}:</span>
          <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
            PKR {p.value?.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function SupportResistanceChart({ 
  data, 
  currentPrice, 
  pivotPoints,
  week52 
}: SupportResistanceChartProps) {
  // Find nearest support and resistance
  const supports = [pivotPoints.s1, pivotPoints.s2, pivotPoints.s3].filter(s => s < currentPrice);
  const resistances = [pivotPoints.r1, pivotPoints.r2, pivotPoints.r3].filter(r => r > currentPrice);
  
  const nearestSupport = supports.length > 0 ? Math.max(...supports) : pivotPoints.s1;
  const nearestResistance = resistances.length > 0 ? Math.min(...resistances) : pivotPoints.r1;
  
  // Calculate range percentage
  const range = nearestResistance - nearestSupport;
  const pricePosition = range > 0 ? ((currentPrice - nearestSupport) / range) * 100 : 50;
  
  return (
    <div
      className="p-4 rounded-[12px]"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
          Support & Resistance Levels
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Pivot: PKR {pivotPoints.pp.toFixed(2)}
        </span>
      </div>
      
      {/* Visual Range Indicator */}
      <div className="mb-4 px-2">
        <div className="flex justify-between text-[10px] mb-1">
          <span style={{ color: '#FF5252' }}>S: {nearestSupport.toFixed(2)}</span>
          <span style={{ color: 'var(--accent-primary)' }}>Current: {currentPrice.toFixed(2)}</span>
          <span style={{ color: '#00B894' }}>R: {nearestResistance.toFixed(2)}</span>
        </div>
        <div 
          className="relative h-3 rounded-full overflow-hidden"
          style={{ background: 'linear-gradient(to right, #FF5252, #9CA3C4, #00B894)' }}
        >
          <div
            className="absolute top-0 h-full w-1 rounded-full"
            style={{ 
              left: `${Math.max(5, Math.min(95, pricePosition))}%`,
              background: 'var(--accent-primary)',
              boxShadow: '0 0 8px var(--accent-primary)'
            }}
          />
        </div>
        <p className="text-[10px] text-center mt-1" style={{ color: 'var(--text-muted)' }}>
          {pricePosition < 30 ? '📉 Near support - potential bounce zone' :
           pricePosition > 70 ? '📈 Near resistance - watch for breakout' :
           '➡️ Trading in mid-range'}
        </p>
      </div>
      
      {/* Chart with S/R lines */}
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="srGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            
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
            <Tooltip content={<SRTooltip />} />
            
            {/* Resistance lines */}
            <ReferenceLine y={pivotPoints.r3} stroke="#00B894" strokeDasharray="5 5" strokeOpacity={0.5} />
            <ReferenceLine y={pivotPoints.r2} stroke="#00B894" strokeDasharray="5 5" strokeOpacity={0.7} />
            <ReferenceLine y={pivotPoints.r1} stroke="#00B894" strokeWidth={2} label={{ value: 'R1', fill: '#00B894', fontSize: 9 }} />
            
            {/* Pivot point */}
            <ReferenceLine y={pivotPoints.pp} stroke="#9CA3C4" strokeWidth={1.5} strokeDasharray="3 3" />
            
            {/* Support lines */}
            <ReferenceLine y={pivotPoints.s1} stroke="#FF5252" strokeWidth={2} label={{ value: 'S1', fill: '#FF5252', fontSize: 9 }} />
            <ReferenceLine y={pivotPoints.s2} stroke="#FF5252" strokeDasharray="5 5" strokeOpacity={0.7} />
            <ReferenceLine y={pivotPoints.s3} stroke="#FF5252" strokeDasharray="5 5" strokeOpacity={0.5} />
            
            {/* 52-week high/low if available */}
            {week52 && (
              <>
                <ReferenceLine y={week52.high} stroke="#E91E63" strokeDasharray="8 4" strokeOpacity={0.8} />
                <ReferenceLine y={week52.low} stroke="#9B59B6" strokeDasharray="8 4" strokeOpacity={0.8} />
              </>
            )}
            
            {/* Price area */}
            <Area 
              type="monotone" 
              dataKey="close" 
              name="Price"
              stroke="var(--accent-primary)" 
              strokeWidth={2}
              fill="url(#srGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {/* Pivot Points Summary */}
      <div className="grid grid-cols-7 gap-1 mt-3 text-center">
        {[
          { label: 'S3', value: pivotPoints.s3, color: '#FF5252' },
          { label: 'S2', value: pivotPoints.s2, color: '#FF5252' },
          { label: 'S1', value: pivotPoints.s1, color: '#FF5252' },
          { label: 'PP', value: pivotPoints.pp, color: '#9CA3C4' },
          { label: 'R1', value: pivotPoints.r1, color: '#00B894' },
          { label: 'R2', value: pivotPoints.r2, color: '#00B894' },
          { label: 'R3', value: pivotPoints.r3, color: '#00B894' },
        ].map((p) => (
          <div
            key={p.label}
            className="p-1.5 rounded-[6px]"
            style={{ 
              background: `${p.color}15`,
              border: `1px solid ${p.color}30`
            }}
          >
            <p className="text-[9px] font-bold" style={{ color: p.color }}>{p.label}</p>
            <p 
              className="text-[10px] font-bold" 
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
            >
              {p.value.toFixed(0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
