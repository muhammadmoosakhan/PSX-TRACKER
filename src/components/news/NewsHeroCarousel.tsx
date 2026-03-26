'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { NewsArticle } from '@/types';
import { NEWS_SOURCES } from '@/lib/news-sources';

interface NewsHeroCarouselProps {
  articles: NewsArticle[];
}

export default function NewsHeroCarousel({ articles }: NewsHeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const heroArticles = articles.filter((a) => a.imageUrl).slice(0, 8);

  const next = useCallback(() => {
    if (heroArticles.length === 0) return;
    setCurrent((c) => (c + 1) % heroArticles.length);
  }, [heroArticles.length]);

  const prev = useCallback(() => {
    if (heroArticles.length === 0) return;
    setCurrent((c) => (c - 1 + heroArticles.length) % heroArticles.length);
  }, [heroArticles.length]);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (paused || heroArticles.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [paused, next, heroArticles.length]);

  if (heroArticles.length === 0) return null;

  const article = heroArticles[current];
  const sourceConfig = article.source !== 'all' ? NEWS_SOURCES[article.source] : null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: '280px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Image */}
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full"
      >
        <img
          src={article.imageUrl!}
          alt={article.title}
          className="w-full h-full object-cover transition-opacity duration-500"
          loading="eager"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '';
            (e.target as HTMLImageElement).style.background = 'var(--bg-secondary)';
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.05) 100%)',
          }}
        />

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-10">
          <h2
            className="text-white text-lg font-bold leading-tight line-clamp-3"
            style={{ fontFamily: 'var(--font-heading)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
          >
            {article.title}
          </h2>

          {/* Source badge */}
          {sourceConfig && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] text-white"
                style={{ background: sourceConfig.color }}
              >
                {sourceConfig.icon}
              </span>
              <span
                className="text-white/80 text-xs font-medium"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
              >
                {sourceConfig.name.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      </a>

      {/* Nav arrows */}
      {heroArticles.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:bg-black/60 transition-all cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {heroArticles.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {heroArticles.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className="transition-all duration-300 rounded-full cursor-pointer"
              style={{
                width: i === current ? '18px' : '6px',
                height: '6px',
                background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
