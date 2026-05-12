'use client';

import { useActionState } from 'react';
import { ArrowRight } from 'lucide-react';
import Wordmark from '@/components/site/Wordmark';
import { signIn, type AuthState } from '@/app/auth/actions';

const initial: AuthState = { error: null, info: null };

export default function LoginPage() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <main className="paper-grid flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Wordmark href="/login" />
        </div>

        <div className="border border-line bg-surface px-8 py-9 shadow-[0_1px_0_rgba(26,20,16,0.04)]">
          <header className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Sign in
            </p>
            <h1 className="font-display mt-1 text-3xl leading-tight tracking-tight text-stone-900">
              Welcome back.
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              Sign in with your password, or we&apos;ll email you a one-tap link.
              First time here? Use the link option — we&apos;ll create your account.
            </p>
          </header>

          <form action={action} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                Email
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@yourcompany.com"
                className="border border-line bg-background px-3 py-2.5 text-[15px] text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-stone-500">
                Password <span className="text-stone-400">— optional</span>
              </span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Leave blank to receive a sign-in link"
                className="border border-line bg-background px-3 py-2.5 text-[15px] text-stone-900 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
              />
            </label>

            <button
              type="submit"
              name="intent"
              value="password"
              disabled={pending}
              className="group mt-2 inline-flex items-center justify-center gap-1.5 bg-orange-600 px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Working…' : 'Sign in'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              type="submit"
              name="intent"
              value="magic_link"
              disabled={pending}
              className="-mt-1 inline-flex items-center justify-center gap-1 px-4 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              → Email me a sign-in link instead
            </button>

            {state.error && (
              <p
                className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
                role="alert"
              >
                {state.error}
              </p>
            )}
            {state.info && (
              <p
                className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                role="status"
              >
                {state.info}
              </p>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
          By signing in you agree to our{' '}
          <a
            href="https://licensedtohaul.com/about"
            className="underline-offset-2 hover:text-orange-700 hover:underline"
          >
            terms
          </a>
          .
        </p>
      </div>
    </main>
  );
}
