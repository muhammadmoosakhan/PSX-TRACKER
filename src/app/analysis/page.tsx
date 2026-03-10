'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import MonthlyView from '@/components/analysis/MonthlyView';
import QuarterlyView from '@/components/analysis/QuarterlyView';
import YearlyView from '@/components/analysis/YearlyView';
import { useTrades } from '@/hooks/useTrades';
import { useAnalysis } from '@/hooks/useAnalysis';

type Tab = 'monthly' | 'quarterly' | 'yearly';

export default function AnalysisPage() {
  const { trades, loading } = useTrades();
  const { monthly, quarterly, yearly } = useAnalysis(trades);
  const [tab, setTab] = useState<Tab>('monthly');

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Analysis" subtitle="Monthly, quarterly, and yearly performance breakdowns" />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Analysis" subtitle="Monthly, quarterly, and yearly performance breakdowns" />
        <EmptyState
          icon={BarChart3}
          title="Not enough data"
          description="Add some trades first. Your performance analysis will appear here over time."
          actionLabel="Go to Trades"
          onAction={() => { globalThis.location.href = '/trades'; }}
        />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Analysis" subtitle="Monthly, quarterly, and yearly performance breakdowns" />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-[14px] mb-6 w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {([
          { key: 'monthly' as Tab, label: 'Monthly' },
          { key: 'quarterly' as Tab, label: 'Quarterly' },
          { key: 'yearly' as Tab, label: 'Yearly' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-5 py-2 text-sm font-medium rounded-[12px] transition-all duration-200 cursor-pointer"
            style={{
              background: tab === key ? 'var(--accent-primary)' : 'transparent',
              color: tab === key ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-[fade-in_0.3s_ease-out]">
        {tab === 'monthly' && <MonthlyView data={monthly} />}
        {tab === 'quarterly' && <QuarterlyView data={quarterly} />}
        {tab === 'yearly' && <YearlyView data={yearly} />}
      </div>
    </div>
  );
}
