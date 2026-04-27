'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DimensionIcon from '@/components/ui/DimensionIcon';
import RequireAuth from '@/components/auth/RequireAuth';
import {
  formatCategoryLabel,
  getHabitProgress,
  getDateKey,
  getDayDifference,
  initialSlots,
  persistDashboardState,
  readDashboardState,
  type HobbySlot,
  type HobbyStatus,
} from '@/lib/dashboard-state';
import type { HobbyCategory } from '@/lib/types';

type ActiveHobbyCardProps = {
  slot: HobbySlot;
  todayKey: string;
  completionDate: string | null;
  onComplete: (category: HobbyCategory) => void;
  onReset: (category: HobbyCategory) => void;
};

function getCategoryColor(category: string) {
  switch (category) {
    case 'physical':
      return 'bg-emerald-50 border-emerald-200';
    case 'intellectual':
      return 'bg-lime-50 border-lime-200';
    case 'creative':
      return 'bg-amber-50 border-amber-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

function getStatusBadgeColor(status: HobbyStatus) {
  switch (status) {
    case 'active':
      return 'bg-olive-100 text-olive-800';
    case 'dormant':
      return 'bg-amber-100 text-amber-800';
    case 'empty':
      return 'bg-gray-100 text-gray-800';
  }
}

function getSlotTaskCopy(slot: HobbySlot, completedToday: boolean, missedDay: boolean) {
  if (completedToday) {
    return slot.nextTask ?? 'Trio keeps tomorrow small so the habit stays repeatable over about 60 days.';
  }

  if (missedDay) {
    return slot.restartTask ?? 'Trio adjusted the task downward so restarting feels light instead of punishing.';
  }

  return slot.starterTask ?? 'Take one small step today.';
}

function ActiveHobbyCard({
  slot,
  todayKey,
  completionDate,
  onComplete,
  onReset,
}: ActiveHobbyCardProps) {
  const completedToday = completionDate === todayKey;
  const missedDay =
    Boolean(completionDate) &&
    !completedToday &&
    Boolean(slot.streak) &&
    getDayDifference(todayKey, completionDate as string) >= 2;
  const taskCopy = getSlotTaskCopy(slot, completedToday, missedDay);

  return (
    <div className={`rounded-2xl border-2 p-5 ${getCategoryColor(slot.category)} shadow-sm`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DimensionIcon category={slot.category} className="h-10 w-10" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-700">
              {formatCategoryLabel(slot.category)}
            </p>
            <p className="text-lg font-semibold text-slate-950">{slot.hobby}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(slot.status)}`}>
          {completedToday ? 'Completed today' : missedDay ? 'Restart mode' : 'Ready today'}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-700">{taskCopy}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Streak</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{slot.streak ?? 0} days</p>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">60-day progress</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{getHabitProgress(slot.streak, slot.progress)}%</p>
        </div>
      </div>

      <div className="mt-4 bg-white/80 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-olive-600 transition-all"
          style={{ width: `${getHabitProgress(slot.streak, slot.progress)}%` }}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => (completedToday ? onReset(slot.category) : onComplete(slot.category))}
          className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-colors sm:w-auto ${
            completedToday
              ? 'bg-olive-200 text-olive-800 hover:bg-olive-300'
              : 'bg-olive-600 text-white hover:bg-olive-700'
          }`}
        >
          {completedToday ? 'Reset today' : 'Mark today complete'}
        </button>
        <Link
          href={`/plan/${slot.category}`}
          className="inline-flex w-full items-center justify-center rounded-lg border border-olive-200 bg-white px-4 py-3 text-sm font-medium text-olive-800 transition-colors hover:bg-olive-50 sm:w-auto"
        >
          Open plan
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [slots, setSlots] = useState<HobbySlot[]>(initialSlots);
  const [completionHistory, setCompletionHistory] = useState<Partial<Record<HobbyCategory, string>>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  const activeSlots = slots.filter((slot) => slot.status === 'active');
  const emptySlots = slots.filter((slot) => slot.status === 'empty');
  const todayKey = getDateKey(new Date());
  const completedActiveCount = activeSlots.filter(
    (slot) => completionHistory[slot.category] === todayKey
  ).length;

  useEffect(() => {
    const savedState = readDashboardState();
    setSlots(savedState.slots);
    setCompletionHistory(savedState.completionHistory);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    persistDashboardState({
      slots,
      completionHistory,
    });
  }, [completionHistory, isHydrated, slots]);

  const handleCompleteToday = (category: HobbyCategory) => {
    const currentSlot = slots.find((slot) => slot.category === category && slot.status === 'active');
    const completedDate = completionHistory[category] ?? null;

    if (!currentSlot || completedDate === todayKey) {
      return;
    }

    const missedDay =
      Boolean(completedDate) &&
      Boolean(currentSlot.streak) &&
      getDayDifference(todayKey, completedDate as string) >= 2;

    setSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.status === 'active' && slot.category === category
          ? {
              ...slot,
              starterTask: slot.nextTask ?? 'Next up: keep the streak going tomorrow',
              streak: missedDay ? 1 : (slot.streak ?? 0) + 1,
              progress: getHabitProgress(missedDay ? 1 : (slot.streak ?? 0) + 1),
            }
          : slot
      )
    );
    setCompletionHistory((currentHistory) => ({
      ...currentHistory,
      [category]: todayKey,
    }));
  };

  const handleResetToday = (category: HobbyCategory) => {
    const currentSlot = slots.find((slot) => slot.category === category && slot.status === 'active');
    const completedDate = completionHistory[category];

    if (!currentSlot || completedDate !== todayKey) {
      return;
    }

    setSlots((currentSlots) =>
      currentSlots.map((slot) =>
        slot.status === 'active' && slot.category === category
          ? {
              ...slot,
              streak: Math.max((slot.streak ?? 0) - 1, 0),
              progress: getHabitProgress(Math.max((slot.streak ?? 0) - 1, 0)),
            }
          : slot
      )
    );
    setCompletionHistory((currentHistory) => {
      const nextHistory = { ...currentHistory };
      delete nextHistory[category];
      return nextHistory;
    });
  };

  const getActionButton = (slot: HobbySlot) => {
    if (slot.status === 'active') {
      return (
        <Link
          href={`/plan/${slot.category}`}
          className="w-full rounded-lg bg-olive-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-olive-700"
        >
          View Today's Task
        </Link>
      );
    } else if (slot.status === 'dormant') {
      return (
        <Link
          href={`/discover?category=${slot.category}`}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          Reactivate
        </Link>
      );
    } else {
      const startLabel =
        slot.category === 'physical'
          ? 'Explore movement'
          : slot.category === 'intellectual'
            ? 'Explore intellect'
            : 'Explore creativity';

      return (
        <Link
          href={`/discover?category=${slot.category}`}
          className="w-full rounded-lg bg-olive-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-olive-700"
        >
          {startLabel}
        </Link>
      );
    }
  };

  const getEmptySlotCopy = (category: HobbySlot['category']) => {
    switch (category) {
      case 'physical':
        return 'Start with a 10-minute physical habit. Walking, running, lifting, or yoga all count if the first step is small.';
      case 'intellectual':
        return 'Pick one mind-focused habit and keep it tiny: reading a few pages, learning a few words, or trying one new skill.';
      case 'creative':
        return 'Choose one making habit and make the first session short: music, cooking, drawing, or writing all work.';
      default:
        return 'Choose a hobby that fits your life and start small.';
    }
  };

  const recommendationCopy =
    activeSlots.length === 0
      ? 'Pick a hobby from one of the available paths so Trio has something to build around.'
      : completedActiveCount === activeSlots.length
        ? 'Most habits take about 60 days of repetition, so Trio keeps the next step small and repeatable.'
        : `${activeSlots.length - completedActiveCount} ${
            activeSlots.length - completedActiveCount === 1 ? 'hobby still needs' : 'hobbies still need'
          } a small step today.`;

  return (
    <RequireAuth>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Keep building the life you want to come back to.
          </h1>
          <p className="text-gray-600">
            One physical, one intellectual, and one creative hobby, growing at a pace that fits real life.
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-olive-200 bg-[linear-gradient(135deg,#f7f9ef,#edf3de)] shadow-sm">
          <div className="grid gap-6 px-6 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-olive-700">Today</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">
                {activeSlots.length > 0
                  ? `You have ${activeSlots.length} ${activeSlots.length === 1 ? 'hobby' : 'hobbies'} coming to life.`
                  : 'No hobbies in progress yet. Pick an available path to start.'}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                Most habits take about 60 days of repetition to stick, so Trio keeps today small and easy to repeat
                tomorrow.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-olive-200">
                  Hobbies in progress: {activeSlots.length}
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-olive-200">
                  Completed today: {completedActiveCount}
                </span>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 ring-1 ring-olive-200">
                  Available paths: {emptySlots.length}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {activeSlots.length > 0 ? (
                activeSlots.map((slot) => (
                  <ActiveHobbyCard
                    key={slot.category}
                    slot={slot}
                    todayKey={todayKey}
                    completionDate={completionHistory[slot.category] ?? null}
                    onComplete={handleCompleteToday}
                    onReset={handleResetToday}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-white/80 bg-white/80 p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-olive-700">No hobbies in progress yet</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    Pick an available path below to discover your first hobby and start building today&apos;s stack.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-lg border border-olive-200 bg-olive-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-olive-900">Recommendation</h3>
          <p className="text-sm text-olive-800">{recommendationCopy}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {slots.map((slot) => (
            <div
              key={slot.category}
              className={`rounded-xl border-2 p-6 transition-all hover:shadow-lg ${getCategoryColor(
                slot.category
              )} ${slot.status === 'empty' ? 'opacity-70 grayscale-[0.25]' : ''}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="mr-3">
                    <DimensionIcon category={slot.category} className="h-11 w-11" />
                  </div>
                  <h2
                    className={`text-xl font-semibold capitalize ${
                      slot.status === 'empty' ? 'text-gray-700' : 'text-gray-900'
                    }`}
                  >
                    {slot.category}
                  </h2>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeColor(slot.status)}`}>
                  {slot.status === 'empty' ? 'Discover' : slot.status === 'active' ? 'In progress' : 'Dormant'}
                </span>
              </div>

              <div className="mb-4 min-h-24">
                {slot.status === 'active' && slot.hobby ? (
                  <div>
                    <p className="mb-1 font-medium text-gray-900">{slot.hobby}</p>
                    {slot.starterTask ? <p className="mb-2 text-sm text-gray-600">{slot.starterTask}</p> : null}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Streak: {slot.streak} days</span>
                      <span>60-day progress: {getHabitProgress(slot.streak, slot.progress)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-olive-600 transition-all"
                        style={{ width: `${getHabitProgress(slot.streak, slot.progress)}%` }}
                      />
                    </div>
                  </div>
                ) : slot.status === 'dormant' ? (
                  <p className="text-gray-500">Paused - ready to restart when you are</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                      Ready when you are
                    </p>
                    <p className="text-gray-500">{getEmptySlotCopy(slot.category)}</p>
                  </div>
                )}
              </div>

              {getActionButton(slot)}
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
