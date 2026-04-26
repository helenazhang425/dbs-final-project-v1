'use client';

import { SignInButton, SignUpButton, useAuth } from '@clerk/nextjs';
import Link from 'next/link';

type AuthCTAProps = {
  authMode?: 'sign-in' | 'sign-up';
  className?: string;
  signedInLabel?: string;
  signedOutLabel?: string;
};

export default function AuthCTA({
  authMode = 'sign-in',
  className = '',
  signedInLabel = 'View Dashboard →',
  signedOutLabel = 'Get Started →',
}: AuthCTAProps) {
  const { isLoaded, isSignedIn } = useAuth();

  const buttonClassName =
    className ||
    'inline-flex min-h-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-300 px-8 py-4 text-base font-sans font-semibold text-navy shadow-lg hover:from-yellow-300 hover:to-yellow-400 hover:-translate-y-1 transition-all';

  if (isLoaded && isSignedIn) {
    return (
      <Link href="/dashboard" className={buttonClassName}>
        {signedInLabel}
      </Link>
    );
  }

  if (authMode === 'sign-up') {
    return (
      <SignUpButton mode="modal">
        <button type="button" className={buttonClassName}>
          {signedOutLabel}
        </button>
      </SignUpButton>
    );
  }

  return (
    <SignInButton mode="modal">
      <button type="button" className={buttonClassName}>
        {signedOutLabel}
      </button>
    </SignInButton>
  );
}
