'use client';

import { useState, useMemo } from 'react';
import { ArrowLeftRight, ShoppingCart, TrendingDown, Layers } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import Badge from '@/components/ui/Badge';
import KPICard from '@/components/dashboard/KPICard';
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

  // Calculate trade summaries
  const tradeSummary = useMemo(() => {
    const buyTrades = trades.filter(t => t.trade_type === 'BUY');
    const sellTrades = trades.filter(t => t.trade_type === 'SELL');
    
    const totalBuyShares = buyTrades.reduce((sum, t) => sum + t.quantity, 0);
    const totalSellShares = sellTrades.reduce((sum, t) => sum + t.quantity, 0);
    const totalBuyValue = buyTrades.reduce((sum, t) => sum + (t.net_value || t.quantity * t.rate_per_share), 0);
    const totalSellValue = sellTrades.reduce((sum, t) => sum + (t.net_value || t.quantity * t.rate_per_share), 0);
    
    return {
      totalShares: totalBuyShares + totalSellShares,
      buyShares: totalBuyShares,
      sellShares: totalSellShares,
      buyValue: totalBuyValue,
      sellValue: totalSellValue,
      netShares: totalBuyShares - totalSellShares,
    };
  }, [trades]);

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

      {/* Trade Summary KPIs */}
      {trades.length > 0 && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <KPICard 
            label="Total Shares Traded" 
            value={tradeSummary.totalShares} 
            format="number" 
            icon={Layers} 
            color="#6C5CE7" 
            delay={0} 
          />
          <KPICard 
            label="Shares Bought" 
            value={tradeSummary.buyShares} 
            format="number" 
            icon={ShoppingCart} 
            color="#00B894" 
            delay={50} 
          />
          <KPICard 
            label="Shares Sold" 
            value={tradeSummary.sellShares} 
            format="number" 
            icon={TrendingDown} 
            color="#FF5252" 
            delay={100} 
          />
          <KPICard 
            label="Net Shares Held" 
            value={tradeSummary.netShares} 
            format="number" 
            icon={ArrowLeftRight} 
            color="#00D2D3" 
            delay={150} 
          />
        </div>
      )}

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
