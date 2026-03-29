# PSX Tracker — PDF Import & Portfolio Bug Fixes Plan

## 📋 Overview

This plan covers:
1. **Smart PDF Import** - Upload broker statement PDF/screenshot → auto-extract trades → update portfolio
2. **Per-Trade Fee Storage** - Store ACTUAL fees from PDF (not settings rates) for each trade
3. **Risk Dashboard Update** - Calculate risk using ACTUAL trade fees, not just saved settings
4. **Portfolio Bug Fixes** - Fix incorrect totals in Portfolio, Wallet, Trades, Analysis tabs
5. **Total Shares Display** - Show total shares correctly across all tabs

---

## 🎯 Key Principle: PDF Data = Source of Truth

**Current Problem:**
- Settings store default rates (e.g., brokerage 0.15%, CVT 0.01%)
- All trades use these fixed rates
- But brokers charge DIFFERENT fees per trade based on volume, stock, etc.

**New Approach:**
- **PDF fees are ACTUAL** → Store exact fees for each trade
- **Settings = defaults** → Only used when manually adding trades
- **Risk calculations** → Use ACTUAL per-trade fees, not settings
- **Per-stock analysis** → Show effective fee rates per stock

---

## 💰 Per-Trade Fee Storage (NEW)

### Current Database Schema (Limited)
```sql
trades (
  brokerage NUMERIC,  -- Single field, calculated from settings rate
  cvt NUMERIC,        -- Single field, calculated from settings rate
)
```

### NEW Database Schema (Detailed Fees)
```sql
-- Add new columns to trades table
ALTER TABLE trades ADD COLUMN commission NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN sst NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN cdc_fee NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN laga NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN secp NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN ncs NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN others NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN fee_source TEXT DEFAULT 'manual'; -- 'pdf' or 'manual'
```

### Fee Fields Breakdown
| Field | Description | From PDF Column |
|-------|-------------|-----------------|
| `commission` | Broker commission | Comm. |
| `sst` | Sales Services Tax | SST |
| `cdc_fee` | CDC charges | CDC |
| `cvt` | Capital Value Tax / WHT | CVT / WHT |
| `laga` | LAGA fee | LAGA |
| `secp` | SECP fee | SECP |
| `ncs` | NCS fee | NCS |
| `others` | Other charges | Others |
| `fee_source` | Where fees came from | 'pdf' or 'manual' |

### Total Brokerage Calculation
```typescript
// OLD: Used settings rate
const brokerage = grossValue * settings.brokerage_rate;

// NEW: Sum of all actual fees from PDF
const totalFees = commission + sst + cdc_fee + cvt + laga + secp + ncs + others;
```

---

## 📊 Risk Dashboard Updates (NEW)

### Current Risk Calculation (Broken)
```typescript
// Uses fixed settings rates for ALL stocks
const estimatedFees = portfolioValue * settings.brokerage_rate;
```

### NEW Risk Calculation (Accurate)

#### 1. Per-Stock Effective Fee Rate
```typescript
interface StockFeeAnalysis {
  symbol: string;
  totalTradeValue: number;      // Sum of all gross_value for this stock
  totalFeesCharged: number;     // Sum of all actual fees for this stock
  effectiveFeeRate: number;     // totalFeesCharged / totalTradeValue
  tradeCount: number;
}

// Calculate from actual trades
const stockFees = trades.reduce((map, trade) => {
  const fees = trade.commission + trade.sst + trade.cdc_fee + 
               trade.cvt + trade.laga + trade.secp + trade.ncs;
  
  if (!map[trade.symbol]) {
    map[trade.symbol] = { totalValue: 0, totalFees: 0, count: 0 };
  }
  map[trade.symbol].totalValue += trade.gross_value;
  map[trade.symbol].totalFees += fees;
  map[trade.symbol].count += 1;
  
  return map;
}, {});
```

