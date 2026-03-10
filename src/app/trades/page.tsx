'use client';

import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import TradeForm from '@/components/trades/TradeForm';
import TradeTable from '@/components/trades/TradeTable';
import { useTrades } from '@/hooks/useTrades';
import { useSettings } from '@/hooks/useSettings';
import { useMarketData } from '@/hooks/useMarketData';
import type { Trade } from '@/types';

export default function TradesPage() {
  const { trades, loading: tradesLoading, addTrade, updateTrade, deleteTrade } = useTrades();
  const { settings, loading: settingsLoading } = useSettings();
  const { stocks, loading: stocksLoading } = useMarketData();
  const [editTrade, setEditTrade] = useState<Trade | null>(null);

  const loading = tradesLoading || settingsLoading || stocksLoading;

  const handleSubmit = async (trade: Parameters<typeof addTrade>[0]) => {
    if (editTrade) {
      return updateTrade(editTrade.id, trade);
    }
    return addTrade(trade);
  };

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Trade Log" subtitle="Record and manage your buy/sell trades" />
        <SkeletonCard />
        <div className="mt-4"><SkeletonTable rows={5} /></div>
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader
        title="Trade Log"
        subtitle="Record and manage your buy/sell trades"
        action={
          trades.length > 0 ? (
            <Badge variant="neutral">{trades.length} trades</Badge>
          ) : undefined
        }
      />

      <TradeForm
        stocks={stocks}
        brokerageRate={settings.brokerage_rate}
        cvtRate={settings.cvt_rate}
        onSubmit={handleSubmit}
        editTrade={editTrade}
        onCancelEdit={() => setEditTrade(null)}
      />

      {trades.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No trades yet"
          description="Click 'Add New Trade' above to log your first buy or sell transaction."
        />
      ) : (
        <TradeTable
          trades={trades}
          onEdit={setEditTrade}
          onDelete={deleteTrade}
        />
      )}
    </div>
  );
}
