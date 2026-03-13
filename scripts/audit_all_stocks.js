#!/usr/bin/env node
/**
 * PSX Tracker — Full Stock Audit Script
 * Hits all relevant endpoints for every stock and records results.
 *
 * Usage:
 *   node scripts/audit_all_stocks.js                  # audit all stocks
 *   node scripts/audit_all_stocks.js --dry-run        # test with 3 stocks
 *   node scripts/audit_all_stocks.js --concurrency 10 # parallel requests
 *
 * Output: audit_results.json
 */

const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv.find(a => a.startsWith('--concurrency'))?.split('=')[1] || '5', 10);
const DRY_RUN = process.argv.includes('--dry-run');
const OUTPUT_FILE = path.join(process.cwd(), 'audit_results.json');

// ── Helpers ──────────────────────────────────────

async function fetchJSON(url, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, raw: text, ok: res.ok };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, json: null, raw: '', ok: false, error: err.message };
  }
}

function getMissingFields(obj, fields) {
  if (!obj) return fields;
  return fields.filter(f => {
    const val = f.split('.').reduce((o, k) => o?.[k], obj);
    return val === null || val === undefined || val === '' || val === 0;
  });
}

// ── Audit a single stock ─────────────────────────

async function auditStock(symbol) {
  const result = {
    live: { status: 0, hasData: false, missingFields: [] },
    history: { status: 0, hasChart: false, pointCount: 0 },
    company: { status: 0, hasData: false },
    fundamentals: { hasData: false, missingFields: [] },
    announcements: { count: 0, hasPdfs: false, hasViewUrls: false },
    profile: { hasData: false, missingFields: [], websiteValid: false },
    technicals: { computable: false },
    peers: { count: 0 },
  };

  // 1. Market data (live)
  const market = await fetchJSON(`${BASE_URL}/api/psx/market`);
  result.live.status = market.status;
  if (market.json?.stocks) {
    const stock = market.json.stocks.find(s => s.symbol?.toUpperCase() === symbol.toUpperCase());
    if (stock) {
      result.live.hasData = true;
      result.live.missingFields = getMissingFields(stock, [
        'current_price', 'ldcp', 'open_price', 'high', 'low', 'volume', 'change', 'change_pct', 'sector'
      ]);
      // Peers
      result.peers.count = market.json.stocks.filter(
        s => s.sector === stock.sector && s.symbol !== stock.symbol
      ).length;
    }
  }

  // 2. History (chart)
  const hist = await fetchJSON(`${BASE_URL}/api/psx/history/${symbol}`);
  result.history.status = hist.status;
  if (hist.json?.history) {
    result.history.pointCount = hist.json.history.length;
    result.history.hasChart = hist.json.history.length > 0;
    result.technicals.computable = hist.json.history.length >= 35; // need 26+9 for MACD
  }

  // 3. Company data (profile + fundamentals + announcements)
  const company = await fetchJSON(`${BASE_URL}/api/psx/company/${symbol}`);
  result.company.status = company.status;
  if (company.json && !company.json.error) {
    result.company.hasData = true;

    // Fundamentals
    const f = company.json.fundamentals;
    if (f) {
      const fundFields = [
        'eps.annual', 'pe.annual', 'profitMargins.gross', 'profitMargins.net',
        'returnOn.roe', 'returnOn.roa', 'dps.annual', 'dividendYield',
        'bookValue', 'pbv', 'currentRatio', 'debtToEquity'
      ];
      result.fundamentals.missingFields = getMissingFields(f, fundFields);
      result.fundamentals.hasData = result.fundamentals.missingFields.length < fundFields.length;
    }

    // Announcements
    const anns = company.json.announcements || [];
    result.announcements.count = anns.length;
    result.announcements.hasPdfs = anns.some(a => a.pdfUrl);
    result.announcements.hasViewUrls = anns.some(a => a.viewUrl);

    // Profile
    const p = company.json.profile;
    if (p) {
      const profileFields = ['description', 'marketCap', 'totalShares', 'chairperson', 'ceo', 'secretary', 'address', 'website', 'registrar', 'auditor'];
      result.profile.missingFields = getMissingFields(p, profileFields);
      result.profile.hasData = result.profile.missingFields.length < profileFields.length;
      result.profile.websiteValid = !!(p.website && /^(https?:\/\/|www\.)/i.test(p.website));
    }
  }

  return result;
}

// ── Main ─────────────────────────────────────────

async function main() {
  console.log(`🔍 PSX Stock Audit — ${DRY_RUN ? 'DRY RUN (3 stocks)' : 'FULL RUN'}`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log('');

  // Get stock list from market endpoint
  console.log('📡 Fetching stock list from /api/psx/market...');
  const marketRes = await fetchJSON(`${BASE_URL}/api/psx/market`);
  if (!marketRes.json?.stocks) {
    console.error('❌ Failed to fetch market data. Is the dev server running?');
    console.error(`   Status: ${marketRes.status}, Error: ${marketRes.error || 'unknown'}`);
    process.exit(1);
  }

  let symbols = marketRes.json.stocks.map(s => s.symbol).filter(Boolean);
  symbols = [...new Set(symbols)].sort();
  console.log(`📊 Found ${symbols.length} stocks`);

  if (DRY_RUN) {
    symbols = symbols.slice(0, 3);
    console.log(`   Dry run: testing ${symbols.join(', ')}`);
  }

  console.log('');

  // Audit in batches
  const results = {};
  let done = 0;

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (sym) => {
        const r = await auditStock(sym);
        done++;
        const pct = ((done / symbols.length) * 100).toFixed(0);
        process.stdout.write(`\r   [${pct}%] ${done}/${symbols.length} — ${sym}          `);
        return [sym, r];
      })
    );
    for (const [sym, r] of batchResults) {
      results[sym] = r;
    }
  }

  console.log('\n');

  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`✅ Audit complete. Results saved to ${OUTPUT_FILE}`);

  // Quick summary
  const total = Object.keys(results).length;
  let clean = 0, partial = 0, broken = 0;
  for (const [, r] of Object.entries(results)) {
    const issues = [];
    if (!r.live.hasData) issues.push('no-live');
    if (!r.history.hasChart) issues.push('no-chart');
    if (r.company.status !== 200) issues.push('no-company');
    if (!r.profile.hasData) issues.push('no-profile');
    if (!r.fundamentals.hasData) issues.push('no-fundamentals');

    if (issues.length === 0) clean++;
    else if (issues.length <= 2) partial++;
    else broken++;
  }

  console.log(`\n📋 Summary: ✓ ${clean} clean | ⚠ ${partial} partial | ✗ ${broken} broken`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
