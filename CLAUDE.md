# CLAUDE.md — PSX Portfolio Tracker

> This file instructs Claude Code on how to work on this project. Read this FIRST before doing anything.

## Project Identity

**Name:** PSX Portfolio Tracker
**Purpose:** A personal investment tracking app for Pakistan Stock Exchange (PSX) — built for a beginner investor to log trades, monitor live prices, track P&L, visualize portfolio performance, and manage risk.
**User:** A single user (beginner investor). No auth needed. Data stored in Supabase.
**Deploy Target:** Vercel (free tier)
**Data Source:** PSX Data Portal (dps.psx.com.pk) — free, personal use only

## Critical Rules

### ALWAYS do these:
1. **Read `spec.md` before writing any code** — it has every screen, every field, every formula
2. **Read `plan.md` before starting a task** — follow the phase order, never skip ahead
3. **Run `bash skills.sh` first** to install all dependencies and scaffold the project
4. **Test after every phase** — run `npm run dev`, open browser, verify the phase works before moving on
5. **Use the design system defined below** — every component must follow the same visual language
6. **Write clean, commented code** — the user is a beginner and needs to understand what's happening
7. **Handle errors gracefully** — never show raw errors to user, always show friendly messages
8. **Mobile-first responsive** — the user will check this on their phone often

### NEVER do these:
1. Never use `localStorage` or `sessionStorage` — all data goes to Supabase
2. Never hardcode Supabase credentials — always use `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Never make direct client-side calls to `dps.psx.com.pk` — always go through Next.js API routes (to avoid CORS)
4. Never skip error handling on Supabase or fetch calls
5. Never use generic fonts (Inter, Roboto, Arial) — see Design System below
6. Never deploy without testing locally first

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14+ (App Router) | Full-stack, Vercel-native |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS | Rapid styling, responsive |
| Database | Supabase (PostgreSQL) | Free tier, real-time capable |
| Charts | Recharts | Lightweight, React-native |
| PDF Export | jsPDF + jspdf-autotable | Client-side PDF generation |
| Date Utils | date-fns | Lightweight date formatting |
| Icons | Lucide React | Clean, consistent icons |
| Deployment | Vercel | Free, auto-deploy from GitHub |

## Design System — "Soft Glow"

### Aesthetic Direction
**Tone:** Soft, bubbly, modern, approachable — like a friendly fintech app for someone who's never used one before. Think Robinhood meets a pastel dream. NOT cold/corporate. NOT generic dashboard.

### Color Palette (CSS Variables)
```css
:root {
  /* Light Mode */
  --bg-primary: #FAFBFE;
  --bg-secondary: #F0F4FF;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F8FAFF;
  --text-primary: #1A1D2E;
  --text-secondary: #6B7194;
  --text-muted: #9CA3C4;
  --accent-primary: #6C5CE7;      /* Purple — main actions */
  --accent-secondary: #00D2D3;    /* Teal — positive/buy */
  --accent-tertiary: #FF6B6B;     /* Coral — negative/sell */
  --accent-warning: #FECA57;      /* Yellow — warnings */
  --accent-success: #00B894;      /* Green — profit */
  --accent-danger: #FF5252;       /* Red — loss */
  --border-light: #E8ECF4;
  --shadow-sm: 0 2px 8px rgba(108, 92, 231, 0.08);
  --shadow-md: 0 4px 20px rgba(108, 92, 231, 0.12);
  --shadow-lg: 0 8px 40px rgba(108, 92, 231, 0.16);
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-full: 9999px;
}

