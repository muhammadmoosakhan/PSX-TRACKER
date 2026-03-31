'use client';

import { useState, useEffect } from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import type { Trade, TradeInput, StockCache } from '@/types';
import { calculateTradeCosts } from '@/lib/calculations';
import { formatPKR } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StockSearch from './StockSearch';
import { useToast } from '@/components/ui/Toast';

interface TradeFormProps {
  stocks: StockCache[];
  brokerageRate: number;
  cvtRate: number;
  onSubmit: (trade: TradeInput) => Promise<boolean>;
  editTrade?: Trade | null;
  onCancelEdit?: () => void;
}

export default function TradeForm({
  stocks,
  brokerageRate,
  cvtRate,
  onSubmit,
  editTrade,
  onCancelEdit,
}: Readonly<TradeFormProps>) {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [tradeDate, setTradeDate] = useState(today);
  const [symbol, setSymbol] = useState('');
  const [stockName, setStockName] = useState('');
  const [sector, setSector] = useState('');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Pre-fill when editing
  useEffect(() => {
    if (editTrade) {
      setExpanded(true);
      setTradeDate(editTrade.trade_date);
      setSymbol(editTrade.symbol);
      setStockName(editTrade.stock_name);
      setSector(editTrade.sector);
      setTradeType(editTrade.trade_type);
      setQuantity(editTrade.quantity);
      setRate(editTrade.rate_per_share);
      setNotes(editTrade.notes || '');
    }
  }, [editTrade]);

  // Auto-calculate costs
  const grossValue = quantity * rate;
  const costs = calculateTradeCosts(grossValue, brokerageRate, cvtRate, tradeType);

  const handleStockSelect = (stock: StockCache) => {
    setSymbol(stock.symbol);
    setStockName(stock.name);
    setSector(stock.sector);
    if (stock.current_price > 0) setRate(stock.current_price);
  };

  const resetForm = () => {
    setTradeDate(today);
    setSymbol('');
    setStockName('');
    setSector('');
    setTradeType('BUY');
    setQuantity(0);
    setRate(0);
    setNotes('');
  };

  const handleSubmit = async () => {
    // Validation
    if (!symbol) { showToast('error', 'Please select a stock'); return; }
    if (quantity <= 0) { showToast('error', 'Quantity must be greater than 0'); return; }
    if (rate <= 0) { showToast('error', 'Rate must be greater than 0'); return; }

    setSubmitting(true);
    const trade: TradeInput = {
      trade_date: tradeDate,
      symbol,
      stock_name: stockName || symbol,
      sector: sector || 'Other',
      trade_type: tradeType,
      quantity,
      rate_per_share: rate,
      brokerage: costs.brokerage,
      cvt: costs.cvt,
      net_value: costs.netValue,
      notes,
    };

    const success = await onSubmit(trade);
    setSubmitting(false);

    if (success) {
      showToast('success', `${tradeType} trade added for ${symbol}`);
      resetForm();
      if (!editTrade) setExpanded(false);
      onCancelEdit?.();
    } else {
      showToast('error', 'Failed to save trade');
    }
  };

  return (
    <Card hoverable={false} padding="none" className="mb-6 overflow-hidden">
      {/* Header — toggle expand */}
      <button
        onClick={() => {
          if (editTrade) return;
          setExpanded(!expanded);
        }}
        className="w-full flex items-center justify-between px-6 py-4 cursor-pointer"
        style={{ background: expanded ? 'var(--bg-card)' : 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center"
            style={{ background: 'var(--accent-primary)' }}
          >
            <Plus size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editTrade ? 'Edit Trade' : 'Add New Trade'}
          </span>
        </div>
        {!editTrade && (
          expanded ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4 animate-[slide-up_0.3s_ease-out]">
          {/* Row 1: Date + Stock Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Date</label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Stock</label>
              <StockSearch stocks={stocks} onSelect={handleStockSelect} value={symbol} />
            </div>
          </div>

          {/* Auto-filled fields */}
          {symbol && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Stock Name</label>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{stockName || '—'}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Sector</label>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{sector ? getSectorDisplay(sector).name : '—'}</p>
              </div>
            </div>
          )}

          {/* Row 2: Type Toggle */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Type</label>
            <div className="flex gap-2">
              {(['BUY', 'SELL'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTradeType(type)}
                  className={`
                    flex-1 py-3 rounded-[12px] text-sm font-bold
                    transition-all duration-200 cursor-pointer
                    ${tradeType === type ? 'text-white scale-[1.02]' : ''}
                  `}
                  style={{
                    background: tradeType === type
                      ? (type === 'BUY' ? 'var(--accent-success)' : 'var(--accent-danger)')
                      : 'var(--bg-secondary)',
                    color: tradeType === type ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Qty + Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity > 0 ? quantity : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuantity(val === '' ? 0 : Math.max(0, Math.round(Number(val))));
                }}
                placeholder="0"
                className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 font-mono-numbers"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Rate per Share</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rate > 0 ? rate : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setRate(val === '' ? 0 : Math.max(0, Number(val)));
                }}
                placeholder="0.00"
                className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 font-mono-numbers"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>

          {/* Cost Preview */}
          {grossValue > 0 && (
            <div
              className="rounded-[14px] p-4 space-y-2"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Gross Value</span>
                <span className="font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(grossValue, 2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>Brokerage ({(brokerageRate * 100).toFixed(2)}%)</span>
                <span className="font-mono-numbers" style={{ color: 'var(--text-muted)' }}>{formatPKR(costs.brokerage, 2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>CVT ({(cvtRate * 100).toFixed(2)}%)</span>
                <span className="font-mono-numbers" style={{ color: 'var(--text-muted)' }}>{formatPKR(costs.cvt, 2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
                <span style={{ color: 'var(--text-primary)' }}>Net Value</span>
                <span
                  className="font-mono-numbers text-base"
                  style={{ color: tradeType === 'BUY' ? 'var(--accent-danger)' : 'var(--accent-success)' }}
                >
                  {formatPKR(costs.netValue, 2)}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none resize-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              placeholder="Optional notes about this trade..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="primary" size="lg" className="flex-1" loading={submitting} onClick={handleSubmit}>
              {editTrade ? 'Update Trade' : `Add ${tradeType} Trade`}
            </Button>
            {editTrade && (
              <Button variant="ghost" size="lg" onClick={() => { resetForm(); onCancelEdit?.(); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
