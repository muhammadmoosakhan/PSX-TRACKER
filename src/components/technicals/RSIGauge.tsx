'use client';

import React from 'react';

interface RSIGaugeProps {
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

export function RSIGauge({ value, signal }: RSIGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));

  // Gauge geometry — semicircle opening downward
  const cx = 120, cy = 115, r = 80;

  // RSI → angle: 0 → π (left), 100 → 0 (right)
  const toAngle = (rsi: number) => Math.PI * (1 - rsi / 100);

  // Point on circle at given angle and radius
  const pt = (angle: number, radius: number = r) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  // SVG arc path from RSI `from` to RSI `to`
  const arc = (from: number, to: number, radius: number = r) => {
    const a = pt(toAngle(from), radius);
    const b = pt(toAngle(to), radius);
    const sweep = toAngle(from) - toAngle(to);
    const large = sweep > Math.PI ? 1 : 0;
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  const needleAngle = toAngle(clamped);
  const needleTip = pt(needleAngle, r - 12);
  const color = clamped < 30 ? '#00B894' : clamped > 70 ? '#FF5252' : '#A8B2D1';

  // Tick configuration
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const majorTicks = new Set([0, 30, 50, 70, 100]);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 145" className="w-full max-w-[300px]">
        <defs>
          <filter id="rsiNeedleGlow">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={color} floodOpacity="0.7" />
          </filter>
          <filter id="rsiHubGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <path
          d={arc(0, 100)}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth="22"
          strokeLinecap="round"
          opacity="0.2"
        />

        {/* Green zone (0-30 oversold) */}
        <path d={arc(0, 30)} fill="none" stroke="#00B894" strokeWidth="20" strokeLinecap="round" opacity="0.65" />

        {/* Neutral zone (30-70) */}
        <path d={arc(30, 70)} fill="none" stroke="#A8B2D1" strokeWidth="20" opacity="0.3" />

        {/* Red zone (70-100 overbought) */}
        <path d={arc(70, 100)} fill="none" stroke="#FF5252" strokeWidth="20" strokeLinecap="round" opacity="0.65" />

        {/* Tick marks */}
        {ticks.map((tick) => {
          const angle = toAngle(tick);
          const isMajor = majorTicks.has(tick);
          const inner = pt(angle, r + 13);
          const outer = pt(angle, r + (isMajor ? 22 : 17));
          const labelPt = pt(angle, r + 30);
          const tickColor = tick <= 30 ? '#00B894' : tick >= 70 ? '#FF5252' : 'var(--text-muted)';

          return (
            <g key={tick}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke={tickColor}
                strokeWidth={isMajor ? 2 : 1}
                opacity={isMajor ? 0.8 : 0.3}
              />
              {isMajor && (
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={tickColor}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {tick}
                </text>
              )}
            </g>
          );
        })}

        {/* Needle */}
        <line
          x1={cx} y1={cy}
          x2={needleTip.x} y2={needleTip.y}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#rsiNeedleGlow)"
        />

        {/* Center hub */}
        <circle cx={cx} cy={cy} r="7" fill={color} filter="url(#rsiHubGlow)" />
        <circle cx={cx} cy={cy} r="3" fill="var(--bg-card)" />

        {/* Value */}
        <text
          x={cx} y={cy - 25}
          textAnchor="middle"
          fontSize="26"
          fontWeight="bold"
          fill={color}
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {clamped.toFixed(1)}
        </text>

        {/* Signal label */}
        <text
          x={cx} y={cy + 18}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill={color}
          letterSpacing="1"
        >
          {signal}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-4 -mt-1 text-[10px]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#00B894' }} />
          <span style={{ color: 'var(--text-muted)' }}>Oversold (&lt;30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: '#A8B2D1' }} />
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
