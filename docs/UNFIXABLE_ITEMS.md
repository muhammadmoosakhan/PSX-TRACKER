# PSX Tracker — Unfixable Items

**Date:** 2026-03-13

These are genuine data gaps on the PSX Data Portal (`dps.psx.com.pk`) that cannot be resolved by code changes. The UI already handles all of these gracefully (shows "Unavailable", hides empty fields, etc.).

## 1. No Fundamentals Data (41 stocks)

**Reason:** ETFs, modarabas, closed-end funds, and very small companies don't have financial ratio tables on PSX.

**Examples:** ACIETF, AGSML, ARPAK, ASLCPS, ASLPS, BGL, CLCPS, DFSM, ESBL, FEM

**UI behavior:** Fundamentals tab shows "Unavailable" — handled correctly.

## 2. No Chart History for MRNS (1 stock)

**Reason:** PSX history endpoint returns empty data for Morinaga (MRNS). Company page exists and works, but no EOD price history is available.

**UI behavior:** Live tab shows "No chart data", Technicals tab shows "Insufficient Data".

## 3. Missing Profile Fields (~19 stocks)

| Field | Missing Count | Reason |
|-------|--------------|--------|
| Chairperson | 19 | PSX page doesn't list one (ETFs, modarabas) |
| Market Cap | 16 | PSX page missing stats section |
| Secretary | 16 | Not listed on PSX |
| CEO | 12 | Mostly ETFs and modarabas |
| Description | 9 | No "BUSINESS DESCRIPTION" section |
| Total Shares | 8 | Missing from stats section |
| Registrar | 8 | Not listed |
| Auditor | 8 | Not listed |
| Website | 1 | PSX doesn't list its own website |

**UI behavior:** Fields are shown conditionally — only when data exists.

## 4. No Announcements (9 stocks with working company pages)

**Reason:** These companies genuinely have no announcements published on PSX.

**UI behavior:** News tab shows "No Announcements".

## 5. No Peers (1 stock — BNWM)

**Reason:** BNWM is the sole stock in its sector in market data. Sector classification issue on PSX's side.

**UI behavior:** Peers tab shows "No peers found".

## 6. Git Push Access

**Blocker:** The authenticated GitHub account (`karsaazebs-dev`) does not have push access to `muhammadmoosakhan/PSX-TRACKER.git`. The repository owner needs to grant collaborator access or the push must be done from the owner's account.

## Summary

| Category | Count | Status |
|----------|-------|--------|
| No fundamentals (ETFs/modarabas) | 41 | PSX data gap — UI handles it |
| No chart history (genuine) | 1 | PSX data gap — UI handles it |
| Missing profile fields | ~19 | PSX data gap — UI handles it |
| No announcements (genuine) | 9 | PSX data gap — UI handles it |
| No peers | 1 | PSX classification — UI handles it |
| Git push access | 1 | Requires repo owner action |
