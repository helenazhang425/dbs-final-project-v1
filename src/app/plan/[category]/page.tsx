'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/auth/RequireAuth';
import {
  formatCategoryLabel,
  getDateKey,
  getDayDifference,
  readDashboardState,
  type HobbySlot,
} from '@/lib/dashboard-state';
import type { HobbyCategory } from '@/lib/types';

const HOBBY_CATEGORIES: HobbyCategory[] = ['physical', 'intellectual', 'creative'];

function parseCategory(category: string): HobbyCategory | null {
  if (HOBBY_CATEGORIES.includes(category as HobbyCategory)) {
    return category as HobbyCategory;
  }

  return null;
}

export default function PlanCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = use(params);
  const category = parseCategory(rawCategory);
  const [slot, setSlot] = useState<HobbySlot | null>(null);
  const [completedDate, setCompletedDate] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const state = readDashboardState();
    setSlot(state.slots.find((currentSlot) => currentSlot.category === category) ?? null);
    setCompletedDate(category ? state.completionHistory[category] ?? null : null);
    setIsHydrated(true);
  }, [category]);

  if (!category) {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Plan not found</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">That plan category does not exist.</h1>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-lg bg-olive-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-olive-700"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (!isHydrated) {
    return (
      <RequireAuth>
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4 text-center">
          <p className="text-base font-medium text-slate-600">Loading your plan...</p>
        </div>
      </RequireAuth>
    );
  }

  if (!slot || slot.status === 'empty') {
    return (
      <RequireAuth>
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
              {formatCategoryLabel(category)} plan
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">No hobby is active in this slot yet.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
              Choose a {category} hobby first, and Trio will turn the first step into a plan that feels easy to repeat.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/discover?category=${category}`}
                className="inline-flex rounded-lg bg-olive-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-olive-700"
              >
                Discover a {category} hobby
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex rounded-lg border border-olive-200 bg-white px-4 py-3 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  const todayKey = getDateKey(new Date());
  const completedToday = completedDate === todayKey;
  const missedDay =
    Boolean(completedDate) &&
    !completedToday &&
    Boolean(slot.streak) &&
    getDayDifference(todayKey, completedDate as string) >= 2;

  return (
    <RequireAuth>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/dashboard" className="text-sm font-medium text-olive-700 transition-colors hover:text-olive-800">
          ← Back to dashboard
        </Link>

        <div className="mt-4 overflow-hidden rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] shadow-sm">
          <div className="grid gap-6 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
                {formatCategoryLabel(category)} plan
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-950">{slot.hobby}</h1>
              <p className="mt-4 text-base leading-7 text-slate-700">
                {completedToday
                  ? 'Today is complete. Leave the bar low enough that tomorrow feels easy to start again.'
                  : missedDay
                    ? slot.restartTask ?? 'Restart with a smaller step today.'
                    : slot.starterTask ?? 'Take one small step today.'}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {completedToday ? 'Completed today' : missedDay ? 'Restart day' : 'Ready for today'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Streak</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{slot.streak ?? 0} days</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Progress</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{slot.progress ?? 0}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">
                {completedToday ? 'Tomorrow' : 'After today'}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                {completedToday
                  ? slot.nextTask ?? 'Tomorrow stays small so the habit remains realistic.'
                  : missedDay
                    ? 'Finish the restart version today. Trio keeps the next step modest until the rhythm feels stable again.'
                    : slot.nextTask ?? 'When today feels manageable, Trio grows the next step a little at a time.'}
              </p>
              <div className="mt-6 rounded-xl bg-slate-950 p-4 text-sm text-white">
                <p className="font-semibold">Why this plan is small on purpose</p>
                <p className="mt-2 leading-6 text-slate-200">
                  Trio treats consistency as the real win. The task only needs to be realistic enough that you will still
                  want to do it on an ordinary day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
