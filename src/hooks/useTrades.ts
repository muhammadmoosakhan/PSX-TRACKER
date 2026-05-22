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

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(num) ? num : 0;
}

function normalizeTradeRow(trade: Trade): Trade {
  return {
    ...trade,
    quantity: toNumber(trade.quantity),
    rate_per_share: toNumber(trade.rate_per_share),
    gross_value: toNumber(trade.gross_value),
    brokerage: toNumber(trade.brokerage),
    cvt: toNumber(trade.cvt),
    net_value: toNumber(trade.net_value),
  };
}

function normalizeTradeInput(trade: TradeInput): TradeInput {
  return {
    ...trade,
    quantity: toNumber(trade.quantity),
    rate_per_share: toNumber(trade.rate_per_share),
    brokerage: toNumber(trade.brokerage),
    cvt: toNumber(trade.cvt),
    net_value: toNumber(trade.net_value),
  };
}

function normalizeTradeUpdate(trade: Partial<TradeInput>): Partial<TradeInput> {
  const updates: Partial<TradeInput> = { ...trade };
  if (trade.quantity !== undefined) updates.quantity = toNumber(trade.quantity);
  if (trade.rate_per_share !== undefined) updates.rate_per_share = toNumber(trade.rate_per_share);
  if (trade.brokerage !== undefined) updates.brokerage = toNumber(trade.brokerage);
  if (trade.cvt !== undefined) updates.cvt = toNumber(trade.cvt);
  if (trade.net_value !== undefined) updates.net_value = toNumber(trade.net_value);
  if (trade.commission !== undefined) updates.commission = toNumber(trade.commission);
  if (trade.sst !== undefined) updates.sst = toNumber(trade.sst);
  if (trade.cdc_fee !== undefined) updates.cdc_fee = toNumber(trade.cdc_fee);
  if (trade.laga !== undefined) updates.laga = toNumber(trade.laga);
  if (trade.secp !== undefined) updates.secp = toNumber(trade.secp);
  if (trade.ncs !== undefined) updates.ncs = toNumber(trade.ncs);
  if (trade.others !== undefined) updates.others = toNumber(trade.others);
  return updates;
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
      setTrades((data || []).map(normalizeTradeRow));
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

      const normalized = normalizeTradeInput(trade);
      const grossValue = normalized.quantity * normalized.rate_per_share;
      const { error: err } = await supabase.from('trades').insert({
        ...normalized,
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

      const rows = tradeInputs.map((trade) => {
        const normalized = normalizeTradeInput(trade);
        return {
          ...normalized,
          gross_value: normalized.quantity * normalized.rate_per_share,
          user_id: userId,
        };
      });

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
      const updates: Record<string, unknown> = normalizeTradeUpdate(trade);
      const qty = updates.quantity;
      const rate = updates.rate_per_share;
      if (qty !== undefined && rate !== undefined) {
        updates.gross_value = Number(qty) * Number(rate);
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
