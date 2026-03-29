'use client';

import React from 'react';

interface RSIGaugeProps {
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export function RSIGauge({ value, signal }: RSIGaugeProps) {
  // RSI ranges: 0-30 oversold (buy), 30-70 neutral, 70-100 overbought (sell)
  const percentage = (value / 100) * 180; // Convert to degrees (180 = half circle)
  
  // Determine color based on zones
  const getZoneColor = (v: number) => {
    if (v < 30) return '#00B894'; // Green - oversold
    if (v > 70) return '#FF5252'; // Red - overbought
    return '#9CA3C4'; // Gray - neutral
  };

  const needleColor = getZoneColor(value);
  
  return (
    <div className="flex flex-col items-center">
      {/* Gauge SVG */}
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        <defs>
          {/* Gradient for the arc */}
          <linearGradient id="rsiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00B894" />
            <stop offset="30%" stopColor="#00B894" />
            <stop offset="30%" stopColor="#9CA3C4" />
            <stop offset="70%" stopColor="#9CA3C4" />
            <stop offset="70%" stopColor="#FF5252" />
            <stop offset="100%" stopColor="#FF5252" />
          </linearGradient>
          
          {/* Glow effect */}
          <filter id="rsiGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="var(--border-light)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* Colored arc with zones */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#rsiGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.8"
        />
        
        {/* Zone markers */}
        <text x="25" y="115" fontSize="10" fill="var(--text-muted)">0</text>
        <text x="55" y="45" fontSize="9" fill="#00B894">30</text>
        <text x="135" y="45" fontSize="9" fill="#FF5252">70</text>
        <text x="170" y="115" fontSize="10" fill="var(--text-muted)">100</text>
        
        {/* Needle */}
        <g transform={`rotate(${percentage - 90}, 100, 100)`}>
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="35"
            stroke={needleColor}
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#rsiGlow)"
          />
          <circle cx="100" cy="100" r="6" fill={needleColor} filter="url(#rsiGlow)" />
        </g>
        
        {/* Center value */}
        <text
          x="100"
          y="90"
          textAnchor="middle"
          fontSize="20"
          fontWeight="bold"
          fill={needleColor}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {value.toFixed(1)}
        </text>
        
        {/* Signal label */}
        <text
          x="100"
          y="108"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill={needleColor}
        >
          {signal}
        </text>
      </svg>
      
      {/* Legend */}
      <div className="flex gap-4 mt-2 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#00B894' }} />
          <span style={{ color: 'var(--text-muted)' }}>Oversold (&lt;30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#9CA3C4' }} />
          <span style={{ color: 'var(--text-muted)' }}>Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#FF5252' }} />
          <span style={{ color: 'var(--text-muted)' }}>Overbought (&gt;70)</span>
        </div>
      </div>
    </div>
  );
}
