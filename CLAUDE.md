# PSX Tracker — Claude Code Context

## Project
- **Stack:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase + Recharts
- **Stock source:** PSX market watch (`dps.psx.com.pk/market-watch`) → cached in Supabase `stocks_cache`
- **Company data:** Scraped from `dps.psx.com.pk/company/{SYMBOL}` via regex HTML parsing
- **Total stocks:** ~506 actively traded
- **Deploy:** Vercel (`psx-tracker-two.vercel.app`)
- **Auth:** Supabase email/password + TOTP 2FA, middleware-protected routes

## API Endpoints
- `GET /api/psx/market` — all stocks (Live, Peers tabs)
- `GET /api/psx/history/[symbol]` — EOD chart data (Live, Technicals tabs)
- `GET /api/psx/company/[symbol]` — profile + fundamentals + announcements (Fund/News/Profile tabs)
- `GET /api/psx/indices` + `/api/psx/indices/[index]` — market indices

## Key Files
- `src/app/stocks/[symbol]/page.tsx` — stock detail (6 tabs: Live, Fundamentals, Technicals, News, Profile, Peers)
- `src/app/api/psx/company/[symbol]/route.ts` — PSX HTML scraper (profile, fundamentals, announcements)
- `src/lib/psx.ts` — market data fetcher/parser
- `src/lib/psx-companies.ts` — static symbol→name map (~380 entries)
- `src/lib/technicals.ts` — RSI, MACD, Stochastic, SMA, Pivot Points
- `src/types/index.ts` — all TypeScript interfaces

## Commands
- `npm run dev` — dev server (Turbopack)
- `npm run build` — production build
- `node scripts/audit_all_stocks.js` — audit all stocks across 6 tabs
- `node scripts/check_stock.js <SYMBOL>` — audit single stock
- `node scripts/summarize_issues.js` — grouped issue counts from audit
- `node scripts/list_broken.js [tab]` — list broken symbols by tab
- `node scripts/diff_audit_results.js` — compare pre/post audit
- `bash scripts/progress.sh` — one-line pass/partial/broken summary

## Environment Variables (names only)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CRON_SECRET`

## DO NOT READ
- `node_modules/`, `.next/`, `dist/`, `build/`, `.cache/`, `coverage/`
- `audit_results.json`, `audit_results_post_fix.json` — use scripts instead
- `src/lib/psx-companies.ts` — static data, query via `scripts/check_stock.js`

## Rules
- All data → Supabase (never localStorage)
- PSX calls → API routes only (CORS)
- Design: "Soft Glow" — purple `#6C5CE7`, rounded 16px
- Fonts: Plus Jakarta Sans + DM Sans + JetBrains Mono
- Run scripts first, read raw files only if script output is insufficient
- Fix root causes by pattern, not stock-by-stock
- After each fix batch, run `bash scripts/progress.sh`

## ACTIVE TASK
- Audit & fix in progress — check `docs/ISSUES_FOUND.md` and `docs/FIXES_APPLIED.md`
