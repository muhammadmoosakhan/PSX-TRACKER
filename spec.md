# spec.md — PSX Portfolio Tracker Full Specification

## Overview

A personal web application for tracking Pakistan Stock Exchange (PSX) investments. The app allows a beginner investor to log buy/sell trades, view current holdings with live market prices, analyze performance over time (monthly/quarterly/yearly), monitor sector allocation and risk exposure, and export PDF reports.

**Single user. No authentication. Supabase as database. Deployed on Vercel free tier.**

---

## Data Sources

### PSX Data Portal (Free, Personal Use)
| Endpoint | Returns | Usage |
|----------|---------|-------|
| `https://dps.psx.com.pk/market-watch` | All ~460 listed stocks: symbol, name, sector, LDCP, open, high, low, current, change, change%, volume | Market overview, stock search, auto-fill trade form, live portfolio prices |
| `https://dps.psx.com.pk/timeseries/eod/{SYMBOL}` | Daily OHLCV for past ~5 years | Historical stock price charts |
| `https://dps.psx.com.pk/timeseries/int/{SYMBOL}` | Intraday tick data | Optional: intraday charts |

**All calls MUST go through Next.js API routes (server-side) to avoid CORS.**
**Cache market-watch data in Supabase `stocks_cache` table — refresh max once per hour.**

---

## Database Schema (Supabase PostgreSQL)

### Table: `trades`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique trade ID |
| created_at | TIMESTAMPTZ | default now() | Record creation time |
| trade_date | DATE | NOT NULL | When the trade happened |
| symbol | TEXT | NOT NULL | Stock ticker (e.g., ENGRO) |
| stock_name | TEXT | NOT NULL | Full name (e.g., Engro Corporation) |
| sector | TEXT | NOT NULL | Sector category |
| trade_type | TEXT | NOT NULL, CHECK IN ('BUY','SELL') | Buy or Sell |
| quantity | INTEGER | NOT NULL, >0 | Number of shares |
| rate_per_share | NUMERIC(12,2) | NOT NULL, >0 | Price per share in PKR |
| gross_value | NUMERIC(14,2) | GENERATED (qty × rate) | Auto-calculated |
| brokerage | NUMERIC(12,2) | default 0 | Broker commission in PKR |
| cvt | NUMERIC(12,2) | default 0 | Capital Value Tax in PKR |
| net_value | NUMERIC(14,2) | default 0 | Total cost including fees |
| notes | TEXT | default '' | Optional remarks |

### Table: `settings`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | PK |
| key | TEXT | UNIQUE setting identifier |
| value | NUMERIC | Setting value |
| label | TEXT | Display label |
| unit | TEXT | '%', 'PKR', or 'ratio' |

**Default settings:** brokerage_rate (0.0045), cvt_rate (0.01), cgt rates, capital_available, leverage_used, risk thresholds

### Table: `stocks_cache`
| Column | Type | Description |
|--------|------|-------------|
| symbol | TEXT | PK |
| name | TEXT | Company name |
| sector | TEXT | Sector |
| ldcp | NUMERIC | Last day closing price |
| open_price | NUMERIC | Today's open |
| high | NUMERIC | Today's high |
| low | NUMERIC | Today's low |
| current_price | NUMERIC | Current/last traded price |
| change | NUMERIC | Price change |
| change_pct | NUMERIC | Price change percentage |
| volume | BIGINT | Volume traded |
| updated_at | TIMESTAMPTZ | Last cache refresh |

### Table: `watchlist`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| symbol | TEXT | Stock ticker |
| stock_name | TEXT | Company name |
| sector | TEXT | Sector |
| added_at | TIMESTAMPTZ | When added |
| target_buy_price | NUMERIC | Target buy price |
| notes | TEXT | Personal notes |

---

## Screens Specification

### Screen 1: Dashboard (`/`)

**Purpose:** Quick overview of entire portfolio health at a glance.

**KPI Row (top, 4-6 cards in a horizontal scroll on mobile):**
| KPI | Source | Format |
|-----|--------|--------|
| Total Portfolio Value | sum(qty_held × current_price) for all holdings | PKR with commas |
| Total Invested | sum(cost_basis) for all holdings | PKR |
| Total P&L | portfolio_value - total_invested | PKR + color (green/red) |
| Total P&L % | (total_pl / total_invested) × 100 | % with color |
| Win Rate | profitable_closed / total_closed × 100 | % |
| Cash Remaining | capital_available - total_invested | PKR |

**Charts Section (below KPIs, 2-column grid on desktop):**
1. **Portfolio Value Over Time** — Line chart, monthly data points, gradient fill under line. X-axis: months. Y-axis: PKR value.
2. **Sector Allocation** — Donut chart (not pie), each sector a different color, center text shows total value. Legend below with sector name + percentage.

