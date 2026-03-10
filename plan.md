# plan.md — Implementation Plan (Phase by Phase)

> **RULE:** Complete each phase fully, test it, then commit before starting the next.
> **RULE:** After each phase, run `npm run dev` and verify in browser.
> **RULE:** Never skip a phase. They build on each other.

---

## Phase 0: Project Setup & Foundation
**Goal:** Scaffold the project, install dependencies, configure Tailwind, set up Supabase client.
**Estimated effort:** Foundation

### Tasks:
- [ ] 0.1 Run `skills.sh` to scaffold and install dependencies
- [ ] 0.2 Configure `tailwind.config.ts` with custom colors, fonts, border-radius from CLAUDE.md Design System
- [ ] 0.3 Set up `src/app/globals.css` with CSS variables (both light and dark mode), custom animation keyframes (fadeIn, slideUp, shimmer, pulse), and base utility classes
- [ ] 0.4 Configure `src/app/layout.tsx` — import Google Fonts (Plus Jakarta Sans, DM Sans, JetBrains Mono), add `<html>` with `data-theme` attribute, add metadata
- [ ] 0.5 Create `src/lib/supabase.ts` — initialize Supabase client using env vars
- [ ] 0.6 Create `src/types/index.ts` — define all TypeScript interfaces (Trade, Setting, StockCache, PortfolioHolding, SectorAllocation, AnalysisRow, RiskMetric)
- [ ] 0.7 Create `src/lib/constants.ts` — sector list, PSX sectors mapping, default values
- [ ] 0.8 Create `src/lib/formatters.ts` — formatPKR(), formatPercent(), formatDate(), formatNumber()
- [ ] 0.9 Create `.env.example` with placeholder values
- [ ] 0.10 Verify: `npm run dev` — should show default Next.js page with custom fonts loaded

**Commit:** `phase-0: project foundation and configuration`

---

## Phase 1: Layout Shell & Navigation
**Goal:** Build the app skeleton — sidebar, mobile nav, theme toggle, page containers.

