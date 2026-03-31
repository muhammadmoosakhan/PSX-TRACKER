/**
 * One-time script: Repair orphaned trades (user_id IS NULL)
 * Finds the user by email and assigns all orphaned trades to them.
 *
 * Usage: node scripts/repair_trades.mjs [email]
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Parse .env.local manually (no dotenv dependency needed)
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const [, key, val] = match;
    process.env[key.trim()] = val.trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = process.argv[2];

  // Step 1: List all users and their trade counts
  console.log('\n=== Supabase Users ===');
  const { data: { users }, error: usersErr } = await admin.auth.admin.listUsers();
  if (usersErr) { console.error('Failed to list users:', usersErr); process.exit(1); }

  for (const u of users) {
    const { count } = await admin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', u.id);
    console.log(`  ${u.email} (${u.id}) → ${count ?? 0} trades`);
  }

  // Step 2: Count orphaned trades
  const { count: orphanCount } = await admin
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .is('user_id', null);
  console.log(`\n=== Orphaned trades (user_id IS NULL): ${orphanCount ?? 0} ===`);

  // Step 3: Count total trades
  const { count: totalCount } = await admin
    .from('trades')
    .select('*', { count: 'exact', head: true });
  console.log(`=== Total trades in DB: ${totalCount ?? 0} ===`);

  if (!orphanCount || orphanCount === 0) {
    // Maybe user_id is set but wrong — check all distinct user_ids
    const { data: distinctUsers } = await admin
      .from('trades')
      .select('user_id')
      .limit(1000);

    const userIdCounts = {};
    for (const row of (distinctUsers || [])) {
      const uid = row.user_id || 'NULL';
      userIdCounts[uid] = (userIdCounts[uid] || 0) + 1;
    }
    console.log('\n=== Trades by user_id ===');
    for (const [uid, cnt] of Object.entries(userIdCounts)) {
      const matchedUser = users.find(u => u.id === uid);
      console.log(`  ${uid} (${matchedUser?.email || 'unknown'}) → ${cnt} trades`);
    }
  }

  if (!email) {
    console.log('\nTo repair, run: node scripts/repair_trades.mjs <email>');
    return;
  }

  // Step 4: Find the target user
  const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!targetUser) {
    console.error(`\nUser not found: ${email}`);
    console.log('Available users:', users.map(u => u.email).join(', '));
    process.exit(1);
  }

  console.log(`\nTarget user: ${targetUser.email} (${targetUser.id})`);

  if (orphanCount && orphanCount > 0) {
    // Repair orphaned trades
    const { error: updateErr } = await admin
      .from('trades')
      .update({ user_id: targetUser.id })
      .is('user_id', null);

    if (updateErr) {
      console.error('Repair failed:', updateErr);
      process.exit(1);
    }
    console.log(`✓ Assigned ${orphanCount} orphaned trades to ${targetUser.email}`);
  } else {
    console.log('No orphaned trades to repair.');
  }

  // Step 5: Final count for this user
  const { count: finalCount } = await admin
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', targetUser.id);
  console.log(`\n=== Final: ${targetUser.email} now has ${finalCount ?? 0} trades ===`);
}

main().catch(console.error);
