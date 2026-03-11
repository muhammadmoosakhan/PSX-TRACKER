'use client';

import { useState } from 'react';
import { RefreshCw, Download, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/Toast';
import { useTrades } from '@/hooks/useTrades';
import { useMarketData } from '@/hooks/useMarketData';
import { usePortfolio } from '@/hooks/usePortfolio';
import { exportTradesCSV, generatePortfolioReport } from '@/lib/pdf-export';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import TwoFactorSetup from '@/components/settings/TwoFactorSetup';
import ProfileSection from '@/components/settings/ProfileSection';
import NotificationSection from '@/components/settings/NotificationSection';

interface SettingField {
  key: string;
  label: string;
  unit: string;
  multiplier: number; // 100 for percentages, 1 for raw
}

const tradingCosts: SettingField[] = [
  { key: 'brokerage_rate', label: 'Brokerage Rate', unit: '%', multiplier: 100 },
  { key: 'cvt_rate', label: 'CVT Rate', unit: '%', multiplier: 100 },
];

const capitalGainsTax: SettingField[] = [
  { key: 'cgt_rate_under_1y', label: 'CGT < 1 Year', unit: '%', multiplier: 100 },
  { key: 'cgt_rate_1_2y', label: 'CGT 1-2 Years', unit: '%', multiplier: 100 },
  { key: 'cgt_rate_2_3y', label: 'CGT 2-3 Years', unit: '%', multiplier: 100 },
  { key: 'cgt_rate_over_3y', label: 'CGT > 3 Years', unit: '%', multiplier: 100 },
];

const capitalFields: SettingField[] = [
  { key: 'capital_available', label: 'Total Capital Available', unit: 'PKR', multiplier: 1 },
  { key: 'leverage_used', label: 'Leverage Used', unit: 'PKR', multiplier: 1 },
];

const riskThresholds: SettingField[] = [
  { key: 'sector_warning', label: 'Sector Warning', unit: '%', multiplier: 100 },
  { key: 'sector_danger', label: 'Sector Danger', unit: '%', multiplier: 100 },
  { key: 'stock_warning', label: 'Stock Warning', unit: '%', multiplier: 100 },
  { key: 'stock_danger', label: 'Stock Danger', unit: '%', multiplier: 100 },
  { key: 'leverage_warning', label: 'Leverage Warning', unit: 'ratio', multiplier: 1 },
  { key: 'leverage_danger', label: 'Leverage Danger', unit: 'ratio', multiplier: 1 },
];

export default function SettingsPage() {
  const { signOut } = useAuth();
  const { settings, loading, updateSetting } = useSettings();
  const { trades } = useTrades();
  const { getPriceMap } = useMarketData();
  const priceMap = getPriceMap();
  const { holdings, sectorAllocation, summary } = usePortfolio(trades, priceMap);
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleUpdate = async (key: string, displayValue: string, multiplier: number) => {
    const num = Number.parseFloat(displayValue);
    if (Number.isNaN(num)) return;
    const rawValue = num / multiplier;
    const success = await updateSetting(key, rawValue);
    if (success) {
      showToast('success', 'Setting updated');
    } else {
      showToast('error', 'Failed to update setting');
    }
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/psx/market');
      const data = await res.json();
      showToast('success', `Stock cache refreshed — ${data.count || 0} stocks updated`);
    } catch {
      showToast('error', 'Failed to refresh stock cache');
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="animate-[fade-in_0.5s_ease-out]">
        <PageHeader title="Settings" subtitle="Configure your trading costs, tax rates, and preferences" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[fade-in_0.5s_ease-out]">
      <PageHeader title="Settings" subtitle="Configure your trading costs, tax rates, and preferences" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <ProfileSection />

        {/* Trading Costs */}
        <SettingsGroup
          title="Trading Costs"
          fields={tradingCosts}
          settings={settings}
          onUpdate={handleUpdate}
        />

        {/* Capital Gains Tax */}
        <SettingsGroup
          title="Capital Gains Tax"
          fields={capitalGainsTax}
          settings={settings}
          onUpdate={handleUpdate}
        />

        {/* Capital */}
        <SettingsGroup
          title="Capital"
          fields={capitalFields}
          settings={settings}
          onUpdate={handleUpdate}
        />

        {/* Risk Thresholds */}
        <SettingsGroup
          title="Risk Thresholds"
          fields={riskThresholds}
          settings={settings}
          onUpdate={handleUpdate}
        />

        {/* Appearance */}
        <Card hoverable={false}>
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            Appearance
          </h3>
          <div className="flex gap-2">
            {[
              { mode: 'light' as const, icon: Sun, label: 'Light' },
              { mode: 'dark' as const, icon: Moon, label: 'Dark' },
              { mode: 'system' as const, icon: Monitor, label: 'System' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px]
                  text-sm font-medium transition-all duration-200 cursor-pointer
                  ${theme === mode ? 'ring-2 ring-[var(--accent-primary)]' : ''}
                `}
                style={{
                  background: theme === mode ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: theme === mode ? '#fff' : 'var(--text-secondary)',
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </Card>

        {/* Security — 2FA */}
        <TwoFactorSetup />

        {/* Notifications */}
        <NotificationSection />

        {/* Data Management */}
        <Card hoverable={false}>
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            Data Management
          </h3>
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              loading={refreshing}
              onClick={handleRefreshCache}
            >
              <RefreshCw size={16} />
              Refresh Stock Cache
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => {
                exportTradesCSV(trades);
                showToast('success', 'CSV downloaded');
              }}
              disabled={trades.length === 0}
            >
              <Download size={16} />
              Export Trades (CSV)
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => {
                generatePortfolioReport(holdings, sectorAllocation, trades, summary);
                showToast('success', 'PDF downloaded');
              }}
              disabled={holdings.length === 0}
            >
              <Download size={16} />
              Export Portfolio Report (PDF)
            </Button>
          </div>
        </Card>

        {/* Sign Out */}
        <Card hoverable={false}>
          <button
            onClick={async () => {
              await signOut();
              globalThis.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] text-sm font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </Card>
      </div>
    </div>
  );
}

function SettingsGroup({
  title,
  fields,
  settings,
  onUpdate,
}: Readonly<{
  title: string;
  fields: SettingField[];
  settings: Record<string, number>;
  onUpdate: (key: string, value: string, multiplier: number) => void;
}>) {
  return (
    <Card hoverable={false}>
      <h3
        className="text-base font-semibold mb-4"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        {title}
      </h3>
      <div className="space-y-3">
        {fields.map((field) => {
          const displayValue = ((settings[field.key] || 0) * field.multiplier).toFixed(
            field.multiplier === 100 ? 2 : 0
          );
          return (
            <div key={field.key} className="flex items-center justify-between gap-2 sm:gap-3">
              <label className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
                {field.label}
              </label>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="number"
                  step={field.multiplier === 100 ? '0.01' : '1'}
                  defaultValue={displayValue}
                  onBlur={(e) => onUpdate(field.key, e.target.value, field.multiplier)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onUpdate(field.key, (e.target as HTMLInputElement).value, field.multiplier);
                    }
                  }}
                  className="w-20 sm:w-24 px-2.5 py-1.5 text-sm text-right rounded-[10px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                    fontFamily: 'var(--font-mono)',
                  }}
                />
                <span
                  className="text-xs w-8 text-right flex-shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {field.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
