'use client';

import { useState } from 'react';
import { Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { Trade } from '@/types';
import { formatPKR, formatDate } from '@/lib/formatters';
import { getSectorDisplay } from '@/lib/constants';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Card from '@/components/ui/Card';

interface TradeTableProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => Promise<boolean>;
}

type SortKey = 'trade_date' | 'symbol' | 'trade_type' | 'quantity' | 'rate_per_share' | 'net_value' | 'sector';

const PAGE_SIZE = 20;

export default function TradeTable({ trades, onEdit, onDelete }: Readonly<TradeTableProps>) {
  const [sortKey, setSortKey] = useState<SortKey>('trade_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterSector, setFilterSector] = useState('');

  // Apply filters
  let filtered = trades;
  if (filterType !== 'ALL') {
    filtered = filtered.filter((t) => t.trade_type === filterType);
  }
  if (filterSector) {
    filtered = filtered.filter((t) => t.sector === filterSector);
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await onDelete(deleteId);
    setDeleting(false);
    setDeleteId(null);
  };

  const sectors = [...new Set(trades.map((t) => t.sector))].sort();

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex rounded-[10px] overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
          {(['ALL', 'BUY', 'SELL'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setPage(0); }}
              className="px-3 py-1.5 text-xs font-medium transition-all cursor-pointer"
              style={{
                background: filterType === type ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: filterType === type ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {type}
            </button>
          ))}
        </div>
        {sectors.length > 0 && (
          <select
            value={filterSector}
            onChange={(e) => { setFilterSector(e.target.value); setPage(0); }}
            className="px-3 py-1.5 text-xs rounded-[10px] outline-none cursor-pointer"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
            }}
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => <option key={s} value={s}>{getSectorDisplay(s).name}</option>)}
          </select>
        )}
        <span className="text-xs self-center ml-auto" style={{ color: 'var(--text-muted)' }}>
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Card hoverable={false} padding="none">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {[
                  { key: 'trade_date' as SortKey, label: 'Date' },
                  { key: 'symbol' as SortKey, label: 'Symbol' },
                  { key: 'sector' as SortKey, label: 'Sector' },
                  { key: 'trade_type' as SortKey, label: 'Type' },
                  { key: 'quantity' as SortKey, label: 'Qty' },
                  { key: 'rate_per_share' as SortKey, label: 'Rate' },
                  { key: 'net_value' as SortKey, label: 'Net Value' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left font-medium cursor-pointer select-none"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <ArrowUpDown size={12} className={sortKey === key ? 'opacity-100' : 'opacity-30'} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((trade, i) => (
                <tr
                  key={trade.id}
                  className="transition-colors"
                  style={{
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{formatDate(trade.trade_date)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--accent-primary)' }}>{trade.symbol}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{getSectorDisplay(trade.sector).name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={trade.trade_type === 'BUY' ? 'buy' : 'sell'}>
                      {trade.trade_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{trade.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono-numbers" style={{ color: 'var(--text-primary)' }}>{formatPKR(trade.rate_per_share, 2)}</td>
                  <td className="px-4 py-3 font-mono-numbers font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPKR(trade.net_value, 2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(trade)}
                        className="p-1.5 rounded-[8px] transition-all hover:scale-110 cursor-pointer"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(trade.id)}
                        className="p-1.5 rounded-[8px] transition-all hover:scale-110 cursor-pointer"
                        style={{ color: 'var(--accent-danger)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paged.map((trade) => (
          <Card key={trade.id} padding="sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="font-semibold text-sm" style={{ color: 'var(--accent-primary)' }}>{trade.symbol}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{formatDate(trade.trade_date)}</span>
              </div>
              <Badge variant={trade.trade_type === 'BUY' ? 'buy' : 'sell'}>
                {trade.trade_type}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Qty</span>
                <p className="font-mono-numbers font-medium" style={{ color: 'var(--text-primary)' }}>{trade.quantity.toLocaleString()}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Rate</span>
                <p className="font-mono-numbers font-medium" style={{ color: 'var(--text-primary)' }}>{formatPKR(trade.rate_per_share, 2)}</p>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Net</span>
                <p className="font-mono-numbers font-semibold" style={{ color: 'var(--text-primary)' }}>{formatPKR(trade.net_value, 0)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-light)' }}>
              <button onClick={() => onEdit(trade)} className="text-xs font-medium cursor-pointer" style={{ color: 'var(--accent-primary)' }}>Edit</button>
              <button onClick={() => setDeleteId(trade.id)} className="text-xs font-medium cursor-pointer" style={{ color: 'var(--accent-danger)' }}>Delete</button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} />
          </Button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Trade">
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Are you sure you want to delete this trade? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
