# PSX Portfolio Tracker

A personal investment tracking app for the **Pakistan Stock Exchange (PSX)**. Track trades, monitor your portfolio in real-time, analyze performance, and manage risk — all in one place.

**Live:** [psx-tracker-two.vercel.app](https://psx-tracker-two.vercel.app)

---

## Features

### Dashboard
- Portfolio value, total invested, unrealized & realized P&L at a glance
- Win rate, cash remaining KPIs
- Portfolio value trend chart
- Sector allocation donut chart
- Recent trades & top holdings

### Trade Management
- Log BUY/SELL trades with auto-calculated brokerage & CVT
- Searchable stock picker with live PSX data
- Filter by symbol, sector, type, date range
- Sortable & paginated trade table
- Mobile-friendly card layout

### Portfolio
- Real-time holdings with live market prices from PSX
- Average buy price, cost basis, market value, P&L per stock
- Weight allocation bars
- One-click refresh from PSX data portal

### Analysis
- Monthly, quarterly, and yearly performance breakdown
- Trade volume, realized P&L, net investment trends
- Interactive charts (line, bar)

### Risk & Sectors
- Risk meter gauges (stock concentration, sector concentration, leverage)
- Automated alerts for concentration thresholds
- Sector allocation breakdown with donut chart

### Settings
- Configurable brokerage rate, CVT, capital gains tax slabs
- Capital & leverage tracking
- Risk threshold configuration
- Light/Dark/System theme toggle
- Two-Factor Authentication (2FA) setup
- Export: PDF report & CSV trades

### Authentication & Security
- Email/password signup & login
- Email verification
- TOTP 2FA (Google Authenticator, Authy)
- Forgot password flow
- Route protection via middleware
- Multi-user support with Row Level Security

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + @supabase/ssr |
| Charts | Recharts |
| PDF Export | jsPDF + jspdf-autotable |
| Icons | Lucide React |
| Fonts | Plus Jakarta Sans, DM Sans, JetBrains Mono |
| Hosting | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install

```bash
git clone https://github.com/muhammadmoosakhan/PSX-TRACKER.git
cd PSX-TRACKER
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Trades table
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  trade_date DATE NOT NULL,
  symbol TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  rate_per_share NUMERIC NOT NULL CHECK (rate_per_share > 0),
  gross_value NUMERIC NOT NULL,
  brokerage NUMERIC DEFAULT 0,
  cvt NUMERIC DEFAULT 0,
  net_value NUMERIC NOT NULL,
  notes TEXT DEFAULT ''
);

-- Settings table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  key TEXT NOT NULL,
  value NUMERIC NOT NULL,
  label TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  CONSTRAINT settings_user_key UNIQUE (user_id, key)
);

-- Stocks cache (shared market data)
CREATE TABLE stocks_cache (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  sector TEXT,
  ldcp NUMERIC,
  open_price NUMERIC,
  high NUMERIC,
  low NUMERIC,
  current_price NUMERIC,
  change NUMERIC,
  change_pct NUMERIC,
  volume BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Watchlist
CREATE TABLE watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id),
  symbol TEXT NOT NULL,
  stock_name TEXT NOT NULL,
  sector TEXT DEFAULT '',
  added_at TIMESTAMPTZ DEFAULT now(),
  target_buy_price NUMERIC,
  notes TEXT DEFAULT ''
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Per-user policies
CREATE POLICY "Users see own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own trades" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own trades" ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own trades" ON trades FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users see own settings" ON settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON settings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public read stocks_cache" ON stocks_cache FOR SELECT USING (true);
CREATE POLICY "Service write stocks_cache" ON stocks_cache FOR ALL USING (true);

CREATE POLICY "Users see own watchlist" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own watchlist" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own watchlist" ON watchlist FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_trades_date ON trades(trade_date DESC);
CREATE INDEX idx_settings_user ON settings(user_id);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
```

### 4. Supabase Auth Configuration

In your Supabase Dashboard:
1. **Authentication > URL Configuration** — Set Site URL to `http://localhost:3000`
2. **Authentication > URL Configuration** — Add redirect URL: `http://localhost:3000/auth/callback`
3. **Authentication > Multi-Factor** — Enable TOTP

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the login page.

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── trades/page.tsx             # Trade log
│   ├── portfolio/page.tsx          # Holdings
│   ├── analysis/page.tsx           # Performance analysis
│   ├── risk/page.tsx               # Risk & sectors
│   ├── settings/page.tsx           # Configuration & 2FA
│   ├── login/page.tsx              # Sign in
│   ├── login/verify-mfa/page.tsx   # 2FA verification
│   ├── signup/page.tsx             # Create account
│   ├── forgot-password/page.tsx    # Password reset
│   ├── auth/callback/route.ts      # Auth redirect handler
│   ├── api/psx/market/route.ts     # PSX market data API
│   └── api/psx/history/[symbol]/route.ts
├── components/
│   ├── ui/          # Button, Card, Modal, Toast, etc.
│   ├── layout/      # Sidebar, MobileNav, AppShell
│   ├── charts/      # LineChart, BarChart, PieChart
│   ├── dashboard/   # KPICard, RecentTrades, TopHoldings
│   ├── trades/      # TradeForm, TradeTable, StockSearch
│   ├── portfolio/   # HoldingsTable
│   ├── analysis/    # MonthlyView, QuarterlyView, YearlyView
│   ├── risk/        # RiskMeter, ConcentrationAlert, SectorBreakdown
│   └── settings/    # TwoFactorSetup
├── hooks/           # useAuth, useTrades, usePortfolio, etc.
├── lib/             # supabase, calculations, formatters, psx
├── types/           # TypeScript interfaces
└── middleware.ts     # Route protection
```

---

## Deployment

Deployed on [Vercel](https://vercel.com). To deploy your own:

1. Push to GitHub
2. Import in Vercel
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Update Supabase redirect URLs with your Vercel domain

---

## Disclaimer

This is a **personal portfolio tracking tool** for educational purposes. It does not provide financial advice. Users are responsible for their own investment decisions.

---

## License

MIT
