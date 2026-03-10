'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { StockCache, StockHistoryPoint } from '@/types';

export function useMarketData() {
  const [stocks, setStocks] = useState<StockCache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchMarketData = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);

      // Check cache age first (skip if force refresh)
      if (!forceRefresh) {
        const { data: cached } = await supabase
          .from('stocks_cache')
          .select('*')
          .order('symbol');

        if (cached && cached.length > 0) {
          setStocks(cached);
          setLastUpdated(cached[0]?.updated_at || null);

          // If cache is less than 2 minutes old, use it
          const cacheAge = Date.now() - new Date(cached[0].updated_at).getTime();
          if (cacheAge < 120000) {
            setLoading(false);
            return cached;
          }
        }
      }

      // Fetch fresh data from API route
      const res = await fetch('/api/psx/market');
      if (!res.ok) throw new Error('Failed to fetch market data');

      const data = await res.json();
      if (data.stocks) {
        setStocks(data.stocks);
        setLastUpdated(new Date().toISOString());
      }
      setError(null);
      return data.stocks || [];
    } catch (e) {
      console.error('Error fetching market data:', e);
      setError('Market data may be outdated');
      return stocks;
    } finally {
      setLoading(false);
    }
  }, [stocks]);

  useEffect(() => {
    fetchMarketData();

    // Auto-refresh every 30s during PSX market hours (Mon-Fri, 9:30-15:30 PKT)
    const interval = setInterval(() => {
      const now = new Date();
      // Convert to PKT (UTC+5)
      const pkt = new Date(now.getTime() + (5 * 60 - now.getTimezoneOffset()) * 60000);
      const day = pkt.getDay(); // 0=Sun, 6=Sat
      const hours = pkt.getHours();
      const mins = pkt.getMinutes();
      const timeInMins = hours * 60 + mins;
      const isMarketOpen = day >= 1 && day <= 5 && timeInMins >= 570 && timeInMins <= 930; // 9:30-15:30
      if (isMarketOpen) {
        fetchMarketData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searchStocks = useCallback(
    (query: string): StockCache[] => {
      if (!query || query.length < 1) return [];
      const q = query.toUpperCase();
      return stocks
        .filter(
          (s) =>
            s.symbol.toUpperCase().includes(q) ||
            s.name.toUpperCase().includes(q)
        )
        .slice(0, 15);
    },
    [stocks]
  );

  const getStockPrice = useCallback(
    (symbol: string): StockCache | undefined => {
      return stocks.find((s) => s.symbol === symbol);
    },
    [stocks]
  );

  const getPriceMap = useCallback((): Record<string, StockCache> => {
    const map: Record<string, StockCache> = {};
    for (const s of stocks) {
      map[s.symbol] = s;
    }
    return map;
  }, [stocks]);

  const getStockHistory = useCallback(
    async (symbol: string): Promise<StockHistoryPoint[]> => {
      try {
        const res = await fetch(`/api/psx/history/${symbol}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        return data.history || [];
      } catch (e) {
        console.error('Error fetching stock history:', e);
        return [];
      }
    },
    []
  );

  return {
    stocks,
    loading,
    error,
    lastUpdated,
    fetchMarketData,
    searchStocks,
    getStockPrice,
    getPriceMap,
    getStockHistory,
  };
}
