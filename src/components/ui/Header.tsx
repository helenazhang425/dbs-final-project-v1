'use client';

import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import TrioLogo from '@/components/ui/TrioLogo';

export default function Header() {
  const { isSignedIn } = useAuth();

  return (
    <header className="bg-olive-50/80 backdrop-blur-md border-b border-olive-200 sticky top-0 z-50">
      <div className="mx-auto max-w-[84rem] px-6">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm ring-1 ring-olive-200 transition-transform group-hover:scale-[1.03]">
              <TrioLogo className="h-7 w-7" />
            </div>
            <div className="font-sans text-xl font-semibold text-slate-800 group-hover:text-olive-500 transition-colors">
              Trio
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="font-sans font-medium text-slate-800 hover:text-olive-500 transition-colors px-3 py-2 rounded-full hover:bg-olive-100 text-sm"
                >
                  Dashboard
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      userButtonTrigger: 'rounded-full border border-olive-200 hover:border-olive-300 transition-shadow'
                    }
                  }}
                />
              </>
            ) : (
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="min-h-10 rounded-full bg-olive-600 text-white px-5 py-2 font-sans font-medium shadow hover:bg-olive-700 transition-all text-sm"
                >
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
