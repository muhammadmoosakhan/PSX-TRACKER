'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Pencil } from 'lucide-react';
import KPICard from '@/components/dashboard/KPICard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface EditableKPICardProps {
  label: string;
  value: number;
  format: 'pkr' | 'percent' | 'number';
  icon: LucideIcon;
  color: string;
  change?: number;
  changeLabel?: string;
  delay?: number;
  onSave: (value: number) => Promise<boolean>;
}

export default function EditableKPICard({
  label,
  value,
  format,
  icon,
  color,
  change,
  changeLabel,
  delay,
  onSave,
}: Readonly<EditableKPICardProps>) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const openEditor = () => {
    setDraft(Number.isFinite(value) ? String(Math.round(value)) : '');
    setOpen(true);
  };

  const handleSave = async () => {
    const num = Number(draft.replace(/,/g, ''));
    if (!Number.isFinite(num)) {
      showToast('error', 'Enter a valid number');
      return;
    }
    setSaving(true);
    const success = await onSave(num);
    setSaving(false);
    if (success) {
      showToast('success', 'Value updated');
      setOpen(false);
    } else {
      showToast('error', 'Failed to update value');
    }
  };

  return (
    <div className="relative">
      <KPICard
        label={label}
        value={value}
        format={format}
        icon={icon}
        color={color}
        change={change}
        changeLabel={changeLabel}
        delay={delay}
      />
      <button
        type="button"
        onClick={openEditor}
        className="absolute top-3 right-3 p-1.5 rounded-[10px] transition-all hover:scale-105"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        aria-label={`Edit ${label}`}
      >
        <Pencil size={14} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Edit ${label}`}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              New value
            </label>
            <input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30 font-mono-numbers"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
              placeholder="0"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" loading={saving} onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
