#!/usr/bin/env node
/**
 * PSX Tracker — List Broken Stocks
 * Usage:
 *   node scripts/list_broken.js              # all broken
 *   node scripts/list_broken.js live          # broken live data
 *   node scripts/list_broken.js history       # no chart data
 *   node scripts/list_broken.js company       # company endpoint failed
 *   node scripts/list_broken.js fundamentals  # no fundamentals
 *   node scripts/list_broken.js announcements # no announcements
 *   node scripts/list_broken.js profile       # no profile data
 *   node scripts/list_broken.js website       # no/invalid website
 *   node scripts/list_broken.js peers         # no peers
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'audit_results.json');
if (!fs.existsSync(FILE)) {
  console.error('❌ audit_results.json not found');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
const filter = process.argv[2]?.toLowerCase();

const broken = [];

for (const [sym, r] of Object.entries(results)) {
  let isBroken = false;

  switch (filter) {
    case 'live':
      isBroken = !r.live.hasData;
      break;
    case 'history':
    case 'chart':
      isBroken = !r.history.hasChart;
      break;
    case 'company':
      isBroken = r.company.status !== 200;
      break;
    case 'fundamentals':
    case 'fund':
      isBroken = !r.fundamentals.hasData;
      break;
    case 'announcements':
    case 'news':
      isBroken = r.announcements.count === 0;
      break;
    case 'profile':
      isBroken = !r.profile.hasData;
      break;
    case 'website':
      isBroken = !r.profile.websiteValid;
      break;
    case 'peers':
      isBroken = r.peers.count === 0;
      break;
    default:
      // No filter — show stocks with any critical issue
      isBroken = !r.live.hasData || !r.history.hasChart || r.company.status !== 200;
      break;
  }

  if (isBroken) broken.push(sym);
}

if (filter) {
  console.log(`\n${broken.length} stocks with ${filter} issues:\n`);
} else {
  console.log(`\n${broken.length} stocks with critical issues:\n`);
}

broken.sort().forEach(s => console.log(s));
console.log('');
