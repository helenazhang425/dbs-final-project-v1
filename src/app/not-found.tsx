import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">Page not found</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">This Trio page does not exist.</h1>
      <p className="mt-4 text-base leading-7 text-slate-700">
        Head back to the dashboard to review your active hobby slots and today&apos;s next step.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-lg bg-olive-600 px-5 text-sm font-medium text-white transition-colors hover:bg-olive-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
