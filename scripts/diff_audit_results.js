#!/usr/bin/env node
/**
 * PSX Tracker — Diff Audit Results
 * Compares pre-fix and post-fix audit JSON files.
 * Usage: node scripts/diff_audit_results.js
 */

const fs = require('fs');
const path = require('path');

const PRE = path.join(process.cwd(), 'audit_results.json');
const POST = path.join(process.cwd(), 'audit_results_post_fix.json');

if (!fs.existsSync(PRE)) { console.error('❌ audit_results.json not found'); process.exit(1); }
if (!fs.existsSync(POST)) { console.error('❌ audit_results_post_fix.json not found'); process.exit(1); }

const pre = JSON.parse(fs.readFileSync(PRE, 'utf-8'));
const post = JSON.parse(fs.readFileSync(POST, 'utf-8'));

function countIssues(results) {
  let issues = 0;
  for (const r of Object.values(results)) {
    if (!r.live?.hasData) issues++;
    if (!r.history?.hasChart) issues++;
    if (r.company?.status !== 200) issues++;
    if (!r.profile?.hasData) issues++;
    if (!r.fundamentals?.hasData) issues++;
    if (r.announcements?.count === 0) issues++;
  }
  return issues;
}

function countHealthy(results) {
  let clean = 0;
  for (const r of Object.values(results)) {
    const bad = [!r.live?.hasData, !r.history?.hasChart, r.company?.status !== 200, !r.profile?.hasData, !r.fundamentals?.hasData].filter(Boolean).length;
    if (bad === 0) clean++;
  }
  return clean;
}

const preIssues = countIssues(pre);
const postIssues = countIssues(post);
const preClean = countHealthy(pre);
const postClean = countHealthy(post);

console.log('\n📊 Audit Diff\n');
console.log(`Stocks audited:  ${Object.keys(pre).length} → ${Object.keys(post).length}`);
console.log(`Total issues:    ${preIssues} → ${postIssues} (${preIssues - postIssues > 0 ? '-' : '+'}${Math.abs(preIssues - postIssues)} resolved)`);
console.log(`Fully clean:     ${preClean} → ${postClean} (${postClean - preClean > 0 ? '+' : ''}${postClean - preClean})`);

// New issues
const preSymbols = new Set(Object.keys(pre));
const newSymbols = Object.keys(post).filter(s => !preSymbols.has(s));
if (newSymbols.length > 0) {
  console.log(`New stocks:      ${newSymbols.length} (${newSymbols.slice(0, 5).join(', ')})`);
}

// Regressions
let regressions = 0;
for (const sym of Object.keys(post)) {
  if (!pre[sym]) continue;
  const preBad = [!pre[sym].live?.hasData, !pre[sym].history?.hasChart, pre[sym].company?.status !== 200].filter(Boolean).length;
  const postBad = [!post[sym].live?.hasData, !post[sym].history?.hasChart, post[sym].company?.status !== 200].filter(Boolean).length;
  if (postBad > preBad) regressions++;
}
console.log(`Regressions:     ${regressions}`);
console.log('');
