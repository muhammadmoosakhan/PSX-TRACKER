'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { StockCache } from '@/types';
import { formatPKR } from '@/lib/formatters';

interface StockSearchProps {
  stocks: StockCache[];
  onSelect: (stock: StockCache) => void;
  value?: string;
}

export default function StockSearch({ stocks, onSelect, value = '' }: Readonly<StockSearchProps>) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<StockCache[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const search = useCallback(
    (q: string) => {
      if (!q || q.length < 1) {
        setResults([]);
        setShowDropdown(false);
        return;
      }
      const upper = q.toUpperCase();
      const filtered = stocks
        .filter((s) => s.symbol.toUpperCase().includes(upper) || s.name.toUpperCase().includes(upper))
        .slice(0, 12);
      setResults(filtered);
      setShowDropdown(filtered.length > 0);
      setSelectedIndex(-1);
    },
    [stocks]
  );

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 200);
  };

  const handleSelect = (stock: StockCache) => {
    setQuery(stock.symbol);
    setShowDropdown(false);
    onSelect(stock);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && search(query)}
          placeholder="Search stock (e.g., ENGRO)..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
          style={{
            background: 'var(--input-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
          }}
        />
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 rounded-[14px] overflow-hidden max-h-[300px] overflow-y-auto"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {results.map((stock, i) => (
            <button
              key={stock.symbol}
              onClick={() => handleSelect(stock)}
              className={`
                w-full flex items-center justify-between px-4 py-2.5 text-left
                transition-all duration-100 cursor-pointer
              `}
              style={{
                background: i === selectedIndex ? 'var(--bg-secondary)' : 'transparent',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                    {stock.symbol}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                  >
                    {stock.sector}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {stock.name}
                </p>
              </div>
              <span className="font-mono-numbers text-sm ml-3" style={{ color: 'var(--text-primary)' }}>
                {formatPKR(stock.current_price, 2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
