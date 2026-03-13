#!/usr/bin/env node
/**
 * PSX Tracker — Summarize Audit Issues
 * Reads audit_results.json and prints grouped issue counts.
 * Usage: node scripts/summarize_issues.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'audit_results.json');

if (!fs.existsSync(FILE)) {
  console.error('❌ audit_results.json not found. Run audit first: node scripts/audit_all_stocks.js');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
const symbols = Object.keys(results);
const total = symbols.length;

// Issue counters
const issues = {
  'No live data': [],
  'No chart history': [],
  'Company endpoint failed': [],
  'No fundamentals data': [],
  'No announcements': [],
  'No PDF links in announcements': [],
  'No view URLs in announcements': [],
  'No profile data': [],
  'No website URL': [],
  'Website URL invalid': [],
  'No CEO': [],
  'No chairperson': [],
  'No address': [],
  'No description': [],
  'No market cap': [],
  'No registrar': [],
  'No auditor': [],
  'Insufficient data for technicals': [],
  'No peers in sector': [],
};

for (const [sym, r] of Object.entries(results)) {
  if (!r.live.hasData) issues['No live data'].push(sym);
  if (!r.history.hasChart) issues['No chart history'].push(sym);
  if (r.company.status !== 200) issues['Company endpoint failed'].push(sym);
  if (!r.fundamentals.hasData) issues['No fundamentals data'].push(sym);
  if (r.announcements.count === 0) issues['No announcements'].push(sym);
  if (r.announcements.count > 0 && !r.announcements.hasPdfs) issues['No PDF links in announcements'].push(sym);
  if (r.announcements.count > 0 && !r.announcements.hasViewUrls) issues['No view URLs in announcements'].push(sym);
  if (!r.profile.hasData) issues['No profile data'].push(sym);
  if (r.profile.missingFields?.includes('website')) issues['No website URL'].push(sym);
  if (r.profile.hasData && !r.profile.websiteValid && !r.profile.missingFields?.includes('website')) issues['Website URL invalid'].push(sym);
  if (r.profile.missingFields?.includes('ceo')) issues['No CEO'].push(sym);
  if (r.profile.missingFields?.includes('chairperson')) issues['No chairperson'].push(sym);
  if (r.profile.missingFields?.includes('address')) issues['No address'].push(sym);
  if (r.profile.missingFields?.includes('description')) issues['No description'].push(sym);
  if (r.profile.missingFields?.includes('marketCap')) issues['No market cap'].push(sym);
  if (r.profile.missingFields?.includes('registrar')) issues['No registrar'].push(sym);
  if (r.profile.missingFields?.includes('auditor')) issues['No auditor'].push(sym);
  if (!r.technicals.computable) issues['Insufficient data for technicals'].push(sym);
  if (r.peers.count === 0) issues['No peers in sector'].push(sym);
}

// Print table
console.log(`\n📋 Audit Summary — ${total} stocks audited\n`);
console.log(`${'Issue Type'.padEnd(40)} ${'Count'.padStart(5)}  ${'%'.padStart(5)}  Examples`);
console.log('─'.repeat(90));

const sorted = Object.entries(issues)
  .filter(([, syms]) => syms.length > 0)
  .sort((a, b) => b[1].length - a[1].length);

for (const [issue, syms] of sorted) {
  const pct = ((syms.length / total) * 100).toFixed(0);
  const examples = syms.slice(0, 3).join(', ') + (syms.length > 3 ? '...' : '');
  console.log(`${issue.padEnd(40)} ${String(syms.length).padStart(5)}  ${(pct + '%').padStart(5)}  ${examples}`);
}

if (sorted.length === 0) {
  console.log('  No issues found! All stocks passing.');
}

// Overall health
let clean = 0, partial = 0, broken = 0;
for (const r of Object.values(results)) {
  const count = [
    !r.live.hasData, !r.history.hasChart, r.company.status !== 200,
    !r.profile.hasData, !r.fundamentals.hasData
  ].filter(Boolean).length;
  if (count === 0) clean++;
  else if (count <= 2) partial++;
  else broken++;
}

console.log(`\n✓ ${clean} clean | ⚠ ${partial} partial | ✗ ${broken} broken\n`);
