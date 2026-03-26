'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { NewsArticle, NewsSourceKey } from '@/types';
import { SOURCE_KEYS } from '@/lib/news-sources';
import NewsHeroCarousel from '@/components/news/NewsHeroCarousel';
import NewsSourceTabs from '@/components/news/NewsSourceTabs';
import NewsCard from '@/components/news/NewsCard';
import NewsTicker from '@/components/news/NewsTicker';

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [activeSource, setActiveSource] = useState<NewsSourceKey>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kse100, setKse100] = useState<{ value: number; change: number } | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/psx/news?source=all');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setError('Unable to load news. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIndex = useCallback(async () => {
    try {
      const res = await fetch('/api/psx/indices');
      if (!res.ok) return;
      const data = await res.json();
      const kse = data.indices?.find?.((i: { name: string }) =>
        i.name?.toUpperCase().includes('KSE100') || i.name?.toUpperCase().includes('KSE 100')
      );
      if (kse) setKse100({ value: kse.current, change: kse.change });
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNews();
    fetchIndex();
  }, [fetchNews, fetchIndex]);

  // Filter articles by source (client-side)
  const filtered = activeSource === 'all'
    ? articles
    : articles.filter((a) => a.source === activeSource);

  // Counts per source
  const counts: Record<string, number> = { all: articles.length };
  for (const key of SOURCE_KEYS) {
    counts[key] = articles.filter((a) => a.source === key).length;
  }

  // Hero articles (one per source for variety, with images)
  const heroArticles: NewsArticle[] = [];
  const usedSources = new Set<string>();
  for (const a of articles) {
    if (a.imageUrl && !usedSources.has(a.source)) {
      heroArticles.push(a);
      usedSources.add(a.source);
    }
    if (heroArticles.length >= 4) break;
  }
  // Fill remaining slots with next best image articles
  for (const a of articles) {
    if (heroArticles.length >= 8) break;
    if (a.imageUrl && !heroArticles.includes(a)) {
      heroArticles.push(a);
    }
  }

  const visibleArticles = filtered.slice(0, visibleCount);

  return (
    <div className="max-w-3xl mx-auto animate-[fade-in_0.3s_ease-out]">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1
          className="text-lg font-bold"
          style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}
        >
          TODAY&apos;S BUSINESS NEWS
        </h1>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="p-2 rounded-[10px] transition-all hover:scale-105 cursor-pointer"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Hero Carousel */}
      {!loading && heroArticles.length > 0 && (
        <NewsHeroCarousel articles={heroArticles} />
      )}

      {/* Loading skeleton for carousel */}
      {loading && (
        <div
          className="w-full animate-[shimmer_1.5s_infinite]"
          style={{ height: '280px', background: 'var(--skeleton-base)' }}
        />
      )}

      {/* KSE100 Ticker */}
      {kse100 && (
        <NewsTicker indexName="KSE100" value={kse100.value} change={kse100.change} />
      )}

      {/* Source Tabs */}
      <NewsSourceTabs
        activeSource={activeSource}
        onSourceChange={(s) => { setActiveSource(s); setVisibleCount(20); }}
        counts={counts}
      />

      {/* News Feed */}
      <div className="px-2 pb-24">
        {loading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-[shimmer_1.5s_infinite]">
                <div
                  className="w-[110px] h-[90px] rounded-[10px] flex-shrink-0"
                  style={{ background: 'var(--skeleton-base)' }}
                />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 rounded" style={{ background: 'var(--skeleton-base)', width: '80%' }} />
                  <div className="h-3 rounded" style={{ background: 'var(--skeleton-base)', width: '60%' }} />
                  <div className="h-3 rounded" style={{ background: 'var(--skeleton-base)', width: '40%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
            <button
              onClick={fetchNews}
              className="mt-3 px-4 py-2 rounded-[10px] text-sm font-medium text-white cursor-pointer"
              style={{ background: 'var(--accent-primary)' }}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No articles found for this source.
            </p>
          </div>
        )}

        {!loading && !error && visibleArticles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}

        {/* Load More */}
        {!loading && visibleCount < filtered.length && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setVisibleCount((c) => c + 20)}
              className="px-6 py-2.5 rounded-[12px] text-sm font-medium transition-all hover:scale-105 cursor-pointer"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--accent-primary)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Load More ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
