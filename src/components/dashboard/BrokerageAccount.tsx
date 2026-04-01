'use client';

import { Landmark, Wallet, ShieldCheck, TrendingUp, Coins, Receipt, BarChart3, PieChart } from 'lucide-react';
import Card from '@/components/ui/Card';
import type { AppSettings } from '@/types';

interface BrokerageAccountProps {
  settings: AppSettings;
  availableCash?: number;
  cashDelta?: number; // totalDeposits - totalWithdrawals since snapshot
}

interface AccountField {
  label: string;
  key: keyof AppSettings;
  icon: React.ElementType;
  color: string;
  prefix?: string;
}

const FIELDS: AccountField[] = [
  { label: 'Ledger Balance', key: 'broker_ledger_balance', icon: Landmark, color: '#6C5CE7' },
  { label: 'Available Cash', key: 'broker_available_cash', icon: Wallet, color: '#00B894' },
  { label: 'Net Worth', key: 'broker_net_worth', icon: TrendingUp, color: '#0984E3' },
  { label: 'Total Collaterals', key: 'broker_total_collaterals', icon: ShieldCheck, color: '#00D2D3' },
  { label: 'Margin Eligible', key: 'broker_margin_eligible', icon: Coins, color: '#FECA57' },
  { label: 'Sold Collaterals', key: 'broker_sold_collaterals', icon: BarChart3, color: '#E17055' },
  { label: 'Account %', key: 'broker_account_pct', icon: PieChart, color: '#A29BFE', prefix: '' },
  { label: 'Expenses', key: 'broker_expense_amount', icon: Receipt, color: '#FF7675' },
];

function formatValue(val: number, prefix?: string): string {
  if (prefix === '') return val.toFixed(2);
  return val.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BrokerageAccount({ settings, availableCash, cashDelta = 0 }: Readonly<BrokerageAccountProps>) {
  const hasData = FIELDS.some((f) => (settings[f.key] as number) > 0);
  if (!hasData) return null;

  return (
    <Card hoverable={false} className="animate-[slide-up_0.5s_ease-out_forwards] opacity-0" style={{ animationDelay: '280ms' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#6C5CE7]/10 flex items-center justify-center">
          <Landmark className="w-4 h-4 text-[#6C5CE7]" />
        </div>
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
          Brokerage Account
        </h3>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
          Munir Khanani
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FIELDS.map((field) => {
          // Dynamic values: available cash, ledger balance, net worth adjust with deposits/withdrawals
          let val = settings[field.key] as number;
          if (field.key === 'broker_available_cash' && availableCash !== undefined) {
            val = availableCash;
          } else if (field.key === 'broker_ledger_balance' && cashDelta !== 0) {
            val = val + cashDelta;
          } else if (field.key === 'broker_net_worth' && cashDelta !== 0) {
            val = val + cashDelta;
          }
          if (val === 0 && field.key !== 'broker_expense_amount') return null;
          const Icon = field.icon;
          return (
            <div
              key={field.key}
              className="flex flex-col gap-1 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]"
            >
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color: field.color }} />
                <span className="text-[10px] font-medium text-[var(--text-muted)] truncate">{field.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                {field.prefix !== '' && (
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">PKR</span>
                )}
                <span className="text-sm font-bold font-mono-numbers" style={{ color: 'var(--text-primary)' }}>
                  {formatValue(val, field.prefix)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
