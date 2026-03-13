const r = require('../audit_results.json');
const broken = Object.keys(r).filter(s => r[s].company.status !== 200);

// Check suffixes
const suffixes = {};
for (const sym of broken) {
  const match = sym.match(/(XD|NC|WU|XB|ETF|ETFXD|CPS|PS|XR|RF1|NLB|NLXB)$/i);
  const suffix = match ? match[1] : 'OTHER';
  if (!suffixes[suffix]) suffixes[suffix] = [];
  suffixes[suffix].push(sym);
}

console.log('Broken stock suffix patterns:');
for (const [suf, syms] of Object.entries(suffixes).sort((a,b) => b[1].length - a[1].length)) {
  console.log(`  ${suf.padEnd(10)} ${syms.length}: ${syms.slice(0, 5).join(', ')}`);
}

// Also check no-fundamentals stocks that DID have company data
const noFund = Object.keys(r).filter(s => r[s].company.status === 200 && !r[s].fundamentals.hasData);
console.log(`\nStocks with company page but no fundamentals: ${noFund.length}`);
console.log(`  Examples: ${noFund.slice(0, 10).join(', ')}`);

// Check which profile fields are most commonly missing (for stocks that have profiles)
const profileFields = ['description', 'marketCap', 'totalShares', 'chairperson', 'ceo', 'secretary', 'address', 'website', 'registrar', 'auditor'];
const fieldCounts = {};
for (const f of profileFields) fieldCounts[f] = 0;
for (const [sym, data] of Object.entries(r)) {
  if (data.company.status === 200 && data.profile.missingFields) {
    for (const f of data.profile.missingFields) {
      if (fieldCounts[f] !== undefined) fieldCounts[f]++;
    }
  }
}
console.log('\nMissing profile fields (stocks with working company pages):');
for (const [f, count] of Object.entries(fieldCounts).sort((a,b) => b[1] - a[1])) {
  if (count > 0) console.log(`  ${f.padEnd(20)} ${count}`);
}

// Check no-history stocks
const noHist = Object.keys(r).filter(s => !r[s].history.hasChart);
const noHistBroken = noHist.filter(s => r[s].company.status !== 200);
const noHistWorking = noHist.filter(s => r[s].company.status === 200);
console.log(`\nNo chart history: ${noHist.length} total`);
console.log(`  Also broken company: ${noHistBroken.length}`);
console.log(`  Company works but no chart: ${noHistWorking.length}`);
if (noHistWorking.length > 0) console.log(`  Examples: ${noHistWorking.slice(0, 10).join(', ')}`);
