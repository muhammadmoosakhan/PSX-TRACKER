#!/usr/bin/env node
/**
 * PSX Tracker — Single Stock Checker
 * Usage: node scripts/check_stock.js ENGRO
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function fetchJSON(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, ok: res.ok };
  } catch (err) {
    return { status: 0, json: null, ok: false, error: err.message };
  }
}

function check(label, condition, detail = '') {
  const icon = condition ? '✓' : '✗';
  const color = condition ? '\x1b[32m' : '\x1b[31m';
  console.log(`  ${color}${icon}\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
  return condition;
}

async function main() {
  const symbol = process.argv[2]?.toUpperCase();
  if (!symbol) {
    console.error('Usage: node scripts/check_stock.js <SYMBOL>');
    process.exit(1);
  }

  console.log(`\n🔍 Checking ${symbol}\n`);
  let pass = 0, fail = 0;

  // 1. Live data
  console.log('📊 Live Data:');
  const market = await fetchJSON(`${BASE_URL}/api/psx/market`);
  const stock = market.json?.stocks?.find(s => s.symbol?.toUpperCase() === symbol);
  if (check('Market endpoint responds', market.ok)) pass++; else fail++;
  if (check('Stock found in market data', !!stock)) {
    pass++;
    if (check('Has current price', stock.current_price > 0, `PKR ${stock.current_price}`)) pass++; else fail++;
    if (check('Has volume', stock.volume > 0, stock.volume?.toLocaleString())) pass++; else fail++;
    if (check('Has sector', !!stock.sector && stock.sector !== 'Other', stock.sector)) pass++; else fail++;
  } else { fail += 3; }

  // 2. History
  console.log('\n📈 Chart History:');
  const hist = await fetchJSON(`${BASE_URL}/api/psx/history/${symbol}`);
  if (check('History endpoint responds', hist.ok)) pass++; else fail++;
  const points = hist.json?.history?.length || 0;
  if (check('Has chart data', points > 0, `${points} data points`)) pass++; else fail++;
  if (check('Enough for technicals', points >= 35, `need 35, have ${points}`)) pass++; else fail++;

  // 3. Company data
  console.log('\n🏢 Company Data:');
  const company = await fetchJSON(`${BASE_URL}/api/psx/company/${symbol}`);
  if (check('Company endpoint responds', company.ok, `status ${company.status}`)) pass++; else fail++;

  if (company.json && !company.json.error) {
    if (check('Company name parsed', !!company.json.name && company.json.name !== symbol, company.json.name)) pass++; else fail++;
    if (check('Sector parsed', !!company.json.sector && company.json.sector !== 'Other', company.json.sector)) pass++; else fail++;

    // Profile
    console.log('\n👤 Profile:');
    const p = company.json.profile;
    if (p) {
      if (check('Has description', !!p.description && p.description.length > 20)) pass++; else fail++;
      if (check('Has market cap', p.marketCap != null, p.marketCap?.toLocaleString())) pass++; else fail++;
      if (check('Has total shares', p.totalShares != null)) pass++; else fail++;
      if (check('Has CEO', !!p.ceo, p.ceo)) pass++; else fail++;
      if (check('Has chairperson', !!p.chairperson, p.chairperson)) pass++; else fail++;
      if (check('Has address', !!p.address)) pass++; else fail++;
      if (check('Has website', !!p.website && /^(https?:\/\/|www\.)/i.test(p.website), p.website)) pass++; else fail++;
      if (check('Has registrar', !!p.registrar)) pass++; else fail++;
      if (check('Has auditor', !!p.auditor)) pass++; else fail++;
    } else {
      check('Profile exists', false);
      fail += 9;
    }

    // Fundamentals
    console.log('\n📐 Fundamentals:');
    const f = company.json.fundamentals;
    if (f) {
      if (check('Has EPS (annual)', f.eps?.annual != null, f.eps?.annual)) pass++; else fail++;
      if (check('Has P/E (annual)', f.pe?.annual != null, f.pe?.annual)) pass++; else fail++;
      if (check('Has ROE', f.returnOn?.roe != null, f.returnOn?.roe)) pass++; else fail++;
      if (check('Has book value', f.bookValue != null, f.bookValue)) pass++; else fail++;
      if (check('Has dividend yield', f.dividendYield != null, f.dividendYield)) pass++; else fail++;
      if (check('Has current ratio', f.currentRatio != null, f.currentRatio)) pass++; else fail++;
    } else {
      check('Fundamentals exist', false);
      fail += 6;
    }

    // Announcements
    console.log('\n📢 Announcements:');
    const anns = company.json.announcements || [];
    if (check('Has announcements', anns.length > 0, `${anns.length} found`)) pass++; else fail++;
    if (check('Has PDF links', anns.some(a => a.pdfUrl), `${anns.filter(a => a.pdfUrl).length} PDFs`)) pass++; else fail++;
    if (check('Has view links', anns.some(a => a.viewUrl), `${anns.filter(a => a.viewUrl).length} views`)) pass++; else fail++;
  } else {
    check('Company data loaded', false, company.json?.error || 'no response');
    fail += 15;
  }

  // 4. Peers
  console.log('\n👥 Peers:');
  if (stock) {
    const peers = market.json.stocks.filter(s => s.sector === stock.sector && s.symbol !== stock.symbol);
    if (check('Has sector peers', peers.length > 0, `${peers.length} peers`)) pass++; else fail++;
  } else {
    check('Peers check', false, 'no stock data');
    fail++;
  }

  // Summary
  console.log(`\n${'─'.repeat(50)}`);
  const total = pass + fail;
  const pct = ((pass / total) * 100).toFixed(0);
  const color = fail === 0 ? '\x1b[32m' : fail <= 5 ? '\x1b[33m' : '\x1b[31m';
  console.log(`${color}${symbol}: ${pass}/${total} checks passed (${pct}%)\x1b[0m\n`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
