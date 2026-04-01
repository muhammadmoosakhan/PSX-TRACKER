'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, X, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import type { Trade } from '@/types';

interface DepositWithdrawProps {
  trades: Trade[];
  onAddTrade: (trade: Record<string, unknown>) => Promise<boolean>;
  onDeleteTrade: (id: string) => Promise<boolean>;
  onUpdateTrade: (id: string, trade: Record<string, unknown>) => Promise<boolean>;
}

/** Cash transactions are stored as trades with fee_source='cash_tx' and symbol='CASH' */
export const CASH_TX_SYMBOL = 'CASH';
export const CASH_TX_MARKER = 'cash_tx';

export function isCashTransaction(trade: Trade): boolean {
  return trade.fee_source === CASH_TX_MARKER || trade.symbol === CASH_TX_SYMBOL;
}

export function getCashTransactions(trades: Trade[]): Trade[] {
  return trades.filter(isCashTransaction);
}

export function getStockTrades(trades: Trade[]): Trade[] {
  return trades.filter(t => !isCashTransaction(t));
}

export default function DepositWithdraw({ trades, onAddTrade, onDeleteTrade, onUpdateTrade }: Readonly<DepositWithdrawProps>) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const cashTxs = getCashTransactions(trades);

  const handleSubmit = async () => {
    const num = Number.parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) {
      showToast('error', 'Enter a valid amount');
      return;
    }

    setSaving(true);

    const tradeInput = {
      trade_date: new Date().toISOString().split('T')[0],
      symbol: CASH_TX_SYMBOL,
      stock_name: mode === 'deposit' ? 'Cash Deposit' : 'Cash Withdrawal',
      sector: 'Cash',
      trade_type: mode === 'deposit' ? 'BUY' as const : 'SELL' as const,
      quantity: 1,
      rate_per_share: num,
      brokerage: 0,
      cvt: 0,
      net_value: num,
      notes: notes || (mode === 'deposit' ? 'Deposited to broker' : 'Withdrawn from broker'),
      fee_source: 'cash_tx' as const,
    };

    const ok = await onAddTrade(tradeInput as any);
    setSaving(false);

    if (ok) {
      showToast('success', `${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} of PKR ${num.toLocaleString()} recorded`);
      setAmount('');
      setNotes('');
      setMode(null);
    } else {
      showToast('error', 'Failed to record transaction');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await onDeleteTrade(id);
    if (ok) showToast('success', 'Transaction deleted');
    else showToast('error', 'Failed to delete');
  };

  const handleEditSave = async (tx: Trade) => {
    const num = Number.parseFloat(editAmount);
    if (Number.isNaN(num) || num <= 0) {
      showToast('error', 'Enter a valid amount');
      return;
    }
    const ok = await onUpdateTrade(tx.id, {
      rate_per_share: num,
      net_value: num,
    } as any);
    if (ok) {
      showToast('success', 'Transaction updated');
      setEditingId(null);
    } else {
      showToast('error', 'Failed to update');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons or Form */}
      {!mode ? (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('deposit')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-light)]
              bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-emerald-500
              hover:border-emerald-500 transition-all"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Deposit Cash
          </button>
          <button
            onClick={() => setMode('withdraw')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-light)]
              bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-red-500
              hover:border-red-500 transition-all"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Withdraw Cash
          </button>
        </div>
      ) : (
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl border animate-[fade-in_0.2s_ease-out]"
          style={{
            background: 'var(--bg-card)',
            borderColor: mode === 'deposit' ? 'rgba(0,184,148,0.3)' : 'rgba(255,82,82,0.3)',
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: mode === 'deposit' ? 'rgba(0,184,148,0.1)' : 'rgba(255,82,82,0.1)' }}
          >
            {mode === 'deposit'
              ? <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
              : <ArrowUpFromLine className="w-5 h-5 text-red-500" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              {mode === 'deposit' ? 'Deposit to' : 'Withdraw from'} Broker Account
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PKR</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                min="1"
                autoFocus
                className="w-32 px-3 py-2 text-sm rounded-lg outline-none transition-all
                  focus:ring-2 focus:ring-opacity-30"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)' }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              />
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note (optional)"
                className="w-40 px-3 py-2 text-sm rounded-lg outline-none transition-all
                  focus:ring-2 focus:ring-opacity-30"
                style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || !amount}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: mode === 'deposit' ? '#00B894' : '#FF5252' }}
          >
            {saving ? '...' : mode === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
          <button
            onClick={() => { setMode(null); setAmount(''); setNotes(''); }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Transaction History */}
      {cashTxs.length > 0 && (
        <div className="rounded-xl border border-[var(--border-light)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <div className="px-4 py-2.5 border-b border-[var(--border-light)]" style={{ background: 'var(--bg-secondary)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Cash Transaction History ({cashTxs.length})
            </p>
          </div>
          <div className="divide-y divide-[var(--border-light)]">
            {cashTxs.map((tx) => {
              const isDeposit = tx.trade_type === 'BUY';
              const isEditing = editingId === tx.id;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: isDeposit ? 'rgba(0,184,148,0.1)' : 'rgba(255,82,82,0.1)' }}
                  >
                    {isDeposit
                      ? <ArrowDownToLine className="w-4 h-4 text-emerald-500" />
                      : <ArrowUpFromLine className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {isDeposit ? 'Deposit' : 'Withdrawal'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(tx.trade_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {tx.notes ? ` — ${tx.notes}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-24 px-2 py-1 text-sm rounded-lg outline-none"
                          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', fontFamily: 'var(--font-mono)' }}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') { handleEditSave(tx); } if (e.key === 'Escape') { setEditingId(null); } }}
                        />
                        <button onClick={() => handleEditSave(tx)} className="text-emerald-500 text-xs font-semibold px-2 py-1 rounded hover:bg-emerald-500/10">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-[var(--text-muted)] text-xs px-1">Cancel</button>
                      </div>
                    ) : (
                      <>
                        <span
                          className="text-sm font-bold font-mono-numbers"
                          style={{ color: isDeposit ? '#00B894' : '#FF5252' }}
                        >
                          {isDeposit ? '+' : '-'}PKR {tx.net_value.toLocaleString()}
                        </span>
                        <button
                          onClick={() => { setEditingId(tx.id); setEditAmount(String(tx.net_value)); }}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-secondary)] transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
