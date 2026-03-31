'use client';

import { useState, useRef } from 'react';
import { RefreshCw, Download, Sun, Moon, Monitor, LogOut, RotateCcw, Trash2, AlertTriangle, Lock, Eye, EyeOff, Wrench } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
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
  const { signOut, changePassword } = useAuth();
  const { settings, loading, updateSetting, resetSettings } = useSettings();
  const { trades, deleteAllTrades } = useTrades();
  const { getPriceMap } = useMarketData();
  const priceMap = getPriceMap();
  const { holdings, sectorAllocation, summary } = usePortfolio(trades, priceMap);
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [resetModal, setResetModal] = useState<'settings' | 'trades' | 'all' | null>(null);
  const [resetting, setResetting] = useState(false);

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

        {/* Change Password */}
        <ChangePasswordCard changePassword={changePassword} showToast={showToast} />

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
              loading={repairing}
              onClick={async () => {
                setRepairing(true);
                try {
                  const res = await fetch('/api/trades/repair', { method: 'POST' });
                  const data = await res.json();
                  if (data.repaired > 0) {
                    showToast('success', `Repaired ${data.repaired} trades for ${data.user_email}`);
                    // Re-fetch trades to pick up newly claimed ones
                    globalThis.location.reload();
                  } else {
                    showToast('success', 'All trades are already linked to your account');
                  }
                } catch {
                  showToast('error', 'Failed to repair trades');
                }
                setRepairing(false);
              }}
            >
              <Wrench size={16} />
              Repair Orphaned Trades
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

        {/* Reset Options */}
        <Card hoverable={false}>
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            Reset
          </h3>
          <div className="space-y-3">
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => setResetModal('settings')}
            >
              <RotateCcw size={16} />
              Reset Settings to Defaults
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => setResetModal('trades')}
              disabled={trades.length === 0}
            >
              <Trash2 size={16} />
              Delete All Trades
            </Button>
            <Button
              variant="danger"
              size="md"
              className="w-full"
              onClick={() => setResetModal('all')}
            >
              <AlertTriangle size={16} />
              Reset Everything
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

      {/* Reset Confirmation Modal */}
      <Modal
        open={!!resetModal}
        onClose={() => setResetModal(null)}
        title={
          resetModal === 'settings'
            ? 'Reset Settings'
            : resetModal === 'trades'
              ? 'Delete All Trades'
              : 'Reset Everything'
        }
      >
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={24} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-danger)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {resetModal === 'settings' && 'This will reset all your settings (brokerage rate, tax rates, risk thresholds, capital) back to default values.'}
            {resetModal === 'trades' && `This will permanently delete all ${trades.length} trade(s). Your portfolio, P&L, and analysis data will be lost. This cannot be undone.`}
            {resetModal === 'all' && 'This will delete ALL your trades and reset ALL settings to defaults. Everything will be wiped clean. This cannot be undone.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setResetModal(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={resetting}
            onClick={async () => {
              setResetting(true);
              let success = true;
              if (resetModal === 'settings' || resetModal === 'all') {
                success = await resetSettings();
              }
              if ((resetModal === 'trades' || resetModal === 'all') && success) {
                success = await deleteAllTrades();
              }
              setResetting(false);
              setResetModal(null);
              if (success) {
                showToast('success',
                  resetModal === 'settings'
                    ? 'Settings reset to defaults'
                    : resetModal === 'trades'
                      ? 'All trades deleted'
                      : 'Everything has been reset'
                );
                if (resetModal !== 'settings') {
                  globalThis.location.reload();
                }
              } else {
                showToast('error', 'Reset failed. Please try again.');
              }
            }}
          >
            {resetModal === 'settings' ? 'Reset Settings' : resetModal === 'trades' ? 'Delete All' : 'Reset Everything'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ChangePasswordCard({
  changePassword,
  showToast,
}: Readonly<{
  changePassword: (current: string, newPass: string) => Promise<{ error: string | null }>;
  showToast: (type: 'success' | 'error', msg: string) => void;
}>) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) {
      showToast('error', 'New password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      showToast('error', 'New passwords do not match');
      return;
    }
    setSaving(true);
    const { error } = await changePassword(currentPw, newPw);
    setSaving(false);
    if (error) {
      showToast('error', error);
    } else {
      showToast('success', 'Password changed successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  };

  const inputStyle = {
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-light)',
  };

  return (
    <Card hoverable={false} className="md:col-span-2">
      <h3
        className="text-base font-semibold mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        <Lock size={18} style={{ color: 'var(--accent-primary)' }} />
        Change Password
      </h3>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 max-w-md">
        {/* Current Password */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              className="w-full px-3 py-2.5 pr-10 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
              style={inputStyle}
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            New Password
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 pr-10 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
              style={inputStyle}
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            required
            className="w-full px-3 py-2.5 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
            style={inputStyle}
            placeholder="Re-enter new password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={saving}
          disabled={!currentPw || !newPw || !confirmPw}
          className="w-full sm:w-auto"
        >
          <Lock size={14} />
          Update Password
        </Button>
      </form>
    </Card>
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
        {fields.map((field) => (
          <SettingsField
            key={field.key}
            field={field}
            rawValue={settings[field.key] || 0}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </Card>
  );
}

function SettingsField({
  field,
  rawValue,
  onUpdate,
}: Readonly<{
  field: SettingField;
  rawValue: number;
  onUpdate: (key: string, value: string, multiplier: number) => void;
}>) {
  const initialDisplay = (rawValue * field.multiplier).toFixed(field.multiplier === 100 ? 2 : 0);
  const [localValue, setLocalValue] = useState(initialDisplay);
  const [saving, setSaving] = useState(false);

  // Sync local state when settings reload (e.g., page refresh or external update)
  const prevRaw = useRef(rawValue);
  if (prevRaw.current !== rawValue) {
    prevRaw.current = rawValue;
    const newDisplay = (rawValue * field.multiplier).toFixed(field.multiplier === 100 ? 2 : 0);
    if (newDisplay !== localValue) {
      setLocalValue(newDisplay);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(field.key, localValue, field.multiplier);
    setSaving(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3">
      <label className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-secondary)' }}>
        {field.label}
      </label>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <input
          type="number"
          step={field.multiplier === 100 ? '0.01' : '1'}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            }
          }}
          disabled={saving}
          className="w-20 sm:w-24 px-2.5 py-1.5 text-sm text-right rounded-[10px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 disabled:opacity-50"
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
}
