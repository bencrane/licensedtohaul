'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type AuthState = { error: string | null; info: string | null };

const initial: AuthState = { error: null, info: null };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const intent = String(formData.get('intent') ?? '');

  if (!email) return { ...initial, error: 'Email is required.' };

  if (intent === 'magic_link') {
    const h = await headers();
    const host = h.get('host') ?? '';
    const proto =
      h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
    const redirectTo = `${proto}://${host}/auth/callback`;

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) return { ...initial, error: error.message };

    return {
      error: null,
      info: 'Check your email for the sign-in link.',
    };
  }

  // Password sign-in (default).
  const password = String(formData.get('password') ?? '');
  if (!password) {
    return {
      ...initial,
      error: 'Password is required. Or use the magic-link option below.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ...initial, error: error.message };

  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
