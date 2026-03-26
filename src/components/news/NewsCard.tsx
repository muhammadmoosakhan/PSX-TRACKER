'use client';

import { ExternalLink, Share2, Clock } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { NEWS_SOURCES } from '@/lib/news-sources';

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

export default function NewsCard({ article }: { article: NewsArticle }) {
  const sourceConfig = article.source !== 'all' ? NEWS_SOURCES[article.source] : null;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator.share) {
      await navigator.share({ title: article.title, url: article.link });
    } else {
      await navigator.clipboard.writeText(article.link);
    }
  };

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 p-3 rounded-[14px] transition-all duration-200 hover:scale-[1.01] group"
      style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}
    >
      {/* Thumbnail */}
      <div
        className="w-[110px] h-[90px] rounded-[10px] flex-shrink-0 overflow-hidden"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="text-2xl font-bold opacity-30"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}
            >
              {sourceConfig?.icon || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3
            className="text-sm font-semibold leading-snug line-clamp-2 group-hover:underline"
            style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {article.title}
          </h3>
          <p
            className="text-xs mt-1 line-clamp-2 leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {article.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            {sourceConfig && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] text-white"
                style={{ background: sourceConfig.color }}
              >
                {sourceConfig.icon}
              </span>
            )}
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {article.sourceName}
            </span>
            <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <Clock size={10} />
              {timeAgo(article.pubDate)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="p-1 rounded-full transition-colors hover:bg-[var(--bg-secondary)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <Share2 size={13} />
            </button>
            <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>
    </a>
  );
}
