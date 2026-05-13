'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f8faf5] text-slate-950">
        <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">Trio</p>
          <h1 className="mt-3 text-3xl font-semibold">Something went wrong.</h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            Trio could not load this view. Try again once, then return to the dashboard if the issue continues.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-olive-600 px-5 text-sm font-medium text-white transition-colors hover:bg-olive-700"
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-olive-200 bg-white px-5 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50"
            >
              Back to dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
