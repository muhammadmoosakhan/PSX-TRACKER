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

### Market Indices
- Live PSX indices — KSE100, KSE30, KMI30 + 15 more
- KSE100 hero card with intraday area chart (Recharts)
- **Clickable index cards** — tap any index to see detailed view
- **Index detail page** with full intraday chart, stats grid, day's range bar
- **Market status indicator** — live open/closed badge (Mon-Fri, 9:30-15:30 PKT)
- Green/red color coding for positive/negative changes
- High, low, change %, absolute change per index
- Real-time refresh from PSX Data Portal

### Stocks Browser
- 500+ PSX listed securities with live prices
- Real company logos via Google Favicon API (60+ mapped stocks)
- Colored fallback circles for unmapped stocks
- Search by symbol or company name
- **38 sector codes mapped** to proper names with emojis (e.g. "🏦 Commercial Banks")
- Filter by sector, sort by change%, volume, price
- Stats bar: total, gainers (green), losers (red), unchanged
- **Clickable stocks** — tap any stock to open full detail page
- "Load More" pagination for performance
- Mobile-optimized card layout

### Business News (NEW)
- Aggregated business news from **4 Pakistani sources**: Dawn, Express Tribune, Business Recorder, Profit
- **Hero carousel** — featured stories with full-width images, headline overlay, source badge, auto-rotate
- **Source filter tabs** — ALL NEWS | DAWN | TRIBUNE | RECORDER | PROFIT (instant client-side switching)
- **News cards** — thumbnail, headline, snippet, source logo, time ago, share button
- **KSE100 ticker strip** — live index value between carousel and news feed
- Click any article to open original source in new tab
- 15-minute server-side RSS cache for fast loads
- ~95 articles across all sources

### Stock Detail Page
Each stock has a dedicated detail page (`/stocks/[symbol]`) with **6 tabs**:

- **Live** — Current price, intraday chart (1D/1M/6M/YTD/1Y/3Y/5Y), stats (volume, open, LDCP), latest quote (bid/ask), Day's Range slider, 52-Week Range slider, Circuit Breakers (±7.5%)
- **Fundamentals** — Earnings (EPS, P/E, PEG), Performance (profit margins, ROE/ROA/ROCE), Payouts (DPS, dividend yield), Valuations (book value, PBV, market cap), Financial Health (current ratio, quick ratio, debt ratios)
- **Technicals** — RSI(14), STOCH(14,3,3), MACD(12,26,9) with BUY/SELL/NEUTRAL signals; Pivot Points (R3-S3); Simple Moving Averages (SMA5-150) — all computed locally from EOD data
- **Announcements** — Company announcements with VIEW/PDF links, chronological list
- **Profile** — Company background, equity profile (market cap, shares, free float), top executives, contact info
- **Competitors** — Sector peers with logos, prices, and change %

> **Derivative symbol support:** 66 derivative tickers (XD, NC, WU, XB, XR, ETFXD, NLXB suffixes) automatically resolve to their parent company data for profile, fundamentals, news, and chart history.

### Risk & Sectors
- Risk meter gauges (stock concentration, sector concentration, leverage)
- Automated alerts for concentration thresholds
- Sector allocation breakdown with donut chart

### Email Notifications (SMTP)
- **Market Open Alert** — emailed at 9:30 AM PKT (Mon-Fri) when PSX opens
- **Market Close Summary** — emailed at 3:30 PM PKT with all index changes
- **Daily Portfolio Report** — portfolio value, P&L, top 5 gainers/losers, index summary
- Vercel Cron Jobs for automated scheduling
- Configurable per-user: toggle on/off, choose notification types
- Dark-themed HTML email templates with KPI cards and color-coded tables
- Works with any SMTP provider (Gmail, Outlook, custom)

### Watchlist
- Add stocks to personal watchlist with target buy prices
- Track watchlisted stocks against live market data
- Notes per watchlist entry

