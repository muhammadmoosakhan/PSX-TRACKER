#!/bin/bash
# PSX Tracker — Progress Summary
# Usage: bash scripts/progress.sh

FILE="audit_results.json"

if [ ! -f "$FILE" ]; then
  echo "❌ audit_results.json not found. Run audit first."
  exit 1
fi

# Use node to parse JSON and count
node -e "
const r = require('./$FILE');
const entries = Object.values(r);
let clean = 0, partial = 0, broken = 0;
for (const e of entries) {
  const issues = [
    !e.live?.hasData,
    !e.history?.hasChart,
    e.company?.status !== 200,
    !e.profile?.hasData,
    !e.fundamentals?.hasData
  ].filter(Boolean).length;
  if (issues === 0) clean++;
  else if (issues <= 2) partial++;
  else broken++;
}
console.log('✓ ' + clean + ' clean | ⚠ ' + partial + ' partial | ✗ ' + broken + ' broken | Total: ' + entries.length);
"
