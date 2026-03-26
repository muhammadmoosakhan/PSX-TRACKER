'use client';

import { Newspaper } from 'lucide-react';
import type { NewsSourceKey } from '@/types';
import { NEWS_SOURCES } from '@/lib/news-sources';

interface NewsSourceTabsProps {
  activeSource: NewsSourceKey;
  onSourceChange: (source: NewsSourceKey) => void;
  counts?: Record<string, number>;
}

const ALL_TAB = { key: 'all' as const, shortName: 'ALL NEWS', icon: null, color: 'var(--accent-primary)' };

export default function NewsSourceTabs({ activeSource, onSourceChange, counts }: NewsSourceTabsProps) {
  const sources = [ALL_TAB, ...Object.values(NEWS_SOURCES)];

  return (
    <div
      className="flex items-center gap-0 overflow-x-auto [&::-webkit-scrollbar]:hidden border-b"
      style={{
        scrollbarWidth: 'none',
        borderColor: 'var(--border-light)',
        background: 'var(--bg-card)',
      }}
    >
      {sources.map((source) => {
        const isActive = activeSource === source.key;
        const count = counts?.[source.key];

        return (
          <button
            key={source.key}
            onClick={() => onSourceChange(source.key as NewsSourceKey)}
            className="flex flex-col items-center gap-1 px-4 py-2.5 relative transition-all duration-200 flex-shrink-0 cursor-pointer"
            style={{
              color: isActive ? source.color : 'var(--text-muted)',
              minWidth: '70px',
            }}
          >
            {/* Source Icon */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200"
              style={{
                background: isActive ? `${typeof source.color === 'string' && source.color.startsWith('#') ? source.color : 'var(--accent-primary)'}15` : 'transparent',
              }}
            >
              {source.key === 'all' ? (
                <Newspaper size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              ) : (
                <span
                  className="text-xs font-black"
                  style={{
                    color: isActive ? source.color : 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {'icon' in source ? source.icon : ''}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className="text-[10px] font-semibold whitespace-nowrap tracking-wide"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {source.shortName}
              {count !== undefined && (
                <span className="ml-1 opacity-50">({count})</span>
              )}
            </span>

            {/* Active indicator */}
            {isActive && (
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full"
                style={{ background: source.color }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