[data-theme="dark"] {
  --bg-primary: #0F0F1A;
  --bg-secondary: #1A1A2E;
  --bg-card: #16162A;
  --bg-card-hover: #1E1E36;
  --text-primary: #E8E8F0;
  --text-secondary: #8888A8;
  --text-muted: #5A5A78;
  --border-light: #2A2A44;
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 40px rgba(0, 0, 0, 0.5);
}
```

### Typography
- **Headings:** `"Plus Jakarta Sans"` (Google Fonts) — rounded, modern, friendly
- **Body:** `"DM Sans"` (Google Fonts) — clean, highly readable
- **Monospace/Numbers:** `"JetBrains Mono"` (Google Fonts) — for PKR values and stock prices

### Component Style Rules
- **Cards:** White bg, `border-radius: 16px`, soft shadow, 1px subtle border. On hover: slight lift with shadow increase. Smooth `transition: all 0.2s ease`.
- **Buttons:** Rounded (`border-radius: 12px`), padding `12px 24px`, subtle gradient on primary. On hover: scale(1.02) with shadow. On press: scale(0.98).
- **Inputs:** Rounded, light bg fill (not bordered), focus ring with accent color glow.
- **KPI Cards:** Large number in monospace font, label below in muted text, colored left border or top gradient strip to indicate category.
- **Charts:** Rounded corners on bars, smooth curves on lines, gradient fills, tooltips with card-like styling.
- **Tables:** Alternating row colors (very subtle), rounded corners on container, sticky header.
- **Animations:** Fade-in on page load (staggered), smooth number counting on KPIs, subtle pulse on live price indicators, bubbly scale on button interactions.
- **Empty States:** Friendly illustration or icon + encouraging text like "No trades yet — add your first one!" with a CTA button.
- **Loading States:** Skeleton screens with shimmer animation, never blank screens.
- **Toast Notifications:** Slide in from bottom-right, rounded, colored accent bar on left.

### Layout
- **Sidebar Navigation** on desktop (collapsible), **Bottom Tab Bar** on mobile
- Sidebar: icon + label, active state with accent bg pill, smooth transitions
- Max content width: 1200px, centered
- Consistent padding: 24px on desktop, 16px on mobile
- Card grid: responsive CSS grid, 1 col on mobile, 2-3 on desktop

### Dark Mode
- Toggle in sidebar/header
- Use CSS variables — theme switch changes `data-theme` attribute on `<html>`
- Persist preference in Supabase settings table
- Smooth transition: `transition: background-color 0.3s ease, color 0.3s ease`

## File Structure

```
psx-tracker/
├── CLAUDE.md                    ← You are here
├── spec.md                      ← Full specification
├── plan.md                      ← Phase-by-phase implementation plan
├── skills.sh                    ← Project setup script
├── .env.local                   ← Supabase credentials (user creates)
├── .env.example                 ← Template for env vars
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   └── favicon.ico
└── src/
    ├── app/
    │   ├── layout.tsx           ← Root layout with fonts, theme provider
    │   ├── page.tsx             ← Dashboard (home)
    │   ├── globals.css          ← CSS variables, base styles, animations
    │   ├── trades/
    │   │   └── page.tsx         ← Trade log + add trade form
    │   ├── portfolio/
    │   │   └── page.tsx         ← Current holdings with live prices
    │   ├── analysis/
    │   │   └── page.tsx         ← Monthly/Quarterly/Yearly tabs
    │   ├── risk/
    │   │   └── page.tsx         ← Sector allocation + risk tracker
    │   ├── settings/
    │   │   └── page.tsx         ← Editable settings
    │   └── api/
    │       ├── psx/
    │       │   ├── market/route.ts     ← Fetches all stock data from PSX
    │       │   └── history/[symbol]/route.ts ← Fetches EOD data for a stock
    │       └── export/
    │           └── pdf/route.ts        ← Generates PDF reports
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── MobileNav.tsx
    │   │   ├── ThemeToggle.tsx
    │   │   └── PageHeader.tsx
    │   ├── ui/
    │   │   ├── Card.tsx
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Toast.tsx
    │   │   ├── Skeleton.tsx
    │   │   ├── Badge.tsx
    │   │   └── EmptyState.tsx
    │   ├── dashboard/
    │   │   ├── KPICard.tsx
    │   │   ├── PortfolioChart.tsx
    │   │   ├── SectorPieChart.tsx
    │   │   ├── RecentTrades.tsx
    │   │   └── TopHoldings.tsx
    │   ├── trades/
    │   │   ├── TradeForm.tsx
    │   │   ├── TradeTable.tsx
    │   │   └── StockSearch.tsx
    │   ├── portfolio/
    │   │   ├── HoldingsTable.tsx
    │   │   └── StockCard.tsx
    │   ├── analysis/
    │   │   ├── MonthlyView.tsx
    │   │   ├── QuarterlyView.tsx
    │   │   ├── YearlyView.tsx
    │   │   └── AnalysisChart.tsx
    │   ├── risk/
    │   │   ├── SectorBreakdown.tsx
    │   │   ├── RiskMeter.tsx
    │   │   └── ConcentrationAlert.tsx
    │   └── charts/
    │       ├── LineChart.tsx
    │       ├── BarChart.tsx
    │       ├── PieChart.tsx
    │       └── ChartTooltip.tsx
    ├── lib/
    │   ├── supabase.ts          ← Supabase client init
    │   ├── psx.ts               ← PSX data fetching + parsing
    │   ├── calculations.ts      ← P&L, averages, risk formulas
    │   ├── formatters.ts        ← PKR formatting, date formatting, %
    │   ├── constants.ts         ← Sector list, default settings
    │   └── pdf-export.ts        ← PDF report generation
    ├── hooks/
    │   ├── useTrades.ts         ← CRUD operations on trades
    │   ├── useSettings.ts       ← Read/update settings
    │   ├── usePortfolio.ts      ← Computed portfolio data
    │   ├── useMarketData.ts     ← Live PSX data with caching
    │   ├── useAnalysis.ts       ← Monthly/quarterly/yearly aggregations
    │   └── useTheme.ts          ← Dark mode toggle
    └── types/
        └── index.ts             ← All TypeScript interfaces