#### 2. Portfolio-Wide Fee Analysis
```typescript
interface PortfolioFeeAnalysis {
  totalFeesAllTime: number;      // All fees ever paid
  avgFeeRate: number;            // Average across all trades
  feesByType: {
    commission: number;
    sst: number;
    cdc: number;
    cvt: number;
    regulatory: number;          // laga + secp + ncs
  };
  estimatedSellFees: number;     // If you sell entire portfolio today
}
```

#### 3. Risk Dashboard New Metrics
| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Total Fees Paid** | All-time trading costs | Sum of all fee columns |
| **Avg Fee Rate** | Your effective brokerage | Total fees / Total traded value |
| **Est. Exit Cost** | Cost to liquidate portfolio | Portfolio value × Avg fee rate |
| **Fee Drag** | Impact on returns | Total fees / Total P&L |
| **Per-Stock Fees** | Breakdown by stock | Group fees by symbol |

### Risk Page UI Updates
```
┌─────────────────────────────────────────────────────────┐
│  📊 TRADING COSTS ANALYSIS                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Total Fees Paid          PKR 1,247.50                 │
│  Average Fee Rate         0.42%                         │
│  Estimated Exit Cost      PKR 523.00                   │
│  Fee Impact on Returns    -2.3%                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Fee Breakdown by Type                           │   │
│  │ ████████████░░░░░ Commission    PKR 620 (50%)  │   │
│  │ ██████░░░░░░░░░░░ CDC           PKR 310 (25%)  │   │
│  │ ███░░░░░░░░░░░░░░ CVT           PKR 155 (12%)  │   │
│  │ ██░░░░░░░░░░░░░░░ SST           PKR 100 (8%)   │   │
│  │ █░░░░░░░░░░░░░░░░ Regulatory    PKR 62 (5%)    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Fees by Stock                                   │   │
│  │ HUBC    12 trades    PKR 450    0.38% rate     │   │
│  │ OGDC     5 trades    PKR 280    0.45% rate     │   │
│  │ ENGRO    3 trades    PKR 320    0.41% rate     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Settings vs PDF Data Logic

### When Adding Trade MANUALLY
```typescript
// Use settings as defaults
const fees = calculateFromSettings(grossValue, settings);
trade.commission = fees.brokerage;
trade.cvt = fees.cvt;
trade.fee_source = 'manual';
```

### When Importing from PDF
```typescript
// Use ACTUAL fees from PDF
trade.commission = parsedTrade.commission;
trade.sst = parsedTrade.sst;
trade.cdc_fee = parsedTrade.cdc_fee;
trade.cvt = parsedTrade.cvt;
trade.laga = parsedTrade.laga;
trade.secp = parsedTrade.secp;
trade.ncs = parsedTrade.ncs;
trade.fee_source = 'pdf';
```

### Risk Dashboard Priority
```typescript
// Always use ACTUAL fees from trades, not settings
const actualFees = trades.reduce((sum, t) => {
  return sum + t.commission + t.sst + t.cdc_fee + t.cvt + t.laga + t.secp + t.ncs;
}, 0);

// Settings only used for ESTIMATING future trades
const estimatedFutureTradeFeess = settings.brokerage_rate * estimatedTradeValue;
```

---

## 🎯 Feature: Smart PDF/Screenshot Import

### What It Does
- User uploads Munir Khanani broker statement (PDF or screenshot)
- System automatically extracts:
  - Trade date & settlement date
  - Stock symbol & name (HUBC, OGDC, etc.)
  - Trade type: **BUY** or **SELL** (detected from "B BUY" or "S SELL")
  - Quantity, Rate, Total amount
  - All fees: Commission, SST, CDC, CVT, LAGA, SECP, NCS
- Creates trades in database automatically
- Updates portfolio holdings instantly

### PDF Format Analysis (Munir Khanani)
```
Date :27-03-2026 Transaction Statement
Settlement : 30-03-2026

