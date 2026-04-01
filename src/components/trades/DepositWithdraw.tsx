'use client';

import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/Toast';

interface DepositWithdrawProps {
  onComplete: () => void;
}

export default function DepositWithdraw({ onComplete }: Readonly<DepositWithdrawProps>) {
  const { settings, updateSetting } = useSettings();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      showToast('error', 'Enter a valid amount');
      return;
    }

    setSaving(true);

    const currentCash = settings.broker_available_cash || 0;
    const newCash = mode === 'deposit' ? currentCash + num : currentCash - num;

    if (mode === 'withdraw' && newCash < 0) {
      showToast('error', 'Insufficient balance');
      setSaving(false);
      return;
    }

    // Update broker_available_cash
    const ok1 = await updateSetting('broker_available_cash', newCash);

    // Also update capital_available for deposit
    if (mode === 'deposit') {
      const currentCapital = settings.capital_available || 0;
      await updateSetting('capital_available', currentCapital + num);
    }

    setSaving(false);

    if (ok1) {
      showToast('success', `${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} of PKR ${num.toLocaleString()} recorded`);
      setAmount('');
      setMode(null);
      onComplete();
    } else {
      showToast('error', 'Failed to record transaction');
    }
  };

  if (!mode) {
    return (
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
    );
  }

  const isDeposit = mode === 'deposit';

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-xl border animate-[fade-in_0.2s_ease-out]"
      style={{
        background: 'var(--bg-card)',
        borderColor: isDeposit ? 'rgba(0,184,148,0.3)' : 'rgba(255,82,82,0.3)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isDeposit ? 'rgba(0,184,148,0.1)' : 'rgba(255,82,82,0.1)' }}
      >
        {isDeposit
          ? <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
          : <ArrowUpFromLine className="w-5 h-5 text-red-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
          {isDeposit ? 'Deposit to' : 'Withdraw from'} Munir Khanani Account
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>PKR</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="1"
            step="1"
            autoFocus
            className="w-40 px-3 py-2 text-sm rounded-lg outline-none transition-all
              focus:ring-2 focus:ring-opacity-30"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              fontFamily: 'var(--font-mono)',
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={saving || !amount}
        className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all
          disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: isDeposit ? '#00B894' : '#FF5252' }}
      >
        {saving ? '...' : isDeposit ? 'Deposit' : 'Withdraw'}
      </button>
      <button
        onClick={() => { setMode(null); setAmount(''); }}
        className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]
          hover:bg-[var(--bg-secondary)] transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