### Tasks:
- [ ] 1.1 Create `src/components/ui/Button.tsx` — primary, secondary, danger, ghost variants with bubbly hover/press animations
- [ ] 1.2 Create `src/components/ui/Card.tsx` — base card with shadow, hover lift, rounded corners
- [ ] 1.3 Create `src/components/ui/Skeleton.tsx` — shimmer loading placeholder
- [ ] 1.4 Create `src/components/ui/Badge.tsx` — colored labels for BUY/SELL/sector/status
- [ ] 1.5 Create `src/components/ui/EmptyState.tsx` — icon + message + CTA button
- [ ] 1.6 Create `src/hooks/useTheme.ts` — toggle dark/light, persist in localStorage (theme only — this is the ONE exception to the no-localStorage rule since it's a UI preference, not data)
- [ ] 1.7 Create `src/components/layout/ThemeToggle.tsx` — sun/moon toggle button with smooth rotation animation
- [ ] 1.8 Create `src/components/layout/Sidebar.tsx` — desktop sidebar with: logo/app name, nav links (Dashboard, Trades, Portfolio, Analysis, Risk, Settings), each with lucide icon, active state pill, theme toggle at bottom, collapsible
- [ ] 1.9 Create `src/components/layout/MobileNav.tsx` — bottom tab bar for mobile with 5 main tabs, active indicator dot/pill animation
- [ ] 1.10 Create `src/components/layout/PageHeader.tsx` — page title + optional subtitle + optional action button
- [ ] 1.11 Update `src/app/layout.tsx` — integrate Sidebar (desktop) + MobileNav (mobile) + main content area with proper padding
- [ ] 1.12 Create placeholder pages for each route: `/`, `/trades`, `/portfolio`, `/analysis`, `/risk`, `/settings` — each showing PageHeader + "Coming soon" EmptyState
- [ ] 1.13 Verify: All pages navigate correctly, sidebar highlights active page, theme toggle works, mobile nav shows on small screens

**Commit:** `phase-1: layout shell with sidebar and navigation`

---

## Phase 2: Supabase Integration & Data Hooks
**Goal:** Build all data access hooks that other phases will use.

### Tasks:
- [ ] 2.1 Create `src/hooks/useSettings.ts`:
  - `getSettings()` — fetch all settings as key-value object
  - `updateSetting(key, value)` — update a single setting
  - Loading and error states
- [ ] 2.2 Create `src/hooks/useTrades.ts`:
  - `getTrades(filters?)` — fetch trades with optional date/symbol/sector/type filters
  - `addTrade(trade)` — insert new trade, auto-calculate brokerage/cvt/net_value using settings
  - `updateTrade(id, trade)` — update existing trade
  - `deleteTrade(id)` — soft delete with confirmation
  - Loading and error states
- [ ] 2.3 Create `src/lib/calculations.ts`:
  - `calculateHoldings(trades)` — returns array of PortfolioHolding
  - `calculateSectorAllocation(holdings)` — returns array of SectorAllocation
  - `calculateRealizedPL(trades)` — returns array of realized P&L entries
  - `calculateMonthlyAnalysis(trades)` — groups by month
  - `calculateQuarterlyAnalysis(trades)` — groups by quarter
  - `calculateYearlyAnalysis(trades)` — groups by year
  - `calculateRiskMetrics(holdings, settings)` — returns risk dashboard data
- [ ] 2.4 Create `src/hooks/usePortfolio.ts`:
  - Uses `useTrades` + `calculations.ts` to derive current holdings
  - Merges with live prices from stocks_cache
  - Returns holdings, totals, sector allocation
- [ ] 2.5 Create `src/hooks/useAnalysis.ts`:
  - Uses `useTrades` + `calculations.ts` to derive monthly/quarterly/yearly data
- [ ] 2.6 Create `src/hooks/useMarketData.ts`:
  - `fetchMarketData()` — calls `/api/psx/market`
  - `searchStocks(query)` — searches stocks_cache by symbol or name
  - `getStockHistory(symbol)` — calls `/api/psx/history/[symbol]`
  - Auto-refresh market data if cache is older than 1 hour
- [ ] 2.7 Verify: Write a test page that calls each hook and console.logs the results

**Commit:** `phase-2: data hooks and calculation engine`

---

## Phase 3: PSX API Routes
**Goal:** Server-side API routes that fetch data from PSX Data Portal.

### Tasks:
- [ ] 3.1 Create `src/app/api/psx/market/route.ts`:
  - GET handler
  - Fetch `https://dps.psx.com.pk/market-watch`
  - Parse the response — it may return HTML (parse table) or JSON
  - Normalize data into clean StockCache[] array
  - Upsert into Supabase `stocks_cache` table
  - Return JSON response
  - Error handling: if PSX fails, query stocks_cache and return cached data with `{ cached: true, lastUpdated: timestamp }`
- [ ] 3.2 Create `src/app/api/psx/history/[symbol]/route.ts`:
  - GET handler with dynamic `[symbol]` param
  - Fetch `https://dps.psx.com.pk/timeseries/eod/{symbol}`
  - Parse response into `{ date, open, high, low, close, volume }[]`
  - Return JSON
  - Error handling: return `{ error: "Unable to fetch history" }` with 500 status
- [ ] 3.3 Test both routes by visiting them in browser: `/api/psx/market` and `/api/psx/history/ENGRO`
- [ ] 3.4 Verify: Market data loads, at least some stocks are returned, history returns daily data

**Commit:** `phase-3: PSX API routes with caching`

---

## Phase 4: Settings Page
**Goal:** Build the settings page so all calculations have their parameters ready.

### Tasks:
- [ ] 4.1 Create `src/components/ui/Input.tsx` — styled input with label, helper text, error state, PKR/% prefix/suffix
- [ ] 4.2 Create `src/components/ui/Toast.tsx` — success/error/warning toast notification with slide-in animation
- [ ] 4.3 Build `src/app/settings/page.tsx`:
  - Grouped cards: Trading Costs, Capital Gains Tax, Capital, Risk Thresholds, Appearance
  - Each setting: label, current value, inline edit (click to edit, save on blur or Enter)
  - Theme toggle (Light/Dark/System)
  - "Refresh Stock Cache" button — calls `/api/psx/market`
  - "Export Trades CSV" button
  - Toast confirmations on save
- [ ] 4.4 Verify: Can edit any setting, value persists on page reload, theme toggle works

**Commit:** `phase-4: settings page with editable parameters`

---

## Phase 5: Trade Log Page
**Goal:** Build the trade entry form and trade history table.

### Tasks:
- [ ] 5.1 Create `src/components/trades/StockSearch.tsx`:
  - Searchable input with dropdown results
  - Debounced search (300ms) against stocks_cache
  - Shows: SYMBOL — Name — Sector — Price
  - On select: calls parent callback with full stock data
- [ ] 5.2 Create `src/components/ui/Select.tsx` — styled dropdown
- [ ] 5.3 Create `src/components/ui/Modal.tsx` — modal/drawer with overlay, close button, animation
- [ ] 5.4 Create `src/components/trades/TradeForm.tsx`:
  - All fields from spec (date, stock search, type toggle, qty, rate, auto-calcs)
  - Real-time calculation preview: as user changes qty/rate, brokerage/cvt/net update live
  - Validation: all required fields, qty > 0, rate > 0, SELL qty <= qty held
  - Submit: calls `addTrade()` from hook, shows success toast, resets form
  - Edit mode: pre-fills form with existing trade data for editing
- [ ] 5.5 Create `src/components/trades/TradeTable.tsx`:
  - Full table with all columns from spec
  - Sortable headers (click to sort asc/desc)
  - Sector and Type filters
  - Date range filter
  - Pagination (20 per page)
  - Row actions: Edit (opens form in edit mode), Delete (confirmation modal)
  - Mobile: renders as card list instead of table
- [ ] 5.6 Build `src/app/trades/page.tsx`:
  - PageHeader: "Trade Log" with "Add Trade" button
  - TradeForm (collapsible, starts collapsed, opens on "Add Trade" click)
  - TradeTable below
  - Trades count badge
- [ ] 5.7 Verify: Can add a BUY trade, see it in table, add a SELL trade, see both, edit, delete, sort, filter

**Commit:** `phase-5: trade log with form and table`

---

## Phase 6: Portfolio Page
**Goal:** Show current holdings with live prices.

### Tasks:
- [ ] 6.1 Create `src/components/charts/ChartTooltip.tsx` — styled tooltip matching design system
- [ ] 6.2 Create `src/components/portfolio/HoldingsTable.tsx`:
  - All columns from spec
  - Live price with change indicator (▲ green / ▼ red)
  - P&L cells color-coded
  - Weight column with mini progress bar
  - Summary row at bottom (sticky)
  - Click row → opens stock detail
- [ ] 6.3 Create `src/components/portfolio/StockCard.tsx` — mobile card version of a holding
- [ ] 6.4 Create stock detail modal:
  - Historical price line chart (fetched from /api/psx/history/[symbol])
  - Trade history for this stock
  - Key metrics: avg buy, current price, days held, P&L
- [ ] 6.5 Build `src/app/portfolio/page.tsx`:
  - PageHeader: "Portfolio" with total value badge
  - KPI summary cards: Total Value, Total Invested, P&L, P&L%
  - HoldingsTable (desktop) / StockCard grid (mobile)
  - "Last updated X minutes ago" indicator for live prices
  - Refresh button
- [ ] 6.6 Verify: Portfolio shows correct qty (buys minus sells), avg price is weighted, P&L calculation correct

**Commit:** `phase-6: portfolio with live prices`

---

## Phase 7: Dashboard
**Goal:** Build the home page with KPIs and overview charts.

### Tasks:
- [ ] 7.1 Create `src/components/charts/LineChart.tsx` — reusable Recharts wrapper with gradient fill, styled tooltip, responsive
- [ ] 7.2 Create `src/components/charts/BarChart.tsx` — reusable, green/red conditional colors, rounded bars
- [ ] 7.3 Create `src/components/charts/PieChart.tsx` — donut style, center label, legend
- [ ] 7.4 Create `src/components/dashboard/KPICard.tsx`:
  - Large metric value (monospace font)
  - Label below
  - Colored accent stripe (left border or top gradient)
  - Animated number counting on mount
  - Change indicator (if applicable)
- [ ] 7.5 Create `src/components/dashboard/PortfolioChart.tsx` — monthly portfolio value line chart
- [ ] 7.6 Create `src/components/dashboard/SectorPieChart.tsx` — donut chart of sector allocation
- [ ] 7.7 Create `src/components/dashboard/RecentTrades.tsx` — last 5 trades mini-table
- [ ] 7.8 Create `src/components/dashboard/TopHoldings.tsx` — top 5 by market value, horizontal bars or cards
- [ ] 7.9 Build `src/app/page.tsx` (Dashboard):
  - KPI row (horizontal scroll on mobile)
  - 2-column grid: PortfolioChart + SectorPieChart
  - RecentTrades card
  - TopHoldings card
  - Staggered fade-in animation on all cards
  - Empty state when no trades: "Welcome! Add your first trade to get started."
- [ ] 7.10 Verify: Dashboard shows real data from trades, charts render, KPIs correct

**Commit:** `phase-7: dashboard with KPIs and charts`

---

## Phase 8: Analysis Page
**Goal:** Monthly, quarterly, and yearly performance breakdowns.

### Tasks:
- [ ] 8.1 Create tab navigation component for Monthly/Quarterly/Yearly switching
- [ ] 8.2 Create `src/components/analysis/MonthlyView.tsx`:
  - Table with all monthly columns from spec
  - Line chart: monthly net investment trend
  - Bar chart: monthly realized P&L
- [ ] 8.3 Create `src/components/analysis/QuarterlyView.tsx`:
  - Table with quarterly columns
  - Combo chart: bar (P&L) + line (portfolio value growth)
  - QoQ growth indicators
- [ ] 8.4 Create `src/components/analysis/YearlyView.tsx`:
  - Table with yearly columns
  - ROI highlight card
  - Best/worst trade highlights
- [ ] 8.5 Build `src/app/analysis/page.tsx`:
  - Tab bar at top
  - Active tab content below
  - Each tab: table + charts
  - Empty state per tab if no data for that period
- [ ] 8.6 Verify: Data groups correctly, charts show real values, switching tabs smooth

**Commit:** `phase-8: analysis with monthly/quarterly/yearly views`

---

## Phase 9: Risk & Sector Page
**Goal:** Sector allocation visualization and risk monitoring.

### Tasks:
- [ ] 9.1 Create `src/components/risk/SectorBreakdown.tsx`:
  - Sector table (all columns from spec)
  - Donut chart
  - Grouped bar chart (invested vs current per sector)
- [ ] 9.2 Create `src/components/risk/RiskMeter.tsx`:
  - Individual risk metric card with:
    - Circular progress indicator or horizontal gauge
    - Color-coded (green/yellow/red based on thresholds from settings)
    - Large metric number
    - Threshold indicator line
- [ ] 9.3 Create `src/components/risk/ConcentrationAlert.tsx`:
  - Warning card that appears when any threshold breached
  - Icon + colored background + text + suggestion
- [ ] 9.4 Build `src/app/risk/page.tsx`:
  - Section: Sector Allocation (table + charts)
  - Section: Risk Dashboard (grid of RiskMeter cards)
  - Section: Alerts (list of ConcentrationAlerts, or "All clear!" green card)
- [ ] 9.5 Verify: Sector weights sum to 100%, risk thresholds fire correctly, colors match state

**Commit:** `phase-9: risk tracker and sector allocation`

---

## Phase 10: PDF Export & Polish
**Goal:** PDF report generation, final UI polish, responsive fixes.

### Tasks:
- [ ] 10.1 Create `src/lib/pdf-export.ts`:
  - `generateMonthlyReport(month, year, data)` — multi-page PDF
  - `generateQuarterlyReport(quarter, year, data)` — multi-page PDF
  - Uses jsPDF + jspdf-autotable for tables
  - Includes KPIs, holdings table, trade log, chart images
- [ ] 10.2 Add "Export PDF" buttons to Analysis page (per period) and Settings page
- [ ] 10.3 Add "Export CSV" to Trade Log page — downloads all trades as CSV
- [ ] 10.4 Responsive polish pass:
  - Test every page at 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px, 1440px
  - Fix any overflow, misalignment, truncation issues
  - Ensure touch targets ≥ 44px on mobile
- [ ] 10.5 Animation polish:
  - Page transitions (fade-in)
  - Card hover effects consistent everywhere
  - Loading skeletons on every data-dependent component
  - Empty states with appropriate illustrations/icons
- [ ] 10.6 Error handling review:
  - Every Supabase call has try/catch with user-friendly toast
  - PSX API failures show cached data with warning
  - Form validations complete with inline messages
- [ ] 10.7 Dark mode review: check every component in both themes, fix contrast issues
- [ ] 10.8 Final build test: `npm run build` — must complete with zero errors
- [ ] 10.9 Verify: Full app flow — add trade → see in portfolio → check dashboard → view analysis → check risk → export PDF

**Commit:** `phase-10: PDF export and final polish`

---

## Phase 11: Deploy
**Goal:** Push to GitHub and deploy to Vercel.

### Tasks:
- [ ] 11.1 Create `.gitignore` with node_modules, .env.local, .next, out
- [ ] 11.2 Final commit: `git add . && git commit -m "PSX Portfolio Tracker v1.0"`
- [ ] 11.3 Push to GitHub: `git push origin main`
- [ ] 11.4 Verify Vercel auto-deploys (should trigger from GitHub push)
- [ ] 11.5 Check environment variables are set in Vercel project settings
- [ ] 11.6 Test live URL: visit `your-app.vercel.app`, verify all features work
- [ ] 11.7 Test on phone: open live URL on mobile, verify responsive layout

**Commit:** `phase-11: production deployment`

---

## Phase Summary

| Phase | What You Get | Depends On |
|-------|-------------|------------|
| 0 | Project scaffold, config, types | Nothing |
| 1 | App shell with navigation | Phase 0 |
| 2 | Data hooks and calculations | Phase 0 |
| 3 | PSX live data API | Phase 0 |
| 4 | Settings page | Phase 1, 2 |
| 5 | Trade log (add/edit/delete) | Phase 1, 2, 3 |
| 6 | Portfolio with live prices | Phase 2, 3, 5 |
| 7 | Dashboard with charts | Phase 2, 6 |
| 8 | Analysis (monthly/quarterly/yearly) | Phase 2, 5 |
| 9 | Risk tracker + sectors | Phase 2, 6 |
| 10 | PDF export + polish | All above |
| 11 | Deploy to Vercel | All above |
