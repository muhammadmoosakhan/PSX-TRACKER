// ============================================
// PSX Portfolio Tracker — TypeScript Types
// ============================================

export interface Trade {
  id: string;
  created_at: string;
  trade_date: string;
  symbol: string;
  stock_name: string;
  sector: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  rate_per_share: number;
  gross_value: number;
  brokerage: number;
  cvt: number;
  net_value: number;
  notes: string;
}

export interface TradeInput {
  trade_date: string;
  symbol: string;
  stock_name: string;
  sector: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  rate_per_share: number;
  brokerage: number;
  cvt: number;
  net_value: number;
  notes?: string;
}

export interface Setting {
  id: number;
  key: string;
  value: number;
  label: string;
  unit: string;
}

export interface SettingsMap {
  [key: string]: number;
}

export interface StockCache {
  symbol: string;
  name: string;
  sector: string;
  ldcp: number;
  open_price: number;
  high: number;
  low: number;
  current_price: number;
  change: number;
  change_pct: number;
  volume: number;
  updated_at: string;
}

export interface PortfolioHolding {
  symbol: string;
  stock_name: string;
  sector: string;
  quantity_held: number;
  avg_buy_price: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  unrealized_pl_pct: number;
  weight_pct: number;
  change_today: number;
  change_today_pct: number;
}

export interface SectorAllocation {
  sector: string;
  stock_count: number;
  total_invested: number;
  current_value: number;
  pl: number;
  pl_pct: number;
  weight_pct: number;
}

export interface RealizedTrade {
  symbol: string;
  stock_name: string;
  sector: string;
  quantity_sold: number;
  avg_buy_rate: number;
  sell_rate: number;
  buy_value: number;
  sell_value: number;
  realized_pl: number;
  realized_pl_pct: number;
  sell_date: string;
}

export interface MonthlyAnalysis {
  period: string;          // "March 2025"
  month: number;
  year: number;
  total_buys: number;
  total_sells: number;
  net_investment: number;
  realized_pl: number;
  trade_count: number;
  most_active_sector: string;
}

export interface QuarterlyAnalysis {
  period: string;          // "Q1 2025"
  quarter: number;
  year: number;
  total_buys: number;
  total_sells: number;
  net_investment: number;
  realized_pl: number;
  portfolio_value: number;
  qoq_growth_pct: number;
  best_sector: string;
  worst_sector: string;
}

export interface YearlyAnalysis {
  year: number;
  capital_deployed: number;
  capital_recovered: number;
  net_invested: number;
  realized_pl: number;
  roi_pct: number;
  trade_count: number;
  win_rate: number;
  best_trade_pl: number;
  worst_trade_pl: number;
}

export interface RiskMetric {
  label: string;
  value: number;
  unit: string;            // '%' or 'ratio' or 'PKR'
  status: 'safe' | 'warning' | 'danger';
  warning_threshold: number;
  danger_threshold: number;
}

export interface DashboardKPI {
  label: string;
  value: number;
  format: 'pkr' | 'percent' | 'number';
  change?: number;
  change_label?: string;
}

export interface StockHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  stock_name: string;
  sector: string;
  added_at: string;
  target_buy_price: number | null;
  notes: string;
}

export interface PSXIndex {
  name: string;
  current: number;
  change: number;
  change_pct: number;
  high: number;
  low: number;
  volume: number;
  updated_at: string;
}

export interface IndexTickPoint {
  timestamp: number;
  value: number;
  volume: number;
}

// ============================================
// News Types
// ============================================

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string | null;
  source: NewsSourceKey;
  sourceName: string;
  pubDate: string;
  category?: string;
  author?: string;
}

export type NewsSourceKey = 'all' | 'dawn' | 'tribune' | 'recorder' | 'profit';

export interface NewsSourceConfig {
  key: NewsSourceKey;
  name: string;
  shortName: string;
  rssUrl: string;
  color: string;
  icon: string;
  homepage: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppSettings extends SettingsMap {
  brokerage_rate: number;
  cvt_rate: number;
  cgt_rate_under_1y: number;
  cgt_rate_1_2y: number;
  cgt_rate_2_3y: number;
  cgt_rate_over_3y: number;
  capital_available: number;
  leverage_used: number;
  sector_warning: number;
  sector_danger: number;
  stock_warning: number;
  stock_danger: number;
  leverage_warning: number;
  leverage_danger: number;
}
