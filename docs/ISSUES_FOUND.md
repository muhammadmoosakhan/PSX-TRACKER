# PSX Tracker — Issues Found (Pre-Fix Audit)

**Audit Date:** 2026-03-13
**Stocks Audited:** 472
**Result:** 364 clean | 42 partial | 66 broken

## Critical Issues

### 1. Company Endpoint Returns 404 for Derivative Symbols (66 stocks)
**Cause:** PSX market watch lists derivative symbols (ex-dividend XD, non-cumulative NC, warrants WU, etc.) as separate tickers, but `dps.psx.com.pk/company/{SYMBOL}` has no page for them.

| Suffix | Count | Examples |
|--------|-------|---------|
| NC | 31 | AMTEXNC, ARUJNC, ASCNC, BELANC, DBCINC |
| XD | 27 | AKBLXD, APLXD, ATRLXD, BAHLXD, BWCLXD |
| WU | 4 | CJPLWU, DWTMWU, GUSMWU, SLYTWU |
| NLXB | 1 | GEMSPNLXB |
| XB | 1 | IPAKXB |
| ETFXD | 1 | JSGBETFXD |
| XR | 1 | SHDTXR |

**Impact:** Profile, Fundamentals, and News tabs all show empty for these 66 stocks.
**Fix:** Strip known suffixes and retry with parent company symbol.

### 2. No Chart History (67 stocks)
**Cause:** 66 overlap with broken company (same derivative symbols). 1 additional (MRNS — Morinaga) returns empty from PSX history endpoint.
**Impact:** Live tab shows "No chart data"; Technicals tab shows "Insufficient Data".
**Fix:** For derivatives, try parent symbol's history. For MRNS, accept as data gap.

## Moderate Issues

### 3. No Fundamentals Data (41 stocks with working company pages)
**Cause:** ETFs, modarabas, closed-end funds, and very small companies don't have financial ratio tables on PSX.
**Examples:** ACIETF, AGSML, ARPAK, ASLCPS, ASLPS, BGL, CLCPS, DFSM, ESBL, FEM
**Impact:** Fundamentals tab shows "Unavailable" (UI handles this gracefully).
**Fix:** Not fixable — PSX doesn't publish these ratios. UI already handles it correctly.

### 4. No Announcements (75 stocks)
**Cause:** 66 are derivative symbols (no company page). Remaining 9 are legitimate stocks with no announcements published on PSX.
**Impact:** News tab shows "No Announcements".
**Fix:** Derivative symbols will be fixed by suffix stripping. The remaining 9 are genuinely empty.

## Minor Issues

### 5. Missing Profile Fields (stocks with working company pages)
| Field | Missing Count | Reason |
|-------|--------------|--------|
| Chairperson | 19 | PSX page genuinely doesn't list one (ETFs, modarabas) |
| Market Cap | 16 | PSX page missing stats section for some instruments |
| Secretary | 16 | Same — not listed on PSX for some instruments |
| CEO | 12 | Mostly ETFs and modarabas |
| Description | 9 | No "BUSINESS DESCRIPTION" section on PSX page |
| Total Shares | 8 | Missing from stats section |
| Registrar | 8 | Not listed |
| Auditor | 8 | Not listed |
| Website | 1 | PSX (Pakistan Stock Exchange) doesn't list its own website |

**Fix:** Not fixable — these are genuine data gaps on PSX. UI already shows fields conditionally (only when data exists).

### 6. No Peers (1 stock)
**Stock:** BNWM — sole stock in its sector in market data.
**Fix:** Not fixable — sector classification issue on PSX's side.

## Summary

| Category | Count | Fixable? |
|----------|-------|----------|
| Derivative symbol 404s | 66 | YES — suffix stripping fallback |
| No chart for derivatives | 66 | YES — use parent symbol |
| No chart (genuine) | 1 | NO — PSX has no data |
| No fundamentals (ETFs/modarabas) | 41 | NO — PSX doesn't publish |
| Missing profile fields | ~19 | NO — genuinely missing on PSX |
| No announcements (genuine) | 9 | NO — PSX has none |
| No peers | 1 | NO — sector classification |

**Total fixable:** 66 stocks (derivative symbol fallback)
**Total unfixable:** ~50 individual data gaps (PSX data quality)
