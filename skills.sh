#!/bin/bash
# ============================================
# PSX Portfolio Tracker — Project Setup Script
# Run this ONCE at the beginning of the project
# Usage: bash skills.sh
# ============================================

set -e  # Exit on any error

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   🇵🇰 PSX Portfolio Tracker — Project Setup      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Check prerequisites ──
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Install from https://nodejs.org"
    exit 1
fi
echo "  ✅ Node.js $(node --version)"

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "  ✅ npm $(npm --version)"

if ! command -v git &> /dev/null; then
    echo "⚠️  Git is not installed. You'll need it for deployment."
fi

# ── Check if we're already in a Next.js project ──
if [ -f "package.json" ] && grep -q "next" package.json 2>/dev/null; then
    echo ""
    echo "📦 Existing Next.js project detected. Installing additional dependencies..."
else
    echo ""
    echo "📦 No Next.js project found. Please run this INSIDE your project directory."
    echo "   If you haven't created a project yet, run:"
    echo ""
    echo "   npx create-next-app@latest psx-tracker"
    echo "   cd psx-tracker"
    echo "   bash skills.sh"
    echo ""
    exit 1
fi

# ── Install dependencies ──
echo ""
echo "📥 Installing dependencies..."

npm install @supabase/supabase-js
npm install recharts
npm install date-fns
npm install jspdf jspdf-autotable
npm install lucide-react
npm install @types/jspdf --save-dev 2>/dev/null || true

echo "  ✅ All dependencies installed"

# ── Create directory structure ──
echo ""
echo "📁 Creating directory structure..."

# App routes
mkdir -p src/app/trades
mkdir -p src/app/portfolio
mkdir -p src/app/analysis
mkdir -p src/app/risk
mkdir -p src/app/settings
mkdir -p src/app/api/psx/market
mkdir -p src/app/api/psx/history

# Components
mkdir -p src/components/layout
mkdir -p src/components/ui
mkdir -p src/components/dashboard
mkdir -p src/components/trades
mkdir -p src/components/portfolio
mkdir -p src/components/analysis
mkdir -p src/components/risk
mkdir -p src/components/charts

# Lib and hooks
mkdir -p src/lib
mkdir -p src/hooks
mkdir -p src/types

echo "  ✅ Directory structure created"

# ── Create .env.example ──
echo ""
echo "📝 Creating .env.example..."

cat > .env.example << 'EOF'
# Supabase Configuration
# Get these from: https://supabase.com → Your Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here
EOF

echo "  ✅ .env.example created"

# ── Check for .env.local ──
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚠️  No .env.local file found!"
    echo "   Create one by copying .env.example:"
    echo "   cp .env.example .env.local"
    echo "   Then fill in your Supabase URL and anon key."
else
    echo "  ✅ .env.local exists"
fi

# ── Create TypeScript types ──
echo ""
echo "📝 Creating TypeScript types..."

cat > src/types/index.ts << 'TYPES_EOF'
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
TYPES_EOF

echo "  ✅ Types created"

# ── Create constants ──
echo ""
echo "📝 Creating constants..."

cat > src/lib/constants.ts << 'CONST_EOF'
// ============================================
// PSX Portfolio Tracker — Constants
// ============================================

export const PSX_SECTORS = [
  'Fertilizer',
  'Oil & Gas',
  'Technology',
  'Banking',
  'Cement',
  'Pharma',
  'Power & Energy',
  'Automobile',
  'Textile',
  'Insurance',
  'Food & Personal Care',
  'Chemical',
  'Sugar',
  'Paper & Board',
  'Glass & Ceramics',
  'Engineering',
  'Tobacco',
  'Transport',
  'Real Estate',
  'Miscellaneous',
  'Other',
] as const;

export const TRADE_TYPES = ['BUY', 'SELL'] as const;

