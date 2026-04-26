'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import AuthCTA from '@/components/ui/AuthCTA';

type RequireAuthProps = {
  children: ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 text-center">
        <p className="text-base font-medium text-slate-600">Checking your session...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 text-center">
        <div className="rounded-md border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase text-blue-700">Sign in required</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Start your Trio plan after signing in.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Your discovery answers, hobby picks, and starter plans need a secure account.
          </p>
          <div className="mt-6">
            <AuthCTA signedOutLabel="Sign in to continue" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
