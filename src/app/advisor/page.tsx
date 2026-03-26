'use client';

import { useState, useCallback } from 'react';
import {
  Search, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Target, ShieldCheck, BarChart3, Brain, Newspaper, Activity,
  ArrowUpCircle, ArrowDownCircle, Loader2, RefreshCw, Info,
} from 'lucide-react';

interface Advisory {
  symbol: string;
  name: string;
  sector: string;
  currentPrice: number;
  ldcp: number;
  advisory: {
    overall: number;
    label: string;
    confidence: number;
    technicalScore: number;
    sentimentScore: number;
    trendScore: number;
    reasoning: string[];
    riskLevel: string;
    suggestedAction: string;
    targetEntry: number | null;
    targetExit: number | null;
    stopLoss: number | null;
  };
  technicals: {
    rsi: { value: number; signal: string } | null;
    stochastic: { k: number; d: number; signal: string } | null;
    macd: { macd: number; signal: number; histogram: number; tradeSignal: string } | null;
    compositeScore: number;
  };
  sentiment: {
    score: number;
    label: string;
    confidence: number;
    method: string;
    headlines: string[];
  };
  trend: {
    shortTerm: { direction: string; strength: number };
    mediumTerm: { direction: string; strength: number };
    longTerm: { direction: string; strength: number };
    crossover: { type: string; description: string };
    volatility: number;
    overallLabel: string;
    prediction: { nextDay: number; confidenceLow: number; confidenceHigh: number };
  };
}

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  // score: -1 to +1
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.3 ? 'var(--accent-success)' : score < -0.3 ? 'var(--accent-danger)' : 'var(--accent-warning)';
  const w = size === 'lg' ? 'h-3' : 'h-2';

  return (
    <div className={`w-full ${w} rounded-full overflow-hidden`} style={{ background: 'var(--bg-secondary)' }}>
      <div
        className={`${w} rounded-full transition-all duration-500`}
        style={{ width: `${Math.max(5, pct)}%`, background: color }}
      />
    </div>
  );
}

function SignalBadge({ label }: { label: string }) {
  const colorMap: Record<string, string> = {
    'Strong Buy': 'var(--accent-success)',
    'Buy': '#00D2D3',
    'Hold': 'var(--accent-warning)',
    'Sell': 'var(--accent-tertiary)',
    'Strong Sell': 'var(--accent-danger)',
  };
  const bg = colorMap[label] || 'var(--text-muted)';

  return (
    <span
      className="px-3 py-1.5 rounded-[10px] text-sm font-bold text-white"
      style={{ background: bg, fontFamily: 'var(--font-heading)' }}
    >
      {label}
    </span>
  );
}

function TrendArrow({ direction }: { direction: string }) {
  if (direction === 'up') return <TrendingUp size={16} style={{ color: 'var(--accent-success)' }} />;
  if (direction === 'down') return <TrendingDown size={16} style={{ color: 'var(--accent-danger)' }} />;
  return <Minus size={16} style={{ color: 'var(--text-muted)' }} />;
}