**Recent Trades (below charts):**
- Table showing last 5 trades: date, symbol, type (BUY badge green / SELL badge red), qty, rate, net value
- "View All →" link to /trades

**Top 5 Holdings (sidebar or below):**
- Horizontal bar chart OR card list
- Stock symbol, current value, P&L% with colored indicator

---

### Screen 2: Trade Log (`/trades`)

**Purpose:** Add new trades and view complete history.

**Add Trade Form (top, collapsible card):**
| Field | Type | Behavior |
|-------|------|----------|
| Date | Date picker | Defaults to today |
| Stock Symbol | Searchable dropdown | Types → searches stocks_cache → auto-fills name + sector + current price |
| Stock Name | Auto-filled | From stock search, read-only |
| Sector | Auto-filled | From stock search, can override with dropdown |
| Type | Toggle buttons | BUY (green) / SELL (red), large tap targets |
| Quantity | Number input | With +/- stepper buttons |
| Rate Per Share | Number input | Auto-filled with current price, user can override |
| Brokerage | Auto-calculated | Displayed as: "0.45% = PKR X" |
| CVT | Auto-calculated | Displayed as: "1.00% = PKR X" |
| Net Value | Auto-calculated | Prominent, large font |
| Notes | Textarea | Optional, collapsible |
| Submit | Button | "Add Trade" — validates all fields, inserts into Supabase |

**Stock Search (`StockSearch.tsx`):**
- Input with search icon
- As user types (debounced 300ms), filter stocks_cache
- Dropdown shows: SYMBOL — Company Name — Sector — Current Price
- Clicking a result fills in symbol, name, sector, and rate

**Trade History Table (below form):**
| Column | Sortable | Filterable |
|--------|----------|-----------|
| Date | Yes | Date range picker |
| Symbol | Yes | Text search |
| Name | No | - |
| Sector | Yes | Dropdown filter |
| Type | Yes | BUY/SELL toggle filter |
| Quantity | Yes | - |
| Rate | Yes | - |
| Gross Value | Yes | - |
| Brokerage | No | - |
| CVT | No | - |
| Net Value | Yes | - |
| Notes | No | - |
| Actions | No | Edit / Delete buttons |

- Pagination: 20 rows per page
- Mobile: Card view instead of table (each trade as a card with key details)

---

### Screen 3: Portfolio (`/portfolio`)

**Purpose:** See what you currently hold with live market prices.

**Holdings Table:**
| Column | Source |
|--------|--------|
| Symbol | From trades |
| Name | From trades |
| Sector | From trades |
| Qty Held | sum(BUY qty) - sum(SELL qty) |
| Avg Buy Price | Weighted average of all buys for this symbol |
| Cost Basis | qty_held × avg_buy_price |
| Current Price | From stocks_cache (live) — with up/down arrow and change% |
| Market Value | qty_held × current_price |
| Unrealized P&L | market_value - cost_basis |
| Unrealized P&L % | (unrealized_pl / cost_basis) × 100 |
| Weight % | market_value / total_portfolio_value × 100 |

**Visual indicators:**
- P&L column: green text + bg for profit, red for loss
- Current Price: small badge showing today's change %
- Weight: mini progress bar in the cell

**Summary Row (sticky at bottom):**
- Total Cost Basis, Total Market Value, Total P&L, Total P&L %

**Stock Detail Modal (click any row):**
- Opens modal/drawer with:
  - Historical price chart (from /api/psx/history/[symbol])
  - All trades for this stock (filtered from trades table)
  - Buy vs current price comparison
  - Days held

---

### Screen 4: Analysis (`/analysis`)

**Purpose:** Performance analysis across time periods.

**Tab Navigation:** Monthly | Quarterly | Yearly

**Monthly Tab:**
| Column | Calculation |
|--------|------------|
| Month-Year | Grouped from trade dates |
| Total Buys | Sum of net_value where type=BUY in that month |
| Total Sells | Sum of net_value where type=SELL in that month |
| Net Investment | Buys - Sells |
| Realized P&L | Sum of (sell_value - cost_of_shares_sold) for sells in that month |
| # Trades | Count of trades in that month |
| Most Active Sector | Sector with highest trade count that month |

**Charts:**
- Line chart: Monthly net investment trend
- Bar chart: Monthly realized P&L (green/red bars)
- Cumulative P&L line chart

**Quarterly Tab:**
Same as monthly but grouped by Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec).
Additional fields:
- Portfolio Value at Quarter End (from portfolio calculation at that point)
- QoQ Growth % = (current_quarter_value - previous_quarter_value) / previous_quarter_value
- Best/Worst Performing Sector

