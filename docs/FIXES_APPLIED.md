# PSX Tracker — Fixes Applied

**Fix Date:** 2026-03-13

## Fix 1: Derivative Symbol Fallback (66 stocks fixed)

**Problem:** PSX market watch lists derivative symbols (XD=ex-dividend, NC=non-cumulative, WU=warrants, XB, XR, NLXB) as separate tickers. These symbols have no company page on `dps.psx.com.pk/company/`, causing 404 errors for Profile, Fundamentals, and News tabs.

**Files Modified:**
- `src/app/api/psx/company/[symbol]/route.ts` — Added `getParentSymbols()` function and retry logic
- `src/app/api/psx/history/[symbol]/route.ts` — Added same parent symbol fallback for chart history

**How It Works:**
1. First attempts to fetch data for the exact symbol (e.g., HUBCXD)
2. If that fails, strips known suffixes in shortest-first order: XD, NC, WU, XB, XR, PS, CPS, ETFXD, NLXB
3. Tries each candidate parent symbol (e.g., HUBC) until one succeeds
4. Returns data with the original derivative symbol in the response

**Impact:**
- Before: 66 stocks returned 404 on company endpoint, had no chart data
- After: All 66 now resolve to their parent company data
- 0 regressions introduced

## Fix 2: Audit & Monitoring Infrastructure

**Files Created:**
- `scripts/audit_all_stocks.js` — Full audit of all stocks across all 6 tabs
- `scripts/check_stock.js` — Single stock deep check with colored output
- `scripts/summarize_issues.js` — Grouped issue report from audit data
- `scripts/list_broken.js` — Filter broken stocks by tab type
- `scripts/diff_audit_results.js` — Compare pre/post fix audit results
- `scripts/progress.sh` — One-line health summary

## Fix 3: CLAUDE.md Optimization

**Before:** 340 lines with outdated file tree, CSS snippets, formula docs
**After:** 55 lines focused on endpoints, commands, and rules
**Token savings:** ~85% reduction per conversation load

## Results

| Metric | Before | After |
|--------|--------|-------|
| Stocks audited | 472 | 472 |
| Clean (all tabs work) | 364 (77%) | 416 (88%) |
| Partial (some tabs missing data) | 42 (9%) | 56 (12%) |
| Broken (critical failures) | 66 (14%) | 0 (0%) |
| Total issues | 381 | 65 |
| Issues resolved | — | 316 |
| Regressions | — | 0 |