```

## Key Formulas (implement in `lib/calculations.ts`)

```typescript
// Total Quantity Held
totalQty = sum(BUY quantities for symbol) - sum(SELL quantities for symbol)

// Weighted Average Buy Price
avgBuyPrice = sum(BUY qty × rate for symbol) / sum(BUY qty for symbol)

// Total Cost Basis
costBasis = totalQty × avgBuyPrice

// Unrealized P&L
unrealizedPL = (currentPrice × totalQty) - costBasis
unrealizedPLPct = unrealizedPL / costBasis × 100

// Realized P&L (per sell trade)
realizedPL = (sellRate - avgBuyPriceAtTimeOfSell) × sellQty
// Adjust for brokerage + CVT on both buy and sell sides

// Gross Value
grossValue = quantity × ratePerShare

// Brokerage
brokerage = grossValue × settings.brokerage_rate

// CVT
cvt = grossValue × settings.cvt_rate

// Net Value
netValue (BUY) = grossValue + brokerage + cvt
netValue (SELL) = grossValue - brokerage - cvt

// Sector Weight
sectorWeight = sectorMarketValue / totalPortfolioMarketValue × 100

// Stock Weight
stockWeight = stockMarketValue / totalPortfolioMarketValue × 100

// Win Rate
winRate = profitableTrades / totalClosedTrades × 100

// ROI
roi = totalRealizedPL / totalCapitalDeployed × 100

// Leverage Ratio
leverageRatio = leverageUsed / capitalAvailable
```

## API Routes

### GET `/api/psx/market`
- Server-side fetch to `https://dps.psx.com.pk/market-watch`
- Parse the response (HTML table or JSON)
- Return clean JSON array: `[{ symbol, name, sector, ldcp, open, high, low, current, change, changePct, volume }]`
- Cache in Supabase `stocks_cache` table (upsert, once per hour)
- Handle errors gracefully — if PSX is down, serve from cache

### GET `/api/psx/history/[symbol]`
- Server-side fetch to `https://dps.psx.com.pk/timeseries/eod/{symbol}`
- Return array: `[{ date, open, high, low, close, volume }]`
- No caching needed (called on demand)

## Working Style

When implementing a phase from `plan.md`:
1. Announce which phase you're starting
2. Create/modify files one at a time
3. After each file, briefly explain what it does
4. After completing all files in a phase, run `npm run dev` and check for errors
5. Fix any TypeScript or runtime errors before moving to next phase
6. Commit with message: `phase-N: description`

## Common Patterns

### Supabase Query Pattern
```typescript
const { data, error } = await supabase
  .from('trades')
  .select('*')
  .order('trade_date', { ascending: false });

if (error) {
  console.error('Error fetching trades:', error);
  return [];
}
return data;
```

### PSX Fetch Pattern (API Route)
```typescript
export async function GET() {
  try {
    const res = await fetch('https://dps.psx.com.pk/market-watch', {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    // Parse and return
  } catch (error) {
    // Serve from Supabase cache as fallback
  }
}
```

### Component Pattern
```tsx
'use client';
import { useState, useEffect } from 'react';

export default function ComponentName() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { /* fetch */ }, []);

  if (loading) return <Skeleton />;
  if (!data) return <EmptyState />;
  return <div>...</div>;
}
```
