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

      // Check cache age first
      if (!forceRefresh) {
        const { data: cached } = await supabase
          .from('stocks_cache')
          .select('*')
          .order('symbol');

        if (cached && cached.length > 0) {
          setStocks(cached);
          setLastUpdated(cached[0]?.updated_at || null);

          // If cache is less than 1 hour old, use it
          const cacheAge = Date.now() - new Date(cached[0].updated_at).getTime();
          if (cacheAge < 3600000) {
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