export default function AdvisorPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Advisory | null>(null);
  const [error, setError] = useState('');

  const analyze = useCallback(async (symbol?: string) => {
    const s = (symbol || query).trim().toUpperCase();
    if (!s) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`/api/psx/advisor/${s}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Analysis failed');
      }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze stock');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyze();
  };

  const quickPicks = ['ENGRO', 'HUBC', 'OGDC', 'LUCK', 'HBL', 'PSO', 'SYS', 'MEBL'];

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24 animate-[fade-in_0.3s_ease-out]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: 'var(--accent-primary)' }}>
          <Brain size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
            Smart Advisor
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            AI-powered stock analysis &bull; Technical + Sentiment + Trend
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[12px]"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border-light)' }}
          >
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Enter stock symbol (e.g. ENGRO)"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-2.5 rounded-[12px] text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Analyze'}
          </button>
        </div>
      </form>

      {/* Quick Picks */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Quick:</span>
        {quickPicks.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); analyze(s); }}
            className="px-2.5 py-1 rounded-[8px] text-xs font-medium transition-all hover:scale-105 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2 p-3 rounded-[12px] mb-5 text-xs"
        style={{ background: 'rgba(254, 202, 87, 0.1)', color: 'var(--accent-warning)' }}
      >
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>For educational purposes only. Not financial advice. Always do your own research before investing.</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Analyzing {query}... Running technical, sentiment & trend analysis
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <p className="text-sm mb-3" style={{ color: 'var(--accent-danger)' }}>{error}</p>
          <button onClick={() => analyze()} className="px-4 py-2 rounded-[10px] text-sm text-white cursor-pointer" style={{ background: 'var(--accent-primary)' }}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {data && (
        <div className="space-y-4 animate-[fade-in_0.3s_ease-out]">
          {/* Main Advisory Card */}
          <div className="rounded-[16px] p-5 space-y-4" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                    {data.symbol}
                  </span>
                  <SignalBadge label={data.advisory.label} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{data.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{data.sector}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  PKR {data.currentPrice.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs" style={{ color: data.currentPrice >= data.ldcp ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {data.currentPrice >= data.ldcp ? '+' : ''}{(data.currentPrice - data.ldcp).toFixed(2)} ({data.ldcp > 0 ? (((data.currentPrice - data.ldcp) / data.ldcp) * 100).toFixed(2) : '0.00'}%)
                </p>
              </div>
            </div>

            {/* Overall Score Gauge */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Advisory Score</span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {(data.advisory.overall * 100).toFixed(0)}%
                </span>
              </div>
              <ScoreGauge score={data.advisory.overall} />
              <div className="flex justify-between mt-1">
                <span className="text-[10px]" style={{ color: 'var(--accent-danger)' }}>Strong Sell</span>
                <span className="text-[10px]" style={{ color: 'var(--accent-success)' }}>Strong Buy</span>
              </div>
            </div>

            {/* Suggested Action */}
            <div className="p-3 rounded-[12px]" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {data.advisory.suggestedAction}
              </p>
            </div>

            {/* Risk + Confidence */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 p-2.5 rounded-[10px]" style={{ background: 'var(--bg-secondary)' }}>
                <ShieldCheck size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Risk: </span>
                <span className="text-xs font-bold" style={{
                  color: data.advisory.riskLevel === 'High' ? 'var(--accent-danger)' : data.advisory.riskLevel === 'Low' ? 'var(--accent-success)' : 'var(--accent-warning)'
                }}>{data.advisory.riskLevel}</span>
              </div>
              <div className="flex-1 flex items-center gap-2 p-2.5 rounded-[10px]" style={{ background: 'var(--bg-secondary)' }}>
                <Info size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Confidence: </span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {(data.advisory.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="rounded-[16px] p-5 space-y-3" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              <BarChart3 size={16} style={{ color: 'var(--accent-primary)' }} /> Score Breakdown
            </h3>

            {[
              { label: 'Technical', score: data.advisory.technicalScore, icon: Activity },
              { label: 'Sentiment', score: data.advisory.sentimentScore, icon: Newspaper },
              { label: 'Trend', score: data.advisory.trendScore, icon: TrendingUp },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <item.icon size={12} /> {item.label}
                  </span>
                  <span className="text-xs font-bold" style={{
                    color: item.score > 0.1 ? 'var(--accent-success)' : item.score < -0.1 ? 'var(--accent-danger)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {item.score > 0 ? '+' : ''}{(item.score * 100).toFixed(0)}%
                  </span>
                </div>
                <ScoreGauge score={item.score} size="sm" />
              </div>
            ))}
          </div>

          {/* Price Targets */}
          {(data.advisory.targetEntry || data.advisory.targetExit || data.advisory.stopLoss) && (
            <div className="rounded-[16px] p-5 space-y-3" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                <Target size={16} style={{ color: 'var(--accent-primary)' }} /> Price Levels
              </h3>

              <div className="grid grid-cols-3 gap-3">
                {data.advisory.targetEntry && (
                  <div className="p-3 rounded-[10px] text-center" style={{ background: 'rgba(0, 184, 148, 0.08)' }}>
                    <ArrowDownCircle size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-success)' }} />
                    <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Entry</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--accent-success)', fontFamily: 'var(--font-mono)' }}>
                      {data.advisory.targetEntry.toLocaleString()}
                    </p>
                  </div>
                )}
                {data.advisory.targetExit && (
                  <div className="p-3 rounded-[10px] text-center" style={{ background: 'rgba(0, 210, 211, 0.08)' }}>
                    <ArrowUpCircle size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-secondary)' }} />
                    <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Take Profit</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--accent-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {data.advisory.targetExit.toLocaleString()}
                    </p>
                  </div>
                )}
                {data.advisory.stopLoss && (
                  <div className="p-3 rounded-[10px] text-center" style={{ background: 'rgba(255, 82, 82, 0.08)' }}>
                    <ShieldCheck size={16} className="mx-auto mb-1" style={{ color: 'var(--accent-danger)' }} />
                    <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Stop Loss</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--accent-danger)', fontFamily: 'var(--font-mono)' }}>
                      {data.advisory.stopLoss.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prediction */}
          <div className="rounded-[16px] p-5 space-y-3" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              <Activity size={16} style={{ color: 'var(--accent-primary)' }} /> Trend & Prediction
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {['shortTerm', 'mediumTerm', 'longTerm'].map((key) => {
                const term = data!.trend[key as keyof typeof data.trend] as { direction: string; strength: number };
                const label = key === 'shortTerm' ? '5-Day' : key === 'mediumTerm' ? '30-Day' : '90-Day';
                return (
                  <div key={key} className="p-3 rounded-[10px] text-center" style={{ background: 'var(--bg-secondary)' }}>
                    <TrendArrow direction={term.direction} />
                    <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-xs font-bold capitalize" style={{
                      color: term.direction === 'up' ? 'var(--accent-success)' : term.direction === 'down' ? 'var(--accent-danger)' : 'var(--text-muted)'
                    }}>
                      {term.direction}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Next-day prediction */}
            <div className="p-3 rounded-[12px] flex items-center justify-between" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Next-day estimate:</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                PKR {data.trend.prediction.nextDay.toLocaleString()} ({data.trend.prediction.confidenceLow.toLocaleString()} — {data.trend.prediction.confidenceHigh.toLocaleString()})
              </span>
            </div>

            {/* Crossover */}
            <div className="p-3 rounded-[12px]" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{data.trend.crossover.description}</p>
            </div>
          </div>

          {/* Reasoning */}
          <div className="rounded-[16px] p-5 space-y-2" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
              <Brain size={16} style={{ color: 'var(--accent-primary)' }} /> Analysis Reasoning
            </h3>
            {data.advisory.reasoning.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs mt-0.5" style={{ color: 'var(--accent-primary)' }}>•</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r}</span>
              </div>
            ))}
          </div>

          {/* News Headlines Used */}
          {data.sentiment.headlines.length > 0 && (
            <div className="rounded-[16px] p-5 space-y-2" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>
                <Newspaper size={16} style={{ color: 'var(--accent-primary)' }} /> News Analyzed
                <span className="text-[10px] px-1.5 py-0.5 rounded-[6px] font-normal" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  via {data.sentiment.method === 'finbert' ? 'FinBERT AI' : 'keyword analysis'}
                </span>
              </h3>
              {data.sentiment.headlines.map((h, i) => (
                <p key={i} className="text-xs pl-3" style={{ color: 'var(--text-secondary)', borderLeft: '2px solid var(--border-light)' }}>
                  {h}
                </p>
              ))}
            </div>
          )}

          {/* Refresh */}
          <div className="flex justify-center">
            <button
              onClick={() => analyze(data.symbol)}
              className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-medium transition-all hover:scale-105 cursor-pointer"
              style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}
            >
              <RefreshCw size={12} /> Refresh Analysis
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !data && (
        <div className="text-center py-16">
          <Brain size={48} className="mx-auto mb-4 opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Enter a stock symbol above to get AI-powered analysis
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Combines technical indicators, news sentiment & trend forecasting
          </p>
        </div>
      )}
    </div>
  );
}
