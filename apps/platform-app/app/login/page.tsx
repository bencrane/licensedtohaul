'use client';

import { useActionState } from 'react';
import {
  signInWithPassword,
  signInWithMagicLink,
  type AuthState,
} from '@/app/auth/actions';

const initial: AuthState = { error: null, info: null };

export default function LoginPage() {
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initial);
  const [mlState, mlAction, mlPending] = useActionState(signInWithMagicLink, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <header className="mb-8">
          <h1 className="text-xs uppercase tracking-widest text-stone-500 font-mono">
            Licensed to Haul
          </h1>
          <p className="font-display text-3xl text-stone-900 mt-1">Sign in</p>
        </header>

        <form action={pwAction} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            className="border border-line bg-surface px-3 py-2 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
          />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            required
            className="border border-line bg-surface px-3 py-2 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pwPending}
            className="mt-1 bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {pwPending ? 'Signing in…' : 'Sign in'}
          </button>
          {pwState.error ? (
            <p className="text-sm text-red-700" role="alert">
              {pwState.error}
            </p>
          ) : null}
        </form>

        <div className="my-6 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.14em] text-stone-500">
          <span className="h-px flex-1 bg-line" />
          <span>OR</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <form action={mlAction} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email"
            required
            className="border border-line bg-surface px-3 py-2 placeholder-stone-400 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={mlPending}
            className="border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-stone-800 hover:border-orange-400 disabled:opacity-50"
          >
            {mlPending ? 'Sending link…' : 'Send magic link'}
          </button>
          {mlState.error ? (
            <p className="text-sm text-red-700" role="alert">
              {mlState.error}
            </p>
          ) : null}
          {mlState.info ? (
            <p className="text-sm text-emerald-700" role="status">
              {mlState.info}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
