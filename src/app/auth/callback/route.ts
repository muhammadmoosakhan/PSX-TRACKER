import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { welcomeEmailHTML } from '@/lib/email-templates';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore — may fail in certain contexts
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Send welcome email for new signups (created within last 5 minutes)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && user.created_at) {
          const createdAt = new Date(user.created_at).getTime();
          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          if (createdAt > fiveMinAgo) {
            sendEmail(
              user.email,
              'Welcome to PSX Portfolio Tracker!',
              welcomeEmailHTML(user.email)
            ).catch(() => {}); // fire and forget
          }
        }
      } catch {
        // Welcome email is non-critical
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