THE HUB POWER COMPANY LIMITED HUBC
T+1REG B BUY 7 198.00 0.2970 0.31 2.50 0.00 0.00 0.06 0.01 0.04 1,391.00
        ↑     ↑   ↑      ↑                                            ↑
        |     |   |      |                                            |
      Type  Qty  Rate  Comm.                                     Net Amount

OIL & GAS DEV.CO OGDC
T+1REG B BUY 5 268.25 ...
```

### Key Detection Rules
| Pattern | Meaning |
|---------|---------|
| `B BUY` | Buy trade |
| `S SELL` | Sell trade |
| `T+1REG` or `T+2REG` | Settlement type (ignore) |
| Line before trades | Stock name + symbol (last word is symbol) |
| `Avg. @` line | Summary row (use for verification) |

---

## 🛠️ Technical Implementation

### Phase 1: PDF Text Extraction API
**File:** `src/app/api/import/pdf/route.ts`

```
Technology: pdf-parse (npm package)
- Lightweight, serverless-compatible
- No external API calls (free!)
- Works on Vercel
```

**For Screenshots:** 
```
Technology: Tesseract.js (runs in browser)
- Client-side OCR (no server load)
- Free, no API keys
- Fallback: HuggingFace free OCR API
```

### Phase 2: Trade Parser
**File:** `src/lib/pdf-parser.ts`

```typescript
interface ParsedTrade {
  trade_date: string;        // From "Date :DD-MM-YYYY"
  settlement_date: string;   // From "Settlement : DD-MM-YYYY"
  symbol: string;            // Extracted from stock line (last word)
  stock_name: string;        // Full name before symbol
  trade_type: 'BUY' | 'SELL'; // Detected from "B BUY" or "S SELL"
  quantity: number;
  rate_per_share: number;
  commission: number;        // Comm. column
  sst: number;               // SST column
  cdc_fee: number;           // CDC column
  cvt: number;               // CVT/WHT column
  others: number;            // Others column
  laga: number;              // LAGA column
  secp: number;              // SECP column
  ncs: number;               // NCS column
  net_value: number;         // Amount column (total)
}
```

### Phase 3: Import UI Component
**File:** `src/components/trades/PDFImport.tsx`

Features:
- Drag & drop zone for PDF/image
- File type validation (PDF, PNG, JPG)
- Preview extracted trades before saving
- Edit any field if OCR made mistakes
- "Import All" button to save to database
- Success/error feedback

### Phase 4: Database Integration
- Use existing `useTrades.addTrade()` hook
- Auto-fill `sector` from `psx-companies.ts` mapping
- Calculate `gross_value` automatically
- Store all fee breakdowns

---

## 🐛 Bug Fixes Required

### Bug 1: Portfolio Total Shares Not Showing
**Location:** `src/app/portfolio/page.tsx`

**Problem:** Total shares KPI missing or showing 0

**Fix:** Add total shares calculation:
```typescript
const totalShares = holdings.reduce((sum, h) => sum + h.quantity_held, 0);
```

### Bug 2: Trades Tab Missing Total Shares
**Location:** `src/app/trades/page.tsx`

**Problem:** No "Total Shares" column in summary

**Fix:** Add shares summary:
```typescript
const totalSharesBought = trades
  .filter(t => t.trade_type === 'BUY')
  .reduce((sum, t) => sum + t.quantity, 0);

const totalSharesSold = trades
  .filter(t => t.trade_type === 'SELL')
  .reduce((sum, t) => sum + t.quantity, 0);

const netSharesHeld = totalSharesBought - totalSharesSold;
```

### Bug 3: Analysis Tab Total Shares Confusion
**Location:** `src/hooks/useAnalysis.ts`

**Problem:** Shows "Total Shares Traded" which sums ALL trades (buys + sells)

**Fix:** 
- Rename to "Share Volume" (total traded)
- Add "Net Shares Held" (current holdings)
- Make clear distinction in UI

### Bug 4: Monthly Portfolio Chart Wrong Formula
**Location:** `src/app/page.tsx` (lines 161-198)

**Problem:** Chart shows cumulative investment, not actual portfolio value

**Fix:** Calculate actual market value at each month-end using:
```typescript
// For each month, calculate:
const monthEndValue = holdings.reduce((sum, h) => {
  return sum + (h.quantity_at_month_end * h.price_at_month_end);
}, 0);
```

### Bug 5: Cash Remaining Incorrect
**Location:** `src/app/page.tsx` (lines 65-67)

**Problem:** Doesn't account for money recovered from sales

**Fix:** Implement proper cash tracking:
```typescript
const totalBuyValue = trades
  .filter(t => t.trade_type === 'BUY')
  .reduce((sum, t) => sum + t.net_value, 0);