**Yearly Tab:**
| Column | Calculation |
|--------|------------|
| Year | Grouped |
| Capital Deployed | Sum of BUY gross values |
| Capital Recovered | Sum of SELL gross values |
| Net Invested | Deployed - Recovered |
| Realized P&L | Sum of all realized P&L for the year |
| ROI % | Realized P&L / Capital Deployed × 100 |
| # Trades | Count |
| Win Rate | Profitable sells / Total sells × 100 |
| Best Trade | Highest single realized P&L |
| Worst Trade | Lowest single realized P&L |

---

### Screen 5: Risk & Sectors (`/risk`)

**Purpose:** Monitor concentration risk and sector exposure.

**Section A: Sector Allocation**

Table:
| Column | Source |
|--------|--------|
| Sector | Grouped from holdings |
| # Stocks | Count of unique symbols in sector |
| Invested | Sum of cost_basis in sector |
| Current Value | Sum of market_value in sector |
| P&L | Current - Invested |
| P&L % | P&L / Invested × 100 |
| Weight % | Sector value / Total value × 100 |

Charts:
- Donut chart: Sector allocation by current value
- Grouped bar chart: Invested vs Current Value per sector

**Section B: Risk Dashboard**

Cards:
| Metric | Formula | Thresholds |
|--------|---------|-----------|
| Capital Utilization | total_invested / capital_available × 100 | <70% green, 70-90% yellow, >90% red |
| Leverage Ratio | leverage_used / capital_available | <0.7 green, 0.7-1.0 yellow, >1.0 red |
| Max Sector Exposure | highest sector weight % | <30% green, 30-40% yellow, >40% red |
| Max Stock Exposure | highest single stock weight % | <20% green, 20-25% yellow, >25% red |
| Diversification | number of sectors invested / number of stocks | Higher is better |

Each card: large metric number, color-coded background, icon, progress bar or gauge.

**Section C: Concentration Alerts**
- List of warnings if any threshold is breached
- Each alert: icon + text + recommended action
- Example: "⚠️ ENGRO is 32% of your portfolio. Consider diversifying."

---

### Screen 6: Settings (`/settings`)

**Purpose:** Configure app parameters.

**Grouped settings with edit-in-place:**

**Trading Costs:**
| Setting | Default | Input |
|---------|---------|-------|
| Brokerage Rate | 0.45% | Number input with % |
| CVT Rate | 1.00% | Number input with % |

**Capital Gains Tax:**
| Setting | Default | Input |
|---------|---------|-------|
| CGT < 1 Year | 15% | Number input |
| CGT 1-2 Years | 12.5% | Number input |
| CGT 2-3 Years | 10% | Number input |
| CGT > 3 Years | 0% | Number input |

**Capital:**
| Setting | Default | Input |
|---------|---------|-------|
| Total Capital Available | 0 | PKR input |
| Leverage Used | 0 | PKR input |

**Risk Thresholds:**
| Setting | Default | Input |
|---------|---------|-------|
| Sector Warning | 30% | Number input |
| Sector Danger | 40% | Number input |
| Stock Warning | 20% | Number input |
| Stock Danger | 25% | Number input |
| Leverage Warning | 0.70 | Number input |
| Leverage Danger | 1.00 | Number input |

**Appearance:**
| Setting | Options |
|---------|---------|
| Theme | Light / Dark / System toggle |

**Data Management:**
- "Refresh Stock Cache" button — manually triggers PSX data refresh
- "Export All Trades (CSV)" button
- "Export Portfolio Report (PDF)" button

---

## PDF Export Specification

### Monthly/Quarterly Report PDF
**Generated client-side using jsPDF + jspdf-autotable**

Page 1 — Summary:
- Title: "PSX Portfolio Report — [Month/Quarter] [Year]"
- Date generated
- KPIs: Total Value, P&L, Win Rate, # Trades
- Sector allocation table

Page 2 — Holdings:
- Current holdings table with all columns
- Summary row

Page 3 — Trade Log:
- All trades for the period
- Totals

Page 4 — Charts:
- Convert Recharts to canvas → toDataURL() → embed as image in PDF

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Single column, bottom tab nav, card-based tables |
| Tablet | 768-1024px | 2-column grid, sidebar collapsed by default |
| Desktop | > 1024px | Full sidebar, 2-3 column grids, full tables |

---

## Error Handling

| Scenario | User Sees |
|----------|----------|
| Supabase connection fails | "Unable to connect to database. Check your internet." + retry button |
| PSX data fetch fails | Cached data with "Prices may be outdated" badge + last updated time |
| No trades yet | Friendly empty state with "Add your first trade" CTA |
| Form validation error | Inline red text below the field + field highlight |
| Delete trade | Confirmation modal: "Are you sure? This cannot be undone." |
| Network offline | Toast: "You're offline. Data will sync when connected." |

---

## Performance Requirements

- First Contentful Paint: < 1.5s
- API route response: < 2s
- PSX data cached — no redundant calls
- Supabase queries indexed on symbol, date, sector, trade_type
- Charts lazy-loaded (only render when visible)
- Images optimized with next/image
