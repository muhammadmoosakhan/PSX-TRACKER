'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Trade, TradeInput } from '@/types';

interface TradeFilters {
  symbol?: string;
  sector?: string;
  trade_type?: 'BUY' | 'SELL';
  dateFrom?: string;
  dateTo?: string;
}

async function getAuthUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = useCallback(async (filters?: TradeFilters) => {
    try {
      setLoading(true);

      const userId = await getAuthUserId();
      let query = supabase
        .from('trades')
        .select('*')
        .order('trade_date', { ascending: false });

      // Explicitly filter by user_id for safety (belt + suspenders with RLS)
      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (filters?.symbol) {
        query = query.ilike('symbol', `%${filters.symbol}%`);
      }
      if (filters?.sector) {
        query = query.eq('sector', filters.sector);
      }
      if (filters?.trade_type) {
        query = query.eq('trade_type', filters.trade_type);
      }
      if (filters?.dateFrom) {
        query = query.gte('trade_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('trade_date', filters.dateTo);
      }

      const { data, error: err } = await query;

      if (err) throw err;
      setTrades(data || []);
      setError(null);
    } catch (e) {
      console.error('Error fetching trades:', e);
      setError('Unable to load trades. Check your connection.');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [fetchTrades]);

  const addTrade = useCallback(async (trade: TradeInput): Promise<boolean> => {
    try {
      const userId = await getAuthUserId();
      if (!userId) {
        console.error('Cannot add trade: user not authenticated');
        return false;
      }

      const grossValue = trade.quantity * trade.rate_per_share;
      const { error: err } = await supabase.from('trades').insert({
        ...trade,
        gross_value: grossValue,
        user_id: userId,
      });

      if (err) throw err;
      await fetchTrades();
      return true;
    } catch (e) {
      console.error('Error adding trade:', e);
      return false;
    }
  }, [fetchTrades]);

  const bulkAddTrades = useCallback(async (tradeInputs: TradeInput[]): Promise<boolean> => {
    try {
      const userId = await getAuthUserId();
      if (!userId) {
        console.error('Cannot add trades: user not authenticated');
        return false;
      }

      const rows = tradeInputs.map((trade) => ({
        ...trade,
        gross_value: trade.quantity * trade.rate_per_share,
        user_id: userId,
      }));

      const { error: err } = await supabase.from('trades').insert(rows);
      if (err) throw err;
      await fetchTrades();
      return true;
    } catch (e) {
      console.error('Error bulk adding trades:', e);
      return false;
    }
  }, [fetchTrades]);

  const updateTrade = useCallback(async (id: string, trade: Partial<TradeInput>): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = { ...trade };
      if (trade.quantity && trade.rate_per_share) {
        updates.gross_value = trade.quantity * trade.rate_per_share;
      }

      const { error: err } = await supabase
        .from('trades')
        .update(updates)
        .eq('id', id);

      if (err) throw err;
      await fetchTrades();
      return true;
    } catch (e) {
      console.error('Error updating trade:', e);
      return false;
    }
  }, [fetchTrades]);

  const deleteTrade = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (err) throw err;
      await fetchTrades();
      return true;
    } catch (e) {
      console.error('Error deleting trade:', e);
      return false;
    }
  }, [fetchTrades]);

  const deleteAllTrades = useCallback(async (): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('trades')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      if (err) throw err;
      setTrades([]);
      return true;
    } catch (e) {
      console.error('Error deleting all trades:', e);
      return false;
    }
  }, []);

  return {
    trades,
    loading,
    error,
    fetchTrades,
    addTrade,
    bulkAddTrades,
    updateTrade,
    deleteTrade,
    deleteAllTrades,
  };
}