const totalSellValue = trades
  .filter(t => t.trade_type === 'SELL')
  .reduce((sum, t) => sum + t.net_value, 0);

const cashRemaining = settings.capital_available - totalBuyValue + totalSellValue;
```

### Bug 6: Gross vs Net Value Inconsistency
**Location:** `src/lib/calculations.ts`

**Problem:** Monthly uses `net_value`, Yearly uses `gross_value`

**Fix:** Standardize all calculations to use `net_value` (actual cash impact)

---

## 📁 Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/import/pdf/route.ts` | PDF upload & text extraction endpoint |
| `src/lib/pdf-parser.ts` | Parse Munir Khanani statement format |
| `src/lib/fee-analysis.ts` | Calculate per-stock & portfolio fee metrics |
| `src/components/trades/PDFImport.tsx` | Drag-drop import UI |
| `src/components/trades/ImportPreview.tsx` | Preview & edit extracted trades |
| `src/components/risk/FeeAnalysis.tsx` | Fee breakdown visualization |
| `src/hooks/useFeeAnalysis.ts` | Hook for fee calculations |

## 📁 Files to Modify

| File | Changes |
|------|---------|
| `src/app/trades/page.tsx` | Add PDF import button, fix totals |
| `src/app/portfolio/page.tsx` | Add Total Shares KPI |
| `src/app/analysis/page.tsx` | Fix share counting labels |
| `src/app/risk/page.tsx` | Add Trading Costs Analysis section with actual fees |
| `src/app/page.tsx` | Fix cash remaining, chart formula |
| `src/lib/calculations.ts` | Standardize gross/net value usage |
| `src/hooks/useAnalysis.ts` | Add net shares calculation |
| `src/hooks/useTrades.ts` | Update to handle new fee columns |
| `src/types/index.ts` | Add new fee fields to Trade interface |
| `package.json` | Add `pdf-parse` dependency |

## 🗄️ Database Migration

Run this SQL in Supabase to add new fee columns:

```sql
-- Add detailed fee columns to trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS commission NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS sst NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS cdc_fee NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS laga NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS secp NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS ncs NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS others NUMERIC(10,4) DEFAULT 0;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS fee_source TEXT DEFAULT 'manual';

-- For existing trades, migrate brokerage to commission
UPDATE trades SET commission = brokerage WHERE commission = 0 AND brokerage > 0;
```

---

## 🔧 Dependencies to Install

```bash
npm install pdf-parse
npm install @types/pdf-parse --save-dev
```

For screenshot OCR (optional, runs client-side):
```bash
npm install tesseract.js
```

---

## 📱 UI Design: PDF Import

### Location in App
- **Trades page** → New "Import from PDF" button next to "Add Trade"
- Opens modal with drag-drop zone

### Import Flow
```
┌─────────────────────────────────────────────────┐
│  📄 Import Trades from Broker Statement         │
├─────────────────────────────────────────────────┤
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │                                         │   │
│   │   📁 Drag & drop PDF or screenshot      │   │
│   │      or click to browse                 │   │
│   │                                         │   │
│   │   Supported: PDF, PNG, JPG              │   │
│   │                                         │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
          ↓ After upload
┌─────────────────────────────────────────────────┐
│  ✅ Found 3 trades                              │
├─────────────────────────────────────────────────┤
│  Date: 27-03-2026                               │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ HUBC  │ BUY │ 14 shares │ @ 198.59 │ ✏️  │  │
│  │ OGDC  │ BUY │  5 shares │ @ 269.73 │ ✏️  │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  Total: PKR 4,128.92                            │
│                                                 │
│  [Cancel]                    [Import All ✓]    │
└─────────────────────────────────────────────────┘
```

