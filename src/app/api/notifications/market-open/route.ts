import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { sendBulkEmails } from '@/lib/email';
import { marketOpenEmailHTML } from '@/lib/email-templates';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users with market_open notifications enabled
    const supabaseAdmin = getSupabaseAdmin();
    const { data: prefs, error } = await supabaseAdmin
      .from('notification_preferences')
      .select('email')
      .eq('enabled', true)
      .eq('market_open', true);

    if (error) throw error;
    if (!prefs || prefs.length === 0) {
      return NextResponse.json({ message: 'No subscribers', sent: 0 });
    }

    const today = new Date().toLocaleDateString('en-PK', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const recipients = prefs
      .filter((p) => p.email)
      .map((p) => ({
        email: p.email,
        subject: `PSX Market Open - ${today}`,
        html: marketOpenEmailHTML(today),
      }));

    const result = await sendBulkEmails(recipients);
    return NextResponse.json({ ...result, total: recipients.length });
  } catch (err) {
    console.error('Market open notification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