export const DEFAULT_SETTINGS = {
  brokerage_rate: 0.0045,
  cvt_rate: 0.01,
  cgt_rate_under_1y: 0.15,
  cgt_rate_1_2y: 0.125,
  cgt_rate_2_3y: 0.10,
  cgt_rate_over_3y: 0.0,
  capital_available: 0,
  leverage_used: 0,
  sector_warning: 0.30,
  sector_danger: 0.40,
  stock_warning: 0.20,
  stock_danger: 0.25,
  leverage_warning: 0.70,
  leverage_danger: 1.0,
};

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: 'LayoutDashboard' },
  { label: 'Trades', href: '/trades', icon: 'ArrowLeftRight' },
  { label: 'Portfolio', href: '/portfolio', icon: 'Briefcase' },
  { label: 'Analysis', href: '/analysis', icon: 'BarChart3' },
  { label: 'Risk', href: '/risk', icon: 'Shield' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const;

export const CHART_COLORS = [
  '#6C5CE7', // Purple
  '#00D2D3', // Teal
  '#FF6B6B', // Coral
  '#FECA57', // Yellow
  '#00B894', // Green
  '#E17055', // Orange
  '#74B9FF', // Light Blue
  '#A29BFE', // Lavender
  '#FD79A8', // Pink
  '#55EFC4', // Mint
] as const;
CONST_EOF

echo "  ✅ Constants created"

# ── Create formatters ──
echo ""
echo "📝 Creating formatters..."

cat > src/lib/formatters.ts << 'FMT_EOF'
// ============================================
// PSX Portfolio Tracker — Formatting Utilities
// ============================================

/**
 * Format a number as PKR currency
 * @example formatPKR(125000) → "PKR 125,000"
 * @example formatPKR(125000.50) → "PKR 125,000.50"
 */
export function formatPKR(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) return 'PKR 0';
  const formatted = Math.abs(value).toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-PKR ${formatted}` : `PKR ${formatted}`;
}

/**
 * Format compact PKR for large numbers
 * @example formatPKRCompact(1250000) → "PKR 1.25M"
 */
export function formatPKRCompact(value: number): string {
  if (Math.abs(value) >= 10000000) return `PKR ${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `PKR ${(value / 100000).toFixed(2)}L`;
  if (Math.abs(value) >= 1000) return `PKR ${(value / 1000).toFixed(1)}K`;
  return formatPKR(value);
}

/**
 * Format a number as percentage
 * @example formatPercent(0.1523) → "15.23%"
 * @example formatPercent(15.23, false) → "15.23%" (already percentage)
 */
export function formatPercent(value: number, isDecimal: boolean = true): string {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  const pct = isDecimal ? value * 100 : value;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

/**
 * Format a date string
 * @example formatDate('2025-03-15') → "15 Mar 2025"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date as month-year
 * @example formatMonthYear('2025-03-15') → "March 2025"
 */
export function formatMonthYear(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a plain number with commas
 * @example formatNumber(1234567) → "1,234,567"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Get quarter string from a date
 * @example getQuarter('2025-03-15') → "Q1 2025"
 */
export function getQuarter(dateStr: string): string {
  const date = new Date(dateStr);
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

/**
 * Return color class based on positive/negative value
 */
export function plColor(value: number): string {
  if (value > 0) return 'text-emerald-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}

/**
 * Return background color class based on positive/negative
 */
export function plBgColor(value: number): string {
  if (value > 0) return 'bg-emerald-50 dark:bg-emerald-950/30';
  if (value < 0) return 'bg-red-50 dark:bg-red-950/30';
  return 'bg-gray-50 dark:bg-gray-800';
}
FMT_EOF

echo "  ✅ Formatters created"

# ── Create Supabase client ──
echo ""
echo "📝 Creating Supabase client..."

cat > src/lib/supabase.ts << 'SUPA_EOF'
// ============================================
// PSX Portfolio Tracker — Supabase Client
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not found. Make sure .env.local has:\n' +
    '   NEXT_PUBLIC_SUPABASE_URL=your_url\n' +
    '   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
SUPA_EOF

echo "  ✅ Supabase client created"

# ── Summary ──
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║   Created:                                       ║"
echo "║   • src/types/index.ts    (TypeScript types)     ║"
echo "║   • src/lib/constants.ts  (App constants)        ║"
echo "║   • src/lib/formatters.ts (Formatting utils)     ║"
echo "║   • src/lib/supabase.ts   (DB client)            ║"
echo "║   • .env.example          (Env template)         ║"
echo "║   • 20+ directories       (App structure)        ║"
echo "║                                                  ║"
echo "║   Next steps:                                    ║"
echo "║   1. Make sure .env.local has your Supabase      ║"
echo "║      URL and anon key                            ║"
echo "║   2. Follow plan.md Phase 0 → Phase 11           ║"
echo "║   3. Start with: npm run dev                     ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