---

## ⏱️ Implementation Order

### Step 1: Database Migration
- Run SQL to add new fee columns
- Migrate existing brokerage data to commission column

### Step 2: Install Dependencies
```bash
npm install pdf-parse
```

### Step 3: Update TypeScript Types
- Add new fee fields to Trade interface
- Create ParsedTrade interface

### Step 4: Create PDF Parser (Core Logic)
- Parse Munir Khanani format
- Extract all trade fields including ALL fees
- Handle BUY and SELL detection

### Step 5: Create API Endpoint
- Accept PDF file upload
- Return parsed trades as JSON

### Step 6: Create Import UI
- Drag-drop component
- Preview/edit extracted trades
- Show fee breakdown before import
- Import button

### Step 7: Update useTrades Hook
- Handle new fee columns
- Support fee_source field

### Step 8: Create Fee Analysis System
- `src/lib/fee-analysis.ts` - Core calculations
- `src/hooks/useFeeAnalysis.ts` - React hook
- Per-stock fee breakdown
- Portfolio-wide fee metrics

### Step 9: Update Risk Dashboard
- Add "Trading Costs Analysis" section
- Show actual fees vs settings rates
- Fee breakdown charts
- Per-stock fee table

### Step 10: Fix Portfolio Bugs
- Total shares display
- Cash remaining calculation
- Chart formula

### Step 11: Fix Analysis Bugs
- Share counting consistency
- Gross/net standardization

### Step 12: Test & Deploy
- Test with real broker PDFs (BUY and SELL)
- Verify fee calculations
- Deploy to Vercel
- Verify on production

---

## ✅ Success Criteria

1. **PDF Import:**
   - [ ] Can upload Munir Khanani PDF statement
   - [ ] Correctly detects BUY vs SELL trades
   - [ ] Extracts ALL fee columns (Comm, SST, CDC, CVT, LAGA, SECP, NCS)
   - [ ] Preview shows correct data before import
   - [ ] Trades saved to database with all fees
   - [ ] Portfolio updates immediately after import

2. **Per-Trade Fee Storage:**
   - [ ] Each trade stores actual fees from PDF
   - [ ] fee_source field indicates 'pdf' or 'manual'
   - [ ] Manual trades still use settings as defaults
   - [ ] Old trades migrated with brokerage → commission

3. **Risk Dashboard:**
   - [ ] Shows "Trading Costs Analysis" section
   - [ ] Total Fees Paid (all-time)
   - [ ] Average Fee Rate (actual, not settings)
   - [ ] Fee breakdown by type (pie chart)
   - [ ] Per-stock fee table with effective rates
   - [ ] Estimated exit cost calculation

4. **Bug Fixes:**
   - [ ] Portfolio page shows correct "Total Shares"
   - [ ] Trades page shows shares bought/sold/net
   - [ ] Analysis page shows clear share metrics
   - [ ] Dashboard cash remaining is accurate
   - [ ] Monthly chart shows real portfolio value

5. **Works on Vercel:**
   - [ ] PDF parsing works in serverless environment
   - [ ] No external API dependencies (free!)
   - [ ] Fast response times (<3 seconds)

---

## 💰 Cost: FREE

- `pdf-parse` - Open source, no API
- `tesseract.js` - Runs in browser, no API
- No external services needed
- Works within Vercel free tier

---

## 🚀 Ready to Implement?

Once you approve this plan, I will:
1. Install pdf-parse
2. Create the PDF parser for Munir Khanani format
3. Build the import UI
4. Fix all portfolio/totals bugs
5. Test and deploy to Vercel

**Estimated time:** 30-45 minutes with parallel agents
