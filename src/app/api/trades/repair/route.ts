import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/**
 * POST /api/trades/repair
 * Claims orphaned trades (user_id IS NULL) for the current authenticated user.
 * One-time fix for trades inserted before user_id was explicitly set.
 */
export async function POST() {
  try {
    // Get the authenticated user from the session
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Use admin client to bypass RLS and find orphaned trades
    const admin = getSupabaseAdmin();

    // Count orphaned trades before fix
    const { count: orphanedCount } = await admin
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    if (!orphanedCount || orphanedCount === 0) {
      return NextResponse.json({
        message: 'No orphaned trades found',
        repaired: 0,
      });
    }

    // Assign orphaned trades to the current user
    const { error: updateError } = await admin
      .from('trades')
      .update({ user_id: user.id })
      .is('user_id', null);

    if (updateError) {
      console.error('Repair error:', updateError);
      return NextResponse.json({ error: 'Failed to repair trades' }, { status: 500 });
    }

    return NextResponse.json({
      message: `Repaired ${orphanedCount} orphaned trades for ${user.email}`,
      repaired: orphanedCount,
      user_email: user.email,
    });
  } catch (e) {
    console.error('Trade repair error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
