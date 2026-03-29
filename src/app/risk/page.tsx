'use client';

import { Shield } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import SectorBreakdown from '@/components/risk/SectorBreakdown';
import RiskMeter from '@/components/risk/RiskMeter';
import ConcentrationAlert from '@/components/risk/ConcentrationAlert';
import FeeAnalysisCard from '@/components/risk/FeeAnalysisCard';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useFeeAnalysis } from '@/hooks/useFeeAnalysis';
import { calculateRiskMetrics } from '@/lib/calculations';
import type { AppSettings } from '@/types';

export default function RiskPage() {
  const { trades, loading: tradesLoading } = useTrades();
  const { settings, loading: settingsLoading } = useSettings();
  const { loading: marketLoading, getPriceMap } = useMarketData();
  const priceMap = getPriceMap();
  const { holdings, sectorAllocation, summary } = usePortfolio(trades, priceMap);
  const riskMetrics = calculateRiskMetrics(holdings, settings as AppSettings);
  
  // Calculate fee analysis from actual trades
  const feeAnalysis = useFeeAnalysis(trades, summary.totalValue, summary.totalPL);

  const loading = tradesLoading || settingsLoading || marketLoading;

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Risk & Sectors" subtitle="Monitor concentration risk and sector exposure" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Risk & Sectors" subtitle="Monitor concentration risk and sector exposure" />
        <EmptyState
          icon={Shield}
          title="No risk data"
          description="Build your portfolio by adding trades. Risk metrics and sector allocation will appear here."
          actionLabel="Go to Trades"
          onAction={() => { globalThis.location.href = '/trades'; }}
        />
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Risk & Sectors" subtitle="Monitor concentration risk and sector exposure" />

      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
        Risk Dashboard
      </h2>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {riskMetrics.map((m) => (
          <RiskMeter key={m.label} metric={m} />
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
        Alerts
      </h2>
      <div className="mb-8">
        <ConcentrationAlert metrics={riskMetrics} holdings={holdings} sectorAllocation={sectorAllocation} />
      </div>

      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
        Sector Allocation
      </h2>
      <SectorBreakdown data={sectorAllocation} />

      {/* Fee Analysis from actual trades */}
      {feeAnalysis && trades.length > 0 && (
        <div className="mt-8">
          <FeeAnalysisCard analysis={feeAnalysis} />
        </div>
      )}
    </div>
  );
}