### Settings
- Configurable brokerage rate, CVT, capital gains tax slabs
- Capital & leverage tracking
- Risk threshold configuration
- **Email notification preferences** — enable/disable, choose alerts
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
| PSX Data | dps.psx.com.pk (free, no API key) |
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

# For email notifications (optional)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=PSX Tracker <your-email@gmail.com>
CRON_SECRET=a-random-secret-string
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

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false NOT NULL,
  email TEXT,
  market_open BOOLEAN DEFAULT true NOT NULL,
  market_close BOOLEAN DEFAULT true NOT NULL,
  daily_report BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prefs" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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
│   ├── market/page.tsx              # PSX indices (KSE100, KSE30, etc.)
│   ├── market/[index]/page.tsx     # Index detail view with chart
│   ├── stocks/page.tsx             # All PSX stocks browser
│   ├── risk/page.tsx               # Risk & sectors
│   ├── settings/page.tsx           # Configuration & 2FA
│   ├── login/page.tsx              # Sign in
│   ├── login/verify-mfa/page.tsx   # 2FA verification
│   ├── signup/page.tsx             # Create account
│   ├── forgot-password/page.tsx    # Password reset
│   ├── auth/callback/route.ts      # Auth redirect handler
│   ├── news/page.tsx               # Business news aggregator (4 sources)
│   ├── api/psx/market/route.ts     # PSX market data API
│   ├── api/psx/news/route.ts       # RSS news aggregator API
│   ├── api/psx/indices/route.ts    # PSX indices API
│   ├── api/psx/indices/[index]/route.ts  # Index intraday data
│   ├── api/psx/history/[symbol]/route.ts
│   ├── api/psx/company/[symbol]/route.ts  # Company scraper (fundamentals, profile, announcements)
│   ├── stocks/[symbol]/page.tsx           # Stock detail page (6 tabs)
│   ├── api/notifications/market-open/route.ts   # Cron: market open email
│   └── api/notifications/market-close/route.ts  # Cron: close + daily report
├── components/
│   ├── ui/          # Button, Card, Modal, Toast, etc.
│   ├── layout/      # Sidebar, MobileNav, AppShell
│   ├── news/        # NewsHeroCarousel, NewsSourceTabs, NewsCard, NewsTicker
│   ├── charts/      # LineChart, BarChart, PieChart
│   ├── dashboard/   # KPICard, RecentTrades, TopHoldings
│   ├── trades/      # TradeForm, TradeTable, StockSearch
│   ├── portfolio/   # HoldingsTable
│   ├── analysis/    # MonthlyView, QuarterlyView, YearlyView
│   ├── risk/        # RiskMeter, ConcentrationAlert, SectorBreakdown
│   └── settings/    # TwoFactorSetup, ProfileSection
├── hooks/           # useAuth, useTrades, usePortfolio, etc.
├── lib/             # supabase, calculations, formatters, psx, stock-logos, email, technicals, news-sources
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

## Audit Scripts

Diagnostic scripts for verifying data coverage across all ~506 PSX stocks:

```bash
node scripts/audit_all_stocks.js          # Full audit of all stocks (6 tabs each)
node scripts/check_stock.js HUBC          # Deep check a single stock
node scripts/summarize_issues.js          # Grouped issue report from audit
node scripts/list_broken.js               # List stocks with critical failures
node scripts/list_broken.js history       # Filter by tab (live/history/company/fundamentals/announcements/profile)
node scripts/diff_audit_results.js        # Compare pre/post fix audit results
bash scripts/progress.sh                  # One-line health summary
```

### Latest Audit Results

| Metric | Count |
|--------|-------|
| Stocks audited | 472 |
| Fully working (all tabs) | 416 (88%) |
| Partial (some data missing) | 56 (12%) |
| Broken (critical failures) | 0 (0%) |

See [docs/FIXES_APPLIED.md](docs/FIXES_APPLIED.md) and [docs/ISSUES_FOUND.md](docs/ISSUES_FOUND.md) for details.

---

## Disclaimer

This is a **personal portfolio tracking tool** for educational purposes. It does not provide financial advice. Users are responsible for their own investment decisions.

---

## License

MIT
